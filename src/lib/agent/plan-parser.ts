import { ConversationMessage, PlanStep, Skill, ExecutorType } from '@/types'

/**
 * Extracts the plan from the last assistant message that contains a JSON block.
 * Returns null if no valid plan steps are found.
 */
export function extractPlanFromConversation(conversation: ConversationMessage[]): PlanStep[] | null {
  // Find the last assistant message
  const assistantMessages = conversation.filter(m => m.role === 'assistant')
  if (assistantMessages.length === 0) return null

  const lastAssistant = assistantMessages[assistantMessages.length - 1]
  const content = typeof lastAssistant.content === 'string'
    ? lastAssistant.content
    : lastAssistant.content.map((c: { type: string; text?: string }) =>
        c.type === 'text' ? (c.text ?? '') : ''
      ).join('')

  // Extract all ```json blocks, use the last one
  const jsonBlocks = content.match(/```json\s*([\s\S]*?)```/g)
  if (!jsonBlocks || jsonBlocks.length === 0) return null

  const lastBlock = jsonBlocks[jsonBlocks.length - 1]
  const jsonText = lastBlock.replace(/```json\s*/, '').replace(/```$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return null
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as { plan?: unknown }).plan)
  ) {
    return null
  }

  const steps: PlanStep[] = []
  for (const item of (parsed as { plan: unknown[] }).plan) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as { skill_slug?: unknown }).skill_slug !== 'string' ||
      !(item as { skill_slug: string }).skill_slug
    ) {
      // Skip steps missing skill_slug
      continue
    }

    const step = item as {
      title?: unknown
      description?: unknown
      skill_slug: string
      agent_slug?: unknown
    }

    steps.push({
      title: typeof step.title === 'string' ? step.title : '',
      description: typeof step.description === 'string' ? step.description : '',
      skill_slug: step.skill_slug,
      agent_slug: typeof step.agent_slug === 'string' ? step.agent_slug : null,
    })
  }

  return steps.length > 0 ? steps : null
}

/**
 * Derives the executor type from a skill slug by looking up the skill in the list.
 * Falls back to 'draft' if the skill is not found.
 */
export function deriveExecutorType(skillSlug: string, skills: Skill[]): ExecutorType {
  const skill = skills.find(s => s.slug === skillSlug)
  return skill?.executor_type ?? 'draft'
}
