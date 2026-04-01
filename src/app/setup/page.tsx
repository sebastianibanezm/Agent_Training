'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { WizardShell } from '@/components/wizard/WizardShell'
import { Step1Name } from '@/components/wizard/Step1Name'
import { Step2Database } from '@/components/wizard/Step2Database'
import { Step3ApiKeys } from '@/components/wizard/Step3ApiKeys'
import { Step4Agent } from '@/components/wizard/Step4Agent'
import { Step5Skill } from '@/components/wizard/Step5Skill'
import { Step6Task } from '@/components/wizard/Step6Task'
import { useEffect, useState, Suspense } from 'react'

function SetupWizard() {
  const params = useSearchParams()
  const router = useRouter()
  const step = parseInt(params.get('step') || '1', 10)
  const [appName, setAppName] = useState('Your')

  useEffect(() => {
    const stored = sessionStorage.getItem('wizard_name')
    if (stored) setAppName(stored)
    if (step > 1 && !stored) {
      router.replace('/setup?step=1')
    }
  }, [step, router])

  const steps: Record<number, React.ReactNode> = {
    1: <Step1Name onNext={(name) => {
      sessionStorage.setItem('wizard_name', name)
      setAppName(name)
      router.push('/setup?step=2')
    }} />,
    2: <Step2Database onNext={() => router.push('/setup?step=3')} />,
    3: <Step3ApiKeys onNext={() => router.push('/setup?step=4')} />,
    4: <Step4Agent onNext={(slug) => {
      if (slug) sessionStorage.setItem('wizard_agent_slug', slug)
      router.push('/setup?step=5')
    }} />,
    5: <Step5Skill onNext={() => router.push('/setup?step=6')} />,
    6: <Step6Task onFinish={async () => {
      const name = sessionStorage.getItem('wizard_name') || appName
      await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      sessionStorage.removeItem('wizard_name')
      sessionStorage.removeItem('wizard_agent_slug')
      router.push('/dashboard/tasks')
    }} />,
  }

  return (
    <WizardShell step={step} totalSteps={6} appTitle={appName}>
      {steps[step] || steps[1]}
    </WizardShell>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading…</div>
      </div>
    }>
      <SetupWizard />
    </Suspense>
  )
}
