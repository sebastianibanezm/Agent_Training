import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { name } = await req.json()

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  try {
    const supabase = createServerClient()
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'user_name', value: name.trim() }, { onConflict: 'key' })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
