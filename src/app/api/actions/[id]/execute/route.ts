import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { runStep } from '@/lib/agent/orchestrator'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  const { data: step } = await supabase
    .from('action_steps')
    .select('*')
    .eq('action_id', id)
    .eq('status', 'pending')
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (!step) return NextResponse.json({ error: 'No pending steps' }, { status: 400 })

  const { data: action } = await supabase.from('actions').select('*').eq('id', id).single()
  if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 })
  const { data: task } = await supabase.from('tasks').select('*').eq('id', action.task_id).single()
  const agent = task?.agent_slug
    ? (await supabase.from('agents').select('*').eq('slug', task.agent_slug).single()).data
    : null
  const skills = agent?.skill_slugs?.length
    ? (await supabase.from('skills').select('*').in('slug', agent.skill_slugs)).data || []
    : []

  await supabase.from('action_steps').update({ status: 'running' }).eq('id', step.id)

  runStep({ step, agent, skills, actionId: id, conversation: action.conversation || [] })
    .then(async (output) => {
      await supabase.from('action_steps')
        .update({ status: 'done', output, updated_at: new Date().toISOString() })
        .eq('id', step.id)

      const { data: remainingSteps } = await supabase
        .from('action_steps')
        .select('id')
        .eq('action_id', id)
        .neq('status', 'done')

      if (!remainingSteps || remainingSteps.length === 0) {
        await supabase.from('actions').update({ status: 'done' }).eq('id', id)
        await supabase.from('tasks').update({ status: 'done' }).eq('id', action.task_id)
      }
    })
    .catch(async (err) => {
      await supabase.from('action_steps')
        .update({ status: 'error', error: err.message, updated_at: new Date().toISOString() })
        .eq('id', step.id)
    })

  const { data: allSteps } = await supabase
    .from('action_steps')
    .select('id, status')
    .eq('action_id', id)

  const pendingAfter = (allSteps || []).filter(s => s.id !== step.id && s.status === 'pending')

  return NextResponse.json({ stepId: step.id, done: pendingAfter.length === 0 })
}
