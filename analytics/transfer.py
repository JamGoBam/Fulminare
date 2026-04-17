"""Transfer-vs-wait decision with explicit dollar tradeoff.

TODO(CLAUDE.md Block 7): for each critical imbalance compute (transfer_cost, projected_chargeback,
recommendation, net_savings). Surface the punchline verbatim for the TransferCard UI:
    "Transfer N pallets A->B: $X freight. Avoid projected $Y chargeback. Net save $Z."
"""
from __future__ import annotations
