"use client"

import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { Package, AlertTriangle, Clock, CheckCircle } from "lucide-react"
import { KpiCard } from "@/components/KpiCard"
import { InventoryMatrix } from "@/components/InventoryMatrix"
import { getInventorySummary } from "@/lib/api"

function InventoryContent() {
  const { data: summary } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: getInventorySummary,
  })

  const kpis = [
    {
      label: "Total SKUs",
      value: summary != null ? String(summary.total) : "—",
      subtext: "across all DCs",
      icon: Package,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
    },
    {
      label: "Critical",
      value: summary != null ? String(summary.critical) : "—",
      subtext: "below 14 days cover",
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      label: "Watch",
      value: summary != null ? String(summary.watch) : "—",
      subtext: "below 30 days cover",
      icon: Clock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Balanced",
      value: summary != null ? String(summary.healthy + summary.overstock) : "—",
      subtext: "no action needed",
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Inventory</h1>
        <p className="text-slate-600">
          Browse and filter all SKUs across DC West, DC Central, and DC East.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <InventoryMatrix />
    </div>
  )
}

export default function InventoryPage() {
  return (
    <Suspense>
      <InventoryContent />
    </Suspense>
  )
}
