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

  const { data: agents, error: agentsError } = await supabase.from('agents').select('*')
  if (agentsError) return NextResponse.json({ error: agentsError.message }, { status: 500 })

  const { data: skills, error: skillsError } = await supabase.from('skills').select('*')
  if (skillsError) return NextResponse.json({ error: skillsError.message }, { status: 500 })

  const systemPrompt = buildBrainstormSystemPrompt(agents ?? [], skills ?? [])

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
