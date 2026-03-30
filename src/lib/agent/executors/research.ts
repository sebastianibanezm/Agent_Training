import Anthropic from '@anthropic-ai/sdk'
import type { ExecutorContext } from '../orchestrator'
import { emitStepLog } from '../step-events'

export async function runResearchExecutor(ctx: ExecutorContext): Promise<string> {
  const { step, agent } = ctx
  const client = new Anthropic()

  emitStepLog(step.id, 'Analyzing research requirements...')

  let webContext = ''
  if (process.env.TAVILY_API_KEY) {
    emitStepLog(step.id, `Searching the web for: ${step.title}`)
    try {
      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: `${step.title} ${step.description || ''}`,
          max_results: 5,
        }),
      })
      const data = await resp.json()
      const results = (data.results || []).slice(0, 5)
      webContext = results
        .map(
          (r: { title: string; content: string; url: string }) =>
            `**${r.title}**\n${r.content}\nSource: ${r.url}`
        )
        .join('\n\n')
      emitStepLog(step.id, `Found ${results.length} web results`)
    } catch {
      emitStepLog(step.id, 'Web search unavailable, proceeding with knowledge only')
    }
  }

  emitStepLog(step.id, 'Synthesizing findings...')

  const prompt = webContext
    ? `Web search results:\n${webContext}\n\nTask: ${step.title}\n${step.description || ''}`
    : `Task: ${step.title}\n${step.description || ''}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: agent ? `You are ${agent.name}. ${agent.role}` : 'You are a research assistant.',
    messages: [{ role: 'user', content: prompt }],
  })

  const output = response.content[0].type === 'text' ? response.content[0].text : ''
  emitStepLog(step.id, 'Research complete')
  return output
}
