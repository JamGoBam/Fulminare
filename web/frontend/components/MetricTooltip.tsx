"use client"

import React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export const GLOSSARY = {
  demand_rate:
    "Daily demand — units sold per day over the trailing 30 days, per SKU per DC.",
  dos:
    "Days of Supply — how many days on-hand inventory lasts at the current demand rate. Critical < 14 days, Warning < 30 days, Target ≈ 90 days.",
  imbalance:
    "Imbalance Score — how unevenly stock is spread across the 3 DCs. 0 = perfectly balanced, 10 = all stock stranded at one DC.",
  transfer_cost:
    "Move Cost — dollar cost of relocating stock between DCs, based on pallets × freight rate (40 cases per pallet).",
  chargeback_risk:
    "Risk ($) — expected dollar penalty if we do nothing: probability of stockout × historical chargeback rate for that customer/channel/DC.",
  otif:
    "OTIF Risk — probability of missing On-Time-In-Full on the next order. 0 = reliable, 1 = certain miss.",
  route:
    "Transfer route — origin DC → destination DC for the recommended stock move.",
  net_saving:
    "Net Saving — estimated penalty avoided minus freight cost if the transfer is executed today.",
  cause_code:
    "Chargeback cause — the reason for the penalty charge (SHORT_SHIP, LATE_DELIVERY, DAMAGE, MISSED_WINDOW). TPR promotional adjustments are excluded.",
  available:
    "Available — on-hand units minus allocated (reserved) units. This is the quantity that can be shipped today.",
  on_hand:
    "On Hand — total physical stock at a DC, including units already allocated to open orders.",
  allocated:
    "Allocated — units reserved for open customer orders that have not yet shipped.",
  lead_time:
    "Lead Time — days from purchase order placement to receipt at the DC. Drives when inbound stock will actually be available.",
  po_eta:
    "PO ETA — expected arrival date of the next open purchase order. Delayed POs add 7 days to their stated ETA.",
  delay_flag:
    "Delay Flag — marks an inbound PO as delayed; its ETA is shifted +7 days when computing stockout risk.",
  stockout_window:
    "Stockout Window — the date range when a DC is projected to run out of stock before the next inbound PO arrives.",
  confidence:
    "Confidence — model certainty in the recommendation (0–100%). Driven by historical demand stability and data recency.",
  short_ship:
    "Short Ship — chargeback issued when a retailer receives fewer units than ordered. Often caused by DC stockout splitting an order.",
  late_delivery:
    "Late Delivery — chargeback issued when a shipment arrives after the retailer's delivery window. Often triggered by split-DC fulfillment.",
  missed_window:
    "Missed Window — chargeback issued when the entire shipment falls outside the allowed delivery window. Higher penalty rate than late delivery.",
  damage:
    "Damage — chargeback for product received in unsellable condition. Not related to inventory imbalance; tracked separately.",
  annual_exposure:
    "Annual Exposure — total chargeback dollars projected over 12 months based on the trailing period rate. Excludes TPR promotional deductions.",
  avoidable_savings:
    "Avoidable Savings — portion of annual exposure estimated to be preventable by acting on the system's recommendations (transfers + PO timing).",
  pct_reduction:
    "% Reduction — avoidable savings ÷ total annual exposure. Shows what fraction of chargebacks the system can eliminate.",
  imbalance_score_dc:
    "DC-level Imbalance — (max DoS − min DoS) / mean DoS across the 3 DCs for a single SKU. Clamped to [0, 10]. Higher = more skewed distribution.",
} as const

export type MetricKey = keyof typeof GLOSSARY

interface MetricTooltipProps {
  metric: MetricKey
  children: React.ReactNode
}

export function MetricTooltip({ metric, children }: MetricTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help underline decoration-dotted underline-offset-2 decoration-muted-foreground/50" />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs leading-relaxed">
        {GLOSSARY[metric]}
      </TooltipContent>
    </Tooltip>
  )
}
