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

export function getActionItems(): Promise<import("./types").ActionItem[]> {
  return apiGet("/api/action-items")
}

export interface InventorySummaryData {
  total: number
  critical: number
  watch: number
  healthy: number
  overstock: number
}

export interface ImbalanceRow {
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

export function getInventorySummary(): Promise<InventorySummaryData> {
  return apiGet<InventorySummaryData>("/api/inventory/summary")
}

export function getInventoryImbalance(top = 1000): Promise<ImbalanceRow[]> {
  return apiGet<ImbalanceRow[]>(`/api/inventory/imbalance?top=${top}`)
}
