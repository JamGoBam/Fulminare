// Single source of truth for DC display labels.
// Canonical codes (DC_EAST/WEST/CENTRAL) stay in the DB, analytics, URLs,
// and chatbot tool interface. Only the human labels shown to users live here.
// Mirror of data/dc_labels.py — keep in sync.

export const DC_LABELS: Record<string, string> = {
  DC_WEST: "DC SF",      // San Francisco
  DC_CENTRAL: "DC LA",   // Los Angeles
  DC_EAST: "DC NJ",      // New Jersey
}

export const DC_CODES = ["DC_WEST", "DC_CENTRAL", "DC_EAST"] as const
export type DcCode = (typeof DC_CODES)[number]

export function dcLabel(code: string): string {
  return DC_LABELS[code] ?? code
}
