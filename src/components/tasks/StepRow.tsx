'use client'

import { ActionStep } from '@/types'

interface StepRowProps {
  step: ActionStep
  position: number
  isSelected: boolean
  onClick: () => void
}

function StatusIcon({ status }: { status: ActionStep['status'] }) {
  if (status === 'running') {
    return (
      <span className="animate-spin inline-block w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
    )
  }
  if (status === 'done' || status === 'completed') {
    return <span className="text-green-400 text-sm font-bold">✓</span>
  }
  if (status === 'error' || status === 'failed') {
    return <span className="text-red-400 text-sm font-bold">✗</span>
  }
  // pending
  return <span className="text-slate-500 text-sm">○</span>
}

export function StepRow({ step, position, isSelected, onClick }: StepRowProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-[#1e2130] transition ${
        isSelected
          ? 'bg-cyan-500/5 border-l-2 border-l-cyan-400'
          : 'hover:bg-[#1e2130]/50 border-l-2 border-l-transparent'
      }`}
    >
      {/* Position number */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1e2130] text-slate-400 text-xs flex items-center justify-center">
        {position}
      </div>

      {/* Title */}
      <span className="flex-1 text-sm text-slate-200 truncate min-w-0">{step.title}</span>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
          {step.skill_slug ?? 'none'}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-slate-600/30 whitespace-nowrap">
          {step.agent_slug ?? 'unassigned'}
        </span>
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        <StatusIcon status={step.status} />
      </div>
    </div>
  )
}
