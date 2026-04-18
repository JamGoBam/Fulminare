"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Bell, AlertCircle, Clock, CheckCircle, DollarSign } from "lucide-react"
import { getActionItems } from "@/lib/api"
import type { ActionItem } from "@/lib/types"

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

export function TopBar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery<ActionItem[]>({
    queryKey: ["action-items"],
    queryFn: getActionItems,
    refetchInterval: 30_000,
  })

  const urgentItems = (data ?? [])
    .filter((item) => item.riskLevel === "High")
    .slice(0, 3)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  function handleItemClick(item: ActionItem) {
    setOpen(false)
    router.push(`/?selected=${item.id}`)
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 shrink-0">
      <div className="flex items-center gap-4">
        {/* Bell with live popover */}
        <div ref={wrapperRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Notifications"
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {urgentItems.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {open && (
            <div className="absolute top-full right-0 mt-1 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Urgent Items</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {urgentItems.length > 0
                    ? `${urgentItems.length} item${urgentItems.length > 1 ? "s" : ""} need immediate attention`
                    : "No urgent items right now"}
                </p>
              </div>

              {urgentItems.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No urgent items — all clear ✓</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {urgentItems.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleItemClick(item)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="mt-0.5">{urgencyIcon(item.daysUntilStockout)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.itemName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.sku} · {item.atRiskDC} · {Math.round(item.daysUntilStockout)}d to stockout
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-red-600">{fmt(item.potentialPenalty)}</span>
                          <DollarSign className="w-3 h-3 text-slate-400" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-sm text-slate-900">Today</div>
          <div className="text-xs text-slate-500">{today}</div>
        </div>
      </div>
    </header>
  )
}
