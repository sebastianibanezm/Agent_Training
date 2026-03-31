import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestSession } from './session'

export async function applyMiddleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl

  // Rule 0: If Supabase is not properly configured, send to env setup
  // Check URL format (not just presence) to catch placeholder values like "your-supabase-url"
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseConfigured = supabaseUrl?.startsWith('https://') && supabaseKey?.startsWith('eyJ')

  if (!supabaseConfigured) {
    if (!pathname.startsWith('/setup/env') && !pathname.startsWith('/api/setup/')) {
      return NextResponse.redirect(new URL('/setup/env', req.url))
    }
    return NextResponse.next()
  }

  // Rule 1: Public paths — unconditional allow
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/setup/')
  ) {
    return NextResponse.next()
  }

  // Rule 2: All other routes — check session cookie
  const session = await getRequestSession(req)
  if (!session.authenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Rule 3: Authenticated + /dashboard/* → check user_name in settings
  if (pathname.startsWith('/dashboard/')) {
    const userName = await getUserName()
    if (!userName) {
      return NextResponse.redirect(new URL('/setup', req.url))
    }
  }

  // Rule 4: Authenticated + /setup/* → if user_name set, redirect to tasks
  if (pathname === '/setup' || pathname.startsWith('/setup/')) {
    const userName = await getUserName()
    if (userName) {
      return NextResponse.redirect(new URL('/dashboard/tasks', req.url))
    }
  }

  // Rule 5: Authenticated + /api/* — allow
  return NextResponse.next()
}

async function getUserName(): Promise<string> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'user_name')
      .single()
    return data?.value || ''
  } catch {
    return ''
  }
}
