'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Agent } from '@/types'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AgentTriggerModal } from './AgentTriggerModal'

interface AgentCardProps {
  agent: Agent
  onEdit: () => void
  onDelete: () => void
  onTaskCreated: () => void
}

export function AgentCard({ agent, onEdit, onDelete, onTaskCreated }: AgentCardProps) {
  const [showDelete, setShowDelete] = useState(false)
  const [showTrigger, setShowTrigger] = useState(false)
  const router = useRouter()

  return (
    <>
      <div className="bg-[#161920] border border-[#1e2130] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-bold text-white">{agent.name}</h3>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-white transition rounded" aria-label="Edit agent">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={() => setShowDelete(true)} className="p-1.5 text-slate-400 hover:text-red-400 transition rounded" aria-label="Delete agent">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>

        {agent.role && (
          <p className="text-xs text-slate-400 line-clamp-1">{agent.role}</p>
        )}

        {agent.goals && (
          <p className="text-xs text-slate-500 line-clamp-2">{agent.goals}</p>
        )}

        {/* Skill chips */}
        <div className="flex flex-wrap gap-1.5">
          {(agent.skill_slugs || []).length === 0 ? (
            <span className="text-[10px] text-slate-600">No skills assigned</span>
          ) : (
            (agent.skill_slugs || []).map(slug => (
              <span key={slug} className="text-[10px] font-medium bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                {slug}
              </span>
            ))
          )}
        </div>

        <button
          onClick={() => setShowTrigger(true)}
          className="w-full mt-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold py-2 rounded-lg border border-cyan-900 transition"
        >
          ▶ Run agent
        </button>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Delete agent"
        message={`Delete "${agent.name}"? This cannot be undone.`}
        onConfirm={() => { setShowDelete(false); onDelete() }}
        onCancel={() => setShowDelete(false)}
      />

      <AgentTriggerModal
        open={showTrigger}
        agent={agent}
        onClose={() => setShowTrigger(false)}
        onCreated={() => {
          setShowTrigger(false)
          onTaskCreated()
          router.push('/dashboard/tasks')
        }}
      />
    </>
  )
}
