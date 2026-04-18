"use client"

import { useMemo, useState, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Clock, TrendingUp, CheckCircle } from "lucide-react"
import { getInventoryImbalance, getActionItems } from "@/lib/api"
import type { ImbalanceRow } from "@/lib/api"
import type { ActionItem } from "@/lib/types"
import { MetricTooltip } from "@/components/MetricTooltip"

const DC_LABELS: Record<string, string> = {
  DC_EAST: "DC East",
  DC_WEST: "DC West",
  DC_CENTRAL: "DC Central",
}

const STATUS_META = {
  Critical: { chip: "bg-red-100 text-red-700 border border-red-200",     Icon: AlertTriangle },
  Watch:    { chip: "bg-amber-100 text-amber-700 border border-amber-200", Icon: Clock        },
  Healthy:  { chip: "bg-green-100 text-green-700 border border-green-200", Icon: CheckCircle  },
  Overstock:{ chip: "bg-blue-100 text-blue-700 border border-blue-200",    Icon: TrendingUp   },
} as const

const REC_COLORS: Record<string, string> = {
  "Transfer Now": "bg-blue-600 text-white",
  Wait: "bg-slate-600 text-white",
  Escalate: "bg-purple-600 text-white",
}

const ALL_STATUSES = ["Critical", "Watch", "Healthy", "Overstock"] as const
type StatusLabel = (typeof ALL_STATUSES)[number]

const PAGE_SIZE = 25

function mapStatus(row: ImbalanceRow): StatusLabel {
  if (row.status === "critical") return "Critical"
  if (row.status === "warning") return "Watch"
  if (row.dos !== null && row.dos > 180) return "Overstock"
  return "Healthy"
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}

