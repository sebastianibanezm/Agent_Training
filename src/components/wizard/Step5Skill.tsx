'use client'
import { useState } from 'react'
import { SectionContainer } from '@/components/shared/SectionContainer'
import { slugify } from '@/lib/utils'
import type { ConversationMessage } from '@/types'

interface Step5SkillProps {
  onFinish: () => Promise<void>
}

interface SkillSections {
  trigger: string
  instructions: string
  output_format: string
  example_output: string | null
}

export function Step5Skill({ onFinish }: Step5SkillProps) {
  const [skillName, setSkillName] = useState('')
  const [description, setDescription] = useState('')
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [sections, setSections] = useState<SkillSections | null>(null)
  const [generating, setGenerating] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (!description.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/setup/generate-skill', {
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

  async function finish() {
    if (!sections || !skillName.trim()) return
    setFinishing(true)
    setError(null)
    try {
      const slug = slugify(skillName)

      // 1. Create the skill
      const skillRes = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name: skillName, ...sections }),
      })
      const skillData = await skillRes.json()
      if (!skillRes.ok) throw new Error(skillData.error || 'Failed to save skill')

      const newSkillSlug = skillData.slug ?? slug

      // 2. Link skill to agent if one was created
      const agentSlug = sessionStorage.getItem('wizard_agent_slug')
      if (agentSlug) {
        const agentRes = await fetch(`/api/agents/${agentSlug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill_slugs: [newSkillSlug] }),
        })
        if (!agentRes.ok) {
          console.warn('Failed to link skill to agent — continuing setup')
        }
      }

      // 3. Seed default data
      await fetch('/api/setup/seed', { method: 'POST' })

      await onFinish()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setFinishing(false)
    }
  }

  async function skip() {
    try {
      await onFinish()
    } catch {
      // navigation failure — ignore silently (router handles its own errors)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-1">Create your first skill</h2>
      <p className="text-sm text-slate-500 mb-6">Skills give your agent a repeatable capability — like researching a company or drafting a cover letter.</p>

      {/* Skill name */}
      <div className="mb-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Skill name</label>
        <input
          type="text"
          value={skillName}
          onChange={e => setSkillName(e.target.value)}
          placeholder="e.g. Company Research"
          className="w-full bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-2.5 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-400/50"
        />
      </div>

      {/* Section previews */}
      <div className="mb-4">
        <SectionContainer label="Trigger" badge="auto-assigned" empty={!sections}>
          {sections?.trigger}
        </SectionContainer>
        <SectionContainer label="Instructions" badge="editable" empty={!sections}>
          {sections?.instructions}
        </SectionContainer>
        <SectionContainer label="Output Format" badge="editable" empty={!sections}>
          {sections?.output_format}
        </SectionContainer>
        <SectionContainer label="Example Output" badge="reference" empty={!sections}>
          {sections?.example_output}
        </SectionContainer>
      </div>

      {/* Chat input */}
      <div className="mb-2">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && description.trim()) { e.preventDefault(); generate() } }}
          placeholder={conversation.length > 0 ? 'Refine or add more detail…' : 'Describe what this skill should do…'}
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
          onClick={skip}
          className="text-xs text-slate-500 underline underline-offset-2"
        >
          Skip for now →
        </button>
        <button
          onClick={finish}
          disabled={!sections || !skillName.trim() || finishing}
          className="bg-cyan-400 text-[#0f172a] font-bold text-sm px-6 py-2.5 rounded-lg disabled:opacity-30"
        >
          {finishing ? 'Finishing…' : 'Finish setup →'}
        </button>
      </div>
    </div>
  )
}
