import Anthropic from '@anthropic-ai/sdk'
import type { ExecutorContext } from '../orchestrator'
import { emitStepLog } from '../step-events'

export async function runAnalyzerExecutor(ctx: ExecutorContext): Promise<string> {
  const { step, agent } = ctx
  const client = new Anthropic()

  emitStepLog(step.id, 'Running analysis...')

  const prompt = `Perform structured analysis for: ${step.title}\n${step.description || ''}\nUse frameworks like SWOT, gap analysis, keyword extraction as appropriate.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: agent ? `You are ${agent.name}. ${agent.role}` : 'You are an analytical strategist.',
    messages: [{ role: 'user', content: prompt }],
  })

  const output = response.content[0].type === 'text' ? response.content[0].text : ''
  emitStepLog(step.id, 'Analysis complete')
  return output
}
