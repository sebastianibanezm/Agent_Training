'use client'
import type { Task } from '@/types'
import { StatusPill } from '@/components/shared/StatusPill'

interface TaskItemProps {
  task: Task
  isSelected: boolean
  onClick: () => void
  agentsMap: Record<string, string>
}

export function TaskItem({ task, isSelected, onClick, agentsMap }: TaskItemProps) {
  const subText = task.status === 'brainstorming' ? 'In dialogue…'
    : task.status === 'running' ? 'Running…'
    : task.status === 'done' ? 'Completed'
    : null

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-[#1e2130] hover:bg-[#1a1d27] transition ${
        isSelected ? 'border-l-2 border-l-cyan-400 bg-[#161920]' : 'border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm text-slate-200 font-medium leading-tight line-clamp-2">{task.title}</span>
        <StatusPill status={task.status} />
      </div>
      {task.agent_slug && (
        <div className="text-[10px] text-slate-600 mt-0.5">{agentsMap[task.agent_slug] ?? task.agent_slug}</div>
      )}
      {subText && (
        <div className="text-[10px] text-slate-500 mt-0.5">{subText}</div>
      )}
    </button>
  )
}
