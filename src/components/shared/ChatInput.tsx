'use client'
import { useState } from 'react'

export function ChatInput({ onSubmit, placeholder, disabled }: {
  onSubmit: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [value, setValue] = useState('')

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) {
        onSubmit(value.trim())
        setValue('')
      }
    }
  }

  return (
    <div className="flex gap-2">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Type a message...'}
        disabled={disabled}
        rows={2}
        className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-cyan-500 disabled:opacity-50"
      />
      <button
        onClick={() => { if (value.trim() && !disabled) { onSubmit(value.trim()); setValue('') } }}
        disabled={!value.trim() || disabled}
        className="px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-900 font-bold rounded-lg text-sm transition"
      >
        Send
      </button>
    </div>
  )
}
