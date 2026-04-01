'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/dashboard/tasks', label: 'Tasks' },
  { href: '/dashboard/agents', label: 'Agents' },
  { href: '/dashboard/skills', label: 'Skills' },
]

export function NavLinks() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1">
      {LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? 'px-3 py-1.5 rounded-md text-sm text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 transition'
                : 'px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-[#1e2130] transition'
            }
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
