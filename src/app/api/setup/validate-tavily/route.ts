import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { key } = await req.json()

  if (!key) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  try {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query: 'test', max_results: 1 }),
    })
    if (!resp.ok) throw new Error(`Tavily returned ${resp.status}: ${resp.statusText}`)
    return NextResponse.json({ valid: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid Tavily key'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
