'use client'
import { useState } from 'react'
import type { Skill, ConversationMessage, ExecutorType } from '@/types'
import { EXECUTOR_TYPES } from '@/types'
import { SectionContainer } from '@/components/shared/SectionContainer'
import { ChatInput } from '@/components/shared/ChatInput'
import { slugify } from '@/lib/utils'

const EXECUTOR_DESCRIPTIONS: Record<string, string> = {
  research:   'Searches the web and synthesizes information',
  document:   'Creates structured documents and reports',
  draft:      'Writes first drafts of content',
  analyzer:   'Analyzes data, patterns, and insights',
  email:      'Composes professional email communications',
  comparison: 'Compares options and produces decision matrices',
  coach:      'Provides personalized coaching and feedback',
  flashcard:  'Creates study materials and flashcard sets',
}

interface SkillFormProps {
  skill: Skill | null
  onSave: (saved: Skill) => void
  onClose: () => void
}

interface SkillSections {
  trigger: string
  instructions: string
  output_format: string
  example_output: string
}

export function SkillForm({ skill, onSave, onClose }: SkillFormProps) {
  const [name, setName] = useState(skill?.name || '')
  const [executorType, setExecutorType] = useState<ExecutorType>(skill?.executor_type ?? 'draft')
  const [sections, setSections] = useState<SkillSections | null>(
    skill ? {
      trigger: skill.trigger,
      instructions: skill.instructions,
      output_format: skill.output_format,
      example_output: skill.example_output || '',
    } : null
  )
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function generate(description: string) {
    setGenerating(true)
    try {
      const res = await fetch('/api/setup/generate-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, conversation }),
      })
      if (!res.ok) {
        setConversation(prev => [
          ...prev,
          { role: 'user', content: description },
          { role: 'assistant', content: 'Failed to generate skill definition. Please try again.' },
        ])
        return
      }
      const result = await res.json()
      if (result.trigger) {
        setSections(result as SkillSections)
        setConversation(prev => [
          ...prev,
          { role: 'user', content: description },
          { role: 'assistant', content: JSON.stringify(result) },
        ])
      }
    } finally {
      setGenerating(false)
    }
  }

  async function save() {
    if (!sections || !name.trim()) return
    setSaving(true)
    try {
      const body = { name: name.trim(), executor_type: executorType, ...sections }
      const res = skill
        ? await fetch(`/api/skills/${skill.slug}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/skills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, slug: slugify(name.trim()) }),
          })
      if (res.ok) {
        const saved = await res.json()
        onSave(saved)
      } else {
        setSaveError('Failed to save skill. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-xl bg-[#0f1117] border-l border-[#1e2130] flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2130] flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-bold text-slate-100">{skill ? 'Edit Skill' : 'New Skill'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Competitive Research"
              className="w-full bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50"
            />
          </div>

          {/* Executor Type */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Executor Type</label>
            <select
              value={executorType}
              onChange={e => setExecutorType(e.target.value as ExecutorType)}
              className="w-full bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-400/50"
            >
              {EXECUTOR_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {executorType && EXECUTOR_DESCRIPTIONS[executorType] && (
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {EXECUTOR_DESCRIPTIONS[executorType]}
              </p>
            )}
          </div>

          {/* Chat thread */}
          {conversation.length > 0 && (
            <div className="space-y-2">
              {conversation.map((msg, i) => (
                <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/20 text-cyan-100'
                      : 'bg-[#161920] text-slate-400 border border-[#1e2130]'
                  }`}>
                    {msg.role === 'user' ? msg.content : '✓ Generated skill definition'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chat input */}
          <ChatInput
            onSubmit={generate}
            placeholder="Describe what you want this skill to do…"
            disabled={generating}
          />

          {/* Sections */}
          <SectionContainer label="Trigger" badge="auto-assigned" empty={!sections}>
            {sections?.trigger || ''}
          </SectionContainer>
          <SectionContainer label="Instructions" badge="editable" empty={!sections}>
            {sections?.instructions || ''}
          </SectionContainer>
          <SectionContainer label="Output Format" badge="editable" empty={!sections}>
            {sections?.output_format || ''}
          </SectionContainer>
          <SectionContainer label="Example Output" badge="reference" empty={!sections}>
            {sections?.example_output || ''}
          </SectionContainer>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e2130] flex-shrink-0 flex flex-col items-end gap-2">
          {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
          <button
            onClick={save}
            disabled={!sections || !name.trim() || saving}
            className="bg-cyan-400 text-[#0f172a] font-bold text-sm px-6 py-2.5 rounded-lg disabled:opacity-30 hover:bg-cyan-300 transition"
          >
            {saving ? 'Saving…' : 'Save skill'}
          </button>
        </div>
      </div>
    </div>
  )
}
