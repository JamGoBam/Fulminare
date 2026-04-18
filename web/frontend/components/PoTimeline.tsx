"use client"

export type TimelineEventType = "past" | "today" | "future" | "delayed"

export interface TimelineEvent {
  label: string
  date: string
  type: TimelineEventType
}

const DOT_COLORS: Record<TimelineEventType, string> = {
  past: "bg-slate-300 border-slate-300",
  today: "bg-blue-500 border-blue-500",
  future: "bg-green-500 border-green-500",
  delayed: "bg-amber-500 border-amber-500",
}

const LABEL_COLORS: Record<TimelineEventType, string> = {
  past: "text-slate-500",
  today: "text-blue-600 font-semibold",
  future: "text-green-700",
  delayed: "text-amber-700",
}

interface PoTimelineProps {
  arrivals: TimelineEvent[]
}

export function PoTimeline({ arrivals }: PoTimelineProps) {
  return (
    <div className="relative flex items-start justify-between gap-2 overflow-x-auto py-3 px-1">
      {/* connecting line */}
      <div className="absolute left-4 right-4 top-[22px] h-0.5 bg-slate-200" />

      {arrivals.map((evt, i) => (
        <div key={i} className="relative flex flex-col items-center gap-1 flex-1 min-w-14">
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 border-white z-10 ${DOT_COLORS[evt.type]}`}
          />
          <span className={`text-xs leading-tight text-center ${LABEL_COLORS[evt.type]}`}>
            {evt.label}
          </span>
          <span className="text-xs text-slate-400 text-center leading-tight">{evt.date}</span>
        </div>
      ))}
    </div>
  )
}
