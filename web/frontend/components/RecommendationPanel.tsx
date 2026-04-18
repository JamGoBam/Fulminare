"use client"

import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import { TrendingUp, CheckCircle2 } from "lucide-react"
import { getActionItems } from "@/lib/api"
import { TransferCard, InboundCard } from "@/components/ActionComparisonCard"
import { PoTimeline } from "@/components/PoTimeline"
import type { ActionItem } from "@/lib/types"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

const REC_COLORS = {
  "Transfer Now": { badge: "bg-blue-600", header: "bg-blue-50" },
  Wait: { badge: "bg-slate-600", header: "bg-slate-50" },
  Escalate: { badge: "bg-purple-600", header: "bg-purple-50" },
} as const

function summaryFor(item: ActionItem): string {
  const days = Math.round(item.daysUntilStockout)
  switch (item.recommendation) {
    case "Transfer Now":
      return `Execute immediate transfer to prevent ${days}-day stockout and avoid ${fmt(item.potentialPenalty)} in penalties.`
    case "Wait":
      return "Monitor inbound shipment. Current trajectory shows arrival before stockout with minimal risk exposure."
    case "Escalate":
      return "Critical situation requiring executive decision. No standard transfer options available."
  }
}

function stub(label: string, id: string) {
  return () => {
    console.log(`[WMS stub] ${label} — item ${id}`)
  }
}

export function RecommendationPanel() {
  const params = useSearchParams()
  const selectedId = params.get("selected")

  const { data: items } = useQuery<ActionItem[]>({
    queryKey: ["action-items"],
    queryFn: getActionItems,
    staleTime: 30_000,
  })

  const item = selectedId ? items?.find((i) => i.id === selectedId) ?? null : null

  if (!item) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center text-center h-full min-h-64">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
          <TrendingUp className="w-7 h-7 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">No Item Selected</h3>
        <p className="text-sm text-slate-500 max-w-xs">
          Select an item from the Action Queue to view the recommendation and decision comparison.
        </p>
      </div>
    )
  }

  const colors = REC_COLORS[item.recommendation] ?? REC_COLORS["Wait"]

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
      {/* Header */}
      <div className={`${colors.header} border-b border-slate-200 p-5`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`${colors.badge} text-white text-sm font-semibold px-3 py-1 rounded-lg`}>
            {item.recommendation}
          </span>
          <span className="text-xs text-slate-500">Recommended Action</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 leading-tight">{item.itemName}</h3>
        <p className="text-sm text-slate-600 mt-0.5">
          {item.sku} · {item.atRiskDC}
        </p>
      </div>

      {/* Summary */}
      <div className="p-5 border-b border-slate-200 bg-slate-50">
        <p className="text-slate-700 text-sm leading-relaxed">{summaryFor(item)}</p>
      </div>

      {/* Decision Comparison */}
      <div className="p-5 border-b border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-3 text-sm">Decision Comparison</h4>
        <div className="grid grid-cols-2 gap-3">
          <TransferCard details={item.transferDetails} />
          <InboundCard details={item.inboundDetails} />
        </div>
      </div>

      {/* Why This Recommendation */}
      <div className="p-5 border-b border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-3 text-sm">Why This Recommendation</h4>
        <ul className="space-y-2">
          {item.reasoning.map((reason, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-sm text-slate-700">{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Evidence & Timeline */}
      <div className="p-5 border-b border-slate-200 bg-slate-50">
        <h4 className="font-semibold text-slate-900 mb-3 text-sm">Evidence & Timeline</h4>
        <PoTimeline item={item} />
      </div>

      {/* Action Buttons */}
      <div className="p-5 bg-slate-50">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={stub("Approve Transfer", item.id)}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Approve Transfer
          </button>
          <button
            onClick={stub("Wait and Monitor", item.id)}
            className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            Wait and Monitor
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={stub("Escalate", item.id)}
            className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Escalate
          </button>
          <button
            onClick={stub("Assign Owner", item.id)}
            className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Assign Owner
          </button>
        </div>
      </div>
    </div>
  )
}
