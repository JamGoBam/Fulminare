"use client"

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

const API_URL = "http://localhost:8000/api/chargebacks/summary"

const DCS = ["DC_EAST", "DC_WEST", "DC_CENTRAL"] as const

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

function cellBg(n: number, max: number): string {
  if (n === 0 || max === 0) return ""
  const intensity = Math.round((n / max) * 80)
  return `bg-destructive/${intensity} text-destructive-foreground`
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
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

export function ChargebackHeatmap() {
  const { data, isLoading, isError } = useQuery<SummaryRow[]>({
    queryKey: ["chargebacks"],
    queryFn: () => axios.get<SummaryRow[]>(API_URL).then((r) => r.data),
  })

  // Pivot: cause_code → dc → summed amount
  const pivot = new Map<string, Map<string, number>>()
  if (data) {
    for (const row of data) {
      if (!pivot.has(row.cause_code)) pivot.set(row.cause_code, new Map())
      const dcMap = pivot.get(row.cause_code)!
      dcMap.set(row.dc, (dcMap.get(row.dc) ?? 0) + row.total_amount)
    }
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
          <TableHead className="w-40">Cause Code</TableHead>
          {DCS.map((dc) => (
            <TableHead key={dc} className="text-right">
              {dc}
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
            <TableCell className="font-mono text-xs font-medium">{code}</TableCell>
            {DCS.map((dc) => {
              const amt = pivot.get(code)?.get(dc) ?? 0
              return (
                <TableCell
                  key={dc}
                  className={`text-right tabular-nums ${cellBg(amt, maxAmount)}`}
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
            {DCS.map((dc) => (
              <TableCell key={dc} className="text-right tabular-nums font-semibold">
                {fmt(colTotals[dc])}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}
