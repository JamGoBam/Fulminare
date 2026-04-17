# Demo scenario (6–8 min walkthrough)

## Hero SKU
- **SKU**: `SKU-004`
- **Product**: Reishi Mushroom Capsules 60ct
- **DC split**: East 50 units / West 10 units / Central 300 units (available)
- **DC_EAST days-to-stockout**: 10 days → **Critical**
- **DC_WEST days-to-stockout**: 20 days → **Warning**

---

## 5-step walkthrough

**Step 1 — Dashboard opens (30s)**
- Point to green banner: *"$10,800 / year in chargeback penalties — avoidable."*
- Point to red alert: *"1 SKU-DC pair at critical levels right now."*

**Step 2 — Imbalance table: spot the problem (1m)**
- Scroll to SKU-004 rows. Highlight:
  - DC_EAST: demand 5.00/day, DoS **10.0**, imbalance score **10.00**, badge **Critical**
  - DC_WEST: demand 0.50/day, DoS **20.0**, badge **Warning**
  - DC_CENTRAL: demand 0.00/day, DoS **—** (300 units sitting idle)
- *"All three DCs roll up to healthy company-level stock — but DC_EAST runs out in 10 days."*

**Step 3 — Transfer recommendation card (1.5m)**
- Scroll to Transfer Recommendations card.
- Read the row verbatim:
  > *"Transfer 108 units DC_CENTRAL → DC_EAST: **$600** freight.
  > Avoid projected **$1,500** chargeback. Net save **$900**."*
- *"The system made the call. The ops manager approves in one click."*

**Step 4 — Chargeback heatmap (1m)**
- Click **Chargeback Analysis →** in the header nav.
- Point to SHORT_SHIP row: DC_EAST = **$970**, DC_WEST = **$680** — top cause.
- *"SHORT_SHIP and LATE_DELIVERY dominate. Both are directly caused by the stockout we just fixed."*
- Click **← Dashboard** to return.

**Step 5 — Annual savings close (30s)**
- Point back to the green banner: *"$10,800 estimated annual saving — from one proactive transfer."*
- *"POP runs 800 active SKUs. Scale that system-wide: this is the $700K opportunity. From reactive post-audit to real-time. One dashboard."*

---

## Stage rules
- **No live coding. No terminal.** Browser only, pre-loaded.
- If a chart fails, refresh once; if still broken, read the numbers from the Transfer card.
- Rehearsal checklist: API on port 8000 ✓, frontend on port 3000 ✓, seed data ingested ✓.
