"use client"

import { useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronLeft, ChevronRight,
  AlertTriangle, Clock, TrendingUp, Package, ArrowRight, CheckCircle,
} from "lucide-react"
import { getInventoryImbalance, getActionItems } from "@/lib/api"
import type { ImbalanceRow } from "@/lib/api"
import type { ActionItem } from "@/lib/types"

interface SkuGroup {
  sku: string
  product_name: string
  dcWest: ImbalanceRow | null
  dcCentral: ImbalanceRow | null
  dcEast: ImbalanceRow | null
  imbalance_score: number
  worstStatus: "critical" | "warning" | "ok"
  hasOverstock: boolean
}

function groupBySku(rows: ImbalanceRow[]): SkuGroup[] {
  const map = new Map<string, SkuGroup>()
  for (const row of rows) {
    if (!map.has(row.sku)) {
      map.set(row.sku, {
        sku: row.sku, product_name: row.product_name,
        dcWest: null, dcCentral: null, dcEast: null,
        imbalance_score: 0, worstStatus: "ok",
        hasOverstock: false,
      })
    }
    const g = map.get(row.sku)!
    if (row.dc === "DC_WEST") g.dcWest = row
    else if (row.dc === "DC_CENTRAL") g.dcCentral = row
    else if (row.dc === "DC_EAST") g.dcEast = row
    g.imbalance_score = Math.max(g.imbalance_score, row.imbalance_score)
    if (row.status === "critical") g.worstStatus = "critical"
    else if (row.status === "warning" && g.worstStatus !== "critical") g.worstStatus = "warning"
    if (row.dos !== null && row.dos > 180) g.hasOverstock = true
  }
  return Array.from(map.values())
}

function cellType(row: ImbalanceRow | null): "critical" | "warning" | "overstock" | "healthy" | "empty" {
  if (!row) return "empty"
  if (row.status === "critical") return "critical"
  if (row.status === "warning") return "warning"
  if (row.dos !== null && row.dos > 180) return "overstock"
  if (row.on_hand === 0) return "empty"
  return "healthy"
}

const CELL_STYLE: Record<string, string> = {
  critical:  "bg-red-100 text-red-700 border-red-200",
  warning:   "bg-amber-100 text-amber-700 border-amber-200",
  overstock: "bg-blue-100 text-blue-700 border-blue-200",
  healthy:   "bg-green-100 text-green-700 border-green-200",
  empty:     "bg-slate-50 text-slate-400 border-slate-200",
}

function imbalanceMeta(score: number) {
  if (score >= 1.5) return { label: "Severe Imbalance", color: "text-red-600",   bg: "bg-red-50",   Icon: AlertTriangle }
  if (score >= 0.5) return { label: "Moderate",         color: "text-amber-600", bg: "bg-amber-50", Icon: TrendingUp    }
  return               { label: "Balanced",           color: "text-green-600", bg: "bg-green-50", Icon: Package      }
}

function DcCell({ row }: { row: ImbalanceRow | null }) {
  const type = cellType(row)
  const style = CELL_STYLE[type]
  if (!row || type === "empty") {
    return (
      <div className={`inline-flex flex-col items-center px-3 py-2 rounded-lg border ${style} text-xs min-w-[72px]`}>
        <span className="text-base font-semibold">—</span>
      </div>
    )
  }
  return (
    <div className={`inline-flex flex-col items-center px-3 py-2 rounded-lg border ${style} min-w-[72px]`}>
      <span className="text-lg font-semibold leading-none">
        {row.dos !== null ? Math.round(row.dos) : "∞"}
      </span>
      <span className="text-xs mt-0.5">days</span>
      <span className="text-xs mt-1">{row.on_hand.toLocaleString()} units</span>
    </div>
  )
}

type StatusFilter = "Critical" | "Watch" | "Balanced"

const ALL_STATUSES: StatusFilter[] = ["Critical", "Watch", "Balanced"]
const STATUS_CHIP: Record<StatusFilter, string> = {
  Critical: "bg-red-100 text-red-700 border border-red-200",
  Watch:    "bg-amber-100 text-amber-700 border border-amber-200",
  Balanced: "bg-green-100 text-green-700 border border-green-200",
}
const STATUS_ICON: Record<StatusFilter, React.ComponentType<{ className?: string }>> = {
  Critical: AlertTriangle,
  Watch:    Clock,
  Balanced: CheckCircle,
}

const PAGE_SIZE = 20

