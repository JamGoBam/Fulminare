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
  dos: "Days of Supply — how many days on-hand inventory lasts at the current demand rate. Critical < 14 days, Warning < 30 days, Target ≈ 90 days.",
  imbalance:
    "Imbalance Score — how unevenly stock is spread across the 3 DCs. 0 = perfectly balanced, 10 = all stock stranded at one DC.",
  transfer_cost:
    "Move Cost — dollar cost of relocating stock between DCs, based on pallets × freight rate (40 cases per pallet).",
  chargeback_risk:
    "Risk ($) — expected dollar penalty if we do nothing: probability of stockout × historical chargeback rate for that customer/channel/DC.",
  otif: "OTIF Risk — probability of missing On-Time-In-Full on the next order. 0 = reliable, 1 = certain miss.",
  route: "Transfer route — origin DC → destination DC for the recommended stock move.",
  net_saving:
    "Net Saving — estimated penalty avoided minus freight cost if the transfer is executed today.",
  cause_code:
    "Chargeback cause — the reason for the penalty charge (SHORT_SHIP, LATE_DELIVERY, DAMAGE, MISSED_WINDOW). TPR promotional adjustments are excluded.",
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
