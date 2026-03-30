import { NextRequest } from 'next/server'
import { subscribeToStep, unsubscribeFromStep } from '@/lib/agent/step-events'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { sid } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch { /* connection closed */ }
      }

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(keepalive)
        }
      }, 30000)

      const timeout = setTimeout(() => {
        send({ type: 'error', content: 'timeout' })
        clearInterval(keepalive)
        unsubscribeFromStep(sid)
        controller.close()
      }, 5 * 60 * 1000)

      subscribeToStep(sid, {
        onLog: (content) => send({ type: 'log', content }),
        onDone: () => {
          send({ type: 'done' })
          clearInterval(keepalive)
          clearTimeout(timeout)
          unsubscribeFromStep(sid)
          controller.close()
        },
        onError: (content) => {
          send({ type: 'error', content })
          clearInterval(keepalive)
          clearTimeout(timeout)
          unsubscribeFromStep(sid)
          controller.close()
        },
      })
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
