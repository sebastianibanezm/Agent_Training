'use client'
import { useState } from 'react'
import type { Skill } from '@/types'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface SkillCardProps {
  skill: Skill
  onEdit: () => void
  onDelete: () => void
}

export function SkillCard({ skill, onEdit, onDelete }: SkillCardProps) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div className="bg-[#161920] border border-[#1e2130] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-bold text-white">{skill.name}</h3>
          <div className="flex gap-2">
            <button onClick={onEdit} className="text-slate-500 hover:text-slate-300 text-xs transition">Edit</button>
            <button onClick={() => setShowDelete(true)} className="text-slate-500 hover:text-red-400 text-xs transition">Delete</button>
          </div>
        </div>

        {skill.trigger && (
          <p className="text-xs text-slate-400 line-clamp-2">{skill.trigger}</p>
        )}

        {/* Section count indicators */}
        <div className="flex flex-wrap gap-1.5">
          {['Trigger', 'Instructions', 'Output Format', 'Example Output'].map(section => (
            <span key={section} className="text-[10px] font-medium bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
              {section}
            </span>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Delete skill"
        message={`Delete "${skill.name}"? This will remove it from any agents using it.`}
        onConfirm={() => { setShowDelete(false); onDelete() }}
        onCancel={() => setShowDelete(false)}
      />
    </>
  )
}
