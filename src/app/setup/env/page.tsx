'use client'
import { useState } from 'react'

type Status = 'idle' | 'testing' | 'valid' | 'error'

export default function EnvSetupPage() {
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [supabaseStatus, setSupabaseStatus] = useState<Status>('idle')
  const [supabaseError, setSupabaseError] = useState('')
  const [supabaseOpen, setSupabaseOpen] = useState(false)

  const [password, setPassword] = useState('')
  const [sessionSecret, setSessionSecret] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function testSupabase() {
    setSupabaseStatus('testing')
    setSupabaseError('')
    try {
      const res = await fetch('/api/setup/test-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: supabaseUrl, key: supabaseKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connection failed')
      setSupabaseStatus('valid')
    } catch (err) {
      setSupabaseStatus('error')
      setSupabaseError(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  function generateSecret() {
    const arr = new Uint8Array(32)
    crypto.getRandomValues(arr)
    return btoa(String.fromCharCode(...arr))
  }

  async function saveAll() {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/setup/save-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vars: {
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey,
            DEMO_PASSWORD: password,
            SESSION_SECRET: sessionSecret || generateSecret(),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const canSave = supabaseStatus === 'valid' && password.length >= 6

  if (saved) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="border border-green-800 rounded-xl bg-[#0d1a0f] p-6 text-center">
            <div className="text-3xl mb-3">✓</div>
            <h2 className="text-lg font-bold text-green-400 mb-2">Environment saved</h2>
            <p className="text-sm text-slate-400 mb-6">Restart your dev server to apply the changes:</p>
            <div className="bg-[#0f1117] border border-[#1e2130] rounded-lg p-3 font-mono text-xs text-cyan-300 text-left mb-4">
              <p className="text-slate-500 mb-1"># In your terminal:</p>
              <p>Ctrl+C</p>
              <p>npm run dev</p>
            </div>
            <p className="text-xs text-slate-500">The setup wizard will continue automatically after restart.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">Before you start</p>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Set up your environment</h1>
          <p className="text-sm text-slate-500">Takes about 3 minutes. You only do this once.</p>
        </div>

        {/* Supabase section */}
        <div className="border border-[#1e2130] rounded-xl overflow-hidden mb-4">
          <div className="bg-[#161920] px-4 py-3 border-b border-[#1e2130] flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-200">1. Connect Supabase</span>
              <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1a1a2e] text-indigo-400 border border-indigo-900">Required</span>
            </div>
            {supabaseStatus === 'valid' && <span className="text-xs text-green-400 font-bold">✓ Connected</span>}
          </div>

          {/* How-to guide */}
          <button
            onClick={() => setSupabaseOpen(o => !o)}
            className="w-full px-4 py-2.5 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-400 border-b border-[#1e2130] text-left"
          >
            <span>{supabaseOpen ? '▾' : '▸'}</span>
            <span>Don&apos;t have a Supabase project yet? Follow these steps</span>
          </button>

          {supabaseOpen && (
            <div className="px-4 py-3 bg-[#0d0f17] border-b border-[#1e2130]">
              <ol className="space-y-3 text-xs text-slate-400">
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#1e2130] text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">1</span>
                  <span>Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">supabase.com</a> and create a free account</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#1e2130] text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">2</span>
                  <span>Click <strong className="text-slate-300">New project</strong> — give it any name, choose the free plan</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#1e2130] text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">3</span>
                  <span>Once created, go to <strong className="text-slate-300">Settings → API</strong></span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#1e2130] text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">4</span>
                  <span>Copy <strong className="text-slate-300">Project URL</strong> and <strong className="text-slate-300">anon public</strong> key into the fields below</span>
                </li>
              </ol>
            </div>
          )}

          {/* Inputs */}
          <div className="px-4 py-3 space-y-2">
            <input
              type="text"
              value={supabaseUrl}
              onChange={e => { setSupabaseUrl(e.target.value); setSupabaseStatus('idle') }}
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded px-3 py-2 text-sm text-slate-300 font-mono focus:outline-none focus:border-cyan-400/40 placeholder:text-slate-600"
            />
            <input
              type="password"
              value={supabaseKey}
              onChange={e => { setSupabaseKey(e.target.value); setSupabaseStatus('idle') }}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded px-3 py-2 text-sm text-slate-400 font-mono focus:outline-none focus:border-cyan-400/40 placeholder:text-slate-600"
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={testSupabase}
                disabled={!supabaseUrl || !supabaseKey || supabaseStatus === 'testing'}
                className={`text-xs font-bold px-3 py-2 rounded border disabled:opacity-40 ${
                  supabaseStatus === 'valid'
                    ? 'bg-green-950 text-green-400 border-green-900'
                    : 'bg-[#1e2130] text-slate-400 border-[#2a2d3a] hover:text-slate-300'
                }`}
              >
                {supabaseStatus === 'testing' ? 'Testing…' : supabaseStatus === 'valid' ? '✓ Connected' : 'Test connection'}
              </button>
              {supabaseStatus === 'error' && <span className="text-xs text-red-400">{supabaseError}</span>}
            </div>
          </div>
        </div>

        {/* Password section */}
        <div className="border border-[#1e2130] rounded-xl overflow-hidden mb-6">
          <div className="bg-[#161920] px-4 py-3 border-b border-[#1e2130]">
            <span className="text-sm font-bold text-slate-200">2. Set your password</span>
          </div>
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs text-slate-500">This protects your app — anyone with the URL will need this to log in.</p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Choose a password (min 6 characters)"
              className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/40 placeholder:text-slate-600"
            />
            <p className="text-xs text-slate-600">Session secret will be auto-generated securely.</p>
          </div>
        </div>

        {saveError && <p className="text-xs text-red-400 mb-3">{saveError}</p>}

        <button
          onClick={saveAll}
          disabled={!canSave || saving}
          className="w-full bg-cyan-400 text-[#0f172a] font-bold text-sm py-3 rounded-xl disabled:opacity-30 hover:bg-cyan-300 transition"
        >
          {saving ? 'Saving…' : 'Save and continue →'}
        </button>

        <p className="text-center text-xs text-slate-600 mt-3">
          Keys are saved to <code className="bg-[#1e2130] px-1 rounded">.env.local</code> on your machine only
        </p>
      </div>
    </div>
  )
}
