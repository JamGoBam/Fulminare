import {
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DollarSign,
  Package,
  MapPin,
} from "lucide-react"
import type { TransferDetails, InboundDetails } from "@/lib/types"

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

function ConfidenceBar({
  value,
  barColor,
  textColor,
  trackColor,
}: {
  value: number
  barColor: string
  textColor: string
  trackColor: string
}) {
  return (
    <div className="pt-2 border-t border-slate-200">
      <div className="text-xs text-slate-500 mb-2">Confidence Level</div>
      <div className="flex items-center gap-2">
        <div className={`flex-1 ${trackColor} rounded-full h-2`}>
          <div
            className={`${barColor} h-2 rounded-full transition-all`}
            style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          />
        </div>
        <span className={`text-sm font-semibold ${textColor}`}>{value}%</span>
      </div>
    </div>
  )
}

export function TransferCard({ details }: { details: TransferDetails }) {
  const isUnavailable = details.sourceDC === "None available" || details.unitsAvailable === 0

  return (
    <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50/50">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <ArrowRight className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-semibold text-slate-900">Option A: Transfer Now</div>
          <div className="text-xs text-slate-500">Certain cost, eliminates risk</div>
        </div>
      </div>

      {isUnavailable ? (
        <p className="text-sm text-slate-500 italic">No transfer source available for this SKU.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <MapPin className="w-3.5 h-3.5" />
              Source DC
            </div>
            <div className="text-sm font-medium text-slate-900">{details.sourceDC}</div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Package className="w-3.5 h-3.5" />
              Units Available
            </div>
            <div className="text-sm font-medium text-slate-900">
              {details.unitsAvailable.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Clock className="w-3.5 h-3.5" />
              Transfer Lead Time
            </div>
            <div className="text-sm font-medium text-slate-900">{details.leadTime}</div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Estimated Arrival
            </div>
            <div className="text-sm font-medium text-green-700">{details.estimatedArrival}</div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              Inter-DC Freight Cost
            </div>
            <div className="text-sm font-semibold text-slate-900">{fmt(details.cost)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Post-Transfer Health</div>
            <div className="text-sm font-medium text-slate-900">{details.postTransferHealth}</div>
          </div>
        </div>
      )}

      <ConfidenceBar
        value={details.confidence}
        barColor="bg-blue-600"
        textColor="text-blue-700"
        trackColor="bg-blue-200"
      />
    </div>
  )
}

export function InboundCard({ details }: { details: InboundDetails }) {
  return (
    <div className="border-2 border-amber-200 rounded-xl p-4 bg-amber-50/50">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-semibold text-slate-900">Option B: Wait for Inbound</div>
          <div className="text-xs text-slate-500">Uncertain timing, penalty risk</div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Clock className="w-3.5 h-3.5" />
            Inbound PO ETA
          </div>
          <div className="text-sm font-medium text-slate-900">{details.poEta}</div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Delay Risk
          </div>
          <div
            className={`text-sm font-medium ${
              details.delayRisk === "High" ? "text-red-700" : "text-amber-700"
            }`}
          >
            {details.delayRisk}
          </div>
        </div>

        {details.complianceFlags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <XCircle className="w-3.5 h-3.5" />
              Compliance Flags
            </div>
            {details.complianceFlags.map((flag, i) => (
              <div key={i} className="text-sm font-medium text-red-700">
                {flag}
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Stockout Window
          </div>
          <div className="text-sm font-medium text-slate-900">{details.stockoutWindow}</div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            Estimated Penalty Risk
          </div>
          <div className="text-sm font-semibold text-red-700">{fmt(details.penaltyRisk)}</div>
        </div>
      </div>

      <ConfidenceBar
        value={details.confidence}
        barColor="bg-amber-600"
        textColor="text-amber-700"
        trackColor="bg-amber-200"
      />
    </div>
  )
}
