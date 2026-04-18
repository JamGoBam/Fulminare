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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MetricTooltip } from "@/components/MetricTooltip"
import { openChatbot } from "@/components/ActionQueue"
import { API_BASE } from "@/lib/api"

const API_URL = `${API_BASE}/api/recommendations/transfers`

interface TransferRow {
  sku: string
  product_name: string
  dest_dc: string
  action: string
  origin_dc: string | null
  qty: number | null
  transfer_cost: number | null
  inbound_po_id: string | null
  inbound_eta: string | null
  inbound_qty: number | null
  days_to_stockout: number | null
  penalty_avoided: number
  net_saving: number
  reason: string
}

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

function ActionBadge({ action }: { action: string }) {
  if (action === "TRANSFER")
    return (
      <Badge className="bg-blue-600 text-white text-xs font-semibold">
        TRANSFER
      </Badge>
    )
  return (
    <Badge variant="secondary" className="text-xs font-semibold">
      WAIT
    </Badge>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 2 }).map((_, i) => (
        <TableRow key={`sk-${i}`}>
          {Array.from({ length: 8 }).map((_, j) => (
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
                <TableHead>Action</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="text-right">
                  <MetricTooltip metric="dos">Days to Stockout</MetricTooltip>
                </TableHead>
                <TableHead className="text-right">
                  <MetricTooltip metric="transfer_cost">Freight Cost</MetricTooltip>
                </TableHead>
                <TableHead className="text-right">
                  <MetricTooltip metric="net_saving">Net Saving</MetricTooltip>
                </TableHead>
                <TableHead>Reason</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <SkeletonRows />}
              {isError && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-destructive py-8"
                  >
                    Failed to load — is the API running on port 8000?
                  </TableCell>
                </TableRow>
              )}
              {data?.map((row, i) => (
                <TableRow key={`${row.sku}-${row.dest_dc}-${i}`}>
                  <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                  <TableCell className="max-w-36 truncate">
                    {row.product_name}
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={row.action} />
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {row.origin_dc
                      ? `${row.origin_dc} → ${row.dest_dc}`
                      : row.dest_dc}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.days_to_stockout !== null
                      ? Math.round(row.days_to_stockout)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.transfer_cost !== null ? fmt(row.transfer_cost) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-green-600 dark:text-green-400">
                    {fmt(row.net_saving)}
                  </TableCell>
                  <TableCell className="max-w-48">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="block truncate text-xs text-muted-foreground cursor-help" />
                        }
                      >
                        {row.reason}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64 text-xs">
                        {row.reason}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2"
                      onClick={() =>
                        openChatbot(
                          `${row.action === "TRANSFER" ? "Should we transfer?" : "Why are we waiting?"} SKU ${row.sku} at ${row.dest_dc}: ${row.reason}`
                        )
                      }
                    >
                      Ask
                    </Button>
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
