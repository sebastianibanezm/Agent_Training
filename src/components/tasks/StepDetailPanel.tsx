'use client'
import { useEffect, useRef } from 'react'
import type { ActionStep } from '@/types'

interface StepDetailPanelProps {
  step: ActionStep | null
  logLines: string[]
  onClose: () => void
}

export function StepDetailPanel({ step, logLines, onClose }: StepDetailPanelProps) {
  const logRef = useRef<HTMLDivElement>(null)

  // Auto-scroll log to bottom when new lines arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logLines])

  if (step === null) return null

  const isRunning = step.status === 'running'
  const isDone = step.status === 'done' || step.status === 'completed'
  const isPending = step.status === 'pending'

  return (
    <div className="absolute left-0 top-0 h-full w-96 z-10 flex flex-col bg-[#0f1117] border-r border-[#1e2130] translate-x-0 transition-transform duration-200">
      {/* Header */}
      <div className="flex flex-col gap-2 px-4 py-4 border-b border-[#1e2130]">
        <div className="flex items-start justify-between gap-2">
          <span className="text-slate-200 text-sm font-medium leading-snug flex-1 min-w-0">
            {step.title}
          </span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors text-base leading-none mt-0.5 flex-shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {step.skill_slug && (
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs px-2 py-0.5 rounded">
              {step.skill_slug}
            </span>
          )}
          {step.agent_slug && (
            <span className="bg-slate-700/50 text-slate-400 border border-slate-600/30 text-xs px-2 py-0.5 rounded">
              {step.agent_slug}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Description — only shown when pending */}
        {isPending && step.description && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Description</p>
            <p className="text-slate-300 text-sm leading-relaxed">{step.description}</p>
          </div>
        )}

        {/* Log lines — shown when running */}
        {isRunning && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Executing</p>
            <div
              ref={logRef}
              className="font-mono text-xs text-cyan-300/80 overflow-y-auto max-h-64 space-y-0.5 bg-[#0a0d12] rounded p-2 border border-[#1e2130]"
            >
              {logLines.length === 0 ? (
                <span className="text-slate-600">Waiting for output…</span>
              ) : (
                logLines.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap break-words">{line}</div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Output — shown when done */}
        {isDone && step.output && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Output</p>
            <pre className="text-slate-300 text-xs whitespace-pre-wrap break-words leading-relaxed bg-[#0a0d12] rounded p-3 border border-[#1e2130] overflow-auto">
              {step.output}
            </pre>
          </div>
        )}

        {/* Error */}
        {step.status === 'error' || step.status === 'failed' ? (
          step.error && (
            <div>
              <p className="text-xs text-red-500/70 uppercase tracking-wide mb-1">Error</p>
              <pre className="text-red-400 text-xs whitespace-pre-wrap break-words leading-relaxed bg-red-900/10 rounded p-3 border border-red-500/20 overflow-auto">
                {step.error}
              </pre>
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
