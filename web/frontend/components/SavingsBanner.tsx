"use client"

import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { API_BASE } from "@/lib/api"

const API_URL = `${API_BASE}/api/summary`

interface Summary {
  manual_annual_penalty: number
  system_avoidable_annual: number
  delta: number
  pct_reduction: number
}

export function SavingsBanner() {
  const { data } = useQuery<Summary>({
    queryKey: ["summary"],
    queryFn: () => axios.get<Summary>(API_URL).then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (!data || data.manual_annual_penalty <= 0) return null

  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
      <span className="text-lg shrink-0">$</span>
      <span>
        Manual process:{" "}
        <strong>{fmt(data.manual_annual_penalty)} lost annually</strong>.{" "}
        POP Assistant:{" "}
        <strong>{fmt(data.system_avoidable_annual)} avoidable</strong>.{" "}
        <strong>{data.pct_reduction}% reduction</strong> in chargeback exposure.
      </span>
    </div>
  )
}
