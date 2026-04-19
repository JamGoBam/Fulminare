"use client"

import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, TrendingUp, MessageSquare } from "lucide-react"
import { getActionItems } from "@/lib/api"
import type { ActionItem } from "@/lib/types"
import { dcLabel } from "@/lib/dc-labels"
import { TransferComparisonCard, InboundComparisonCard } from "@/components/ActionComparisonCard"
import { PoTimeline } from "@/components/PoTimeline"
import type { TimelineEvent } from "@/components/PoTimeline"
import { useActionStatus } from "@/lib/action-status-context"
import { openChatbot } from "@/components/ActionQueue"

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

const STATUS_LABEL: Record<string, string> = {
  approved:  "✓ Approved",
  waiting:   "⏳ Monitoring",
  escalated: "↑ Escalated",
  assigned:  "→ Assigned",
}

export function RecommendationPanel() {
  const params = useSearchParams()
  const selectedId = params.get("selected")
  const { statuses, setStatus } = useActionStatus()

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
  const currentStatus = statuses[item.id]
  const transferRecommended = item.recommendation === "Transfer Now"
  const waitRecommended = item.recommendation === "Wait"

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
              <span className="text-xs text-slate-500">{dcLabel(item.atRiskDC)}</span>
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
          <TransferComparisonCard
            details={item.transferDetails}
            recommended={transferRecommended}
          />
          <InboundComparisonCard
            details={item.inboundDetails}
            recommended={waitRecommended}
          />
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
            {/* #7 — Explain in chat */}
            <button
              onClick={() =>
                openChatbot(
                  `Explain why ${item.sku} at ${dcLabel(item.atRiskDC)} should ${item.recommendation}. Walk me through the reasoning bullets.`
                )
              }
              className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Explain in chat ↗
            </button>
          </div>
        )}

        {/* Evidence & Timeline */}
        {timeline.length > 1 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Evidence &amp; Timeline</h3>
            <PoTimeline arrivals={timeline} />
          </div>
        )}

        {/* #6 — Action buttons with client state */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {currentStatus && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-xs text-green-700 font-medium">
                {STATUS_LABEL[currentStatus]} — marked for WMS review.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setStatus(item.id, "approved")}
              className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                currentStatus === "approved"
                  ? "bg-green-600 text-white"
                  : transferRecommended
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {currentStatus === "approved" ? "✓ Approved" : "Approve Transfer"}
            </button>
            <button
              onClick={() => setStatus(item.id, "waiting")}
              className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                currentStatus === "waiting"
                  ? "bg-slate-700 text-white"
                  : waitRecommended
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {currentStatus === "waiting" ? "✓ Monitoring" : "Wait & Monitor"}
            </button>
            <button
              onClick={() => setStatus(item.id, "escalated")}
              className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                currentStatus === "escalated"
                  ? "bg-purple-700 text-white"
                  : "bg-purple-100 hover:bg-purple-200 text-purple-700"
              }`}
            >
              {currentStatus === "escalated" ? "✓ Escalated" : "Escalate"}
            </button>
            <button
              onClick={() => setStatus(item.id, "assigned")}
              className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                currentStatus === "assigned"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {currentStatus === "assigned" ? "✓ Assigned" : "Assign Owner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
