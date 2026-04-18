"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

export type ActionStatus = "approved" | "waiting" | "escalated" | "assigned"
type StatusMap = Record<string, ActionStatus>

interface ContextValue {
  statuses: StatusMap
  setStatus: (id: string, status: ActionStatus) => void
}

const ActionStatusCtx = createContext<ContextValue>({
  statuses: {},
  setStatus: () => {},
})

export function ActionStatusProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<StatusMap>({})

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pop:actions")
      if (raw) setStatuses(JSON.parse(raw))
    } catch {}
  }, [])

  function setStatus(id: string, status: ActionStatus) {
    setStatuses((prev) => {
      const next = { ...prev, [id]: status }
      try {
        sessionStorage.setItem("pop:actions", JSON.stringify(next))
      } catch {}
      return next
    })
  }

  return (
    <ActionStatusCtx.Provider value={{ statuses, setStatus }}>
      {children}
    </ActionStatusCtx.Provider>
  )
}

export function useActionStatus() {
  return useContext(ActionStatusCtx)
}
