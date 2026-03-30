'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/dashboard/tasks')
      } else {
        const data = await res.json()
        setError(data.error || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="w-full max-w-sm bg-[#161920] border border-[#1e2130] rounded-xl p-8">
        <h1 className="text-xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-sm text-slate-400 mb-6">Enter your password to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={!password || loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-900 font-bold py-3 rounded-lg text-sm transition"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
