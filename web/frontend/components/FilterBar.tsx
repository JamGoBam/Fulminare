"use client"

import { useRef, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
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

const DC_OPTIONS = [
  { label: "All DCs",    value: "" },
  { label: "DC West",    value: "DC West" },
  { label: "DC Central", value: "DC Central" },
  { label: "DC East",    value: "DC East" },
]

const SELECT_CLASS =
  "px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

export function FilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeStatus = new Set((params.get("status") ?? "").split(",").filter(Boolean))
  const activeDc      = params.get("dc")      ?? ""
  const activeRisk    = params.get("risk")    ?? ""
  const activeRec     = params.get("rec")     ?? ""
  const activeChannel = params.get("channel") ?? ""
  const activeSort    = params.get("sort")    ?? ""

  const [localQ, setLocalQ] = useState(() => params.get("q") ?? "")

  function pushParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (!v) next.delete(k)
      else next.set(k, v)
    }
    const qs = next.toString()
    router.push(`${pathname}${qs ? `?${qs}` : ""}`)
  }

  function togglePill(id: string) {
    const next = new Set(activeStatus)
    next.has(id) ? next.delete(id) : next.add(id)
    pushParams({ status: [...next].join(",") || null })
  }

  function handleSearchChange(val: string) {
    setLocalQ(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      pushParams({ q: val.trim() || null })
    }, 200)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search — wired to ?q= with 200ms debounce */}
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={localQ}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by SKU, item name, or DC..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* DC — wired to ?dc= */}
          <select
            value={activeDc}
            onChange={(e) => pushParams({ dc: e.target.value || null })}
            className={SELECT_CLASS}
          >
            {DC_OPTIONS.map(({ label, value }) => (
              <option key={label} value={value}>{label}</option>
            ))}
          </select>

          {/* Risk level — wired to ?risk= */}
          <select
            value={activeRisk}
            onChange={(e) => pushParams({ risk: e.target.value || null })}
            className={SELECT_CLASS}
          >
            <option value="">All Risk Levels</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>

          {/* Recommendation — wired to ?rec= */}
          <select
            value={activeRec}
            onChange={(e) => pushParams({ rec: e.target.value || null })}
            className={SELECT_CLASS}
          >
            <option value="">All Recommendations</option>
            <option value="Transfer Now">Transfer Now</option>
            <option value="Wait">Wait</option>
            <option value="Escalate">Escalate</option>
          </select>

          {/* Channel — wired to ?channel= (no ActionItem channel field yet; kept for URL state) */}
          <select
            value={activeChannel}
            onChange={(e) => pushParams({ channel: e.target.value || null })}
            className={SELECT_CLASS}
          >
            <option value="">All Channels</option>
            <option value="Costco">Costco</option>
            <option value="Whole Foods">Whole Foods</option>
            <option value="Sprouts">Sprouts</option>
            <option value="Amazon">Amazon</option>
            <option value="Independent Retailers">Independent Retailers</option>
          </select>

          {/* Sort — wired to ?sort= */}
          <select
            value={activeSort}
            onChange={(e) => pushParams({ sort: e.target.value || null })}
            className={SELECT_CLASS}
          >
            <option value="">Sort: Urgency</option>
            <option value="penalty">Sort: Penalty Exposure</option>
            <option value="confidence">Sort: Confidence</option>
            <option value="dc">Sort: DC Name</option>
          </select>
        </div>
      </div>

      <div className="p-3 bg-slate-50 flex items-center gap-2 flex-wrap rounded-b-xl">
        <span className="text-xs text-slate-500 mr-1">Quick Filters:</span>
        {QUICK_FILTERS.map(({ id, label, icon: Icon, active, idle }) => (
          <button
            key={id}
            onClick={() => togglePill(id)}
            className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeStatus.has(id) ? active : idle
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
