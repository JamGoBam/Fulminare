"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useParams } from "next/navigation"
import { MessageSquare, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { API_BASE } from "@/lib/api"

type Role = "user" | "assistant"

interface ChatMessage {
  id: number
  role: Role
  content: string
  toolCalls?: string[]
  unverified?: boolean
}

const SUGGESTIONS: Record<string, string[]> = {
  "/": ["What's my #1 action today?", "How much could we save?"],
  "/chargebacks": ["What's the top chargeback cause?", "Which customer has the highest exposure?"],
}

function getSuggestions(pathname: string): string[] {
  if (pathname.startsWith("/sku/")) return ["Why is this SKU flagged?", "Transfer or wait?"]
  return SUGGESTIONS[pathname] ?? SUGGESTIONS["/"]
}

let _id = 0
const nextId = () => ++_id

export function Chatbot() {
  const pathname = usePathname()
  const params = useParams()
  const sku = typeof params?.sku === "string" ? params.sku : null

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
  }, [])

  // Stable ref so the event listener never captures a stale sendMessage closure
  const sendMessageRef = useRef<(text: string) => Promise<void>>(async () => {})

  // Open chatbot with a pre-filled message dispatched from other components
  useEffect(() => {
    const handler = (e: Event) => {
      const { message } = (e as CustomEvent<{ message: string }>).detail
      setOpen(true)
      sendMessageRef.current(message)
    }
    window.addEventListener("chat:prefill", handler)
    return () => window.removeEventListener("chat:prefill", handler)
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return
      setInput("")

      const userMsg: ChatMessage = { id: nextId(), role: "user", content: text }
      const assistantMsg: ChatMessage = { id: nextId(), role: "assistant", content: "", toolCalls: [] }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreaming(true)
      scrollToBottom()

      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const body = JSON.stringify({
        messages: history,
        page_context: { path: pathname, sku },
      })

      abortRef.current = new AbortController()

      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const parts = buf.split("\n\n")
          buf = parts.pop() ?? ""

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue
            let event: Record<string, unknown>
            try {
              event = JSON.parse(part.slice(6))
            } catch {
              continue
            }

            if (event.type === "token") {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + (event.content as string),
                  }
                }
                return updated
              })
              scrollToBottom()
            } else if (event.type === "tool_start") {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    toolCalls: [...(last.toolCalls ?? []), event.name as string],
                  }
                }
                return updated
              })
            } else if (event.type === "warning") {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, unverified: true }
                }
                return updated
              })
            } else if (event.type === "error") {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: `Error: ${event.message}`,
                  }
                }
                return updated
              })
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === "assistant" && last.content === "") {
            updated[updated.length - 1] = { ...last, content: "Connection error. Please retry." }
          }
          return updated
        })
      } finally {
        setStreaming(false)
        scrollToBottom()
      }
    },
    [messages, pathname, sku, streaming, scrollToBottom]
  )

  // Keep ref in sync so the prefill event handler always calls the latest version
  sendMessageRef.current = sendMessage

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const suggestions = getSuggestions(pathname)

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" showCloseButton className="flex flex-col w-full sm:max-w-md p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-sm font-semibold">POP Inventory Assistant</SheetTitle>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Ask about inventory, chargebacks, or transfers.</p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="block w-full text-left text-xs px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {/* Tool call pills */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {msg.toolCalls.map((t, i) => (
                      <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.content || (streaming && msg.role === "assistant" ? (
                    <span className="animate-pulse">▋</span>
                  ) : null)}
                </div>
                {msg.unverified && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                    ⚠ unverified — figures may not reflect live data
                  </p>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t px-4 py-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about inventory or chargebacks…"
              disabled={streaming}
              className="flex-1 text-sm"
            />
            <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
