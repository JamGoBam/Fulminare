"use client"

import { useEffect, useState } from "react"
import { X, ArrowRight } from "lucide-react"

const STORAGE_KEY = "pop-onboarding-dismissed"

export function OnboardingTour() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl px-5 py-4 flex items-start gap-4">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
          <ArrowRight className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5">Welcome to POP Operations Hub</p>
          <p className="text-xs text-slate-300 leading-relaxed">
            Click any Action Queue row to see a transfer recommendation with side-by-side cost comparison.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss welcome banner"
          className="shrink-0 p-1 hover:bg-slate-700 rounded transition-colors mt-0.5"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  )
}
