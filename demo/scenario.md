# Demo scenario (6–8 min walkthrough)

## Hero SKU
- **SKU**: `J-72402`
- **Product**: Totole Chicken Bouillon 2.2 lbs
- **DC split**: East 48 units available / West 6,094 units / Central 480 units
- **DC_EAST days-to-stockout**: 12 days → **Critical**
- **DC_WEST days-to-stockout**: 317 days (overstocked)

---

## 5-step walkthrough

**Step 1 — Dashboard opens (30s)**
- Point to savings banner: *"$717,665 / year in avoidable penalty exposure — identified by the system."*
- Point to red alert: *"2 SKU-DC pairs at critical inventory levels — immediate action required."*
- Point to stat bar: *"219 SKU-DC rows tracked | 2 Critical | 1 Watch | 8 Overstock"*

**Step 2 — Imbalance table: spot the problem (1m)**
- Scroll to J-72402 rows. Highlight:
  - DC_EAST: demand 4.00/day, DoS **12.0**, imbalance score **1.91**, badge **Critical**
  - DC_WEST: demand 19.20/day, DoS **317.4** (6,094 units sitting idle)
  - DC_CENTRAL: demand 3.20/day, DoS **150.0**
- *"Company-level stock looks fine — 219 SKU-DC rows tracked. But DC_EAST runs out of Totole Bouillon in 12 days."*

**Step 3 — Transfer recommendation card (1.5m)**
- Click J-72402 in the Action Queue. Recommendation panel opens on the right.
- Read the row verbatim:
  > *"Transfer 72 units DC_WEST → DC_EAST: **$420** freight.
  > Avoid projected **$115,826** in chargeback exposure. Net save **$115,406**."*
- *"The system made the call. The ops manager approves in one click."*

**Step 4 — Chargeback heatmap (1m)**
- Click **Chargeback Analysis** in the sidebar nav.
- Point to top cause: **MISSED_WINDOW — $2,764,629 total, 1,999 incidents**.
- Point to top customer table — MDO100A at top.
- *"MISSED_WINDOW and SHORT_SHIP dominate. Both are directly caused by the stockouts we just fixed."*
- Click **← Dashboard** to return.

**Step 5 — Annual savings close (30s)**
- Point back to the savings banner: *"$717,665 estimated annual saving — from proactive transfers vs. today's reactive process."*
- *"POP runs 800 active SKUs. The system is tracking 219 SKU-DC pairs today. Scale that system-wide: this is the $700K+ opportunity. From reactive post-audit to real-time. One dashboard."*

---

## Stage rules
- **No live coding. No terminal.** Browser only, pre-loaded.
- If a chart fails, refresh once; if still broken, read the numbers from the Transfer card.
- Rehearsal checklist: API on port 8000 ✓, frontend on port 3000 ✓, real data ingested ✓, `qwen2.5:7b-instruct` pulled ✓.
