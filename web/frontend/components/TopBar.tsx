"use client"

import { Bell, Search, X } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useRef, useState } from "react"

export function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState("")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  function handleChange(val: string) {
    setQ(val)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (val.trim()) {
        params.set("q", val.trim())
      } else {
        params.delete("q")
      }
      const qs = params.toString()
      router.push(`${pathname}${qs ? `?${qs}` : ""}`)
    }, 200)
  }

  function clearSearch() {
    setQ("")
    if (timer.current) clearTimeout(timer.current)
    const params = new URLSearchParams(window.location.search)
    params.delete("q")
    const qs = params.toString()
    router.push(`${pathname}${qs ? `?${qs}` : ""}`)
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search SKUs, DCs, or PO numbers..."
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {q && (
            <button
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="text-right">
          <div className="text-sm text-slate-900">Today</div>
          <div className="text-xs text-slate-500">{today}</div>
        </div>
      </div>
    </header>
  )
}
