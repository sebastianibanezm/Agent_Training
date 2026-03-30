'use client'
import { useEffect, useState } from 'react'
import type { Action, ActionStep, Task } from '@/types'

interface ApiUsageEvent {
  id: string
  step_id: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

interface ReportPanelProps {
  action: Action
  task: Task
}

export function ReportPanel({ action, task }: ReportPanelProps) {
  const [steps, setSteps] = useState<ActionStep[]>([])
  const [usage, setUsage] = useState<ApiUsageEvent[]>([])

  useEffect(() => {
    fetch(`/api/actions/${action.id}/steps`)
      .then(r => r.json())
      .then(setSteps)

    fetch(`/api/actions/${action.id}/usage`)
      .then(r => r.ok ? r.json() : [])
      .then(setUsage)
  }, [action.id])

  const originalRequest = action.conversation?.[0]?.content || '—'
  const totalCost = usage.reduce((sum, e) => sum + (e.cost_usd || 0), 0)

  function downloadReport() {
    const lines = [
      `# Task Report: ${task.title}`,
      '',
      `## Original Request`,
      originalRequest,
      '',
      `## Steps`,
      ...steps.map(s =>
        `### ${s.position}. ${s.title} (${s.executor_type})\n${s.output ? s.output.slice(0, 500) : 'No output'}`
      ),
      '',
      `## Cost`,
      `Total: $${totalCost.toFixed(4)} USD`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${task.title.slice(0, 40).replace(/\s+/g, '-')}-report.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-300">Completion Report</h3>
        <button
          onClick={downloadReport}
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-900 px-3 py-1.5 rounded-lg transition"
        >
          ↓ Download
        </button>
      </div>

      {/* Original Request */}
      <div className="mb-4 border border-[#1e2130] rounded-lg overflow-hidden">
        <div className="bg-[#161920] px-4 py-2.5 border-b border-[#1e2130]">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Original Request</span>
        </div>
        <div className="px-4 py-3 text-sm text-slate-300">{originalRequest}</div>
      </div>

      {/* Steps Summary */}
      <div className="mb-4 border border-[#1e2130] rounded-lg overflow-hidden">
        <div className="bg-[#161920] px-4 py-2.5 border-b border-[#1e2130]">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Steps Summary</span>
        </div>
        <div className="divide-y divide-[#1e2130]">
          {steps.map(step => (
            <div key={step.id} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-300">{step.position}. {step.title}</span>
                <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{step.executor_type}</span>
              </div>
              {step.output && (
                <p className="text-xs text-slate-500 line-clamp-3">{step.output}</p>
              )}
            </div>
          ))}
          {steps.length === 0 && (
            <div className="px-4 py-3 text-xs text-slate-600">No steps recorded</div>
          )}
        </div>
      </div>

      {/* Cost */}
      <div className="border border-[#1e2130] rounded-lg overflow-hidden">
        <div className="bg-[#161920] px-4 py-2.5 border-b border-[#1e2130]">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Cost</span>
        </div>
        <div className="px-4 py-3">
          <span className="text-2xl font-bold text-cyan-400">${totalCost.toFixed(4)}</span>
          <span className="text-xs text-slate-500 ml-2">USD</span>
        </div>
      </div>
    </div>
  )
}
