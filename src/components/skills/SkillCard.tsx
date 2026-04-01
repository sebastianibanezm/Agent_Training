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
      <div className="bg-[#161920] border border-[#1e2130] rounded-xl p-4 flex flex-col gap-3 hover:bg-[#1a1d27] transition-colors">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-bold text-white">{skill.name}</h3>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-white transition rounded" aria-label="Edit skill">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={() => setShowDelete(true)} className="p-1.5 text-slate-400 hover:text-red-400 transition rounded" aria-label="Delete skill">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>

        {skill.trigger && (
          <p className="text-sm text-slate-400 line-clamp-1">{skill.trigger}</p>
        )}

        {/* Section count indicators */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'Trigger', value: skill.trigger },
            { label: 'Instructions', value: skill.instructions },
            { label: 'Output Format', value: skill.output_format },
            { label: 'Example', value: skill.example_output },
          ].map(({ label, value }) => (
            <span key={label} className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              <span className={`w-1.5 h-1.5 rounded-full ${value ? 'bg-cyan-500' : 'bg-slate-600'}`} />
              {label}
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
