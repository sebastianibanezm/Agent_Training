import type { ConversationMessage, PlanStep } from '@/types'

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

    const steps: PlanStep[] = []
    for (const step of parsed.plan) {
      if (!step.skill_slug) continue  // skip malformed steps
      steps.push({
        title: step.title || 'Untitled step',
        description: step.description || '',
        skill_slug: step.skill_slug,
        agent_slug: step.agent_slug ?? null,
      })
    }

    return steps.length > 0 ? steps : null
  } catch {
    return null
  }
}
