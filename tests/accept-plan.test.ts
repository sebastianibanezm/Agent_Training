import { describe, it, expect } from 'vitest'
import { extractPlanFromConversation } from '@/lib/agent/plan-parser'

describe('extractPlanFromConversation', () => {
  it('extracts plan with skill_slug and agent_slug from last assistant message', () => {
    const conversation = [
      { role: 'user' as const, content: 'Help me research Stripe' },
      {
        role: 'assistant' as const,
        content: 'Here\'s my plan:\n\n```json\n{"plan":[{"title":"Research","description":"Do research","skill_slug":"web-research","agent_slug":"researcher"}]}\n```',
      },
    ]
    const plan = extractPlanFromConversation(conversation)
    expect(plan).toHaveLength(1)
    expect(plan![0].title).toBe('Research')
    expect(plan![0].skill_slug).toBe('web-research')
    expect(plan![0].agent_slug).toBe('researcher')
  })

  it('accepts null agent_slug', () => {
    const conversation = [
      {
        role: 'assistant' as const,
        content: '```json\n{"plan":[{"title":"Draft","description":"Write it","skill_slug":"write-doc","agent_slug":null}]}\n```',
      },
    ]
    const plan = extractPlanFromConversation(conversation)
    expect(plan![0].agent_slug).toBeNull()
  })

  it('returns null if no json block found', () => {
    const conversation = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'How can I help?' },
    ]
    expect(extractPlanFromConversation(conversation)).toBeNull()
  })

  it('returns null if plan array is missing', () => {
    const conversation = [
      { role: 'assistant' as const, content: '```json\n{"something":"else"}\n```' },
    ]
    expect(extractPlanFromConversation(conversation)).toBeNull()
  })

  it('skips steps missing skill_slug', () => {
    const conversation = [
      {
        role: 'assistant' as const,
        content: '```json\n{"plan":[{"title":"A","description":"a","skill_slug":"web-research","agent_slug":null},{"title":"B","description":"b"}]}\n```',
      },
    ]
    const plan = extractPlanFromConversation(conversation)
    expect(plan).toHaveLength(1)
    expect(plan![0].title).toBe('A')
  })
})

// Tests for the executor_type derivation logic used in accept-plan/route.ts
// This is a pure function test — no Supabase needed
describe('executor_type derivation from skill', () => {
  function deriveExecutorType(
    skillSlug: string,
    skills: Array<{ slug: string; executor_type: string }>
  ): string {
    const skill = skills.find(s => s.slug === skillSlug)
    return skill?.executor_type ?? 'draft'
  }

  it('returns the skill executor_type when skill is found', () => {
    const skills = [{ slug: 'web-research', executor_type: 'research' }]
    expect(deriveExecutorType('web-research', skills)).toBe('research')
  })

  it('falls back to draft when skill_slug is not found in DB', () => {
    const skills = [{ slug: 'web-research', executor_type: 'research' }]
    expect(deriveExecutorType('unknown-skill', skills)).toBe('draft')
  })

  it('falls back to draft when skills list is empty', () => {
    expect(deriveExecutorType('any-skill', [])).toBe('draft')
  })
})
