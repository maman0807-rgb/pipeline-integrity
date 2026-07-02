import { useState } from 'react'
import { Droplets, Lock, User } from 'lucide-react'

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const raw = username.trim()
    const email = raw.includes('@') ? raw : `${raw.toLowerCase()}@eramcore.internal`
    const { error: err } = await onLogin(email, password)
    if (err) setError(`[${email}] ${err.message}`)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest">PHR Prabumulih</p>
            <h1 className="text-xl font-bold text-white leading-tight">Pipeline Integrity</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="username atau email lengkap" required autoComplete="username"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="••••••••" required
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