export function InventoryMatrix() {
  const router = useRouter()
  const params = useSearchParams()

  // Read filter state from URL
  const statusParam = params.get("status")
  const statusFilter: string[] = statusParam ? statusParam.split(",") : ["Critical", "Watch"]
  const dcFilter = params.get("dc") ?? "all"
  const search = params.get("q") ?? ""
  const page = Math.max(1, Number(params.get("page") ?? 1))

  // Local search state so input stays responsive while URL debounces
  const [localSearch, setLocalSearch] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const { data: imbalance, isLoading, isError } = useQuery({
    queryKey: ["inventory-imbalance"],
    queryFn: () => getInventoryImbalance(1000),
    refetchInterval: 60_000,
  })

  const { data: actionItems } = useQuery({
    queryKey: ["action-items"],
    queryFn: getActionItems,
  })

  // Build lookup: "SKU::DC East" → ActionItem
  const actionMap = useMemo(() => {
    const map = new Map<string, ActionItem>()
    actionItems?.forEach((a) => map.set(`${a.sku}::${a.atRiskDC}`, a))
    return map
  }, [actionItems])

  function pushParams(updates: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    if (resetPage && !("page" in updates)) next.set("page", "1")
    router.push(`/inventory?${next.toString()}`, { scroll: false })
  }

  function toggleStatus(s: string) {
    const current = new Set(statusFilter)
    if (current.has(s)) current.delete(s)
    else current.add(s)
    pushParams({ status: current.size > 0 ? [...current].join(",") : null })
  }

  function handleSearchChange(value: string) {
    setLocalSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushParams({ q: value || null })
    }, 200)
  }

  const statusStr = [...statusFilter].sort().join(",")

  const filtered = useMemo(() => {
    return (imbalance ?? [])
      .filter((row) => {
        if (!statusFilter.includes(mapStatus(row))) return false
        if (dcFilter !== "all" && row.dc !== dcFilter) return false
        if (localSearch) {
          const q = localSearch.toLowerCase()
          if (!row.sku.toLowerCase().includes(q) && !row.product_name.toLowerCase().includes(q))
            return false
        }
        return true
      })
      .sort((a, b) => {
        const order = { critical: 0, warning: 1, ok: 2 }
        const diff = (order[a.status] ?? 2) - (order[b.status] ?? 2)
        if (diff !== 0) return diff
        return (a.dos ?? 9999) - (b.dos ?? 9999)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imbalance, statusStr, dcFilter, localSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const isDefaultFilters =
    statusFilter.slice().sort().join(",") === "Critical,Watch" && dcFilter === "all" && !localSearch

  return (
    <div className="flex gap-6">
      {/* Left filter rail */}
      <div className="w-64 shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-24 space-y-5">
          {/* Search */}
          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Search</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                placeholder="SKU or product name…"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>

          {/* Status checkboxes */}
          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Status</p>
            <div className="space-y-2">
              {ALL_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={statusFilter.includes(s)}
                    onChange={() => toggleStatus(s)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${STATUS_META[s].chip}`}>
                    {(() => { const I = STATUS_META[s].Icon; return <I className="w-3 h-3 shrink-0" /> })()}
                    {s}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* DC selector */}
          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Distribution Center
            </p>
            <select
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              value={dcFilter}
              onChange={(e) =>
                pushParams({ dc: e.target.value === "all" ? null : e.target.value })
              }
            >
              <option value="all">All DCs</option>
              <option value="DC_EAST">DC East</option>
              <option value="DC_WEST">DC West</option>
              <option value="DC_CENTRAL">DC Central</option>
            </select>
          </div>

          {/* Clear filters */}
          {!isDefaultFilters && (
            <button
              onClick={() => {
                setLocalSearch("")
                router.push("/inventory", { scroll: false })
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header row */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">
              {filtered.length} SKU-DC rows
              <span className="ml-2 text-xs font-normal text-slate-500">sorted by urgency</span>
            </span>
          </div>

          {isLoading && <TableSkeleton />}

          {isError && (
            <div className="p-10 text-sm text-center text-slate-500">
              We can&apos;t reach the data service right now. Try again in a moment.
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="p-10 text-sm text-center text-slate-500">
              No SKUs match these filters. Try removing a Status filter.
            </div>
          )}

          {!isLoading && !isError && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 w-24">
                      SKU
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">
                      Item Name
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 w-24">
                      DC
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 w-24">
                      Status
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 w-28">
                      <MetricTooltip metric="dos">Days of cover</MetricTooltip>
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 w-28">
                      At-risk $
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 w-36">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pageRows.map((row, i) => {
                    const statusLabel = mapStatus(row)
                    const dcLabel = DC_LABELS[row.dc] ?? row.dc
                    const actionItem = actionMap.get(`${row.sku}::${dcLabel}`)

                    return (
                      <tr
                        key={`${row.sku}-${row.dc}-${i}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-slate-800">
                            {row.sku}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-0">
                          <p className="text-sm text-slate-700 truncate">{row.product_name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-600">{dcLabel}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${STATUS_META[statusLabel].chip}`}
                          >
                            {(() => { const I = STATUS_META[statusLabel].Icon; return <I className="w-3 h-3 shrink-0" /> })()}
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {row.dos !== null ? (
                            <span
                              className={`text-sm font-medium ${
                                row.dos < 14
                                  ? "text-red-600"
                                  : row.dos < 30
                                  ? "text-amber-600"
                                  : "text-slate-700"
                              }`}
                            >
                              {row.dos.toFixed(1)}d
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {actionItem ? (
                            <span className="text-sm font-semibold text-red-600">
                              {fmt(actionItem.potentialPenalty)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {actionItem ? (
                            <button
                              onClick={() => router.push(`/?selected=${actionItem.id}`)}
                              className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                                REC_COLORS[actionItem.recommendation] ?? "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {actionItem.recommendation}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>
                Page {safePage} of {totalPages} · {filtered.length} rows
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => pushParams({ page: String(safePage - 1) }, false)}
                  disabled={safePage <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  onClick={() => pushParams({ page: String(safePage + 1) }, false)}
                  disabled={safePage >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
