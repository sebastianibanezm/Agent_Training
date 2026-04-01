'use client'
import { useEffect, useMemo, useState } from 'react'
import { AgentCard } from '@/components/agents/AgentCard'
import { AgentForm } from '@/components/agents/AgentForm'
import type { Agent, Skill } from '@/types'

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Agent | null | 'new'>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/agents').then(r => r.json()),
      fetch('/api/skills').then(r => r.json()),
    ]).then(([agentsData, skillsData]) => {
      if (Array.isArray(agentsData)) setAgents(agentsData)
      if (Array.isArray(skillsData)) setSkills(skillsData)
    }).finally(() => setLoading(false))
  }, [])

  const skillsMap = useMemo(
    () => Object.fromEntries(skills.map(s => [s.slug, s.name])),
    [skills]
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-white">Agents</h1>
        <button
          onClick={() => setEditing('new')}
          className="bg-cyan-500 text-slate-900 font-bold text-sm px-4 py-2 rounded-lg hover:bg-cyan-400 transition"
        >
          + New agent
        </button>
      </div>

      {!loading && agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center text-xl mb-4">
            🤖
          </div>
          <h3 className="text-[15px] font-semibold text-slate-100 tracking-tight">Build your first AI agent</h3>
          <p className="text-sm text-slate-400 leading-relaxed mt-2 max-w-[260px]">
            Agents are AI workers with a defined role and skills. Create one and give it a task to run.
          </p>
          <button
            onClick={() => setEditing('new')}
            className="mt-5 bg-cyan-500/12 text-cyan-400 border border-cyan-500/20 rounded-md px-4 py-2 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
          >
            + Create your first agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              skillsMap={skillsMap}
              onEdit={() => setEditing(agent)}
              onDelete={async () => {
                const res = await fetch(`/api/agents/${agent.slug}`, { method: 'DELETE' })
                if (res.ok) {
                  setAgents(prev => prev.filter(a => a.id !== agent.id))
                } else {
                  alert('Failed to delete agent')
                }
              }}
              onTaskCreated={() => {}}
            />
          ))}
        </div>
      )}

      {editing && (
        <AgentForm
          agent={editing === 'new' ? null : editing}
          onSave={(saved) => {
            setAgents(prev =>
              editing === 'new'
                ? [saved, ...prev]
                : prev.map(a => a.id === saved.id ? saved : a)
            )
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
