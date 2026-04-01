'use client'

import { useEffect, useRef, useState } from 'react'
import type { Action, ConversationMessage } from '@/types'

interface TaskChatProps {
  action: Action
  onPlanAccepted: () => void
  collapsed?: boolean
  title?: string
}

function detectPlan(content: string): { hasPlan: boolean; stepCount: number } {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (Array.isArray(parsed.plan)) {
        return { hasPlan: true, stepCount: parsed.plan.length }
      }
    } catch {}
  }
  return { hasPlan: false, stepCount: 0 }
}

export function TaskChat({ action, onPlanAccepted, collapsed = false, title }: TaskChatProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>(action.conversation ?? [])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasPlan, setHasPlan] = useState(false)
  const [planStepCount, setPlanStepCount] = useState(0)
  const [isAccepting, setIsAccepting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoSentRef = useRef(false)

  // Detect plan from existing conversation on mount
  useEffect(() => {
    const lastAssistant = [...(action.conversation ?? [])].reverse().find(m => m.role === 'assistant')
    if (lastAssistant) {
      const { hasPlan: hp, stepCount } = detectPlan(lastAssistant.content)
      if (hp) {
        setHasPlan(true)
        setPlanStepCount(stepCount)
      }
    }
  }, [])

  // Auto-send task title as opening message when conversation is brand new
  useEffect(() => {
    if (autoSentRef.current) return
    if ((action.conversation ?? []).length === 0 && title) {
      autoSentRef.current = true
      sendMessage(title)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  async function sendMessage(text?: string) {
    const trimmed = (text ?? input).trim()
    if (!trimmed || isStreaming) return

    const userMsg: ConversationMessage = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    if (!text) setInput('')
    setIsStreaming(true)

    try {
      const res = await fetch(`/api/actions/${action.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })

      if (!res.ok || !res.body) {
        setIsStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMsg: ConversationMessage = { role: 'assistant', content: '' }
      setMessages(prev => [...prev, assistantMsg])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const event = JSON.parse(raw)

            if (event.type === 'delta') {
              assistantContent += event.content
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                return updated
              })
            } else if (event.type === 'done') {
              // API already tells us hasPlan and stepCount
              if (event.hasPlan) {
                setHasPlan(true)
                setPlanStepCount(event.stepCount)
              } else {
                // Still check client-side in case API doesn't signal
                const { hasPlan: hp, stepCount } = detectPlan(assistantContent)
                if (hp) {
                  setHasPlan(true)
                  setPlanStepCount(stepCount)
                }
              }
              setIsStreaming(false)
            } else if (event.type === 'error') {
              setIsStreaming(false)
            }
          } catch {}
        }
      }
    } catch {
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  async function handleAcceptPlan() {
    setIsAccepting(true)
    try {
      const res = await fetch(`/api/actions/${action.id}/accept-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: messages }),
      })
      if (res.ok) {
        onPlanAccepted()
      }
    } finally {
      setIsAccepting(false)
    }
  }

  if (collapsed) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#161920] border border-[#1e2130] text-slate-400 text-sm">
        <span>💬</span>
        <span>Plan accepted — chat collapsed</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-8">
            Describe what you want to accomplish and the agent will help you plan it.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'user' ? (
              <div className="max-w-[75%] rounded-xl px-4 py-2 text-sm bg-cyan-500/10 text-slate-200 border border-cyan-500/20">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[85%] text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="text-sm text-slate-500 flex items-center gap-1">
              <span>Agent is thinking</span>
              <span className="inline-flex gap-0.5">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Plan accepted bar */}
      {hasPlan && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-4 py-2">
          <span className="text-sm text-cyan-300">
            Plan ready — {planStepCount} {planStepCount === 1 ? 'step' : 'steps'}
          </span>
          <button
            onClick={handleAcceptPlan}
            disabled={isAccepting}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-bold text-sm transition"
          >
            {isAccepting ? 'Accepting…' : 'Accept & Run'}
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 pt-1">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to accomplish..."
            disabled={isStreaming}
            rows={2}
            className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-900 font-bold rounded-lg text-sm transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
