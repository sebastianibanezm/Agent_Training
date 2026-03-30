import { createServerClient } from '@/lib/supabase/server'

export async function logUsage(params: {
  actionId: string
  stepId?: string
  model: string
  inputTokens: number
  outputTokens: number
}): Promise<void> {
  const { actionId, stepId, model, inputTokens, outputTokens } = params
  const costUsd = (inputTokens * 3 + outputTokens * 15) / 1_000_000

  const supabase = createServerClient()
  const { error } = await supabase.from('api_usage_events').insert({
    action_id: actionId,
    step_id: stepId ?? null,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: costUsd,
  })

  if (error) {
    console.warn('[logUsage] Failed to log API usage:', error.message)
  }
}
