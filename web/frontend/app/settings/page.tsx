"use client"

import { useState } from "react"
import { DC_LABELS as DC_LABEL_MAP, DC_CODES } from "@/lib/dc-labels"

const INTEGRATIONS = [
  { name: "WMS (Warehouse Management)", status: "Connected",     badgeClass: "bg-green-100 text-green-700" },
  { name: "ERP (SAP)",                  status: "Connected",     badgeClass: "bg-green-100 text-green-700" },
  { name: "EDI (SPS Commerce)",         status: "Pending setup", badgeClass: "bg-amber-100 text-amber-700" },
]

const DC_LABELS = DC_CODES.map((code) => ({ code, display: DC_LABEL_MAP[code] }))

function Toggle({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${on ? "bg-blue-600" : "bg-slate-200"}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  )
}

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Settings</h1>
        <p className="text-slate-600 text-sm">Configuration and preferences for Prince of Peace Operations Hub.</p>
      </div>

      <div className="space-y-4">
        {/* Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Preferences</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { label: "Email alerts for critical SKUs", defaultOn: true  },
              { label: "Daily digest at 8am",            defaultOn: false },
              { label: "Show dollar values in dashboard", defaultOn: true  },
            ].map(({ label, defaultOn }) => (
              <div key={label} className="flex items-center justify-between px-6 py-3.5">
                <span className="text-sm text-slate-700">{label}</span>
                <Toggle defaultOn={defaultOn} />
              </div>
            ))}
          </div>
        </div>

        {/* DC Labels */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">DC Labels</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {DC_LABELS.map(({ code, display }) => (
              <div key={code} className="flex items-center justify-between px-6 py-3.5">
                <span className="text-xs font-mono text-slate-400">{code}</span>
                <span className="text-sm font-medium text-slate-700">{display}</span>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-slate-50">
            <p className="text-xs text-slate-400">DC label editing not yet supported</p>
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Integrations</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {INTEGRATIONS.map(({ name, status, badgeClass }) => (
              <div key={name} className="flex items-center justify-between px-6 py-3.5">
                <span className="text-sm text-slate-700">{name}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
