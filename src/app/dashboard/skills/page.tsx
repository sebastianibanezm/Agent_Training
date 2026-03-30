'use client'
import { useEffect, useState } from 'react'
import { SkillCard } from '@/components/skills/SkillCard'
import { SkillForm } from '@/components/skills/SkillForm'
import type { Skill } from '@/types'

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [editing, setEditing] = useState<Skill | null | 'new'>(null)

  useEffect(() => {
    fetch('/api/skills').then(r => r.json()).then(setSkills)
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map(skill => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onEdit={() => setEditing(skill)}
            onDelete={async () => {
              await fetch(`/api/skills/${skill.slug}`, { method: 'DELETE' })
              setSkills(prev => prev.filter(s => s.id !== skill.id))
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
