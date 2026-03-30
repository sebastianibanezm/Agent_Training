'use client'
import { useState } from 'react'

interface Step3ApiKeysProps {
  onNext: () => void
}

type KeyState = { value: string; status: 'idle' | 'validating' | 'valid' | 'error'; error?: string }

export function Step3ApiKeys({ onNext }: Step3ApiKeysProps) {
  const [anthropic, setAnthropic] = useState<KeyState>({ value: '', status: 'idle' })
  const [tavily, setTavily] = useState<KeyState>({ value: '', status: 'idle' })
  const [anthropicOpen, setAnthropicOpen] = useState(false)
  const [tavilyOpen, setTavilyOpen] = useState(false)

  async function validateKey(
    key: string,
    endpoint: string,
    setter: React.Dispatch<React.SetStateAction<KeyState>>,
    storageKey: string
  ) {
    setter(s => ({ ...s, status: 'validating' }))
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid key')
      sessionStorage.setItem(storageKey, key)
      setter(s => ({ ...s, status: 'valid' }))
    } catch (err) {
      setter(s => ({ ...s, status: 'error', error: err instanceof Error ? err.message : 'Invalid key' }))
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-1">Connect your AI keys</h2>
      <p className="text-sm text-slate-500 mb-6">These let your agents think and research. Stored in your <code className="text-xs bg-[#1e2130] px-1 rounded">.env.local</code> — never leave your machine.</p>

      {/* Anthropic block */}
      <div className="border border-[#1e2130] rounded-lg mb-3 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1a1a2e] flex items-center justify-center text-base">🤖</div>
          <div className="flex-1">
            <span className="text-sm font-bold text-slate-200">Anthropic API Key</span>
            <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1a1a2e] text-indigo-400 border border-indigo-900">Required</span>
          </div>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <input
            type="password"
            value={anthropic.value}
            onChange={e => setAnthropic(s => ({ ...s, value: e.target.value, status: 'idle' }))}
            placeholder="sk-ant-api03-..."
            className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded px-3 py-2 text-sm text-slate-400 font-mono focus:outline-none focus:border-cyan-400/40"
          />
          <button
            onClick={() => validateKey(anthropic.value, '/api/setup/validate-anthropic', setAnthropic, 'anthropic_key')}
            disabled={!anthropic.value || anthropic.status === 'validating'}
            className={`text-xs font-bold px-3 py-2 rounded border ${anthropic.status === 'valid' ? 'bg-green-950 text-green-400 border-green-900' : 'bg-[#1e2130] text-slate-400 border-[#2a2d3a]'} disabled:opacity-40`}
          >
            {anthropic.status === 'validating' ? '…' : anthropic.status === 'valid' ? '✓ Valid' : 'Test'}
          </button>
        </div>
        {anthropic.status === 'error' && <p className="px-4 pb-2 text-xs text-red-400">{anthropic.error}</p>}
        <button onClick={() => setAnthropicOpen(o => !o)} className="px-4 pb-3 flex items-center gap-1 text-xs text-slate-500 underline underline-offset-2">
          How to get this key {anthropicOpen ? '▴' : '▾'}
        </button>
        {anthropicOpen && (
          <div className="border-t border-[#1e2130] bg-[#0d0f17] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Getting your Anthropic API key</p>
            <ol className="space-y-2 text-xs text-slate-400">
              <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-[#1e2130] text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">1</span><span>Go to <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-cyan-400">console.anthropic.com</a> and create a free account</span></li>
              <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-[#1e2130] text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">2</span><span>In the sidebar, click <code className="bg-[#1e2130] px-1 rounded">API Keys</code> → <code className="bg-[#1e2130] px-1 rounded">Create Key</code></span></li>
              <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-[#1e2130] text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">3</span><span>Name it <code className="bg-[#1e2130] px-1 rounded">coaching-app</code>, copy the key (starts with <code className="bg-[#1e2130] px-1 rounded">sk-ant-</code>)</span></li>
              <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-[#1e2130] text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">4</span><span>Add to <code className="bg-[#1e2130] px-1 rounded">.env.local</code>: <code className="bg-[#1e2130] px-1 rounded">ANTHROPIC_API_KEY=sk-ant-…</code></span></li>
            </ol>
          </div>
        )}
      </div>

      {/* Tavily block */}
      <div className="border border-[#1e2130] rounded-lg mb-6 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1a2518] flex items-center justify-center text-base">🔍</div>
          <div className="flex-1">
            <span className="text-sm font-bold text-slate-200">Tavily API Key</span>
            <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1a2518] text-green-400 border border-green-900">Optional — unlocks live web search</span>
          </div>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <input
            type="password"
            value={tavily.value}
            onChange={e => setTavily(s => ({ ...s, value: e.target.value, status: 'idle' }))}
            placeholder="tvly-..."
            className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded px-3 py-2 text-sm text-slate-400 font-mono focus:outline-none focus:border-cyan-400/40"
          />
          <button
            onClick={() => validateKey(tavily.value, '/api/setup/validate-tavily', setTavily, 'tavily_key')}
            disabled={!tavily.value || tavily.status === 'validating'}
            className={`text-xs font-bold px-3 py-2 rounded border ${tavily.status === 'valid' ? 'bg-green-950 text-green-400 border-green-900' : 'bg-[#1e2130] text-slate-400 border-[#2a2d3a]'} disabled:opacity-40`}
          >
            {tavily.status === 'validating' ? '…' : tavily.status === 'valid' ? '✓ Valid' : 'Test'}
          </button>
        </div>
        {tavily.status === 'error' && <p className="px-4 pb-2 text-xs text-red-400">{tavily.error}</p>}
        <button onClick={() => setTavilyOpen(o => !o)} className="px-4 pb-3 flex items-center gap-1 text-xs text-slate-500 underline underline-offset-2">
          Why add this? How to get it {tavilyOpen ? '▴' : '▾'}
        </button>
        {tavilyOpen && (
          <div className="border-t border-[#1e2130] bg-[#0d0f17] px-4 py-3 text-xs text-slate-400">
            <p className="mb-2">With Tavily, your research agents can search the web in real time — useful for company intelligence and competitive analysis tasks.</p>
            <ol className="space-y-1">
              <li>1. Go to <a href="https://tavily.com" target="_blank" rel="noreferrer" className="text-cyan-400">tavily.com</a> and create a free account</li>
              <li>2. Copy your API key from the dashboard (starts with <code className="bg-[#1e2130] px-1 rounded">tvly-</code>)</li>
              <li>3. Add to <code className="bg-[#1e2130] px-1 rounded">.env.local</code>: <code className="bg-[#1e2130] px-1 rounded">TAVILY_API_KEY=tvly-…</code></li>
            </ol>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-600">Tavily is optional — you can add it later</span>
        <button
          onClick={onNext}
          disabled={anthropic.status !== 'valid'}
          className="bg-cyan-400 text-[#0f172a] font-bold text-sm px-6 py-2.5 rounded-lg disabled:opacity-30"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
