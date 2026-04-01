'use client'
import { useEffect, useState } from 'react'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskDetail } from '@/components/tasks/TaskDetail'
import type { Task } from '@/types'

function FirstTaskPrompt({ onCreated }: { onCreated: (task: Task) => void }) {
  const [company, setCompany] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const taskTitle = company.trim()
    ? `Help me prepare for a marketing interview at ${company.trim()}`
    : 'Help me prepare for a marketing interview at …'

  async function create() {
    if (!company.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: taskTitle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create task')
      onCreated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
      setCreating(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-full px-8">
      <div className="w-full max-w-sm">
        <p className="text-slate-200 font-semibold text-base mb-1">Create your first task</p>
        <p className="text-slate-500 text-sm mb-6">Which company are you interviewing at?</p>
        <input
          type="text"
          value={company}
          onChange={e => setCompany(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && company.trim() && create()}
          placeholder="e.g. Google, Oatly, Stripe…"
          autoFocus
          className="w-full bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-2.5 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-400/50 mb-3"
        />
        <div className="bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-3 mb-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Task preview</p>
          <p className={`text-sm ${company.trim() ? 'text-slate-200' : 'text-slate-600 italic'}`}>{taskTitle}</p>
        </div>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <button
          onClick={create}
          disabled={!company.trim() || creating}
          className="w-full bg-cyan-400 text-[#0f172a] font-bold text-sm py-2.5 rounded-lg disabled:opacity-30"
        >
          {creating ? 'Creating…' : 'Create task →'}
        </button>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTasks(d) })
      .finally(() => setLoading(false))
  }, [])

  const selected = tasks.find(t => t.id === selectedId) || null

  async function createTask() {
    const title = prompt('Task title')
    if (!title) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const task = await res.json()
    setTasks(prev => [task, ...prev])
    setSelectedId(task.id)
  }

  function handleFirstTask(task: Task) {
    setTasks([task])
    setSelectedId(task.id)
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-80px)] border border-[#1e2130] rounded-xl overflow-hidden">
      <TaskList
        tasks={tasks}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={createTask}
      />
      <div className="flex-1 border-l border-[#1e2130]">
        {selected
          ? <TaskDetail task={selected} onTaskUpdate={(updated) =>
              setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
            } />
          : !loading && tasks.length === 0
            ? <FirstTaskPrompt onCreated={handleFirstTask} />
            : <div className="flex items-center justify-center h-full text-slate-600 text-sm">Select a task to get started</div>
        }
      </div>
    </div>
  )
}
