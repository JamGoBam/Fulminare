"use client"

import { Bell } from "lucide-react"

export function TopBar() {
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 shrink-0">
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