export function InventoryMatrix() {
  const router = useRouter()
  const params = useSearchParams()

  const statusParam    = params.get("status")
  const statusFilter: string[] = statusParam ? statusParam.split(",") : ["Critical", "Watch", "Balanced"]
  const dcFilter       = params.get("dc") ?? "all"
  const imbalanceFilter = params.get("imbalance") ?? "all"
  const search         = params.get("q") ?? ""
  const page           = Math.max(1, Number(params.get("page") ?? 1))

  const { data: imbalance, isLoading, isError } = useQuery({
    queryKey: ["inventory-imbalance"],
    queryFn: () => getInventoryImbalance(1000),
    refetchInterval: 60_000,
  })

  const { data: actionItems } = useQuery({
    queryKey: ["action-items"],
    queryFn: getActionItems,
  })

  const actionBySku = useMemo(() => {
    const map = new Map<string, ActionItem>()
    actionItems?.forEach((a) => { if (!map.has(a.sku)) map.set(a.sku, a) })
    return map
  }, [actionItems])

  const skuGroups = useMemo(() => groupBySku(imbalance ?? []), [imbalance])

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

  function groupStatusLabel(g: SkuGroup): StatusFilter {
    if (g.worstStatus === "critical") return "Critical"
    if (g.worstStatus === "warning")  return "Watch"
    return "Balanced"
  }

  const statusStr = [...statusFilter].sort().join(",")

  const filtered = useMemo(() => {
    return skuGroups
      .filter((g) => {
        if (!statusFilter.includes(groupStatusLabel(g))) return false
        if (dcFilter !== "all") {
          const dcRow = dcFilter === "DC_WEST" ? g.dcWest : dcFilter === "DC_CENTRAL" ? g.dcCentral : g.dcEast
          if (!dcRow || dcRow.status === "ok") return false
        }
        if (search) {
          const q = search.toLowerCase()
          if (!g.sku.toLowerCase().includes(q) && !g.product_name.toLowerCase().includes(q)) return false
        }
        if (imbalanceFilter === "severe"     && g.imbalance_score < 1.5) return false
        if (imbalanceFilter === "moderate"   && (g.imbalance_score < 0.5 || g.imbalance_score >= 1.5)) return false
        if (imbalanceFilter === "balanced"   && g.imbalance_score >= 0.5) return false
        if (imbalanceFilter === "overstock"  && !g.hasOverstock) return false
        return true
      })
      .sort((a, b) => {
        const ord: Record<string, number> = { critical: 0, warning: 1, ok: 2 }
        return (ord[a.worstStatus] ?? 2) - (ord[b.worstStatus] ?? 2)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuGroups, statusStr, dcFilter, search, imbalanceFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const isDefault = statusStr === "Balanced,Critical,Watch" && dcFilter === "all" && !search && imbalanceFilter === "all"

  return (
    <div className="flex gap-6">
      {/* Filter rail */}
      <div className="w-52 shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-24 space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Status</p>
            <div className="space-y-2">
              {ALL_STATUSES.map((s) => {
                const Icon = STATUS_ICON[s]
                return (
                  <label key={s} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(s)}
                      onChange={() => toggleStatus(s)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${STATUS_CHIP[s]}`}>
                      <Icon className="w-3 h-3 shrink-0" />
                      {s}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Distribution Center
            </p>
            <select
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              value={dcFilter}
              onChange={(e) => pushParams({ dc: e.target.value === "all" ? null : e.target.value })}
            >
              <option value="all">All DCs</option>
              <option value="DC_EAST">DC East</option>
              <option value="DC_WEST">DC West</option>
              <option value="DC_CENTRAL">DC Central</option>
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Imbalance
            </p>
            <select
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              value={imbalanceFilter}
              onChange={(e) => pushParams({ imbalance: e.target.value === "all" ? null : e.target.value })}
            >
              <option value="all">All Imbalances</option>
              <option value="severe">Severe Imbalance</option>
              <option value="moderate">Moderate</option>
              <option value="balanced">Balanced</option>
              <option value="overstock">Overstocked</option>
            </select>
          </div>

          {!isDefault && (
            <button
              onClick={() => router.push("/inventory", { scroll: false })}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Matrix table */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Inventory Matrix</h2>
            <p className="text-sm text-slate-500 mt-0.5">Days of supply and on-hand units by DC</p>
          </div>

          {isLoading && (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          {isError && (
            <div className="p-10 text-sm text-center text-slate-500">
              Can&apos;t reach data service. Try again in a moment.
            </div>
          )}

          {!isLoading && !isError && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">DC West</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">DC Central</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">DC East</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Imbalance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inbound PO</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-sm text-center text-slate-500">
                        No SKUs match these filters. Try removing a status filter.
                      </td>
                    </tr>
                  ) : pageRows.map((g) => {
                    const imb = imbalanceMeta(g.imbalance_score)
                    const ImbIcon = imb.Icon
                    const actionItem = actionBySku.get(g.sku)
                    const inboundPO = actionItem?.inboundDetails?.poEta ?? null
                    const isCritical = g.worstStatus === "critical"

                    return (
                      <tr key={g.sku} className={isCritical ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50"}>
                        <td className={`px-6 py-4 whitespace-nowrap ${isCritical ? "border-l-4 border-l-red-500" : "border-l-4 border-l-transparent"}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-slate-900">{g.sku}</span>
                            {isCritical && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded leading-none">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Urgent
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900 max-w-[180px] truncate">
                            {g.product_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <DcCell row={g.dcWest} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <DcCell row={g.dcCentral} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <DcCell row={g.dcEast} />
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center justify-center gap-1.5 ${imb.bg} px-3 py-2 rounded-lg`}>
                            <ImbIcon className={`w-4 h-4 ${imb.color} shrink-0`} />
                            <span className={`text-xs font-medium ${imb.color} whitespace-nowrap`}>
                              {imb.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                          {inboundPO ?? "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {actionItem ? (
                            <button
                              onClick={() => router.push(`/?selected=${actionItem.id}`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Review
                              <ArrowRight className="w-3 h-3" />
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

          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Page {safePage} of {totalPages} · {filtered.length} SKUs</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => pushParams({ page: String(safePage - 1) }, false)}
                  disabled={safePage <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  onClick={() => pushParams({ page: String(safePage + 1) }, false)}
                  disabled={safePage >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
