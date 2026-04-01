import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase/server'

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

    // Persist to settings so other routes can use it without a server restart
    const supabase = createServerClient()
    await supabase.from('settings').upsert({ key: 'anthropic_api_key', value: key }, { onConflict: 'key' })

    return NextResponse.json({ valid: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid API key'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
