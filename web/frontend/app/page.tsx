"use client"

import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, DollarSign, Clock, Package } from "lucide-react"
import { KpiCard } from "@/components/KpiCard"
import { FilterBar } from "@/components/FilterBar"
import { ActionQueue } from "@/components/ActionQueue"
import { getSummary, getAlerts } from "@/lib/api"

function fmtDollars(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

function DashboardContent() {
  const { data: summary } = useQuery({
    queryKey: ["summary"],
    queryFn: getSummary,
  })

  const { data: alerts } = useQuery({
    queryKey: ["alerts", 20],
    queryFn: () => getAlerts(20),
  })

  const urgentCount = alerts?.filter((a) => (a.days_to_stockout ?? Infinity) <= 14).length
  const highRiskCount = alerts?.filter((a) => (a.days_to_stockout ?? Infinity) <= 7).length ?? 0

  const kpis = [
    {
      label: "Urgent Actions",
      value: urgentCount != null ? String(urgentCount) : "—",
      subtext: `${highRiskCount} high risk`,
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      label: "Total Chargeback Risk",
      value: summary ? fmtDollars(summary.manual_annual_penalty) : "—",
      subtext: "Annual exposure",
      icon: DollarSign,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Delayed Inbounds",
      value: "—",
      subtext: "Wired in P3 (enriched data)",
      icon: Clock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Overstocked DCs",
      value: "—",
      subtext: "Wired in P3 (enriched data)",
      icon: Package,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Operations Dashboard</h1>
        <p className="text-slate-600">
          Manage inventory imbalances across 3 DCs · Prevent chargebacks and maintain OTIF performance
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <FilterBar />

      <div className="grid grid-cols-3 gap-6">
        {/* Action Queue — left 2/3 */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Action Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ranked by urgency — click a row to see the recommendation
              </p>
            </div>
            <ActionQueue />
          </div>
        </div>

        {/* Recommendation Panel placeholder — right 1/3 (wired in F4) */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-64">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Recommendation Panel</h2>
            <p className="text-slate-500 text-sm">
              Select an item from the Action Queue to see the transfer-vs-wait comparison.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  )
}
