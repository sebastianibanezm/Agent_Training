'use client'
import { useState } from 'react'
import type { Agent } from '@/types'

interface AgentTriggerModalProps {
  open: boolean
  agent: Agent
  onClose: () => void
  onCreated: () => void
}

export function AgentTriggerModal({ open, agent, onClose, onCreated }: AgentTriggerModalProps) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function submit() {
    if (!title.trim()) return
    setLoading(true)
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), agent_slug: agent.slug }),
      })
      setTitle('')
      onCreated()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#161920] border border-[#1e2130] rounded-xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-100">Run {agent.name}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm transition">✕</button>
        </div>
        <p className="text-xs text-slate-500 mb-3">What do you want to work on?</p>
        <input
          type="text"
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="e.g. Research Stripe for my PMM interview"
          className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 mb-4"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 transition">Cancel</button>
          <button
            onClick={submit}
            disabled={!title.trim() || loading}
            className="bg-cyan-500 text-slate-900 font-bold text-sm px-5 py-2 rounded-lg disabled:opacity-40 hover:bg-cyan-400 transition"
          >
            {loading ? 'Creating…' : 'Create task →'}
          </button>
        </div>
      </div>
    </div>
  )
}
