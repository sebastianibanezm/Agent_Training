import Anthropic from '@anthropic-ai/sdk'
import type { ExecutorContext } from '../orchestrator'
import { emitStepLog } from '../step-events'

export async function runFlashcardExecutor(ctx: ExecutorContext): Promise<string> {
  const { step, agent } = ctx
  const client = new Anthropic()

  emitStepLog(step.id, 'Generating flashcards...')

  const prompt = `Generate a set of Q&A flashcards for: ${step.title}\n${step.description || ''}. Format as numbered pairs: Q: / A:`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: agent
      ? `You are ${agent.name}. ${agent.role}`
      : 'You are an educational content creator.',
    messages: [{ role: 'user', content: prompt }],
  })

  const output = response.content[0].type === 'text' ? response.content[0].text : ''
  emitStepLog(step.id, 'Flashcards complete')
  return output
}
