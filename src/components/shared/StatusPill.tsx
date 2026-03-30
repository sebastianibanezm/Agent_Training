import type { TaskStatus } from '@/types'

const STYLES = {
  draft: 'bg-amber-950 text-amber-400 border border-amber-900',
  brainstorming: 'bg-purple-950 text-purple-400 border border-purple-900',
  planning: 'bg-blue-950 text-blue-400 border border-blue-900',
  running: 'bg-green-950 text-green-400 border border-green-900 animate-pulse',
  done: 'bg-green-950 text-green-400 border border-green-900',
} satisfies Record<TaskStatus, string>

export function StatusPill({ status }: { status: TaskStatus }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STYLES[status]}`}>
      {status}
    </span>
  )
}
