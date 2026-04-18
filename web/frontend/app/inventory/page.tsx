"use client"

import { Suspense, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, TrendingDown, Package, Clock } from "lucide-react"
import { InventoryMatrix } from "@/components/InventoryMatrix"
import { getInventoryImbalance } from "@/lib/api"

function InventoryContent() {
  const { data: imbalance } = useQuery({
    queryKey: ["inventory-imbalance"],
    queryFn: () => getInventoryImbalance(1000),
  })

  const stats = useMemo(() => {
    if (!imbalance) return null
    const bysku = new Map<string, { worstStatus: string; maxImbalance: number; hasOverstock: boolean }>()
    for (const row of imbalance) {
      const isOverstock = row.dos !== null && row.dos > 180
      const existing = bysku.get(row.sku)
      if (!existing) {
        bysku.set(row.sku, { worstStatus: row.status, maxImbalance: row.imbalance_score, hasOverstock: isOverstock })
      } else {
        if (row.status === "critical") existing.worstStatus = "critical"
        else if (row.status === "warning" && existing.worstStatus !== "critical") existing.worstStatus = "warning"
        existing.maxImbalance = Math.max(existing.maxImbalance, row.imbalance_score)
        if (isOverstock) existing.hasOverstock = true
      }
    }
    const groups = Array.from(bysku.values())
    return {
      criticalSkus:      groups.filter((g) => g.worstStatus === "critical").length,
      severeImbalances:  groups.filter((g) => g.maxImbalance >= 1.5).length,
      overstocked:       groups.filter((g) => g.hasOverstock).length,
      watchSkus:         groups.filter((g) => g.worstStatus === "warning").length,
    }
  }, [imbalance])

  const kpis = [
    {
      label: "Critical SKUs",
      value: stats ? String(stats.criticalSkus) : "—",
      valueColor: "text-red-600",
      Icon: AlertTriangle,
      iconColor: "text-red-600",
    },
    {
      label: "Severe Imbalances",
      value: stats ? String(stats.severeImbalances) : "—",
      valueColor: "text-amber-600",
      Icon: TrendingDown,
      iconColor: "text-amber-600",
    },
    {
      label: "Overstocked",
      value: stats ? String(stats.overstocked) : "—",
      valueColor: "text-blue-600",
      Icon: Package,
      iconColor: "text-blue-600",
    },
    {
      label: "Watch SKUs",
      value: stats ? String(stats.watchSkus) : "—",
      valueColor: "text-slate-900",
      Icon: Clock,
      iconColor: "text-slate-600",
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Inventory Overview</h1>
        <p className="text-slate-600">SKU-level inventory health across all distribution centers</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map(({ label, value, valueColor, Icon, iconColor }) => (
          <div key={label} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-sm mb-1">{label}</div>
                <div className={`text-3xl font-semibold ${valueColor}`}>{value}</div>
              </div>
              <Icon className={`w-8 h-8 ${iconColor}`} />
            </div>
          </div>
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
