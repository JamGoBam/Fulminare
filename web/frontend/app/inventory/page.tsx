export default function InventoryPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Inventory</h1>
        <p className="text-slate-600">
          Browse and filter all SKUs across DC West, DC Central, and DC East.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-500">
        Inventory matrix coming in F5 — summary cards, per-DC status, and imbalance scores.
      </div>
    </div>
  )
}
