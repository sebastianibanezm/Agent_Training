'use client'
import { useState, useEffect } from 'react'
import type { Agent, Skill, ConversationMessage } from '@/types'
import { SectionContainer } from '@/components/shared/SectionContainer'
import { ChatInput } from '@/components/shared/ChatInput'
import { slugify } from '@/lib/utils'

const EXECUTOR_DESCRIPTIONS: Record<string, string> = {
  research: 'Searches the web and synthesizes information',
  document: 'Creates structured documents and reports',
  draft: 'Writes first drafts of content',
  analyzer: 'Analyzes data, patterns, and insights',
  email: 'Composes professional email communications',
  comparison: 'Compares options and produces decision matrices',
  coach: 'Provides personalized coaching and feedback',
  flashcard: 'Creates study materials and flashcard sets',
}

interface AgentFormProps {
  agent: Agent | null
  onSave: (saved: Agent) => void
  onClose: () => void
}

interface AgentSections {
  role: string
  goals: string
  constraints: string
}

export function AgentForm({ agent, onSave, onClose }: AgentFormProps) {
  const [name, setName] = useState(agent?.name || '')
  const [sections, setSections] = useState<AgentSections | null>(
    agent ? { role: agent.role, goals: agent.goals, constraints: agent.constraints } : null
  )
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [generating, setGenerating] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(agent?.skill_slugs || [])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [skillsError, setSkillsError] = useState(false)

  useEffect(() => {
    fetch('/api/skills').then(r => r.json()).then(setSkills).catch(() => {
      setSkillsError(true)
    })
  }, [])

  async function generate(description: string) {
    setGenerating(true)
    try {
      const res = await fetch('/api/setup/generate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, conversation }),
      })
      if (!res.ok) {
        setConversation(prev => [
          ...prev,
          { role: 'user', content: description },
          { role: 'assistant', content: 'Failed to generate agent definition. Please try again.' },
        ])
        return
      }
      const result = await res.json()
      if (result.role) {
        setSections(result as AgentSections)
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
    setSaveError(null)
    try {
      const body = { name: name.trim(), ...sections, skill_slugs: selectedSlugs }
      const res = agent
        ? await fetch(`/api/agents/${agent.slug}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, slug: slugify(name.trim()) }),
          })
      if (res.ok) {
        const saved = await res.json()
        onSave(saved)
      } else {
        setSaveError('Failed to save agent. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  function toggleSkill(slug: string) {
    setSelectedSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-xl bg-[#0f1117] border-l border-[#1e2130] flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2130] flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-bold text-slate-100">{agent ? 'Edit Agent' : 'New Agent'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Name */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-0.5 h-3.5 rounded-full bg-cyan-400/40 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-slate-300">Name</span>
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. The Researcher"
              className="w-full bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50"
            />
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
                    {msg.role === 'user' ? msg.content : '✓ Generated agent definition'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chat input */}
          <ChatInput
            onSubmit={generate}
            placeholder="Describe what you want this agent to do…"
            disabled={generating}
          />

          {/* Sections */}
          <SectionContainer label="Role" badge="auto-assigned" empty={!sections}>
            {sections?.role || ''}
          </SectionContainer>
          <SectionContainer label="Goals" badge="editable" empty={!sections}>
            {sections?.goals || ''}
          </SectionContainer>
          <SectionContainer label="Constraints" badge="editable" empty={!sections}>
            {sections?.constraints || ''}
          </SectionContainer>

          {/* Skills picker */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-0.5 h-3.5 rounded-full bg-cyan-400/40 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-slate-300">Skills</span>
            </div>
            {skillsError ? (
              <p className="text-xs text-red-400">Could not load skills</p>
            ) : skills.length === 0 ? (
              <p className="text-xs text-slate-600">No skills available — create skills first</p>
            ) : (
              <div className="space-y-1.5">
                {skills.map(skill => (
                  <label key={skill.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSlugs.includes(skill.slug)}
                      onChange={() => toggleSkill(skill.slug)}
                      className="accent-cyan-500"
                    />
                    <span className="text-xs text-slate-300">{skill.name}</span>
                    <span className="text-[10px] text-slate-600 truncate">{skill.trigger}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Tools reference */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-0.5 h-3.5 rounded-full bg-cyan-400/40 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-slate-300">Available Tools</span>
              <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900">reference</span>
            </div>
            <div className="space-y-1">
              {Object.entries(EXECUTOR_DESCRIPTIONS).map(([type, desc]) => (
                <div key={type} className="flex gap-2 text-xs">
                  <span className="font-mono text-cyan-400 w-20 flex-shrink-0">{type}</span>
                  <span className="text-slate-500">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e2130] flex-shrink-0 flex flex-col items-end gap-2">
          {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
          <button
            onClick={save}
            disabled={!sections || !name.trim() || saving}
            className="bg-cyan-400 text-[#0f172a] font-bold text-sm px-6 py-2.5 rounded-lg disabled:opacity-30 hover:bg-cyan-300 transition"
          >
            {saving ? 'Saving…' : 'Save agent'}
          </button>
        </div>
      </div>
    </div>
  )
}
