"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, Clock, CheckCircle, DollarSign, Package } from "lucide-react"
import { getActionItems } from "@/lib/api"
import type { ActionItem } from "@/lib/types"
import { useActionStatus, type ActionStatus } from "@/lib/action-status-context"
import { dcLabel, DC_LABELS } from "@/lib/dc-labels"

export function openChatbot(message: string) {
  window.dispatchEvent(new CustomEvent("chat:prefill", { detail: { message } }))
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

function urgencyIcon(days: number) {
  if (days <= 1) return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
  if (days <= 3) return <Clock className="w-4 h-4 text-amber-500 shrink-0" />
  return <CheckCircle className="w-4 h-4 text-slate-400 shrink-0" />
}

function accentBorder(days: number) {
  if (days <= 1) return "border-l-red-500"
  if (days <= 3) return "border-l-amber-500"
  if (days <= 7) return "border-l-yellow-400"
  return "border-l-slate-200"
}

function RecBadge({ rec }: { rec: string }) {
  const styles: Record<string, string> = {
    "Transfer Now": "bg-blue-600 text-white",
    "Wait": "bg-slate-600 text-white",
    "Escalate": "bg-purple-600 text-white",
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${styles[rec] ?? "bg-slate-200 text-slate-700"}`}>
      {rec}
    </span>
  )
}

const STATUS_CHIP: Record<ActionStatus, { label: string; cls: string }> = {
  approved:  { label: "✓ Approved",   cls: "bg-green-100 text-green-700" },
  waiting:   { label: "⏳ Monitoring", cls: "bg-slate-100 text-slate-600" },
  escalated: { label: "↑ Escalated",  cls: "bg-purple-100 text-purple-700" },
  assigned:  { label: "→ Assigned",   cls: "bg-blue-100 text-blue-700" },
}

function Skeleton() {
  return (
    <div className="space-y-2 p-4">
      {["a", "b", "c"].map((k) => (
        <div key={k} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Package className="w-10 h-10 text-slate-300 mb-3" />
      <p className="text-sm font-semibold text-slate-700 mb-1">No items match</p>
      <p className="text-xs text-slate-500">Try clearing filters or adjusting your search.</p>
    </div>
  )
}

const PILL_FILTER: Record<string, (item: ActionItem) => boolean> = {
  "high-risk":      (item) => item.riskLevel === "High",
  "fda-holds":      (item) => item.riskLevel === "High",
  "split-ship":     (item) => item.recommendation === "Transfer Now",
  "needs-approval": (item) => item.recommendation === "Escalate",
}

export function ActionQueue() {
  const router = useRouter()
  const params = useSearchParams()
  const { statuses } = useActionStatus()

  const selectedId = params.get("selected")
  const q          = (params.get("q")       ?? "").toLowerCase().trim()
  const activeDc   = (params.get("dc")      ?? "").toLowerCase()
  const activeStatus = new Set((params.get("status") ?? "").split(",").filter(Boolean))
  const riskFilter = params.get("risk")    ?? ""
  const recFilter  = params.get("rec")     ?? ""
  const sortBy     = params.get("sort")    ?? ""

  const { data, isLoading, isError } = useQuery<ActionItem[]>({
    queryKey: ["action-items"],
    queryFn: getActionItems,
    refetchInterval: 30_000,
  })

  if (isLoading) return <Skeleton />

  if (isError) {
    return (
      <div className="p-6 text-sm text-slate-500">
        We couldn&apos;t load today&apos;s data — try again in a moment.
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-sm text-slate-500">
        All SKUs balanced — no action needed ✓
      </div>
    )
  }

  // Apply filters
  let filtered = data

  if (q) {
    filtered = filtered.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q)
    )
  }

  if (activeDc) {
    filtered = filtered.filter(
      (item) => dcLabel(item.atRiskDC).toLowerCase() === activeDc
    )
  }

  if (activeStatus.size > 0) {
    filtered = filtered.filter((item) =>
      [...activeStatus].some((pid) => PILL_FILTER[pid]?.(item) ?? false)
    )
  }

  if (riskFilter) {
    filtered = filtered.filter((item) => item.riskLevel === riskFilter)
  }

  if (recFilter) {
    filtered = filtered.filter((item) => item.recommendation === recFilter)
  }

  // Primary sort by user preference
  if (sortBy === "penalty") {
    filtered = [...filtered].sort((a, b) => b.potentialPenalty - a.potentialPenalty)
  } else if (sortBy === "confidence") {
    filtered = [...filtered].sort((a, b) => b.confidence - a.confidence)
  } else if (sortBy === "dc") {
    filtered = [...filtered].sort((a, b) => a.atRiskDC.localeCompare(b.atRiskDC))
  } else {
    filtered = [...filtered].sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
  }

  // Resolved items always sink to the bottom (stable secondary sort)
  filtered = [...filtered].sort((a, b) => {
    const aR = statuses[a.id] ? 1 : 0
    const bR = statuses[b.id] ? 1 : 0
    return aR - bR
  })

  // Top 3 High-risk rows get URGENT badge (based on unfiltered data)
  const urgentIds = new Set(
    data
      .filter((item) => item.riskLevel === "High")
      .slice(0, 3)
      .map((item) => item.id)
  )

  function select(id: string) {
    const next = new URLSearchParams(params.toString())
    next.set("selected", id)
    router.push(`/?${next.toString()}`)
  }

  if (filtered.length === 0) return <EmptyState />

  return (
    <ul className="divide-y divide-slate-100">
      {filtered.map((item) => {
        const isSelected = item.id === selectedId
        const isUrgent = urgentIds.has(item.id)
        const days = item.daysUntilStockout
        const itemStatus = statuses[item.id] as ActionStatus | undefined

        return (
          <li
            key={item.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => select(item.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(item.id) } }}
            className={`flex items-start gap-3 px-4 py-4 cursor-pointer border-l-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
              ${isSelected ? "bg-blue-50 border-l-blue-600" : `${accentBorder(days)} hover:bg-slate-50`}
              ${isUrgent && !isSelected ? "bg-red-50/30" : ""}
              ${itemStatus ? "opacity-60" : ""}
            `}
          >
            <div className="mt-0.5">{urgencyIcon(days)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="font-mono text-xs font-semibold text-slate-800">{item.sku}</span>
                <span className="text-xs text-slate-500">{dcLabel(item.atRiskDC)}</span>
                <RecBadge rec={item.recommendation} />
                {isUrgent && (
                  <span className="bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
                    URGENT
                  </span>
                )}
                {itemStatus && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_CHIP[itemStatus].cls}`}>
                    {STATUS_CHIP[itemStatus].label}
                  </span>
                )}
                {days < 9999 && (
                  <span className={`text-xs font-medium ${days <= 7 ? "text-red-600" : "text-amber-600"}`}>
                    {Math.round(days)}d to stockout
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{item.reason}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-red-600 whitespace-nowrap">
                {fmt(item.potentialPenalty)}
              </span>
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
