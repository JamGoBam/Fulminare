"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { DollarSign, TrendingDown, AlertTriangle, Zap, Clock } from "lucide-react"
import { KpiCard } from "@/components/KpiCard"
import { ChargebackHeatmap } from "@/components/ChargebackHeatmap"
import { RecommendationPanel } from "@/components/RecommendationPanel"
import { getSummary, getTopCauses, getActionItems } from "@/lib/api"
import type { ActionItem } from "@/lib/types"

const CAUSE_LABELS: Record<string, string> = {
  SHORT_SHIP: "Short shipment",
  LATE_DELIVERY: "Late delivery",
  DAMAGE: "Damaged goods",
  MISSED_WINDOW: "Missed window",
}

function fmtDollars(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}


function recBadgeClass(rec: string) {
  if (rec === "Transfer Now") return "bg-blue-600 text-white"
  if (rec === "Escalate") return "bg-purple-600 text-white"
  return "bg-slate-600 text-white"
}

function CauseBarChart({ data }: { data: { label: string; amount: number }[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1)
  return (
    <div className="space-y-3 py-2">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 truncate pr-2">{d.label}</span>
            <span className="font-semibold text-slate-800 shrink-0">{fmtDollars(d.amount)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all"
              style={{ width: `${(d.amount / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function AnalyticsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const selectedId = params.get("selected")

  const { data: summary } = useQuery({
    queryKey: ["summary"],
    queryFn: getSummary,
  })

  const { data: topCauses } = useQuery({
    queryKey: ["top-causes", 5],
    queryFn: () => getTopCauses(5),
  })

  const { data: actionItems } = useQuery({
    queryKey: ["action-items"],
    queryFn: getActionItems,
  })

  // Top cause name for KPI tile
  const topCauseName =
    topCauses && topCauses.length > 0
      ? (CAUSE_LABELS[topCauses[0].cause_code] ?? topCauses[0].cause_code)
      : null

  // Bar chart data with plain-language labels
  const barData =
    topCauses?.map((c) => ({
      label: CAUSE_LABELS[c.cause_code] ?? c.cause_code,
      amount: c.total_amount,
    })) ?? []

  // Top 5 action items by potential penalty
  const topRisk: ActionItem[] = actionItems
    ? [...actionItems].sort((a, b) => b.potentialPenalty - a.potentialPenalty).slice(0, 5)
    : []

  const kpis = [
    {
      label: "Annual Chargeback Exposure",
      value: summary ? fmtDollars(summary.manual_annual_penalty) : "—",
      subtext: "annualized from history",
      icon: DollarSign,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      label: "System-Avoidable Savings",
      value: summary ? fmtDollars(summary.system_avoidable_annual) : "—",
      subtext: "if all recs are executed",
      icon: TrendingDown,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      label: "Reduction Possible",
      value: summary ? `${summary.pct_reduction.toFixed(1)}%` : "—",
      subtext: "vs. manual process",
      icon: Zap,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Top Cause",
      value: topCauseName ?? "—",
      subtext: topCauses?.[0] ? fmtDollars(topCauses[0].total_amount) + " exposure" : "by $ exposure",
      icon: AlertTriangle,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Analytics</h1>
        <p className="text-slate-600">
          Chargeback trends, penalty exposure by channel and DC, and highest-risk SKUs.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Heatmap + bar chart */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Chargeback heatmap — left 2/3 */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Chargeback Heatmap</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              $ exposure by cause code × DC — darker = higher risk
            </p>
          </div>
          <ChargebackHeatmap />
        </div>

        {/* Top-cause bar chart — right 1/3 */}
        <div className="col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Top Causes</h2>
            <p className="text-xs text-slate-500 mt-0.5">$ exposure by cause</p>
          </div>
          <div className="p-4">
            {barData.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-sm text-slate-400">
                No data — backend offline
              </div>
            ) : (
              <CauseBarChart data={barData} />
            )}
          </div>
        </div>
      </div>

      {/* Top-risk SKUs + inline recommendation panel */}
      <div className={`grid gap-6 ${selectedId ? "grid-cols-[1fr_400px]" : "grid-cols-1"}`}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Top-Risk SKUs</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Highest penalty exposure — click to open recommendation
            </p>
          </div>

          {topRisk.length === 0 ? (
            <div className="p-8 text-sm text-center text-slate-400">
              {actionItems === undefined
                ? "Loading…"
                : "All SKUs balanced — no action needed ✓"}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 w-28">SKU</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Item</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 w-24">DC</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 w-28">
                    <span className="flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      Days left
                    </span>
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 w-28">
                    At-risk $
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 w-36">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topRisk.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/analytics?selected=${item.id}`)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      item.id === selectedId ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-slate-800">{item.sku}</span>
                    </td>
                    <td className="px-4 py-3 max-w-0">
                      <p className="text-sm text-slate-700 truncate">{item.itemName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600">{item.atRiskDC}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.daysUntilStockout < 9999 ? (
                        <span
                          className={`text-sm font-medium ${
                            item.daysUntilStockout <= 7 ? "text-red-600" : "text-amber-600"
                          }`}
                        >
                          {Math.round(item.daysUntilStockout)}d
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="text-sm font-semibold text-red-600">
                        {fmtDollars(item.potentialPenalty)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${recBadgeClass(item.recommendation)}`}
                      >
                        {item.recommendation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedId && (
          <div className="min-w-0">
            <RecommendationPanel />
          </div>
        )}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return <AnalyticsContent />
}
