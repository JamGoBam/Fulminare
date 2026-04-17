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
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const API_URL = "http://localhost:8000/api/inventory/imbalance?top=20"

interface ImbalanceRow {
  sku: string
  product_name: string
  dc: string
  on_hand: number
  available: number
  demand_rate: number
  dos: number | null
  imbalance_score: number
  status: "critical" | "warning" | "ok"
}

function StatusBadge({ status }: { status: ImbalanceRow["status"] }) {
  if (status === "critical") return <Badge variant="destructive">Critical</Badge>
  if (status === "warning") return <Badge variant="secondary">Warning</Badge>
  return <Badge variant="outline">OK</Badge>
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function ImbalanceTable() {
  const { data, isLoading, isError } = useQuery<ImbalanceRow[]>({
    queryKey: ["imbalance"],
    queryFn: () => axios.get<ImbalanceRow[]>(API_URL).then((r) => r.data),
    refetchInterval: 30_000,
  })

  const rows = data
    ? [...data].sort((a, b) => b.imbalance_score - a.imbalance_score)
    : []

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>DC</TableHead>
          <TableHead className="text-right">Demand / day</TableHead>
          <TableHead className="text-right">Days of Supply</TableHead>
          <TableHead className="text-right">Imbalance Score</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <SkeletonRows />}
        {isError && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-destructive py-8">
              Failed to load data — is the API running on port 8000?
            </TableCell>
          </TableRow>
        )}
        {rows.map((row, i) => (
          <TableRow key={`${row.sku}-${row.dc}-${i}`}>
            <TableCell className="font-mono text-xs">{row.sku}</TableCell>
            <TableCell className="max-w-48 truncate">{row.product_name}</TableCell>
            <TableCell className="font-mono text-xs">{row.dc}</TableCell>
            <TableCell className="text-right tabular-nums">
              {row.demand_rate.toFixed(2)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.dos !== null ? row.dos.toFixed(1) : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              {row.imbalance_score.toFixed(2)}
            </TableCell>
            <TableCell>
              <StatusBadge status={row.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
