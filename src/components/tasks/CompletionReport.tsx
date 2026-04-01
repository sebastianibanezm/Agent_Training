'use client'

import { Action, ActionStep } from '@/types'

interface CompletionReportProps {
  action: Action
  steps: ActionStep[]
  onClose: () => void
}

export default function CompletionReport({ action, steps, onClose }: CompletionReportProps) {
  const doneSteps = steps.filter(s => s.status === 'done' || s.status === 'completed')

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#161920] border border-[#1e2130] rounded-xl w-full max-w-lg shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#1e2130]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-lg font-bold">✓</span>
              <span className="text-slate-200 font-semibold text-base">Task Complete</span>
            </div>
            <p className="text-slate-400 text-sm leading-snug">
              {doneSteps.length} of {steps.length} steps completed
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors text-xl leading-none mt-0.5"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Steps */}
        <div className="overflow-y-auto max-h-96 divide-y divide-[#1e2130]">
          {steps.map((step, idx) => (
            <div key={step.id} className="px-5 py-3.5 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-500 text-xs shrink-0 font-mono">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-slate-200 text-sm font-medium truncate">
                    {step.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {step.skill_slug && (
                    <span className="text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 text-xs px-2 py-0.5 rounded-full font-mono">
                      {step.skill_slug}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      step.status === 'done' || step.status === 'completed'
                        ? 'text-green-400 bg-green-400/10'
                        : step.status === 'error' || step.status === 'failed'
                        ? 'text-red-400 bg-red-400/10'
                        : 'text-slate-400 bg-slate-400/10'
                    }`}
                  >
                    {step.status === 'done' || step.status === 'completed' ? '✓ done' : step.status}
                  </span>
                </div>
              </div>
              {step.output && (
                <p
                  className="text-slate-400 text-sm pl-7"
                  style={{
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}
                >
                  {step.output}
                </p>
              )}
            </div>
          ))}
          {steps.length === 0 && (
            <p className="px-5 py-6 text-slate-500 text-sm text-center">No steps recorded.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-[#1e2130]">
          <button
            onClick={onClose}
            className="bg-cyan-500 hover:bg-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
