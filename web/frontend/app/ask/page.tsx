"use client"

import React, { useCallback, useEffect, useRef, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Send, MessageSquare } from "lucide-react"
import { API_BASE } from "@/lib/api"

type Role = "user" | "assistant"

interface ChatMessage {
  id: string
  role: Role
  content: string
  toolCalls?: string[]
  unverified?: boolean
}

const nextId = () => Math.random().toString(36).slice(2)

function AskContent() {
  const params = useSearchParams()
  const initialQ = params.get("q") ?? ""

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const autoSentRef = useRef(false)
  const sendMessageRef = useRef<(text: string) => Promise<void>>(async () => {})

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
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

      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))
      abortRef.current = new AbortController()

      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, page_context: { path: "/ask" } }),
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

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
            try { event = JSON.parse(part.slice(6)) } catch { continue }

            if (event.type === "token") {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: last.content + (event.content as string) }
                }
                return updated
              })
              scrollToBottom()
            } else if (event.type === "tool_start") {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, toolCalls: [...(last.toolCalls ?? []), event.name as string] }
                }
                return updated
              })
            } else if (event.type === "warning") {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") updated[updated.length - 1] = { ...last, unverified: true }
                return updated
              })
            } else if (event.type === "error") {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: `Error: ${event.message}` }
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
    [messages, streaming, scrollToBottom]
  )

  sendMessageRef.current = sendMessage

  // Auto-send ?q= on first mount
  useEffect(() => {
    if (initialQ && !autoSentRef.current) {
      autoSentRef.current = true
      sendMessageRef.current(initialQ)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">POP Inventory Assistant</h1>
            <p className="text-xs text-slate-500">Ask about inventory, chargebacks, or transfer decisions</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center pt-16">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-slate-700 font-medium mb-1">Ask anything about your inventory</p>
              <p className="text-slate-400 text-sm mb-6">Powered by local Ollama — no data leaves your network</p>
              <div className="flex flex-col gap-2 items-center">
                {["What's my #1 action today?", "Which SKUs are critical right now?", "How much could we save on chargebacks?"].map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {msg.toolCalls.map((t, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-800 shadow-sm"
                }`}
              >
                {msg.content || (streaming && msg.role === "assistant"
                  ? <span className="animate-pulse text-slate-400">▋</span>
                  : null)}
              </div>
              {msg.unverified && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  ⚠ unverified — figures may not reflect live data
                </p>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-8 py-4 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
          className="max-w-2xl mx-auto flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about inventory, chargebacks, or transfers…"
            disabled={streaming}
            className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-slate-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AskPage() {
  return (
    <Suspense>
      <AskContent />
    </Suspense>
  )
}
