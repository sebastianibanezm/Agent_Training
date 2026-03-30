'use client'
import { useState } from 'react'

interface Step1NameProps {
  onNext: (name: string) => void
}

export function Step1Name({ onNext }: Step1NameProps) {
  const [name, setName] = useState('')

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-1">What's your name?</h2>
      <p className="text-sm text-slate-500 mb-6">We'll personalise your app with it.</p>
      <input
        type="text"
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onNext(name.trim()) }}
        placeholder="e.g. Alex"
        className="w-full bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-3 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-400/50 mb-4"
      />
      <div className="flex justify-end">
        <button
          onClick={() => { if (name.trim()) onNext(name.trim()) }}
          disabled={!name.trim()}
          className="bg-cyan-400 text-[#0f172a] font-bold text-sm px-6 py-2.5 rounded-lg disabled:opacity-30"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
