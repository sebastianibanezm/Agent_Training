'use client'
import { useEffect, useState, useCallback } from 'react'
import type { Action, ActionStep, Task } from '@/types'
import { StepRow } from './StepRow'

interface ExecutionPanelProps {
  action: Action
  task: Task
  onComplete: () => void
}

export function ExecutionPanel({ action, task, onComplete }: ExecutionPanelProps) {
  const [steps, setSteps] = useState<ActionStep[]>([])
  const [logLines, setLogLines] = useState<Record<string, string[]>>({})
  const [running, setRunning] = useState(false)

  const addLogLine = useCallback((stepId: string, line: string) => {
    setLogLines(prev => ({
      ...prev,
      [stepId]: [...(prev[stepId] || []), line],
    }))
  }, [])

  async function runChain(currentSteps: ActionStep[]) {
    setRunning(true)
    for (const step of currentSteps) {
      if (step.status !== 'pending') continue

      await new Promise<void>((resolve, reject) => {
        const sse = new EventSource(`/api/actions/${action.id}/steps/${step.id}/events`)
        sse.onmessage = (e) => {
          const event = JSON.parse(e.data)
          if (event.type === 'log') addLogLine(step.id, event.content)
          if (event.type === 'done') {
            sse.close()
            setSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done' } : s))
            resolve()
          }
          if (event.type === 'error') {
            sse.close()
            setSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'error' } : s))
            reject(new Error(event.content))
          }
        }
        sse.onerror = () => { sse.close(); reject(new Error('SSE connection failed')) }

        // Call execute AFTER SSE is open
        fetch(`/api/actions/${action.id}/execute`, { method: 'POST' })
          .catch(reject)
      })
    }
    setRunning(false)
    onComplete()
  }

  useEffect(() => {
    fetch(`/api/actions/${action.id}/steps`)
      .then(r => r.ok ? r.json() : [])
      .then((fetchedSteps: ActionStep[]) => {
        setSteps(fetchedSteps)
      })
  }, [action.id, task.status])

  const hasRunningStep = steps.some(s => s.status === 'running')
  const hasPendingStep = steps.some(s => s.status === 'pending')
  const showResume = task.status === 'running' && !hasRunningStep && hasPendingStep && !running

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {steps.length === 0 && (
          <div className="text-slate-600 text-sm text-center py-8">No steps yet</div>
        )}
        {steps.map(step => (
          <StepRow
            key={step.id}
            step={step}
            isActive={step.status === 'running'}
            logLines={logLines[step.id] || []}
          />
        ))}
      </div>
      {showResume && (
        <div className="px-6 py-4 border-t border-[#1e2130]">
          <button
            onClick={() => runChain(steps)}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-sm py-2.5 rounded-lg transition"
          >
            Resume execution
          </button>
        </div>
      )}
    </div>
  )
}
