import Anthropic from '@anthropic-ai/sdk'
import type { ExecutorContext } from '../orchestrator'
import { emitStepLog } from '../step-events'

export async function runEmailExecutor(ctx: ExecutorContext): Promise<string> {
  const { step, agent } = ctx
  const client = new Anthropic()

  emitStepLog(step.id, 'Composing email...')

  const prompt = `Compose a professional email for: ${step.title}\n${step.description || ''}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: agent
      ? `You are ${agent.name}. ${agent.role}`
      : 'You are a professional communications specialist.',
    messages: [{ role: 'user', content: prompt }],
  })

  const output = response.content[0].type === 'text' ? response.content[0].text : ''
  emitStepLog(step.id, 'Email complete')
  return output
}
