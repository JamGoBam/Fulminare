export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Settings</h1>
        <p className="text-slate-600">Configuration and preferences</p>
      </div>

      <div className="space-y-4">
        {[
          { title: "Preferences", desc: "Display density, default DC filter" },
          { title: "DC Labels", desc: "Rename DC West, DC Central, DC East to site names" },
          { title: "Integrations", desc: "Ollama URL and model configuration" },
        ].map(({ title, desc }) => (
          <div key={title} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">{title}</h2>
            <p className="text-sm text-slate-500">{desc} — coming in F7</p>
          </div>
        ))}
      </div>
    </div>
  )
}
