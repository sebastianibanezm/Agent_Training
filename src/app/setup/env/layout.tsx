import { redirect } from 'next/navigation'

export default function EnvSetupLayout({ children }: { children: React.ReactNode }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url?.startsWith('https://') && key?.startsWith('eyJ')) {
    redirect('/setup')
  }
  return <>{children}</>
}
