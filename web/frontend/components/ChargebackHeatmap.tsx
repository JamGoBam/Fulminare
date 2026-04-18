"use client"

import React from "react"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { MetricTooltip } from "@/components/MetricTooltip"
import { API_BASE } from "@/lib/api"

const API_URL = `${API_BASE}/api/chargebacks/summary`

const DCS = ["DC_EAST", "DC_WEST", "DC_CENTRAL"] as const

const CAUSE_LABELS: Record<string, string> = {
  SHORT_SHIP: "Short shipment",
  LATE_DELIVERY: "Late delivery",
  DAMAGE: "Damaged goods",
  MISSED_WINDOW: "Missed window",
}

const DC_LABELS: Record<string, string> = {
  DC_EAST: "DC East",
  DC_WEST: "DC West",
  DC_CENTRAL: "DC Central",
}

interface SummaryRow {
  cause_code: string
  channel: string
  dc: string
  total_amount: number
  count: number
}

function fmt(n: number): string {
  return n === 0 ? "" : `$${Math.round(n).toLocaleString("en-US")}`
}

function cellStyle(n: number, max: number): React.CSSProperties {
  if (n === 0 || max === 0) return {}
  const t = n / max
  const alpha = 0.12 + t * 0.68
  return {
    backgroundColor: `rgba(220, 38, 38, ${alpha.toFixed(2)})`,
    color: alpha > 0.5 ? "#fff" : undefined,
  }
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={`sk-${i}`}>
          {Array.from({ length: 4 }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function ChargebackHeatmap({ channel, dc }: { channel?: string; dc?: string }) {
  const { data, isLoading, isError } = useQuery<SummaryRow[]>({
    queryKey: ["chargebacks"],
    queryFn: () => axios.get<SummaryRow[]>(API_URL).then((r) => r.data),
  })

  // Client-side filter by channel / dc props
  const filtered = (data ?? []).filter((row) => {
    if (channel && row.channel !== channel) return false
    if (dc && row.dc !== dc) return false
    return true
  })

  // Pivot: cause_code → dc → summed amount
  const pivot = new Map<string, Map<string, number>>()
  for (const row of filtered) {
    if (!pivot.has(row.cause_code)) pivot.set(row.cause_code, new Map())
    const dcMap = pivot.get(row.cause_code)!
    dcMap.set(row.dc, (dcMap.get(row.dc) ?? 0) + row.total_amount)
  }

  const causeCodes = Array.from(pivot.keys()).sort()
  const allAmounts = Array.from(pivot.values()).flatMap((m) => Array.from(m.values()))
  const maxAmount = allAmounts.length ? Math.max(...allAmounts) : 0

  // Column totals
  const colTotals = Object.fromEntries(
    DCS.map((dc) => [dc, causeCodes.reduce((s, c) => s + (pivot.get(c)?.get(dc) ?? 0), 0)])
  )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-40">
            <MetricTooltip metric="cause_code">Cause Code</MetricTooltip>
          </TableHead>
          {DCS.map((d) => (
            <TableHead key={d} className="text-right">
              {DC_LABELS[d] ?? d}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <SkeletonRows />}
        {isError && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-destructive py-8">
              Failed to load data — is the API running on port 8000?
            </TableCell>
          </TableRow>
        )}
        {causeCodes.map((code) => (
          <TableRow key={code}>
            <TableCell className="text-xs font-medium">{CAUSE_LABELS[code] ?? code}</TableCell>
            {DCS.map((d) => {
              const amt = pivot.get(code)?.get(d) ?? 0
              return (
                <TableCell
                  key={d}
                  className="text-right tabular-nums transition-colors"
                  style={cellStyle(amt, maxAmount)}
                >
                  {fmt(amt)}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
      {causeCodes.length > 0 && (
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold">Total</TableCell>
            {DCS.map((d) => (
              <TableCell key={d} className="text-right tabular-nums font-semibold">
                {fmt(colTotals[d])}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}
