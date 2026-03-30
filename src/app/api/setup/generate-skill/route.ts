import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { ConversationMessage } from '@/types'

const SYSTEM = `You are an AI skill designer. When given a description of what a skill should do, return ONLY a JSON object with exactly these four keys: trigger, instructions, output_format, example_output. No markdown fences, no explanation, just raw JSON.

- trigger: one sentence describing when this skill activates
- instructions: numbered step-by-step execution instructions
- output_format: description of the shape and structure of the output
- example_output: a short realistic example of what the output looks like`

export async function POST(req: NextRequest) {
  const { description, conversation = [] }: {
    description: string
    conversation?: ConversationMessage[]
  } = await req.json()

  if (!description) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }

  try {
    const client = new Anthropic()
    const messages: Anthropic.MessageParam[] = [
      ...conversation.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: description }
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SYSTEM,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse skill definition' }, { status: 500 })
    }
    // Validate shape
    if (typeof (parsed as Record<string, unknown>).trigger !== 'string' ||
        typeof (parsed as Record<string, unknown>).instructions !== 'string' ||
        typeof (parsed as Record<string, unknown>).output_format !== 'string' ||
        typeof (parsed as Record<string, unknown>).example_output !== 'string') {
      return NextResponse.json({ error: 'Failed to parse skill definition' }, { status: 500 })
    }
    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
