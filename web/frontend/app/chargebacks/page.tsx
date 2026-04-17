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
