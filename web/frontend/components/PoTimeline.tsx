import type { ActionItem } from "@/lib/types"

interface PoTimelineProps {
  item: ActionItem
}

interface TimelineEvent {
  dot: "blue" | "amber" | "green"
  label: string
  detail: string
}

function deriveEvents(item: ActionItem): TimelineEvent[] {
  const events: TimelineEvent[] = []

  const days = item.daysUntilStockout
  const daysStr = days < 9999 ? `${Math.round(days)} days` : "unknown"

  events.push({
    dot: days <= 7 ? "amber" : "blue",
    label: "Current inventory status",
    detail: `${item.atRiskDC} has ${daysStr} of cover remaining at current demand rate.`,
  })

  if (item.inboundDetails.poEta !== "None scheduled") {
    const delayed = item.inboundDetails.complianceFlags.length > 0
    events.push({
      dot: delayed ? "amber" : "green",
      label: `Inbound PO ETA: ${item.inboundDetails.poEta}`,
      detail: delayed
        ? `PO is flagged for delay (+7d risk). Delay risk: ${item.inboundDetails.delayRisk}.`
        : `PO is on track. Delay risk: ${item.inboundDetails.delayRisk}.`,
    })
  } else {
    events.push({
      dot: "amber",
      label: "No inbound PO scheduled",
      detail: `No replenishment is scheduled for ${item.atRiskDC}. Transfer is the only coverage option.`,
    })
  }

  if (item.transferDetails.sourceDC !== "None available") {
    events.push({
      dot: "blue",
      label: `Transfer option: ${item.transferDetails.sourceDC} → ${item.atRiskDC}`,
      detail: `${item.transferDetails.unitsAvailable} units available. Arrives ${item.transferDetails.estimatedArrival} (${item.transferDetails.leadTime}).`,
    })
  }

  return events
}

const dotClass: Record<TimelineEvent["dot"], string> = {
  blue: "bg-blue-600",
  amber: "bg-amber-500",
  green: "bg-green-500",
}

export function PoTimeline({ item }: PoTimelineProps) {
  const events = deriveEvents(item)

  return (
    <div className="space-y-4">
      {events.map((evt, i) => (
        <div key={i} className="flex items-start gap-3 text-sm">
          <div className="flex flex-col items-center gap-1 shrink-0 mt-1">
            <div className={`w-2 h-2 rounded-full ${dotClass[evt.dot]}`} />
            {i < events.length - 1 && <div className="w-px h-4 bg-slate-200" />}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">{evt.label}</p>
            <p className="text-slate-700">{evt.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
