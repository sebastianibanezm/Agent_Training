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
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const [showDelete, setShowDelete] = useState(false)
  const [showTrigger, setShowTrigger] = useState(false)
  const router = useRouter()

  return (
    <>
      <div className="bg-[#161920] border border-[#1e2130] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-bold text-white">{agent.name}</h3>
          <div className="flex gap-2">
            <button onClick={onEdit} className="text-slate-500 hover:text-slate-300 text-xs transition">Edit</button>
            <button onClick={() => setShowDelete(true)} className="text-slate-500 hover:text-red-400 text-xs transition">Delete</button>
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
          router.push('/dashboard/tasks')
        }}
      />
    </>
  )
}
