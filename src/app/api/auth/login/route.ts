import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== process.env.DEMO_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }
  const session = await getSession()
  session.authenticated = true
  await session.save()
  return NextResponse.json({ ok: true })
}
