"use client"

import { FileText, ArrowRight, TrendingUp, Download } from "lucide-react"

const QUICK_ACTIONS = [
  {
    icon: FileText,
    title: "Export Chargeback Report",
    subtitle: "CSV · last 90 days",
    button: "Download",
  },
  {
    icon: ArrowRight,
    title: "Transfer Summary",
    subtitle: "Pending transfers this week",
    button: "View",
  },
  {
    icon: TrendingUp,
    title: "OTIF Scorecard",
    subtitle: "On-time in-full by DC",
    button: "View",
  },
]

const AVAILABLE_REPORTS = [
  { name: "Chargeback Detail",      freq: "Weekly",  generated: "Apr 14, 2026", format: "CSV"  },
  { name: "Inventory Imbalance",    freq: "Daily",   generated: "Apr 18, 2026", format: "CSV"  },
  { name: "Transfer Log",           freq: "Weekly",  generated: "Apr 14, 2026", format: "XLSX" },
  { name: "OTIF Scorecard",         freq: "Monthly", generated: "Apr 1, 2026",  format: "PDF"  },
  { name: "Supplier Lead Time",     freq: "Monthly", generated: "Apr 1, 2026",  format: "PDF"  },
]

export default function ReportsPage() {
  function handleAction(label: string) {
    console.log(`[Reports] action: ${label}`)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Reports</h1>
        <p className="text-slate-600 text-sm">Export inventory snapshots, performance summaries, and scheduled reports.</p>
      </div>

      {/* Quick-action cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {QUICK_ACTIONS.map(({ icon: Icon, title, subtitle, button }) => (
          <div key={title} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 leading-snug">{title}</p>
                <p className="text-xs text-slate-500">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => handleAction(title)}
              className="mt-auto self-start flex items-center gap-1.5 text-xs font-semibold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {button}
            </button>
          </div>
        ))}
      </div>

      {/* Available Reports list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Available Reports</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Report Name</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Frequency</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Generated</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Format</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {AVAILABLE_REPORTS.map((r, i) => (
              <tr key={r.name} className={i < AVAILABLE_REPORTS.length - 1 ? "border-b border-slate-50" : ""}>
                <td className="px-6 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-6 py-3 text-slate-600">{r.freq}</td>
                <td className="px-6 py-3 text-slate-600">{r.generated}</td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                    {r.format}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => handleAction(r.name)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
