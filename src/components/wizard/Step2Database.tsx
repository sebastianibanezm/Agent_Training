'use client'
import { useState } from 'react'

interface Step2DatabaseProps {
  onNext: () => void
}

export function Step2Database({ onNext }: Step2DatabaseProps) {
  const [validating, setValidating] = useState(false)
  const [valid, setValid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function validate() {
    setValidating(true)
    setError(null)
    const name = sessionStorage.getItem('wizard_name') || ''
    try {
      const res = await fetch('/api/setup/validate-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connection failed')
      setValid(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setValidating(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-1">Set up your database</h2>
      <p className="text-sm text-slate-500 mb-6">One-time setup — takes about 2 minutes.</p>

      {/* Section A */}
      <div className="border border-[#1e2130] rounded-lg mb-4 overflow-hidden">
        <div className="bg-[#161920] px-4 py-2.5 border-b border-[#1e2130]">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Step 1 — Run migration</span>
        </div>
        <div className="px-4 py-3 text-sm text-slate-400 space-y-2">
          <p>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Supabase dashboard</a>, go to <strong className="text-slate-300">SQL Editor</strong>, paste the contents of:</p>
          <code className="block bg-[#161920] border border-[#1e2130] rounded px-3 py-2 text-xs text-cyan-300 font-mono">src/lib/db/migration.sql</code>
          <p>Click <strong className="text-slate-300">Run</strong>. This creates all required tables.</p>
        </div>
      </div>

      {/* Section B */}
      <div className="border border-[#1e2130] rounded-lg mb-6 overflow-hidden">
        <div className="bg-[#161920] px-4 py-2.5 border-b border-[#1e2130]">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Step 2 — Confirm connection</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={validate}
            disabled={validating || valid}
            className="bg-[#1e2130] hover:bg-[#252836] text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg border border-[#2a2d3a] disabled:opacity-40"
          >
            {validating ? 'Checking…' : valid ? '✓ Connected' : 'Validate connection'}
          </button>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!valid}
          className="bg-cyan-400 text-[#0f172a] font-bold text-sm px-6 py-2.5 rounded-lg disabled:opacity-30"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
