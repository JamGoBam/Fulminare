"use client"

import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { use } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const DCS = ["DC_EAST", "DC_WEST", "DC_CENTRAL"] as const

interface ImbalanceRow {
  sku: string
  product_name: string
  dc: string
  demand_rate: number
  dos: number | null
  imbalance_score: number
  status: "critical" | "warning" | "ok"
}

interface TransferRow {
  sku: string
  product_name: string
  origin_dc: string
  dest_dc: string
  qty_to_transfer: number
  transfer_cost: number
  chargeback_risk_avoided: number
  net_saving: number
}

function StatusBadge({ status }: { status: ImbalanceRow["status"] }) {
  if (status === "critical") return <Badge variant="destructive">Critical</Badge>
  if (status === "warning") return <Badge variant="secondary">Warning</Badge>
  return <Badge variant="outline">OK</Badge>
}

function DosStat({ dc, row }: { dc: string; row: ImbalanceRow | undefined }) {
  const dos = row?.dos
  const status = row?.status ?? "ok"
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-mono text-muted-foreground">{dc}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-3xl font-semibold tabular-nums">
          {dos !== null && dos !== undefined ? dos.toFixed(1) : "—"}
        </p>
        <p className="text-xs text-muted-foreground">days of supply</p>
        <StatusBadge status={status} />
      </CardContent>
    </Card>
  )
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

export default function SkuPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = use(params)

  const { data: allRows, isLoading: loadingImbalance } = useQuery<ImbalanceRow[]>({
    queryKey: ["imbalance"],
    queryFn: () =>
      axios.get<ImbalanceRow[]>("http://localhost:8000/api/inventory/imbalance?top=100").then((r) => r.data),
  })

  const { data: allTransfers, isLoading: loadingTransfers } = useQuery<TransferRow[]>({
    queryKey: ["transfers"],
    queryFn: () =>
      axios.get<TransferRow[]>("http://localhost:8000/api/recommendations/transfers").then((r) => r.data),
  })

  const skuRows = allRows?.filter((r) => r.sku === sku) ?? []
  const skuTransfers = allTransfers?.filter((r) => r.sku === sku) ?? []
  const productName = skuRows[0]?.product_name ?? sku

  const dcMap = Object.fromEntries(skuRows.map((r) => [r.dc, r]))

  const isLoading = loadingImbalance || loadingTransfers

  return (
    <div className="flex flex-col flex-1 px-4 py-8 max-w-7xl mx-auto w-full gap-6">
      <header className="flex flex-col gap-1">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{productName}</h1>
        <p className="text-sm text-muted-foreground font-mono">{sku}</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {DCS.map((dc) => (
            <Card key={dc}>
              <CardContent className="pt-4">
                <div className="h-10 w-20 rounded bg-zinc-200 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {DCS.map((dc) => (
            <DosStat key={dc} dc={dc} row={dcMap[dc]} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Transfer Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {skuTransfers.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No transfers recommended for this SKU.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Freight Cost</TableHead>
                  <TableHead className="text-right">Risk Avoided</TableHead>
                  <TableHead className="text-right">Net Saving</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skuTransfers.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {r.origin_dc} → {r.dest_dc}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.qty_to_transfer}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(r.transfer_cost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(r.chargeback_risk_avoided)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-green-600 dark:text-green-400">
                      {fmt(r.net_saving)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
