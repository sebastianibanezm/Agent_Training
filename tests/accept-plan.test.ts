import { describe, it, expect } from 'vitest'
import { extractPlanFromConversation } from '@/lib/agent/plan-parser'

describe('extractPlanFromConversation', () => {
  it('extracts plan from last assistant message with json block', () => {
    const conversation = [
      { role: 'user' as const, content: 'Help me research Stripe' },
      { role: 'assistant' as const, content: 'Great! Here\'s my plan:\n\n```json\n{"plan":[{"title":"Research","description":"Do research","executor_type":"research"}]}\n```' },
    ]
    const plan = extractPlanFromConversation(conversation)
    expect(plan).toHaveLength(1)
    expect(plan![0].title).toBe('Research')
    expect(plan![0].executor_type).toBe('research')
  })

  it('returns null if no json block found', () => {
    const conversation = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'How can I help?' },
    ]
    expect(extractPlanFromConversation(conversation)).toBeNull()
  })

  it('remaps invalid executor_type to draft', () => {
    const conversation = [
      { role: 'assistant' as const, content: '```json\n{"plan":[{"title":"X","description":"Y","executor_type":"invalid"}]}\n```' },
    ]
    const plan = extractPlanFromConversation(conversation)
    expect(plan![0].executor_type).toBe('draft')
  })
})
