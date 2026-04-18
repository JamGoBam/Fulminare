export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export interface SummaryData {
  manual_annual_penalty: number
  system_avoidable_annual: number
  delta: number
  pct_reduction: number
}

export interface AlertData {
  rank: number
  sku: string
  dc: string
  priority_score: number
  action?: string
  reason: string
  days_to_stockout?: number
  exposure_dollars: number
}

export function getSummary(): Promise<SummaryData> {
  return apiGet<SummaryData>("/api/summary")
}

export function getAlerts(limit = 10): Promise<AlertData[]> {
  return apiGet<AlertData[]>(`/api/recommendations/alerts?limit=${limit}`)
}
