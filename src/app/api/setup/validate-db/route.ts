import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest) {
  try {
    const supabase = createServerClient()

    const { error: pingError } = await supabase.from('settings').select('key').limit(1)

    if (pingError) {
      const isTableMissing =
        pingError.message?.includes('schema cache') ||
        pingError.message?.includes('does not exist') ||
        pingError.code === '42P01'

      if (isTableMissing) {
        return NextResponse.json(
          { error: 'Tables not found. Please run src/lib/db/migration.sql in your Supabase SQL Editor, then wait ~30s and try again.' },
          { status: 400 }
        )
      }

      throw new Error(`Cannot connect to database: ${pingError.message}`)
    }

    return NextResponse.json({ valid: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database connection failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
