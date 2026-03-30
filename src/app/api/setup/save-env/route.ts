import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const ALLOWED_VARS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'DEMO_PASSWORD', 'SESSION_SECRET']

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const body = await req.json() as { vars: Record<string, string> }
  const filtered: Record<string, string> = {}
  for (const key of ALLOWED_VARS) {
    if (body.vars[key]) filtered[key] = body.vars[key]
  }

  const envPath = join(process.cwd(), '.env.local')

  // Parse existing .env.local
  const existing: Record<string, string> = {}
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=\s][^=]*)=(.*)$/)
      if (match) existing[match[1].trim()] = match[2].trim()
    }
  }

  // Merge new vars over existing
  const merged = { ...existing, ...filtered }

  // Write back preserving comments at top
  const lines = Object.entries(merged).map(([k, v]) => `${k}=${v}`)
  writeFileSync(envPath, lines.join('\n') + '\n')

  return NextResponse.json({ ok: true })
}
