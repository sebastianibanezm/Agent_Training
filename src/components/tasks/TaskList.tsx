'use client'
import type { Task } from '@/types'
import { TaskItem } from './TaskItem'

interface TaskListProps {
  tasks: Task[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  agentsMap: Record<string, string>
}

export function TaskList({ tasks, selectedId, onSelect, onCreate, agentsMap }: TaskListProps) {
  return (
    <div className="w-[280px] flex-shrink-0 bg-[#0d0f17] flex flex-col">
      <div className="px-4 py-4 border-b border-[#1e2130] flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Tasks</span>
        <button
          onClick={onCreate}
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
        >
          + New task
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-600 text-xs">No tasks yet</div>
        )}
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            isSelected={task.id === selectedId}
            onClick={() => onSelect(task.id)}
            agentsMap={agentsMap}
          />
        ))}
      </div>
    </div>
  )
}
