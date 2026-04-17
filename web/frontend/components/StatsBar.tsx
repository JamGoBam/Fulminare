"use client"

import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { API_BASE } from "@/lib/api"

const API_URL = `${API_BASE}/api/summary`

interface Summary {
  total_skus: number
  critical_count: number
  warning_count: number
  annual_savings_estimate: number
}

export function StatsBar() {
  const { data } = useQuery<Summary>({
    queryKey: ["summary"],
    queryFn: () => axios.get<Summary>(API_URL).then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (!data) return null

  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

  return (
    <div className="flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
      <span>{data.total_skus} SKUs tracked</span>
      <span className="opacity-30 select-none">|</span>
      <span className="font-medium text-red-600 dark:text-red-400">{data.critical_count} Critical</span>
      <span className="opacity-30 select-none">|</span>
      <span className="font-medium text-yellow-600 dark:text-yellow-400">{data.warning_count} Warning</span>
      <span className="opacity-30 select-none">|</span>
      <span className="font-medium text-green-700 dark:text-green-400">{fmt(data.annual_savings_estimate)} est. savings / year</span>
    </div>
  )
}
