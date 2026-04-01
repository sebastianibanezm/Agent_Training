'use client'
import { useEffect, useState } from 'react'
import { SkillCard } from '@/components/skills/SkillCard'
import { SkillForm } from '@/components/skills/SkillForm'
import type { Skill } from '@/types'

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Skill | null | 'new'>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/skills')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load skills')
        return res.json()
      })
      .then(setSkills)
      .catch(() => setError('Failed to load skills. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-white">Skills</h1>
        <button
          onClick={() => setEditing('new')}
          className="bg-cyan-500 text-slate-900 font-bold text-sm px-4 py-2 rounded-lg hover:bg-cyan-400 transition"
        >
          + New skill
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {!loading && skills.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center text-xl mb-4">
            🛠️
          </div>
          <h3 className="text-[15px] font-semibold text-slate-100 tracking-tight">Teach your agents new skills</h3>
          <p className="text-sm text-slate-400 leading-relaxed mt-2 max-w-[260px]">
            Skills are instructions that tell an agent how to do a specific type of work — research, writing, analysis.
          </p>
          <button
            onClick={() => setEditing('new')}
            className="mt-5 bg-cyan-500/12 text-cyan-400 border border-cyan-500/20 rounded-md px-4 py-2 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
          >
            + Create your first skill
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onEdit={() => setEditing(skill)}
              onDelete={async () => {
                const res = await fetch(`/api/skills/${skill.slug}`, { method: 'DELETE' })
                if (res.ok) {
                  setSkills(prev => prev.filter(s => s.id !== skill.id))
                } else {
                  setError('Failed to delete skill. Please try again.')
                }
              }}
            />
          ))}
        </div>
      )}

      {editing && (
        <SkillForm
          skill={editing === 'new' ? null : editing}
          onSave={(saved) => {
            setSkills(prev =>
              editing === 'new'
                ? [saved, ...prev]
                : prev.map(s => s.id === saved.id ? saved : s)
            )
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
