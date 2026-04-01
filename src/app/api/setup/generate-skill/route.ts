import { NextRequest, NextResponse } from 'next/server'
import type { ConversationMessage } from '@/types'
import { getAnthropicClient } from '@/lib/getAnthropicClient'

const SYSTEM = `You are an AI skill designer. When given a description of what a skill should do, return ONLY a JSON object with exactly these four keys: trigger, instructions, output_format, example_output. No markdown fences, no explanation, just raw JSON. All values must be strings (or null for example_output).

Example output:
{"trigger":"When a user asks to research a company before an interview","instructions":"1. Search for the company's recent news and campaigns\\n2. Identify key competitors and differentiators\\n3. Find the LinkedIn profiles of interviewers\\n4. Summarise findings into talking points","output_format":"A structured brief with sections: Company Overview, Recent Campaigns, Competitors, Talking Points, and Suggested Questions","example_output":"## Acme Corp Brief\\n**Recent Campaigns:** Launched 'Go Bold' rebrand in Q1...\\n**Talking Points:** Strong growth in SMB segment..."}`

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
      console.error('[generate-skill] JSON parse failed. raw:', text)
      return NextResponse.json({ error: 'Failed to parse skill definition', debug_raw: text }, { status: 500 })
    }
    const p = parsed as Record<string, unknown>
    // Coerce arrays/objects to strings in case the model deviated
    const coerce = (v: unknown): string | null => {
      if (v === null || v === undefined) return null
      if (typeof v === 'string') return v
      if (Array.isArray(v)) return v.join('\n')
      return JSON.stringify(v)
    }
    const result = {
      trigger: coerce(p.trigger),
      instructions: coerce(p.instructions),
      output_format: coerce(p.output_format),
      example_output: coerce(p.example_output),
    }
    if (!result.trigger || !result.instructions || !result.output_format) {
      console.error('[generate-skill] missing required fields. parsed:', p)
      return NextResponse.json({ error: 'Failed to parse skill definition', debug_parsed: p }, { status: 500 })
    }
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
