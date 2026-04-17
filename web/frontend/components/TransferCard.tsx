"use client"

import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { API_BASE } from "@/lib/api"

const API_URL = `${API_BASE}/api/recommendations/transfers`

interface TransferRow {
  sku: string
  product_name: string
  origin_dc: string
  dest_dc: string
  dos_origin: number | null
  dos_dest: number
  qty_to_transfer: number
  transfer_cost: number
  chargeback_risk_avoided: number
  net_saving: number
}

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 2 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 6 }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function TransferCard() {
  const { data, isLoading, isError } = useQuery<TransferRow[]>({
    queryKey: ["transfers"],
    queryFn: () => axios.get<TransferRow[]>(API_URL).then((r) => r.data),
    refetchInterval: 30_000,
  })

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Transfer Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!isLoading && !isError && data?.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No transfers recommended — inventory is balanced.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Freight Cost</TableHead>
                <TableHead className="text-right">Est. Net Saving</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <SkeletonRows />}
              {isError && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-destructive py-8">
                    Failed to load — is the API running on port 8000?
                  </TableCell>
                </TableRow>
              )}
              {data?.map((row, i) => (
                <TableRow key={`${row.sku}-${row.origin_dc}-${row.dest_dc}-${i}`}>
                  <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                  <TableCell className="max-w-44 truncate">{row.product_name}</TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {row.origin_dc} → {row.dest_dc}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.qty_to_transfer}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(row.transfer_cost)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-green-600 dark:text-green-400">
                    {fmt(row.net_saving)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
