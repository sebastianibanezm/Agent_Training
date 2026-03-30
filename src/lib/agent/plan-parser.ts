import type { ConversationMessage, PlanStep } from '@/types'

const VALID_EXECUTOR_TYPES = new Set([
  'research', 'document', 'draft', 'analyzer', 'email', 'comparison', 'coach', 'flashcard'
])

export function extractPlanFromConversation(
  conversation: ConversationMessage[]
): PlanStep[] | null {
  const lastAssistant = [...conversation]
    .reverse()
    .find(m => m.role === 'assistant')

  if (!lastAssistant) return null

  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g
  const matches = [...lastAssistant.content.matchAll(jsonBlockRegex)]
  if (matches.length === 0) return null

  const lastMatch = matches[matches.length - 1][1]

  try {
    const parsed = JSON.parse(lastMatch)
    if (!Array.isArray(parsed.plan)) return null

    return parsed.plan.map((step: PlanStep) => ({
      title: step.title || 'Untitled step',
      description: step.description || '',
      executor_type: VALID_EXECUTOR_TYPES.has(step.executor_type) ? step.executor_type : 'draft',
    }))
  } catch {
    return null
  }
}
