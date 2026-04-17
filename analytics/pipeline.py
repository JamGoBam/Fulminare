"""Analytics orchestrator. Entry: `python -m analytics.pipeline`.

Reads ingested parquets, computes all derived tables, writes them back to data/processed/.
Must run after `python -m data.ingest`.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd


def run(processed_dir: Path = Path("data/processed")) -> None:
    """Compute all derived analytics tables and write as parquets."""
    p = processed_dir

    inventory = pd.read_parquet(p / "inventory.parquet")
    sales = pd.read_parquet(p / "sales.parquet")
    skus = pd.read_parquet(p / "skus.parquet")
    freight = pd.read_parquet(p / "freight.parquet")
    open_po = pd.read_parquet(p / "open_po.parquet")
    chargebacks = pd.read_parquet(p / "chargebacks.parquet")

    from analytics.imbalance import compute_imbalance_table
    from analytics.chargeback import (
        top_causes, top_customers, top_channels, by_dc, monthly_trend,
    )
    from analytics.transfer import transfer_recommendations
    from analytics.alerts import rank_alerts

    print("  [pipeline] imbalance...")
    imbalance_df = compute_imbalance_table(inventory, sales, skus)
    imbalance_df.to_parquet(p / "imbalance.parquet", index=False)

    print("  [pipeline] chargeback aggregates...")
    top_causes(chargebacks).to_parquet(p / "cb_top_causes.parquet", index=False)
    top_customers(chargebacks).to_parquet(p / "cb_top_customers.parquet", index=False)
    top_channels(chargebacks).to_parquet(p / "cb_top_channels.parquet", index=False)
    by_dc(chargebacks).to_parquet(p / "cb_by_dc.parquet", index=False)
    monthly_trend(chargebacks).to_parquet(p / "cb_monthly_trend.parquet", index=False)

    print("  [pipeline] transfer recommendations...")
    transfer_df = transfer_recommendations(
        inventory, sales, skus, freight, open_po, chargebacks
    )
    transfer_df.to_parquet(p / "transfers_computed.parquet", index=False)

    print("  [pipeline] alerts...")
    alerts_df = rank_alerts(imbalance_df, transfer_df, chargebacks)
    alerts_df.to_parquet(p / "alerts.parquet", index=False)

    print("  [pipeline] done.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run analytics pipeline over processed parquets.")
    parser.add_argument(
        "--processed", default="data/processed",
        help="Directory containing ingested parquets (default: data/processed)",
    )
    args = parser.parse_args()
    run(Path(args.processed))


if __name__ == "__main__":
    main()
