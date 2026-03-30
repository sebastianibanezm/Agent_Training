import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { name } = await req.json()

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  try {
    const supabase = createServerClient()

    // Test connectivity — simple read is enough; RPCs like 'version' don't exist in Supabase
    const { error: pingError } = await supabase.from('settings').select('key').limit(1)

    if (pingError && pingError.code !== 'PGRST116') {
      // PGRST116 = table not found (migration not run yet)
      // Any other error is a real connectivity failure
      throw new Error(`Cannot connect to database: ${pingError.message}`)
    }

    if (pingError?.code === 'PGRST116') {
      // Tables don't exist yet — user must run migration manually
      return NextResponse.json(
        { error: 'Tables not found. Please run src/lib/db/migration.sql in your Supabase SQL Editor, then try again.' },
        { status: 400 }
      )
    }

    // Save user name
    const { error: settingsError } = await supabase
      .from('settings')
      .upsert({ key: 'user_name', value: name.trim() }, { onConflict: 'key' })

    if (settingsError) throw settingsError

    return NextResponse.json({ valid: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database connection failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
