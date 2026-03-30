import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url, key } = await req.json() as { url: string; key: string }

  if (!url?.startsWith('https://')) {
    return NextResponse.json({ error: 'Invalid URL — should start with https://' }, { status: 400 })
  }
  if (!key?.startsWith('eyJ')) {
    return NextResponse.json({ error: 'Invalid anon key — should be a JWT starting with eyJ' }, { status: 400 })
  }

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    })
    // Any HTTP response (even 401/404) means the server exists and key format is accepted
    if (!res) throw new Error('No response')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not reach Supabase — check your URL' }, { status: 400 })
  }
}
