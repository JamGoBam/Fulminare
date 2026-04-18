"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { ChargebackHeatmap } from "@/components/ChargebackHeatmap"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTopCustomers } from "@/lib/api"
import type { TopCustomer } from "@/lib/api"

const CHANNELS = ["Direct", "Wholesale", "Retail", "Online"]
const DC_OPTIONS = [
  { label: "All DCs",    value: "" },
  { label: "DC East",    value: "DC_EAST" },
  { label: "DC West",    value: "DC_WEST" },
  { label: "DC Central", value: "DC_CENTRAL" },
]

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

function CustomerSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={`sk-${i}`} className="flex items-center gap-4 px-4 py-3">
          <div className="h-4 w-6 rounded bg-slate-100 animate-pulse" />
          <div className="h-4 flex-1 rounded bg-slate-100 animate-pulse" />
          <div className="h-4 w-16 rounded bg-slate-100 animate-pulse" />
          <div className="h-4 w-20 rounded bg-slate-100 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function ChargebacksPage() {
  const router = useRouter()
  const params = useSearchParams()

  const selectedChannel = params.get("channel") ?? ""
  const selectedDc      = params.get("dc")      ?? ""

  function pushFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/chargebacks?${next.toString()}`, { scroll: false })
  }

  const { data: customers, isLoading: custLoading } = useQuery<TopCustomer[]>({
    queryKey: ["top-customers"],
    queryFn: () => getTopCustomers(10),
    refetchInterval: 60_000,
  })

  const selectCls = "text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="flex flex-col flex-1 px-8 py-8 max-w-7xl mx-auto w-full gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Chargeback Analysis</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Penalty exposure by cause, channel, and distribution center.
        </p>
      </header>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filter:</span>

        <select
          className={selectCls}
          value={selectedChannel}
          onChange={(e) => pushFilter("channel", e.target.value)}
        >
          <option value="">All channels</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className={selectCls}
          value={selectedDc}
          onChange={(e) => pushFilter("dc", e.target.value)}
        >
          {DC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {(selectedChannel || selectedDc) && (
          <button
            onClick={() => router.push("/chargebacks", { scroll: false })}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Chargebacks by Cause × DC</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ChargebackHeatmap
            channel={selectedChannel || undefined}
            dc={selectedDc || undefined}
          />
        </CardContent>
      </Card>

      {/* Top customers */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Top customers by exposure</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {custLoading && <CustomerSkeleton />}
          {!custLoading && (!customers || customers.length === 0) && (
            <p className="px-4 py-8 text-sm text-center text-slate-500">
              No chargeback data available.
            </p>
          )}
          {!custLoading && customers && customers.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 w-12">Rank</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Customer</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 w-28">Incidents</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 w-36">Total Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customers.map((c, i) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-400">#{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.customer_id}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{c.count}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-red-600">
                      {fmt(c.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
