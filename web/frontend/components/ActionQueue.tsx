"use client"

import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { API_BASE } from "@/lib/api"

const API_URL = `${API_BASE}/api/recommendations/alerts`

interface AlertRow {
  rank: number
  sku: string
  dc: string
  priority_score: number
  action: string | null
  reason: string
  days_to_stockout: number | null
  exposure_dollars: number
}

export function openChatbot(message: string) {
  window.dispatchEvent(new CustomEvent("chat:prefill", { detail: { message } }))
}

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

function ActionBadge({ action }: { action: string }) {
  if (action === "TRANSFER")
    return (
      <Badge className="bg-blue-600 text-white text-xs shrink-0">TRANSFER</Badge>
    )
  return (
    <Badge variant="secondary" className="text-xs shrink-0">
      WAIT
    </Badge>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-md bg-zinc-100 dark:bg-zinc-800 animate-pulse"
        />
      ))}
    </div>
  )
}

export function ActionQueue() {
  const { data, isLoading, isError } = useQuery<AlertRow[]>({
    queryKey: ["alerts"],
    queryFn: () => axios.get<AlertRow[]>(API_URL).then((r) => r.data),
    refetchInterval: 30_000,
  })

  if (isLoading) return <SkeletonRows />
  if (isError || !data || data.length === 0) return null

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">Action Queue</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ranked by urgency — address these first.
        </p>
      </div>
      <ul className="divide-y">
        {data.map((alert) => (
          <li
            key={`${alert.rank}-${alert.sku}-${alert.dc}`}
            className="flex items-start gap-3 px-4 py-3"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {alert.rank}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold">{alert.sku}</span>
                <span className="text-xs text-muted-foreground">{alert.dc}</span>
                {alert.action && <ActionBadge action={alert.action} />}
                {alert.days_to_stockout !== null && (
                  <span className="text-xs text-destructive font-medium">
                    {Math.round(alert.days_to_stockout)}d to stockout
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {alert.reason}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-destructive whitespace-nowrap">
                {fmt(alert.exposure_dollars)}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={() =>
                  openChatbot(
                    `Explain alert #${alert.rank}: ${alert.sku} at ${alert.dc} — ${alert.reason}`
                  )
                }
              >
                Explain
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
