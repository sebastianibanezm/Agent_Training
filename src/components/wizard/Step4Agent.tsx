'use client'
import { useState } from 'react'
import { SectionContainer } from '@/components/shared/SectionContainer'
import { slugify } from '@/lib/utils'
import type { ConversationMessage } from '@/types'

interface Step4AgentProps {
  onNext: (slug: string | null) => void
}

interface AgentSections {
  role: string
  goals: string
  constraints: string
}

export function Step4Agent({ onNext }: Step4AgentProps) {
  const [agentName, setAgentName] = useState('The Researcher')
  const [description, setDescription] = useState(
    "I want an agent that helps me prepare for marketing job interviews. It should research companies I'm applying to, find their recent campaigns and marketing strategy, identify the key people I'll meet, and help me craft smart questions and talking points that show I've done my homework."
  )
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [sections, setSections] = useState<AgentSections | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (!description.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/setup/generate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, conversation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setConversation(prev => [
        ...prev,
        { role: 'user', content: description },
        { role: 'assistant', content: JSON.stringify(data) },
      ])
      setSections(data)
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function save() {
    if (!sections) return
    setSaving(true)
    setError(null)
    try {
      const slug = slugify(agentName)
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name: agentName, ...sections, skill_slugs: [] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save agent')
      onNext(data.slug ?? slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agent')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-1">Create your first agent</h2>
      <p className="text-sm text-slate-500 mb-6">Describe what you want it to do and we'll generate its configuration.</p>

      {/* Agent name */}
      <div className="mb-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Agent name</label>
        <input
          type="text"
          value={agentName}
          onChange={e => setAgentName(e.target.value)}
          className="w-full bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-400/50"
        />
      </div>

      {/* Section previews */}
      <div className="mb-4">
        <SectionContainer label="Role" badge="auto-assigned" empty={!sections}>
          {sections?.role}
        </SectionContainer>
        <SectionContainer label="Goals" badge="editable" empty={!sections}>
          {sections?.goals}
        </SectionContainer>
        <SectionContainer label="Constraints" badge="editable" empty={!sections}>
          {sections?.constraints}
        </SectionContainer>
      </div>

      {/* Chat input */}
      <div className="mb-2">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && description.trim()) { e.preventDefault(); generate() } }}
          placeholder={conversation.length > 0 ? 'Refine or add more detail…' : 'Describe what you want this agent to do…'}
          rows={3}
          className="w-full bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-3 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-400/50 resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={generate}
          disabled={!description.trim() || generating}
          className="bg-[#1e2130] hover:bg-[#252836] border border-[#2a2d3a] text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40"
        >
          {generating ? 'Generating…' : conversation.length > 0 ? 'Regenerate' : 'Generate'}
        </button>
        {conversation.length > 0 && <span className="text-xs text-slate-600">{conversation.length / 2} turn{conversation.length / 2 !== 1 ? 's' : ''}</span>}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => onNext(null)}
          className="text-xs text-slate-500 underline underline-offset-2"
        >
          Skip for now →
        </button>
        <button
          onClick={save}
          disabled={!sections || saving}
          className="bg-cyan-400 text-[#0f172a] font-bold text-sm px-6 py-2.5 rounded-lg disabled:opacity-30"
        >
          {saving ? 'Saving…' : 'Looks good →'}
        </button>
      </div>
    </div>
  )
}
