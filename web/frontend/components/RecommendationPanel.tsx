"use client"

import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react"
import { getActionItems } from "@/lib/api"
import type { ActionItem } from "@/lib/types"
import { TransferComparisonCard, InboundComparisonCard } from "@/components/ActionComparisonCard"
import { PoTimeline } from "@/components/PoTimeline"
import type { TimelineEvent } from "@/components/PoTimeline"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

function summaryText(item: ActionItem): string {
  if (item.recommendation === "Transfer Now") {
    return `Execute immediate transfer to prevent ${Math.round(item.daysUntilStockout)}-day stockout and avoid ${fmt(item.potentialPenalty)} in penalties.`
  }
  if (item.recommendation === "Wait") {
    return "Monitor inbound shipment. Current trajectory shows arrival before stockout with minimal risk exposure."
  }
  return "Critical situation requiring executive decision. No standard transfer options available."
}

function RecBadge({ rec }: { rec: ActionItem["recommendation"] }) {
  if (rec === "Transfer Now") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded shrink-0">
        <TrendingUp className="w-3 h-3" />
        Transfer Now
      </span>
    )
  }
  if (rec === "Wait") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-600 text-white px-2 py-0.5 rounded shrink-0">
        <CheckCircle2 className="w-3 h-3" />
        Wait
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-600 text-white px-2 py-0.5 rounded shrink-0">
      <AlertTriangle className="w-3 h-3" />
      Escalate
    </span>
  )
}

function buildTimeline(item: ActionItem): TimelineEvent[] {
  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const events: TimelineEvent[] = [{ label: "Today", date: todayLabel, type: "today" }]

  if (
    item.recommendation !== "Escalate" &&
    item.transferDetails.estimatedArrival &&
    item.transferDetails.estimatedArrival !== "N/A"
  ) {
    events.push({
      label: "Transfer ETA",
      date: item.transferDetails.estimatedArrival,
      type: "future",
    })
  }

  if (item.inboundDetails.poEta && item.inboundDetails.poEta !== "N/A") {
    events.push({
      label: "PO arrives",
      date: item.inboundDetails.poEta,
      type: item.inboundDetails.delayRisk === "High" ? "delayed" : "future",
    })
  }

  return events
}

export function RecommendationPanel() {
  const params = useSearchParams()
  const selectedId = params.get("selected")

  const { data } = useQuery<ActionItem[]>({
    queryKey: ["action-items"],
    queryFn: getActionItems,
  })

  const item = selectedId ? data?.find((a) => a.id === selectedId) : undefined

  if (!item) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-64 flex flex-col">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Recommendation Panel</h2>
        <div className="flex-1 flex items-center justify-center py-12">
          <p className="text-slate-400 text-sm text-center">
            Select an item from the Action Queue to see the transfer‑vs‑wait comparison.
          </p>
        </div>
      </div>
    )
  }

  const timeline = buildTimeline(item)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 leading-snug truncate">
              {item.itemName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="font-mono text-xs text-slate-500">{item.sku}</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">{item.atRiskDC}</span>
            </div>
          </div>
          <RecBadge rec={item.recommendation} />
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
        {/* Summary sentence */}
        <p className="text-sm text-slate-700 font-medium leading-relaxed">
          {summaryText(item)}
        </p>

        {/* Comparison cards */}
        <div className="space-y-3">
          <TransferComparisonCard details={item.transferDetails} />
          <InboundComparisonCard details={item.inboundDetails} />
        </div>

        {/* Why this recommendation */}
        {item.reasoning.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Why This Recommendation</h3>
            <ul className="space-y-1.5">
              {item.reasoning.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidence & Timeline */}
        {timeline.length > 1 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Evidence &amp; Timeline</h3>
            <PoTimeline arrivals={timeline} />
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
          <button
            onClick={() => console.log("Marked for WMS review:", item.id)}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
          >
            Approve Transfer
          </button>
          <button
            onClick={() => console.log("Marked for WMS review:", item.id)}
            className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors"
          >
            Wait &amp; Monitor
          </button>
          <button
            onClick={() => console.log("Marked for WMS review:", item.id)}
            className="text-xs font-semibold bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg transition-colors"
          >
            Escalate
          </button>
          <button
            onClick={() => console.log("Marked for WMS review:", item.id)}
            className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors"
          >
            Assign Owner
          </button>
        </div>
      </div>
    </div>
  )
}
