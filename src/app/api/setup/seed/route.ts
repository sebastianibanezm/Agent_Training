import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { SEED } from '@/lib/db/seed-data'

export async function POST(_req: NextRequest) {
  const supabase = createServerClient()

  try {
    const s = SEED

    // Insert in dependency order: agents, skills, tasks, actions, steps, usage events
    const { error: agentsErr } = await supabase.from('agents').upsert(
      Object.values(s.agents),
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (agentsErr) throw agentsErr

    const { error: skillsErr } = await supabase.from('skills').upsert(
      Object.values(s.skills),
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (skillsErr) throw skillsErr

    const { error: tasksErr } = await supabase.from('tasks').upsert(
      Object.values(s.tasks),
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (tasksErr) throw tasksErr

    const { error: actionsErr } = await supabase.from('actions').upsert(
      Object.values(s.actions),
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (actionsErr) throw actionsErr

    const { error: stepsErr } = await supabase.from('action_steps').upsert(
      Object.values(s.steps),
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (stepsErr) throw stepsErr

    const { error: usageErr } = await supabase.from('api_usage_events').upsert(
      s.usageEvents,
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (usageErr) throw usageErr

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Seed failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
