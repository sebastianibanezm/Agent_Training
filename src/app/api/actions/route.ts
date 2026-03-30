import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const taskId = new URL(req.url).searchParams.get('task_id')
  const supabase = createServerClient()
  const baseQuery = supabase.from('actions').select('*')
  const query = taskId ? baseQuery.eq('task_id', taskId) : baseQuery
  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { task_id, initial_message } = await req.json()
  const supabase = createServerClient()

  const conversation = initial_message
    ? [{ role: 'user', content: initial_message }]
    : []

  const { data: action, error: actionError } = await supabase
    .from('actions')
    .insert({ task_id, status: 'brainstorming', conversation })
    .select()
    .single()
  if (actionError) return NextResponse.json({ error: actionError.message }, { status: 500 })

  await supabase
    .from('tasks')
    .update({ status: 'brainstorming' })
    .eq('id', task_id)

  return NextResponse.json(action)
}
