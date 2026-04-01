import { createServerClient } from '@/lib/supabase/server'
import { NavLinks } from '@/components/shared/NavLinks'
import { redirect } from 'next/navigation'

async function getUserName(): Promise<string> {
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'user_name')
      .single()
    return data?.value || 'Your'
  } catch {
    return 'Your'
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.startsWith('https://') || !key?.startsWith('eyJ')) {
    redirect('/setup/env')
  }

  const userName = await getUserName()

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <nav className="border-b border-[#1e2130] bg-[#0d0f17]">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-bold text-sm text-white">{userName}&apos;s Command Center</span>
            <NavLinks />
          </div>
          <span className="text-xs font-semibold bg-green-950 text-green-400 px-3 py-1 rounded-full border border-green-900">
            Demo Mode
          </span>
        </div>
      </nav>
      <main className="max-w-screen-xl mx-auto px-6 py-6">{children}</main>
    </div>
  )
}
