"use client"

import { useState } from "react"
import { Search, AlertTriangle, FileWarning, Truck, CheckSquare } from "lucide-react"

const QUICK_FILTERS = [
  {
    id: "high-risk",
    label: "High Risk Only",
    icon: AlertTriangle,
    active: "bg-red-50 border-red-400 text-red-700",
    idle: "bg-white border-red-300 text-red-700 hover:bg-red-50",
  },
  {
    id: "fda-holds",
    label: "FDA Holds",
    icon: FileWarning,
    active: "bg-amber-50 border-amber-400 text-amber-700",
    idle: "bg-white border-amber-300 text-amber-700 hover:bg-amber-50",
  },
  {
    id: "split-ship",
    label: "Split Ship Risk",
    icon: Truck,
    active: "bg-purple-50 border-purple-400 text-purple-700",
    idle: "bg-white border-purple-300 text-purple-700 hover:bg-purple-50",
  },
  {
    id: "needs-approval",
    label: "Needs Approval",
    icon: CheckSquare,
    active: "bg-blue-50 border-blue-400 text-blue-700",
    idle: "bg-white border-blue-300 text-blue-700 hover:bg-blue-50",
  },
]

const DROPDOWNS = [
  { label: "All DCs", options: ["DC West", "DC Central", "DC East"] },
  { label: "All Risk Levels", options: ["High Risk", "Medium Risk", "Low Risk"] },
  { label: "All Recommendations", options: ["Transfer Now", "Wait", "Escalate"] },
  { label: "All Channels", options: ["Costco", "Whole Foods", "Sprouts", "Amazon", "Independent Retailers"] },
  { label: "Sort: Urgency", options: ["Sort: Penalty Exposure", "Sort: Confidence", "Sort: DC Name"] },
]

export function FilterBar() {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU, item name, or DC..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {DROPDOWNS.map(({ label, options }) => (
            <select
              key={label}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option>{label}</option>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <div className="p-3 bg-slate-50 flex items-center gap-2 flex-wrap rounded-b-xl">
        <span className="text-xs text-slate-500 mr-1">Quick Filters:</span>
        {QUICK_FILTERS.map(({ id, label, icon: Icon, active, idle }) => (
          <button
            key={id}
            onClick={() => toggle(id)}
            className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeFilters.has(id) ? active : idle
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
