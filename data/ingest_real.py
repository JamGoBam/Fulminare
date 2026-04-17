"""Real POP data ingest: reads XLSX/CSV from data/raw/, produces standard parquets."""
from __future__ import annotations

import math
import re
from datetime import date
from pathlib import Path

import pandas as pd

from data.constants import DC, DC_MAP, REAL_CAUSE_CODE_MAP

RAW = Path("data/raw")

_SHEET_DC = {
    "Site 1 - SF": DC.WEST,
    "Site 2 - NJ": DC.EAST,
    "Site 3 - LA": DC.CENTRAL,
}

# Integer/string location codes -> DC
_LOC_DC: dict[object, DC] = {
    1: DC.WEST, "1": DC.WEST,
    2: DC.EAST, "2": DC.EAST,
    3: DC.CENTRAL, "3": DC.CENTRAL,
}


def _loc_to_dc(val: object) -> str:
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return str(DC.EAST)
    key = str(val).strip().split(".")[0]  # "1.0" -> "1"
    return str(_LOC_DC.get(key, DC_MAP.get(key, DC.EAST)))


def _parse_case_pack(val: object) -> int:
    """'BOX40' -> 40, 'CS24' -> 24, 20 -> 20, NaN -> 1."""
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return 1
    m = re.search(r"\d+", str(val))
    return int(m.group()) if m else 1


def _avg_unit_cost(raw: Path) -> pd.DataFrame:
    """Return DataFrame[sku, unit_cost] — average received cost per SKU from PO history."""
    path = raw / "POP_PurchaseOrderHistory.XLSX"
    if not path.exists():
        return pd.DataFrame(columns=["sku", "unit_cost"])
    df = pd.read_excel(path, sheet_name=0)
    df = df.rename(columns={"Item Number": "sku", "Unit Cost": "unit_cost"})
    df["unit_cost"] = pd.to_numeric(df["unit_cost"], errors="coerce")
    return df.groupby("sku")["unit_cost"].mean().reset_index()


def _vendor_brand_map(raw: Path) -> pd.DataFrame:
    """Map sku -> brand, category, supplier_id via PO history + vendor master."""
    po_path = raw / "POP_PurchaseOrderHistory.XLSX"
    vm_path = raw / "POP_VendorMaster.xlsx"
    empty = pd.DataFrame(columns=["sku", "brand", "category", "supplier_id"])
    if not po_path.exists() or not vm_path.exists():
        return empty
    po = pd.read_excel(po_path, sheet_name=0)
    po = po.rename(columns={"Item Number": "sku", "Vendor ID": "supplier_id"})
    po = po[["sku", "supplier_id"]].dropna().drop_duplicates("sku")

    vm = pd.read_excel(vm_path, sheet_name="Supplier Master")
    vm = vm.rename(columns={
        "Vendor ID": "supplier_id",
        "Brand": "brand",
        "Product Line": "category",
    })
    vm = vm[["supplier_id", "brand", "category"]].dropna(subset=["supplier_id"])

    merged = po.merge(vm, on="supplier_id", how="left")
    return merged[["sku", "brand", "category", "supplier_id"]]


def load_inventory_real(raw: Path = RAW) -> pd.DataFrame:
    path = raw / "POP_InventorySnapshot.xlsx"
    today = date.today().isoformat()
    cost_df = _avg_unit_cost(raw)

    dfs = []
    for sheet, dc in _SHEET_DC.items():
        df = pd.read_excel(path, sheet_name=sheet)
        df = df.rename(columns={"Item Number": "sku", "On Hand": "on_hand", "Available": "available"})
        df = df[df["sku"].notna()].copy()
        df["sku"] = df["sku"].astype(str).str.strip()
        df["dc"] = str(dc)
        df["on_hand"] = pd.to_numeric(df["on_hand"], errors="coerce").fillna(0)
        df["available"] = pd.to_numeric(df["available"], errors="coerce").fillna(0)
        df["allocated"] = (df["on_hand"] - df["available"]).clip(lower=0)
        df["snapshot_date"] = today
        df = df.merge(cost_df, on="sku", how="left")
        df["unit_cost"] = df["unit_cost"].fillna(0.0)
        dfs.append(df[["sku", "dc", "on_hand", "allocated", "available", "unit_cost", "snapshot_date"]])
    return pd.concat(dfs, ignore_index=True)


