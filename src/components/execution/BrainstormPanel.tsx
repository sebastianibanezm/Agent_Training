'use client'
import { useState, useRef, useEffect } from 'react'
import type { Action, Task, ConversationMessage } from '@/types'
import { ChatInput } from '@/components/shared/ChatInput'

interface BrainstormPanelProps {
  action: Action
  task: Task
  onPlanAccepted: () => void
}

export function BrainstormPanel({ action, task, onPlanAccepted }: BrainstormPanelProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>(action.conversation || [])
  const [streaming, setStreaming] = useState(false)
  const [hasPlan, setHasPlan] = useState(false)
  const [stepCount, setStepCount] = useState(0)
  const [accepting, setAccepting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    const userMsg: ConversationMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)
    setHasPlan(false)

    let assistantContent = ''
    const assistantMsg: ConversationMessage = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch(`/api/actions/${action.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'delta') {
              assistantContent += data.content
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                return updated
              })
            }
            if (data.type === 'done') {
              setHasPlan(data.hasPlan)
              setStepCount(data.stepCount)
            }
          } catch {
            // skip malformed line
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      setStreaming(false)
    }
  }

  async function acceptPlan() {
    setAccepting(true)
    try {
      const res = await fetch(`/api/actions/${action.id}/accept-plan`, { method: 'POST' })
      if (res.ok) {
        onPlanAccepted()
      }
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-slate-600 text-sm text-center py-8">
            Start by describing what you want to accomplish.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-cyan-500/20 text-cyan-100 rounded-br-none'
                : 'bg-[#161920] text-slate-300 rounded-bl-none border border-[#1e2130]'
            }`}>
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Plan acceptance bar */}
      {hasPlan && !streaming && (
        <div className="px-6 py-3 border-t border-[#1e2130] bg-[#0a1a10] flex items-center justify-between">
          <span className="text-sm text-green-400 font-medium">
            Plan ready — {stepCount} step{stepCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={acceptPlan}
            disabled={accepting}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold text-sm px-5 py-2 rounded-lg transition"
          >
            {accepting ? 'Accepting…' : `Accept plan & run (${stepCount} steps)`}
          </button>
        </div>
      )}

      {/* Chat input */}
      <div className="px-6 py-4 border-t border-[#1e2130]">
        <ChatInput
          onSubmit={sendMessage}
          placeholder={task.agent_slug ? `Ask ${task.agent_slug}…` : 'Describe what you want to accomplish…'}
          disabled={streaming}
        />
      </div>
    </div>
  )
}
