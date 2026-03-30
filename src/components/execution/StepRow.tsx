import type { ActionStep } from '@/types'

export function StepRow({ step, isActive, logLines }: {
  step: ActionStep
  isActive: boolean
  logLines: string[]
}) {
  return (
    <div className={`border border-[#1e2130] rounded-lg p-4 mb-2 ${
      step.status === 'done' ? 'opacity-60' :
      step.status === 'running' ? 'border-cyan-900 bg-[#0a1520]' : ''
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          step.status === 'done' ? 'bg-green-900 text-green-400' :
          step.status === 'running' ? 'bg-cyan-900 text-cyan-400' :
          step.status === 'error' ? 'bg-red-900 text-red-400' :
          'bg-slate-800 text-slate-500'
        }`}>
          {step.status === 'done' ? '✓' : step.status === 'error' ? '✗' : step.position}
        </div>
        <span className={`text-sm font-medium ${step.status === 'done' ? 'text-slate-500' : 'text-white'}`}>
          {step.title}
        </span>
        <span className="ml-auto text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
          {step.executor_type}
        </span>
      </div>
      {isActive && logLines.length > 0 && (
        <div className="mt-3 pl-9 font-mono text-xs text-cyan-400 space-y-0.5">
          {logLines.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
      {step.status === 'done' && step.output && (
        <div className="mt-2 pl-9 text-xs text-slate-500 line-clamp-2">{step.output}</div>
      )}
    </div>
  )
}
