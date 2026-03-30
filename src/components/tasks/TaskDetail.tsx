'use client'
import { useEffect, useRef, useState } from 'react'
import type { Task, Action } from '@/types'
import { BrainstormPanel } from '@/components/execution/BrainstormPanel'
import { ExecutionPanel } from '@/components/execution/ExecutionPanel'
import { ReportPanel } from '@/components/execution/ReportPanel'

type Tab = 'brainstorm' | 'execution' | 'report'

interface TaskDetailProps {
  task: Task
  onTaskUpdate: (updated: Task) => void
}

export function TaskDetail({ task, onTaskUpdate }: TaskDetailProps) {
  const [action, setAction] = useState<Action | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('brainstorm')
  const [loading, setLoading] = useState(true)
  const onTaskUpdateRef = useRef(onTaskUpdate)
  useEffect(() => { onTaskUpdateRef.current = onTaskUpdate }, [onTaskUpdate])

  useEffect(() => {
    setActiveTab(task.status === 'done' ? 'report' : task.status === 'running' ? 'execution' : 'brainstorm')
  }, [task.status])

  useEffect(() => {
    setLoading(true)

    // Load or create action
    fetch(`/api/actions?task_id=${task.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(async (existingAction) => {
        if (existingAction && !existingAction.error) {
          setAction(existingAction)
        } else if (task.status === 'draft') {
          // Auto-create action when opening a draft task
          const res = await fetch('/api/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: task.id }),
          })
          if (res.ok) {
            const newAction = await res.json()
            setAction(newAction)
            onTaskUpdateRef.current({ ...task, status: 'brainstorming' })
          }
        }
      })
      .finally(() => setLoading(false))
  }, [task.id])

  const tabs: { id: Tab; label: string; visible: boolean }[] = [
    { id: 'brainstorm', label: 'Brainstorm', visible: true },
    { id: 'execution', label: 'Execution', visible: task.status !== 'draft' },
    { id: 'report', label: 'Report', visible: task.status === 'done' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-600 text-sm">Loading…</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1e2130]">
        <h2 className="text-base font-bold text-slate-100 mb-3">{task.title}</h2>
        <div className="flex gap-1">
          {tabs.filter(t => t.visible).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'brainstorm' && action && (
          <BrainstormPanel
            action={action}
            task={task}
            onPlanAccepted={() => {
              onTaskUpdate({ ...task, status: 'running' })
              setActiveTab('execution')
            }}
          />
        )}
        {activeTab === 'execution' && action && (
          <ExecutionPanel
            action={action}
            task={task}
            onComplete={() => {
              onTaskUpdate({ ...task, status: 'done' })
              setActiveTab('report')
            }}
          />
        )}
        {activeTab === 'report' && action && (
          <ReportPanel action={action} task={task} />
        )}
      </div>
    </div>
  )
}
