'use client'
import { useEffect, useState } from 'react'
import { AgentCard } from '@/components/agents/AgentCard'
import { AgentForm } from '@/components/agents/AgentForm'
import type { Agent } from '@/types'

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [editing, setEditing] = useState<Agent | null | 'new'>(null)

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(setAgents)
  }, [])

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onEdit={() => setEditing(agent)}
            onDelete={async () => {
              await fetch(`/api/agents/${agent.slug}`, { method: 'DELETE' })
              setAgents(prev => prev.filter(a => a.id !== agent.id))
            }}
          />
        ))}
      </div>

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
