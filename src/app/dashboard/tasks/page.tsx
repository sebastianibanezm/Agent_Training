'use client'
import { useEffect, useState } from 'react'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskDetail } from '@/components/tasks/TaskDetail'
import type { Task } from '@/types'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tasks').then(r => r.json()).then(setTasks)
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
          : <div className="flex items-center justify-center h-full text-slate-600 text-sm">Select a task to get started</div>
        }
      </div>
    </div>
  )
}
