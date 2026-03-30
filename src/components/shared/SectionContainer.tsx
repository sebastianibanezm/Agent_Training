'use client'
type BadgeType = 'editable' | 'auto-assigned' | 'reference'

const BADGE_STYLES: Record<BadgeType, string> = {
  'editable': 'bg-amber-950 text-amber-400 border border-amber-900',
  'auto-assigned': 'bg-slate-800 text-slate-400 border border-slate-700',
  'reference': 'bg-blue-950 text-blue-400 border border-blue-900',
}

interface SectionContainerProps {
  label: string
  badge?: BadgeType
  explainer?: string
  children: React.ReactNode
  empty?: boolean
}

export function SectionContainer({ label, badge, explainer, children, empty }: SectionContainerProps) {
  return (
    <div className="border border-[#1e2130] rounded-lg overflow-hidden mb-3">
      <div className="bg-[#161920] px-4 py-2.5 flex items-center gap-2 border-b border-[#1e2130]">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{label}</span>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[badge]}`}>
            {badge}
          </span>
        )}
      </div>
      {explainer && (
        <div className="px-4 py-2 bg-[#0d0f17] border-b border-[#1e2130] text-xs text-slate-500 italic">
          {explainer}
        </div>
      )}
      <div className={`px-4 py-3 ${empty ? 'text-slate-600 text-sm italic' : 'text-sm text-slate-300 whitespace-pre-wrap'}`}>
        {empty ? 'Will appear here after generation' : children}
      </div>
    </div>
  )
}
