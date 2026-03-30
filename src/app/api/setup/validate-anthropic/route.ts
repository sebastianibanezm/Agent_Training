import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const { key } = await req.json()

  if (!key) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  try {
    const client = new Anthropic({ apiKey: key })
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
    return NextResponse.json({ valid: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid API key'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
