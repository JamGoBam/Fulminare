import type { LucideIcon } from "lucide-react"

interface KpiCardProps {
  label: string
  value: string
  subtext: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

export function KpiCard({ label, value, subtext, icon: Icon, iconBg, iconColor }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-slate-500 text-sm mb-1">{label}</div>
          <div className="text-3xl font-semibold text-slate-900 mb-1">{value}</div>
          <div className="text-xs text-slate-500">{subtext}</div>
        </div>
        <div className={`${iconBg} ${iconColor} p-3 rounded-lg`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
