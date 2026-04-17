"""CSV to parquet + DuckDB views. Entry point: `python -m data.ingest`."""
from __future__ import annotations

import argparse
import math
from enum import Enum
from pathlib import Path

import duckdb
import pandas as pd

from data.constants import DC_MAP
from data.schemas import (
    ChargebackRow,
    FreightRow,
    InventoryRow,
    OpenPORow,
    POHistoryRow,
    SKURow,
    SalesRow,
    SupplierRow,
    TransferRow,
)

# Table name -> (schema class, columns that hold DC values to be normalized)
_TABLES: dict[str, tuple] = {
    "inventory":   (InventoryRow,   ["dc"]),
    "sales":       (SalesRow,       ["ship_from_dc"]),
    "po_history":  (POHistoryRow,   ["dc"]),
    "open_po":     (OpenPORow,      ["dc"]),
    "suppliers":   (SupplierRow,    []),
    "chargebacks": (ChargebackRow,  ["dc"]),
    "skus":        (SKURow,         []),
    "transfers":   (TransferRow,    ["origin_dc", "dest_dc"]),
    "freight":     (FreightRow,     ["origin", "destination"]),
}


def _clean(row: dict) -> dict:
    """Replace float NaN with None so pydantic handles Optional fields correctly."""
    return {k: (None if isinstance(v, float) and math.isnan(v) else v) for k, v in row.items()}


def _serialize(val: object) -> object:
    """Coerce StrEnum instances to their string values for clean DataFrame storage."""
    if isinstance(val, Enum):
        return val.value
    return val


def load_table(name: str, src_dir: Path) -> pd.DataFrame:
    """Load one CSV, normalize DC columns, validate with pydantic, return DataFrame."""
    schema_cls, dc_cols = _TABLES[name]
    df = pd.read_csv(src_dir / f"{name}.csv", dtype=str)
    for col in dc_cols:
        if col in df.columns:
            df[col] = df[col].map(
                lambda v: DC_MAP.get(str(v).strip(), v) if pd.notna(v) else v  # type: ignore[return-value]
            )
    records = [
        {k: _serialize(v) for k, v in schema_cls.model_validate(_clean(row)).model_dump().items()}
        for row in df.to_dict(orient="records")
    ]
    return pd.DataFrame(records)


def run(src_dir: Path, out_dir: Path, db_path: Path) -> None:
    """Ingest all tables: CSV -> parquet + DuckDB views."""
    out_dir.mkdir(parents=True, exist_ok=True)
    conn = duckdb.connect(str(db_path))
    for name in _TABLES:
        df = load_table(name, src_dir)
        parquet_path = (out_dir / f"{name}.parquet").resolve()
        df.to_parquet(parquet_path, index=False)
        conn.execute(
            f"CREATE OR REPLACE VIEW {name} AS "
            f"SELECT * FROM read_parquet('{parquet_path.as_posix()}')"
        )
        print(f"  {name}: {len(df)} rows -> {parquet_path.name}")
    conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest CSVs into parquet + DuckDB views.")
    parser.add_argument("--raw", default="data/raw", help="Source CSV directory")
    parser.add_argument("--seed", action="store_true", help="Use data/seed/ as source")
    parser.add_argument("--real", action="store_true", help="Use real POP data from data/raw/")
    parser.add_argument("--out", default="data/processed", help="Output directory")
    args = parser.parse_args()
    out = Path(args.out)

    # Auto-detect real data: use it if POP_InventorySnapshot.xlsx is present
    real_marker = Path("data/raw/POP_InventorySnapshot.xlsx")
    use_real = args.real or (not args.seed and real_marker.exists())

    if use_real:
        from data.ingest_real import run_real
        print(f"Ingesting real POP data from data/raw -> {out}")
        run_real(Path("data/raw"), out, out / "pop.duckdb")
    else:
        src = Path("data/seed") if args.seed else Path(args.raw)
        print(f"Ingesting from {src} -> {out}")
        run(src, out, out / "pop.duckdb")
    print("Done.")


if __name__ == "__main__":
    main()
