'use client'
import { useEffect, useRef, useState } from 'react'
import type { Task, Action } from '@/types'
import { TaskPanel } from '@/components/tasks/TaskPanel'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface TaskDetailProps {
  task: Task
  onTaskUpdate: (updated: Task) => void
  onTaskDelete: (id: string) => void
}

export function TaskDetail({ task, onTaskUpdate, onTaskDelete }: TaskDetailProps) {
  const [action, setAction] = useState<Action | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const onTaskUpdateRef = useRef(onTaskUpdate)
  useEffect(() => { onTaskUpdateRef.current = onTaskUpdate }, [onTaskUpdate])

  useEffect(() => {
    setLoading(true)
    setAction(null)

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

  function handleActionUpdated(updated: Action) {
    setAction(updated)
    // Sync task status from action status where applicable
    if (updated.status === 'running' && task.status !== 'running') {
      onTaskUpdate({ ...task, status: 'running' })
    } else if (updated.status === 'done' && task.status !== 'done') {
      onTaskUpdate({ ...task, status: 'done' })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-600 text-sm">Loading…</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        message="This task and all its progress will be permanently deleted."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
          onTaskDelete(task.id)
        }}
      />

      {/* Header: title + delete */}
      <div className="px-6 py-4 border-b border-[#1e2130] flex items-start justify-between gap-3 flex-shrink-0">
        <h2 className="text-base font-bold text-slate-100 leading-snug">{task.title}</h2>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex-shrink-0 text-slate-600 hover:text-red-400 transition text-xs mt-0.5"
        >
          Delete
        </button>
      </div>

      {/* Panel area — relative so StepDetailPanel's absolute overlay works */}
      <div className="flex-1 overflow-hidden relative p-4">
        {action ? (
          <TaskPanel
            action={action}
            title={task.title}
            onActionUpdated={handleActionUpdated}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600 text-sm">
            No action found for this task.
          </div>
        )}
      </div>
    </div>
  )
}
