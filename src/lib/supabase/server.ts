import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.startsWith('https://') || !key?.startsWith('eyJ')) {
    throw new Error('Supabase is not configured — visit /setup/env to complete setup')
  }
  return createClient(url, key)
}
