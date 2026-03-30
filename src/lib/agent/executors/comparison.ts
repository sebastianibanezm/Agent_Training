import Anthropic from '@anthropic-ai/sdk'
import type { ExecutorContext } from '../orchestrator'
import { emitStepLog } from '../step-events'

export async function runComparisonExecutor(ctx: ExecutorContext): Promise<string> {
  const { step, agent } = ctx
  const client = new Anthropic()

  emitStepLog(step.id, 'Building comparison...')

  const prompt = `Create a side-by-side comparison for: ${step.title}\n${step.description || ''}. Format as a clear table or structured breakdown.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: agent ? `You are ${agent.name}. ${agent.role}` : 'You are a competitive analyst.',
    messages: [{ role: 'user', content: prompt }],
  })

  const output = response.content[0].type === 'text' ? response.content[0].text : ''
  emitStepLog(step.id, 'Comparison complete')
  return output
}
