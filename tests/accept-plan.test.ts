import { describe, it, expect } from 'vitest'
import { extractPlanFromConversation } from '../src/lib/agent/plan-parser'
import { deriveExecutorType } from '../src/lib/agent/plan-parser'
import type { ConversationMessage, Skill } from '../src/types'

function makeConversation(assistantContent: string): ConversationMessage[] {
  return [{ role: 'assistant', content: assistantContent }]
}

describe('extractPlanFromConversation', () => {
  it('extracts skill_slug and agent_slug from a valid plan', () => {
    const content = `Here is the plan:\n\`\`\`json\n${JSON.stringify({
      plan: [
        { title: 'Step 1', description: 'Do research', skill_slug: 'web-research', agent_slug: 'researcher' }
      ]
    })}\n\`\`\``
    const result = extractPlanFromConversation(makeConversation(content))
    expect(result).toEqual([
      { title: 'Step 1', description: 'Do research', skill_slug: 'web-research', agent_slug: 'researcher' }
    ])
  })

  it('defaults agent_slug to null when absent', () => {
    const content = `\`\`\`json\n${JSON.stringify({
      plan: [
        { title: 'Step 1', description: 'Write doc', skill_slug: 'document-writer' }
      ]
    })}\n\`\`\``
    const result = extractPlanFromConversation(makeConversation(content))
    expect(result).not.toBeNull()
    expect(result![0].agent_slug).toBeNull()
  })

  it('returns null when there is no json block', () => {
    const result = extractPlanFromConversation(makeConversation('Here is some text with no code block.'))
    expect(result).toBeNull()
  })

  it('returns null when the json block has no plan array', () => {
    const content = `\`\`\`json\n${JSON.stringify({ steps: [] })}\n\`\`\``
    const result = extractPlanFromConversation(makeConversation(content))
    expect(result).toBeNull()
  })

  it('skips steps missing skill_slug and returns null if no valid steps remain', () => {
    const content = `\`\`\`json\n${JSON.stringify({
      plan: [
        { title: 'Bad step', description: 'no slug here' }
      ]
    })}\n\`\`\``
    const result = extractPlanFromConversation(makeConversation(content))
    expect(result).toBeNull()
  })

  it('includes valid steps and skips those missing skill_slug', () => {
    const content = `\`\`\`json\n${JSON.stringify({
      plan: [
        { title: 'Good', description: 'has slug', skill_slug: 'research' },
        { title: 'Bad', description: 'no slug' }
      ]
    })}\n\`\`\``
    const result = extractPlanFromConversation(makeConversation(content))
    expect(result).toHaveLength(1)
    expect(result![0].skill_slug).toBe('research')
  })
})

describe('deriveExecutorType', () => {
  const skills: Skill[] = [
    {
      id: '1', slug: 'web-research', name: 'Web Research', trigger: 'search', instructions: '', output_format: '',
      example_output: null, executor_type: 'research', created_at: '', updated_at: ''
    },
    {
      id: '2', slug: 'write-doc', name: 'Write Doc', trigger: 'write', instructions: '', output_format: '',
      example_output: null, executor_type: 'document', created_at: '', updated_at: ''
    }
  ]

  it('returns the executor_type of the matching skill', () => {
    expect(deriveExecutorType('web-research', skills)).toBe('research')
    expect(deriveExecutorType('write-doc', skills)).toBe('document')
  })

  it('returns draft for an unknown slug', () => {
    expect(deriveExecutorType('unknown-skill', skills)).toBe('draft')
  })

  it('returns draft when skills list is empty', () => {
    expect(deriveExecutorType('web-research', [])).toBe('draft')
  })
})