def load_sales_real(raw: Path = RAW) -> pd.DataFrame:
    path = raw / "POP_SalesTransactionHistory.csv"
    df = pd.read_csv(path, dtype={"LOCNCODE": str})
    df = df[df["SOP TYPE"] == "Invoice"].copy()
    df = df[df["LOCNCODE"].isin(["1", "2", "3"])].copy()

    df["date"] = pd.to_datetime(df["DOCDATE"], errors="coerce").dt.date.astype(str)
    df["sku"] = df["ITEMNMBR"].astype(str).str.strip()
    # QTYBSUOM = base sellable units; fallback to QUANTITY_adj if missing
    df["qty"] = pd.to_numeric(df.get("QTYBSUOM", df.get("QUANTITY_adj", 0)), errors="coerce").fillna(0)
    df["unit_price"] = pd.to_numeric(df.get("Unit_Price_adj", 0), errors="coerce").fillna(0)
    df["customer_id"] = df["CUSTNMBR"].astype(str).str.strip()
    df["channel"] = df["Customer Type"].fillna("OTHER").astype(str).str.strip()
    df["ship_from_dc"] = df["LOCNCODE"].map(_loc_to_dc)
    df = df[df["qty"] > 0].copy()

    return df[["date", "sku", "qty", "unit_price", "customer_id", "channel", "ship_from_dc"]].reset_index(drop=True)


def load_chargebacks_real(raw: Path = RAW) -> pd.DataFrame:
    path = raw / "POP_ChargeBack_Deductions_Penalties_Freight.xlsx"
    df = pd.read_excel(path, sheet_name="Data - Deductions & Cause Code")
    df = df[df["Location Code"].isin([1, 2, 3])].copy()

    df["date"] = pd.to_datetime(df["Document Date"], errors="coerce").dt.date.astype(str)
    df["dc"] = df["Location Code"].astype(int).astype(str).map(_loc_to_dc)
    df["cause_code"] = (
        df["Cause Code"].astype(str).str.strip()
        .map(REAL_CAUSE_CODE_MAP)
        .fillna("MISSED_WINDOW")
    )
    df["amount"] = pd.to_numeric(df["Extended Price"], errors="coerce").fillna(0).abs()
    df["customer_id"] = df["Customer Number"].astype(str).str.strip()
    df["order_id"] = df["SOP Number"].astype(str).str.strip()
    df["channel"] = df["Salesperson ID"].apply(
        lambda v: "DIRECT" if str(v).upper() == "HOUSE" else "RETAIL"
    )
    df = df[df["amount"] > 0].copy()

    return df[["date", "channel", "customer_id", "dc", "cause_code", "amount", "order_id"]].reset_index(drop=True)


def load_skus_real(raw: Path = RAW) -> pd.DataFrame:
    path = raw / "POP_ItemSpecMaster.xlsx"
    df = pd.read_excel(path, sheet_name="Item Spec Master")
    df = df.rename(columns={
        "Item Number": "sku",
        "Description": "product_name",
        "Case Pack": "pack_size_raw",
        "Shelf Life (Months)": "shelf_life_months",
    })
    df = df[df["sku"].notna()].copy()
    df["sku"] = df["sku"].astype(str).str.strip()
    df["units_per_case"] = df["pack_size_raw"].apply(_parse_case_pack)
    df["pack_size"] = df["pack_size_raw"].astype(str)
    df["shelf_life_days"] = (
        pd.to_numeric(df["shelf_life_months"], errors="coerce").fillna(24).mul(30).astype(int)
    )

    vm = _vendor_brand_map(raw)
    if not vm.empty:
        df = df.merge(vm, on="sku", how="left")

    df["brand"] = df.get("brand", pd.Series(dtype=str)).fillna("POP")
    df["category"] = df.get("category", pd.Series(dtype=str)).fillna("General")
    df["supplier_id"] = df.get("supplier_id", pd.Series(dtype=str)).fillna("UNKNOWN")

    return (
        df[["sku", "product_name", "brand", "category", "pack_size", "units_per_case", "shelf_life_days", "supplier_id"]]
        .drop_duplicates("sku")
        .reset_index(drop=True)
    )


def load_suppliers_real(raw: Path = RAW) -> pd.DataFrame:
    path = raw / "POP_VendorMaster.xlsx"
    df = pd.read_excel(path, sheet_name="Supplier Master")
    df = df.rename(columns={
        "Vendor ID": "supplier_id",
        "Country": "country",
        "Payment Terms": "payment_terms",
    })
    df = df[df["supplier_id"].notna()].copy()
    df["supplier_id"] = df["supplier_id"].astype(str).str.strip()
    df["country"] = df["country"].fillna("USA").astype(str)
    df["moq"] = 0
    df["lead_time_days"] = 30
    df["port"] = ""
    df["payment_terms"] = df["payment_terms"].fillna("NET30").astype(str)
    return df[["supplier_id", "country", "moq", "lead_time_days", "payment_terms", "port"]].reset_index(drop=True)


