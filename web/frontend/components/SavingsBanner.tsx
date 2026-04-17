"use client"

import { useQuery } from "@tanstack/react-query"
import axios from "axios"

const API_URL = "http://localhost:8000/api/summary"

interface Summary {
  total_skus: number
  critical_count: number
  warning_count: number
  annual_savings_estimate: number
}

export function SavingsBanner() {
  const { data } = useQuery<Summary>({
    queryKey: ["summary"],
    queryFn: () => axios.get<Summary>(API_URL).then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (!data || data.annual_savings_estimate <= 0) return null

  const fmt = (n: number) =>
    `$${Math.round(n).toLocaleString("en-US")}`

  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
      <span className="text-lg">$</span>
      <span>
        Proactive transfers could save POP an estimated{" "}
        <strong>{fmt(data.annual_savings_estimate)} / year</strong> in chargeback penalties.
      </span>
    </div>
  )
}
