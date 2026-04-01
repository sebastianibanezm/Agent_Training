'use client'
import { useState } from 'react'

interface Step6TaskProps {
  onFinish: () => Promise<void>
}

export function Step6Task({ onFinish }: Step6TaskProps) {
  const [company, setCompany] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const taskTitle = company.trim()
    ? `Help me prepare for a marketing interview at ${company.trim()}`
    : 'Help me prepare for a marketing interview at …'

  async function createTask() {
    if (!company.trim()) return
    setCreating(true)
    setError(null)
    try {
      const agentSlug = sessionStorage.getItem('wizard_agent_slug')
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: taskTitle, agent_slug: agentSlug || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create task')
      await onFinish()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
      setCreating(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-1">Create your first task</h2>
      <p className="text-sm text-slate-500 mb-6">
        Which company are you interviewing at? We'll create a research task for your agent.
      </p>

      <div className="mb-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Company name</label>
        <input
          type="text"
          value={company}
          onChange={e => setCompany(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && company.trim() && createTask()}
          placeholder="e.g. Google, Oatly, Stripe…"
          autoFocus
          className="w-full bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-2.5 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-400/50"
        />
      </div>

      {/* Task preview */}
      <div className="mb-6 bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Task preview</p>
        <p className={`text-sm ${company.trim() ? 'text-slate-200' : 'text-slate-600 italic'}`}>
          {taskTitle}
        </p>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="flex justify-between items-center">
        <button
          onClick={onFinish}
          className="text-xs text-slate-500 underline underline-offset-2"
        >
          Skip for now →
        </button>
        <button
          onClick={createTask}
          disabled={!company.trim() || creating}
          className="bg-cyan-400 text-[#0f172a] font-bold text-sm px-6 py-2.5 rounded-lg disabled:opacity-30"
        >
          {creating ? 'Creating…' : 'Create task →'}
        </button>
      </div>
    </div>
  )
}
