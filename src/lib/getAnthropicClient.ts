import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase/server'

export async function getAnthropicClient(): Promise<Anthropic> {
  // Prefer key stored in settings (saved during onboarding) over env var.
  // This avoids requiring a server restart after the onboarding wizard runs.
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'anthropic_api_key')
      .single()
    if (data?.value) return new Anthropic({ apiKey: data.value })
  } catch {
    // fall through to env var
  }

  return new Anthropic() // falls back to ANTHROPIC_API_KEY env var
}
