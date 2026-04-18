"use client"

import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { ChargebackHeatmap } from "@/components/ChargebackHeatmap"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { API_BASE } from "@/lib/api"

interface ChargebackRecord {
  cause_code: string
  channel: string
  dc: string
  total_amount: number
  count: number
}

interface TopCustomer {
  customer_id: string
  total_amount: number
  count: number
}

interface TopCause {
  cause_code: string
  total_amount: number
  count: number
}

const CAUSE_LABELS: Record<string, string> = {
  SHORT_SHIP: "Short shipment",
  LATE_DELIVERY: "Late delivery",
  DAMAGE: "Damaged goods",
  MISSED_WINDOW: "Missed delivery window",
}

export default function ChargebacksPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const { data: records } = useQuery<ChargebackRecord[]>({
    queryKey: ["chargebacks-summary"],
    queryFn: () =>
      axios.get<ChargebackRecord[]>(`${API_BASE}/api/chargebacks/summary`).then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: topCustomers } = useQuery<TopCustomer[]>({
    queryKey: ["chargebacks-top-customers"],
    queryFn: () =>
      axios.get<TopCustomer[]>(`${API_BASE}/api/chargebacks/top-customers?n=10`).then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: topCauses } = useQuery<TopCause[]>({
    queryKey: ["chargebacks-top-causes"],
    queryFn: () =>
      axios.get<TopCause[]>(`${API_BASE}/api/chargebacks/top-causes?n=5`).then((r) => r.data),
    refetchInterval: 60_000,
  })

  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

  const totalAmount = records ? records.reduce((s, r) => s + r.total_amount, 0) : 0
  const totalCount = records ? records.reduce((s, r) => s + r.count, 0) : 0

  return (
    <div className="flex flex-col flex-1 px-4 py-8 max-w-7xl mx-auto w-full gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Chargeback Analysis</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base">Top Customers by Penalty $</CardTitle>
            <p className="text-xs text-muted-foreground">Highest chargeback exposure — all time, excl. TPR</p>
          </CardHeader>
          <CardContent className="p-0">
            {topCustomers && topCustomers.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs text-slate-500">
                    <th className="text-left px-4 py-2 font-medium">Customer</th>
                    <th className="text-right px-4 py-2 font-medium">Total $</th>
                    <th className="text-right px-4 py-2 font-medium">Incidents</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c, i) => (
                    <tr key={c.customer_id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700">
                        <span className="text-slate-400 mr-2">{i + 1}.</span>
                        {c.customer_id}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-red-600">{fmt(c.total_amount)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{c.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground px-4 py-6">Loading customer data…</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base">Top Causes</CardTitle>
            <p className="text-xs text-muted-foreground">Ranked by total penalty exposure</p>
          </CardHeader>
          <CardContent className="p-0">
            {topCauses && topCauses.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs text-slate-500">
                    <th className="text-left px-4 py-2 font-medium">Cause</th>
                    <th className="text-right px-4 py-2 font-medium">Total $</th>
                    <th className="text-right px-4 py-2 font-medium">Incidents</th>
                  </tr>
                </thead>
                <tbody>
                  {topCauses.map((c, i) => (
                    <tr key={c.cause_code} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700">
                        <span className="text-slate-400 text-xs mr-2">{i + 1}.</span>
                        {CAUSE_LABELS[c.cause_code] ?? c.cause_code}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-red-600">{fmt(c.total_amount)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{c.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground px-4 py-6">Loading cause data…</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Chargebacks by Cause × DC</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ChargebackHeatmap />
        </CardContent>
      </Card>

      {records && records.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Total chargeback exposure (excl. TPR):{" "}
          <strong className="text-foreground">{fmt(totalAmount)}</strong> across{" "}
          <strong className="text-foreground">{totalCount} incidents</strong>
        </p>
      )}
    </div>
  )
}
