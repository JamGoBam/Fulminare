"use client"

import { Suspense, useMemo, useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, TrendingDown, Package, Clock, Search, X } from "lucide-react"
import { InventoryMatrix } from "@/components/InventoryMatrix"
import { getInventoryImbalance } from "@/lib/api"

function InventoryContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [localSearch, setLocalSearch] = useState(params.get("q") ?? "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function handleSearchChange(value: string) {
    setLocalSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (value) next.set("q", value)
      else next.delete("q")
      router.push(`/inventory?${next.toString()}`, { scroll: false })
    }, 200)
  }

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
      hoverBorder: "hover:border-red-300",
      filter: "status=Critical",
    },
    {
      label: "Severe Imbalances",
      value: stats ? String(stats.severeImbalances) : "—",
      valueColor: "text-amber-600",
      Icon: TrendingDown,
      iconColor: "text-amber-600",
      hoverBorder: "hover:border-amber-300",
      filter: "imbalance=severe",
    },
    {
      label: "Overstocked",
      value: stats ? String(stats.overstocked) : "—",
      valueColor: "text-blue-600",
      Icon: Package,
      iconColor: "text-blue-600",
      hoverBorder: "hover:border-blue-300",
      filter: "imbalance=overstock",
    },
    {
      label: "Watch SKUs",
      value: stats ? String(stats.watchSkus) : "—",
      valueColor: "text-slate-900",
      Icon: Clock,
      iconColor: "text-slate-600",
      hoverBorder: "hover:border-slate-300",
      filter: "status=Watch",
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Inventory Overview</h1>
        <p className="text-slate-600">SKU-level inventory health across all distribution centers</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map(({ label, value, valueColor, Icon, iconColor, hoverBorder, filter }) => (
          <button
            key={label}
            onClick={() => router.push(`/inventory?${filter}`)}
            className={`bg-white rounded-xl p-5 border border-slate-200 shadow-sm ${hoverBorder} hover:shadow-md transition-all text-left group cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-sm mb-1">{label}</div>
                <div className={`text-3xl font-semibold ${valueColor}`}>{value}</div>
              </div>
              <Icon className={`w-8 h-8 ${iconColor} group-hover:scale-110 transition-transform`} />
            </div>
            <div className="mt-2 text-xs text-slate-400 group-hover:text-blue-500 transition-colors">
              Filter by {label.toLowerCase()} →
            </div>
          </button>
        ))}
      </div>

      {/* Search bar — matches dashboard FilterBar style */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by SKU or product name…"
            className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {localSearch && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
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
