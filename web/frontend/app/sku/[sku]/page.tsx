"use client"

import { use } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle, CheckCircle, TrendingUp, Clock,
  ArrowRight, DollarSign, Package, MapPin,
} from "lucide-react"
import { getSkuDetail, getActionItems } from "@/lib/api"
import type { SkuDcDetail, SkuRecommendation } from "@/lib/api"
import { PoTimeline } from "@/components/PoTimeline"
import type { TimelineEvent } from "@/components/PoTimeline"

// ── helpers ────────────────────────────────────────────────────────────────────

const DC_LABELS: Record<string, string> = {
  DC_EAST: "DC East", DC_WEST: "DC West", DC_CENTRAL: "DC Central",
}

function dcLabel(dc: string) { return DC_LABELS[dc] ?? dc }

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

function mapStatus(dc: SkuDcDetail): "Critical" | "Watch" | "Healthy" | "Overstock" {
  if (dc.status === "critical") return "Critical"
  if (dc.status === "warning")  return "Watch"
  if (dc.dos !== null && dc.dos > 180) return "Overstock"
  return "Healthy"
}

const STATUS_META = {
  Critical: { chip: "bg-red-100 text-red-700 border border-red-200",     Icon: AlertTriangle, val: "text-red-600"   },
  Watch:    { chip: "bg-amber-100 text-amber-700 border border-amber-200", Icon: Clock,        val: "text-amber-600" },
  Healthy:  { chip: "bg-green-100 text-green-700 border border-green-200", Icon: CheckCircle,  val: "text-slate-700" },
  Overstock:{ chip: "bg-blue-100 text-blue-700 border border-blue-200",    Icon: TrendingUp,   val: "text-blue-600"  },
} as const

const REC_META: Record<string, { label: string; cls: string }> = {
  TRANSFER: { label: "Transfer Now", cls: "bg-blue-600 text-white" },
  WAIT:     { label: "Wait",         cls: "bg-slate-600 text-white" },
  ESCALATE: { label: "Escalate",     cls: "bg-purple-600 text-white" },
}

// ── sub-components ─────────────────────────────────────────────────────────────

function DcCard({ dc }: { dc: SkuDcDetail }) {
  const status = mapStatus(dc)
  const { chip, Icon, val } = STATUS_META[status]
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">{dcLabel(dc.dc)}</span>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${chip}`}>
          <Icon className="w-3 h-3 shrink-0" />
          {status}
        </span>
      </div>
      <div>
        <p className={`text-3xl font-semibold tabular-nums ${val}`}>
          {dc.dos !== null ? `${dc.dos.toFixed(1)}d` : "—"}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">days of cover</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-500">Available</p>
          <p className="font-semibold text-slate-800">{Math.round(dc.available).toLocaleString()} units</p>
        </div>
        <div>
          <p className="text-slate-500">Demand</p>
          <p className="font-semibold text-slate-800">{dc.demand_rate.toFixed(1)}/day</p>
        </div>
      </div>
    </div>
  )
}

function RecCard({ rec, actionId }: { rec: SkuRecommendation; actionId?: string }) {
  const meta = REC_META[rec.action] ?? REC_META["WAIT"]
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Transfer vs Wait</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${meta.cls}`}>{meta.label}</span>
      </div>
      <div className="p-4 space-y-3">
        {rec.action === "TRANSFER" && rec.origin_dc && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-800">{dcLabel(rec.origin_dc)}</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-800">{dcLabel(rec.dest_dc)}</span>
            {rec.qty && (
              <span className="text-slate-500">· {rec.qty.toLocaleString()} units</span>
            )}
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {rec.transfer_cost !== null && (
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-500 mb-0.5">Freight cost</p>
              <p className="text-sm font-semibold text-slate-800">{fmt(rec.transfer_cost)}</p>
            </div>
          )}
          {rec.days_to_stockout !== null && (
            <div className="bg-red-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-500 mb-0.5">Days to stockout</p>
              <p className="text-sm font-semibold text-red-600">{Math.round(rec.days_to_stockout)}d</p>
            </div>
          )}
          {rec.net_saving !== null && (
            <div className="bg-green-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-500 mb-0.5">Net saving</p>
              <p className="text-sm font-semibold text-green-600">{fmt(rec.net_saving)}</p>
            </div>
          )}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{rec.reason}</p>
        {actionId && (
          <Link
            href={`/?selected=${actionId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Review in Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  )
}

function DcCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-16 rounded bg-slate-100 animate-pulse" />
        <div className="h-5 w-20 rounded bg-slate-100 animate-pulse" />
      </div>
      <div className="h-8 w-20 rounded bg-slate-100 animate-pulse" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-8 rounded bg-slate-100 animate-pulse" />
        <div className="h-8 rounded bg-slate-100 animate-pulse" />
      </div>
    </div>
  )
}

// ── page ────────────────────────────────────────────────────────────────────────

export default function SkuPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = use(params)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sku-detail", sku],
    queryFn: () => getSkuDetail(sku),
  })

  const { data: actionItems } = useQuery({
    queryKey: ["action-items"],
    queryFn: getActionItems,
  })

  // Find matching action item for "Review in Dashboard" link
  const actionId = actionItems?.find(
    (a) => a.sku === sku
  )?.id

  // Build PO timeline
  const timeline: TimelineEvent[] = [
    {
      label: "Today",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      type: "today",
    },
  ]

  if (data) {
    // Transfer ETA — 3 days from today (locked constant per CLAUDE.md)
    if (data.recommendation?.action === "TRANSFER") {
      const eta = new Date()
      eta.setDate(eta.getDate() + 3)
      timeline.push({
        label: "Transfer ETA",
        date: eta.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        type: "future",
      })
    }
    // Open PO arrivals
    for (const po of data.open_pos) {
      timeline.push({
        label: `PO ${po.po_id}`,
        date: po.expected_arrival,
        type: po.delay_flag ? "delayed" : "future",
      })
    }
  }

  const productName = data?.product_name ?? sku

  return (
    <div className="flex flex-col flex-1 px-8 py-8 max-w-7xl mx-auto w-full gap-6">
      {/* Header */}
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2 w-fit">
          ← Dashboard
        </Link>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 leading-tight">{productName}</h1>
            <p className="text-sm font-mono text-slate-500 mt-0.5">{sku}</p>
          </div>
        </div>
      </header>

      {/* 3-DC cards */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Inventory by DC
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <DcCardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <p className="text-sm text-slate-500">
            We can&apos;t reach the data service right now. Try again in a moment.
          </p>
        ) : data && data.dcs.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {data.dcs.map((dc) => <DcCard key={dc.dc} dc={dc} />)}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No inventory data found for this SKU.</p>
        )}
      </section>

      {/* PO Timeline */}
      {!isLoading && data && timeline.length > 1 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Timeline
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-2">
            <PoTimeline arrivals={timeline} />
          </div>
        </section>
      )}

      {/* Transfer recommendation */}
      {!isLoading && data && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Recommendation
          </h2>
          {data.recommendation ? (
            <RecCard rec={data.recommendation} actionId={actionId} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-6 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-sm text-slate-600">No transfer decision pending for this SKU.</p>
            </div>
          )}
        </section>
      )}

      {/* Chargeback summary */}
      {!isLoading && data && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Chargeback History (all time)
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Total exposure</p>
                <p className="text-lg font-semibold text-red-600">
                  {fmt(data.chargeback_history_summary.total_amount)}
                </p>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <div>
              <p className="text-xs text-slate-500">Incidents</p>
              <p className="text-lg font-semibold text-slate-800">
                {data.chargeback_history_summary.count}
              </p>
            </div>
            <p className="text-xs text-slate-400 ml-auto">
              Excludes promotional (TPR) chargebacks
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
