'use client'
interface WizardShellProps {
  step: number
  totalSteps: number
  appTitle: string
  children: React.ReactNode
}

export function WizardShell({ step, totalSteps, appTitle, children }: WizardShellProps) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="bg-[#161920] border border-[#1e2130] rounded-t-xl px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-200">{appTitle}'s Command Center</span>
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => {
              const n = i + 1
              if (n < step) return <div key={n} className="w-2 h-2 rounded-full bg-green-500" />
              if (n === step) return <div key={n} className="w-6 h-2 rounded bg-cyan-400" />
              return <div key={n} className="w-2 h-2 rounded-full bg-[#2a2d3a]" />
            })}
          </div>
        </div>
        {/* Body */}
        <div className="bg-[#0f1117] border-x border-b border-[#1e2130] rounded-b-xl p-6">
          <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest mb-1">
            Step {step} of {totalSteps}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
