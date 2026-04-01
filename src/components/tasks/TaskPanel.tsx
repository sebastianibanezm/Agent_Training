'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Action, ActionStep } from '@/types'
import { StepRow } from './StepRow'
import { StepDetailPanel } from './StepDetailPanel'
import { TaskChat } from './TaskChat'
import CompletionReport from './CompletionReport'

interface TaskPanelProps {
  action: Action
  onActionUpdated: (action: Action) => void
}

function StatusPill({ status }: { status: Action['status'] }) {
  const map: Record<Action['status'], { label: string; className: string }> = {
    brainstorming: { label: 'Brainstorming', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
    ready:         { label: 'Ready',         className: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
    running:       { label: 'Running',        className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    done:          { label: 'Done',           className: 'bg-green-500/10 text-green-400 border border-green-500/20' },
    paused:        { label: 'Paused',         className: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
  }
  const { label, className } = map[status] ?? map.brainstorming
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${className}`}>
      {label}
    </span>
  )
}

export function TaskPanel({ action: initialAction, onActionUpdated }: TaskPanelProps) {
  const [action, setAction] = useState<Action>(initialAction)
  const [steps, setSteps] = useState<ActionStep[]>([])
  const [selectedStep, setSelectedStep] = useState<ActionStep | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const [showReport, setShowReport] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sseRef = useRef<EventSource | null>(null)
  const actionRef = useRef(action)
  useEffect(() => { actionRef.current = action }, [action])

  // ── helpers ───────────────────────────────────────────────────────────────

  const fetchSteps = useCallback(async (): Promise<ActionStep[]> => {
    const res = await fetch(`/api/actions/${action.id}/steps`)
    if (!res.ok) return []
    const data = await res.json() as ActionStep[]
    setSteps(data)
    // Keep selectedStep in sync with fresh data
    setSelectedStep(prev => prev ? (data.find(s => s.id === prev.id) ?? null) : null)
    return data
  }, [action.id])

  const updateAction = useCallback((updated: Action) => {
    setAction(updated)
    onActionUpdated(updated)
  }, [onActionUpdated])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      await fetchSteps()
      // Also refresh action status
      const res = await fetch(`/api/actions/${actionRef.current.id}`)
      if (res.ok) {
        const fresh: Action = await res.json()
        if (fresh.status !== actionRef.current.status) {
          updateAction(fresh)
          if (fresh.status === 'done') {
            stopPolling()
          }
        }
      }
    }, 2000)
  }, [fetchSteps, stopPolling, updateAction])

  const openStepSSE = useCallback((stepId: string) => {
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }
    setLogLines([])

    const es = new EventSource(`/api/actions/${action.id}/steps/${stepId}/events`)
    sseRef.current = es

    es.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data) as { type?: string; content?: string }
        const eventType = raw.type ?? ''
        const content = raw.content ?? ''
        if (eventType === 'log') {
          setLogLines(prev => [...prev, content])
        } else if (eventType === 'done' || eventType === 'error') {
          es.close()
          sseRef.current = null
          fetchSteps()
        }
      } catch { /* ignore parse errors */ }
    }
    es.onerror = () => {
      es.close()
      sseRef.current = null
    }
  }, [action.id, fetchSteps])

  // ── execute loop ──────────────────────────────────────────────────────────

  const handleExecute = useCallback(async () => {
    if (isExecuting) return
    setIsExecuting(true)

    // Mark action as running optimistically
    const runningAction: Action = { ...action, status: 'running' }
    updateAction(runningAction)
    startPolling()

    try {
      let done = false
      while (!done) {
        const res = await fetch(`/api/actions/${action.id}/execute`, { method: 'POST' })
        if (!res.ok) break

        const result = await res.json() as { stepId: string; done: boolean }
        const { stepId, done: stepDone } = result

        // Open SSE for the step that just started running
        if (stepId) {
          // Fetch fresh steps to avoid stale closure over the steps state variable
          const freshSteps = await fetchSteps()
          setSelectedStep(prev => {
            const match = freshSteps.find(s => s.id === stepId)
            return match ?? prev
          })
          openStepSSE(stepId)
          // Wait for the SSE stream to close (step done) before firing next execute
          await new Promise<void>((resolve) => {
            const check = setInterval(() => {
              if (!sseRef.current) {
                clearInterval(check)
                resolve()
              }
            }, 500)
          })
        }

        done = stepDone
      }
    } finally {
      setIsExecuting(false)
      fetchSteps()
    }
  }, [isExecuting, action, updateAction, startPolling, openStepSSE, fetchSteps])

  // ── lifecycle ─────────────────────────────────────────────────────────────

  // Fetch steps on mount
  useEffect(() => {
    fetchSteps()
  }, [fetchSteps])

  // Start polling if already running on mount
  useEffect(() => {
    if (action.status === 'running') {
      startPolling()
    }
    return () => {
      stopPolling()
      sseRef.current?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop polling when action reaches done
  useEffect(() => {
    if (action.status === 'done') {
      stopPolling()
    }
  }, [action.status, stopPolling])

  // Sync action when prop changes from parent (e.g. parent fetches fresh data)
  useEffect(() => {
    setAction(initialAction)
  }, [initialAction])

  // ── plan accepted ─────────────────────────────────────────────────────────

  const handlePlanAccepted = useCallback(async () => {
    // Re-fetch steps (accept-plan created them in DB) and refresh action
    await fetchSteps()
    const res = await fetch(`/api/actions/${action.id}`)
    if (res.ok) {
      const fresh: Action = await res.json()
      updateAction(fresh)
    }
  }, [action.id, fetchSteps, updateAction])

  // ── step selection ────────────────────────────────────────────────────────

  const handleStepClick = useCallback((step: ActionStep) => {
    if (selectedStep?.id === step.id) {
      setSelectedStep(null)
      setLogLines([])
    } else {
      setSelectedStep(step)
      setLogLines([])
      // If step is running, open SSE for it
      if (step.status === 'running') {
        openStepSSE(step.id)
      }
    }
  }, [selectedStep, openStepSSE])

  // ── footer ────────────────────────────────────────────────────────────────

  const footer =
    action.status === 'ready' ? (
      <button
        onClick={handleExecute}
        disabled={isExecuting}
        className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-bold text-sm transition"
      >
        Execute
      </button>
    ) : action.status === 'running' ? (
      <button
        disabled
        className="w-full py-2.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold text-sm cursor-not-allowed"
      >
        Running…
      </button>
    ) : action.status === 'done' ? (
      <button
        onClick={() => setShowReport(true)}
        className="w-full py-2.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 font-semibold text-sm transition"
      >
        View Report
      </button>
    ) : null

  const showSteps = action.status !== 'brainstorming'
  const chatCollapsed = action.status !== 'brainstorming'

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#161920] border border-[#1e2130] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#1e2130] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <StatusPill status={action.status} />
        </div>
        {action.status === 'done' && (
          <button
            onClick={() => setShowReport(true)}
            className="text-xs text-green-400 hover:text-green-300 transition"
          >
            View Report
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
        {/* StepDetailPanel — absolute overlay */}
        <StepDetailPanel
          step={selectedStep}
          logLines={logLines}
          onClose={() => {
            setSelectedStep(null)
            setLogLines([])
          }}
        />

        {/* Steps list */}
        {showSteps && steps.length > 0 && (
          <div className="flex-shrink-0 overflow-y-auto max-h-64 border-b border-[#1e2130]">
            {steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                position={i + 1}
                isSelected={selectedStep?.id === step.id}
                onClick={() => handleStepClick(step)}
              />
            ))}
          </div>
        )}

        {/* Chat */}
        <div className={`flex-1 min-h-0 ${chatCollapsed ? 'flex items-start px-4 py-3' : 'flex flex-col'}`}>
          <TaskChat
            action={action}
            onPlanAccepted={handlePlanAccepted}
            collapsed={chatCollapsed}
          />
        </div>
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-4 py-3 border-t border-[#1e2130] flex-shrink-0">
          {footer}
        </div>
      )}

      {/* Completion Report modal */}
      {showReport && action.status === 'done' && (
        <CompletionReport
          action={action}
          steps={steps}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
