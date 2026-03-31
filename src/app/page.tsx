import { redirect } from 'next/navigation'
export default function Home() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.startsWith('https://') || !key?.startsWith('eyJ')) {
    redirect('/setup/env')
  }
  redirect('/dashboard/tasks')
}