def load_po_history_real(raw: Path = RAW) -> pd.DataFrame:
    path = raw / "POP_PurchaseOrderHistory.XLSX"
    df = pd.read_excel(path, sheet_name=0)
    df = df.rename(columns={
        "PO Number": "po_id",
        "Item Number": "sku",
        "Vendor ID": "supplier_id",
        "QTY Shipped": "qty",
        "Unit Cost": "unit_cost",
        "PO Date": "order_date",
        "Promised Ship Date": "ship_date",
        "Receipt Date": "receipt_date",
        "Location Code": "dc_raw",
        "Primary Ship To Address": "port",
    })
    df["dc"] = df["dc_raw"].astype(str).map(_loc_to_dc)
    df["qty"] = pd.to_numeric(df["qty"], errors="coerce").fillna(0).astype(int)
    df["unit_cost"] = pd.to_numeric(df["unit_cost"], errors="coerce").fillna(0.0)
    df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce").dt.date.astype(str)
    df["ship_date"] = pd.to_datetime(df["ship_date"], errors="coerce").dt.date.astype(str)
    df["receipt_date"] = pd.to_datetime(df["receipt_date"], errors="coerce").dt.date.astype(str)
    df["po_id"] = df["po_id"].astype(str)
    df["sku"] = df["sku"].astype(str).str.strip()
    df["supplier_id"] = df["supplier_id"].astype(str).str.strip()
    df["port"] = df.get("port", pd.Series(dtype=str)).fillna("").astype(str)
    return df[["po_id", "sku", "supplier_id", "qty", "unit_cost", "order_date", "ship_date", "receipt_date", "port", "dc"]].reset_index(drop=True)


def load_transfers_real(raw: Path = RAW) -> pd.DataFrame:
    path = raw / "POP_InternalTransferHistory.XLSX"
    xl = pd.ExcelFile(path)
    df = pd.read_excel(xl, sheet_name=xl.sheet_names[0])

    if "Document Type" in df.columns:
        df = df[df["Document Type"].astype(str).str.strip() == "Transfer"].copy()

    df = df.rename(columns={
        "Document Date": "date",
        "Item Number": "sku",
        "TRX QTY": "qty",
        "TRX Location": "origin_dc_raw",
        "Transfer To Location": "dest_dc_raw",
        "Extended Cost": "freight_cost",
    })
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.date.astype(str)
    df["origin_dc"] = df["origin_dc_raw"].astype(str).map(_loc_to_dc)
    df["dest_dc"] = df["dest_dc_raw"].astype(str).map(_loc_to_dc)
    df["qty"] = pd.to_numeric(df["qty"], errors="coerce").abs().fillna(0).astype(int)
    df["freight_cost"] = pd.to_numeric(df["freight_cost"], errors="coerce").fillna(0.0)
    df["sku"] = df["sku"].astype(str).str.strip()
    df["reason"] = "TRANSFER"
    return df[["date", "sku", "qty", "origin_dc", "dest_dc", "freight_cost", "reason"]].reset_index(drop=True)


def run_real(raw: Path = RAW, out_dir: Path = Path("data/processed"), db_path: Path | None = None) -> None:
    import duckdb
    from data.ingest import load_table

    if db_path is None:
        db_path = out_dir / "pop.duckdb"
    out_dir.mkdir(parents=True, exist_ok=True)
    conn = duckdb.connect(str(db_path))

    loaders = {
        "inventory": load_inventory_real,
        "sales": load_sales_real,
        "chargebacks": load_chargebacks_real,
        "skus": load_skus_real,
        "suppliers": load_suppliers_real,
        "po_history": load_po_history_real,
        "transfers": load_transfers_real,
    }

    for name, loader in loaders.items():
        print(f"  {name}...", end=" ", flush=True)
        df = loader(raw)
        parquet_path = (out_dir / f"{name}.parquet").resolve()
        df.to_parquet(parquet_path, index=False)
        conn.execute(
            f"CREATE OR REPLACE VIEW {name} AS "
            f"SELECT * FROM read_parquet('{parquet_path.as_posix()}')"
        )
        print(f"{len(df)} rows -> {parquet_path.name}")

    # freight + open_po: no real-data source, fall back to seed
    for name in ["freight", "open_po"]:
        parquet_path = (out_dir / f"{name}.parquet").resolve()
        if not parquet_path.exists():
            df = load_table(name, Path("data/seed"))
            df.to_parquet(parquet_path, index=False)
            print(f"  {name}: seed fallback -> {parquet_path.name}")
        conn.execute(
            f"CREATE OR REPLACE VIEW {name} AS "
            f"SELECT * FROM read_parquet('{parquet_path.as_posix()}')"
        )
    conn.close()
