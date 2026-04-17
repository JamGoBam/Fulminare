# Demo scenario (6–8 min walkthrough) — DRAFT

*Fill in at end of Day 1 Block 8, once real data is loaded. Once filled, DO NOT CHANGE the SKU.*

## The hero SKU
- **SKU**: `<FILL>`
- **Product**: `<e.g. Ginger Chew Peach 3.5oz>`
- **Historical chargebacks on this SKU**: `$<FILL>` over `<FILL>` months
- **Current DC split**: East `<X>` / West `<Y>` / Central `<Z>` (units available)
- **Projected days-to-stockout at the starving DC**: `<FILL>`

## The story (6 min, in order)

1. **00:00 — Hook (30s)**. "POP loses ~$700K/year to preventable chargebacks. Here's one SKU that tells the whole story."
2. **00:30 — Before (1m)**. Walk the current manual process: current-day snapshot, buyer eyeballs it, misses the imbalance, order splits, penalty lands 8–12 months later in post-audit.
3. **01:30 — System detects (1m)**. Dashboard home → ImbalanceTable → click hero SKU. Show the 3-DC DoS numbers; red flag is visible.
4. **02:30 — Transfer card (1.5m)**. Read the card verbatim:
   > "Transfer `<N>` pallets `<origin>` → `<dest>`: **$<freight>** freight. Avoid projected **$<chargeback>** chargeback. **Net save $<save>.**"
5. **04:00 — Chargeback heatmap (1m)**. Zoom out: "This isn't one SKU. Here's the pattern across 9 channels. Short-ship and late-delivery dominate, concentrated in `<channel>`."
6. **05:00 — Before/After banner (30s)**. "System projects **$<annual>** avoided annually vs. manual baseline."
7. **05:30 — Close (30s)**. "From reactive to proactive. From 8-month lag to real-time. One dashboard an ops manager can run."

## Rules for stage
- **No live coding.**
- **No terminal.** Everything in the browser, already loaded.
- If a chart fails, refresh once; if it still fails, keep talking — the numbers are on the card.
- Who drives: `<name>`. Who narrates: `<name>`. Who closes: `<name>`.
