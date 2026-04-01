import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { ConversationMessage } from '@/types'
import { getAnthropicClient } from '@/lib/getAnthropicClient'

const SYSTEM = `You are an AI system prompt designer. When given a description of what an agent should do, return ONLY a JSON object with exactly these three keys: role, goals, constraints. No markdown fences, no explanation, just raw JSON.

Example output:
{"role":"Strategic competitive intelligence analyst for B2B SaaS companies","goals":"Deliver concise, interview-ready competitive briefings; prioritize recent market movements; connect findings to the candidate's target role","constraints":"No fabricated statistics; responses under 600 words unless asked; no legal or financial advice"}`

export async function POST(req: NextRequest) {
  const { description, conversation = [] }: {
    description: string
    conversation?: ConversationMessage[]
  } = await req.json()

  if (!description) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }

  try {
    const client = await getAnthropicClient()
    const messages: Anthropic.MessageParam[] = [
      ...conversation.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: description }
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: SYSTEM,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    // Strip markdown fences if Claude added them despite instructions
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse agent definition' }, { status: 500 })
    }
    // Validate shape
    if (typeof (parsed as Record<string, unknown>).role !== 'string' ||
        typeof (parsed as Record<string, unknown>).goals !== 'string' ||
        typeof (parsed as Record<string, unknown>).constraints !== 'string') {
      return NextResponse.json({ error: 'Failed to parse agent definition' }, { status: 500 })
    }
    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
