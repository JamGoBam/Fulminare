"use client"

import type { TransferDetails, InboundDetails } from "@/lib/types"
import { ArrowRight, Clock, DollarSign, Package, MapPin, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>Confidence</span>
        <span className="font-medium text-slate-700">{pct}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Row({ icon, label, value, valueClass = "text-slate-800" }: {
  icon: React.ReactNode
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`font-medium ml-auto ${valueClass}`}>{value}</span>
    </div>
  )
}

export function TransferComparisonCard({
  details,
  recommended,
}: {
  details: TransferDetails
  recommended: boolean
}) {
  const isUnavailable =
    details.sourceDC === "None available" ||
    details.unitsAvailable === 0 ||
    details.leadTime === "N/A"

  const container = recommended
    ? "border border-blue-200 rounded-lg p-4 bg-blue-50/30"
    : "border border-slate-200 rounded-lg p-4 bg-slate-50/30"
  const badge = recommended ? "bg-blue-600 text-white" : "bg-slate-600 text-white"
  const bar = recommended ? "bg-blue-500" : "bg-slate-400"

  return (
    <div className={container}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${badge}`}>
          Option A — Transfer Now
        </span>
        {isUnavailable && (
          <span className="text-xs text-slate-400">No source available</span>
        )}
      </div>

      {isUnavailable ? (
        <p className="text-sm text-slate-500 mb-4">No transfer source available for this SKU.</p>
      ) : (
        <div className="space-y-2 mb-4">
          <Row icon={<MapPin className="w-3.5 h-3.5" />} label="From" value={details.sourceDC} />
          <Row icon={<Package className="w-3.5 h-3.5" />} label="Units available" value={String(details.unitsAvailable)} />
          <Row icon={<Clock className="w-3.5 h-3.5" />} label="Lead time" value={details.leadTime} />
          <Row icon={<ArrowRight className="w-3.5 h-3.5" />} label="Arrives" value={details.estimatedArrival} />
          <Row icon={<DollarSign className="w-3.5 h-3.5" />} label="Freight cost" value={fmt(details.cost)} valueClass="text-slate-900 font-semibold" />
          <Row icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Post-transfer health" value={details.postTransferHealth} valueClass="text-green-700" />
        </div>
      )}

      <ConfidenceBar value={isUnavailable ? 0 : details.confidence} color={bar} />
    </div>
  )
}

export function InboundComparisonCard({
  details,
  recommended,
}: {
  details: InboundDetails
  recommended: boolean
}) {
  const delayClass =
    details.delayRisk === "High"
      ? "text-red-600"
      : details.delayRisk === "Medium"
      ? "text-amber-600"
      : "text-green-600"

  const container = recommended
    ? "border border-blue-200 rounded-lg p-4 bg-blue-50/30"
    : "border border-slate-200 rounded-lg p-4 bg-slate-50/30"
  const badge = recommended ? "bg-blue-600 text-white" : "bg-slate-600 text-white"
  const bar = recommended ? "bg-blue-500" : "bg-slate-400"

  return (
    <div className={container}>
      <div className="mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${badge}`}>
          Option B — Wait for Inbound
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <Row icon={<Clock className="w-3.5 h-3.5" />} label="PO ETA" value={details.poEta} />
        <Row
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          label="Delay risk"
          value={details.delayRisk}
          valueClass={delayClass}
        />
        {details.complianceFlags.length > 0 && (
          <Row
            icon={<XCircle className="w-3.5 h-3.5" />}
            label="Compliance flags"
            value={details.complianceFlags.join(", ")}
            valueClass="text-amber-700"
          />
        )}
        <Row
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Stockout window"
          value={details.stockoutWindow}
          valueClass="text-red-700"
        />
        <Row
          icon={<DollarSign className="w-3.5 h-3.5" />}
          label="Penalty risk"
          value={fmt(details.penaltyRisk)}
          valueClass="text-red-700 font-semibold"
        />
      </div>

      <ConfidenceBar value={details.confidence} color={bar} />
    </div>
  )
}
