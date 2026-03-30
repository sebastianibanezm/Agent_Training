'use client'
import { useEffect, useState } from 'react'
import { SkillCard } from '@/components/skills/SkillCard'
import { SkillForm } from '@/components/skills/SkillForm'
import type { Skill } from '@/types'

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
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
