export default function ReportsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Reports</h1>
        <p className="text-slate-600">
          Export inventory snapshots, performance summaries, and scheduled reports.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {["Quick Export", "Performance Summary", "Scheduled Reports"].map((label) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">{label}</h2>
            <p className="text-sm text-slate-500">Coming in F7</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-500">
        Available reports and recent exports coming in F7.
      </div>
    </div>
  )
}
