import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildBrainstormSystemPrompt } from '@/lib/agent/system-prompt'
import { extractPlanFromConversation } from '@/lib/agent/plan-parser'
import type { ConversationMessage } from '@/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { message } = await req.json()
  const supabase = createServerClient()

  const { data: action } = await supabase.from('actions').select('*').eq('id', id).single()
  if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 })

  const { data: task } = await supabase.from('tasks').select('*').eq('id', action.task_id).single()
  const agent = task?.agent_slug
    ? (await supabase.from('agents').select('*').eq('slug', task.agent_slug).single()).data
    : null
  const skills = agent?.skill_slugs?.length
    ? (await supabase.from('skills').select('*').in('slug', agent.skill_slugs)).data || []
    : []

  const systemPrompt = agent
    ? buildBrainstormSystemPrompt(agent, skills)
    : 'You are a helpful AI assistant that helps users plan their tasks. When ready, propose a plan as a JSON block.'

  const conversation: ConversationMessage[] = action.conversation || []
  const updatedConversation: ConversationMessage[] = [
    ...conversation,
    { role: 'user', content: message }
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic()
        let fullContent = ''

        const anthropicStream = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          system: systemPrompt,
          messages: updatedConversation.map(m => ({ role: m.role, content: m.content })),
          stream: true,
        })

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullContent += event.delta.text
            const data = JSON.stringify({ type: 'delta', content: event.delta.text })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        const finalConversation: ConversationMessage[] = [
          ...updatedConversation,
          { role: 'assistant', content: fullContent }
        ]
        await supabase.from('actions').update({ conversation: finalConversation }).eq('id', id)

        const plan = extractPlanFromConversation(finalConversation)
        const doneData = JSON.stringify({
          type: 'done',
          hasPlan: plan !== null,
          stepCount: plan?.length ?? 0,
        })
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
        controller.close()
      } catch (err) {
        const errData = JSON.stringify({ type: 'error', content: err instanceof Error ? err.message : 'Stream error' })
        controller.enqueue(encoder.encode(`data: ${errData}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
