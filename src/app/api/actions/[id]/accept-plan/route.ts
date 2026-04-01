import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { deriveExecutorType, extractPlanFromConversation } from '@/lib/agent/plan-parser'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  const { data: action } = await supabase.from('actions').select('*').eq('id', id).single()
  if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 })

  const plan = extractPlanFromConversation(action.conversation || [])
  if (!plan || plan.length === 0) {
    return NextResponse.json({ error: 'No plan found in last assistant message' }, { status: 422 })
  }

  const { data: skills, error: skillsError } = await supabase.from('skills').select('*')
  if (skillsError) return NextResponse.json({ error: skillsError.message }, { status: 500 })

  await supabase.from('action_steps').delete().eq('action_id', id)

  const stepsToInsert = plan.map((step, i) => ({
    action_id: id,
    position: i + 1,
    title: step.title,
    description: step.description,
    skill_slug: step.skill_slug,
    agent_slug: step.agent_slug,
    executor_type: deriveExecutorType(step.skill_slug, skills ?? []),
    status: 'pending',
  }))

  const { data: steps, error: stepsError } = await supabase
    .from('action_steps')
    .insert(stepsToInsert)
    .select()

  if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 })

  await supabase.from('actions').update({ status: 'ready' }).eq('id', id)

  return NextResponse.json({ steps })
}
