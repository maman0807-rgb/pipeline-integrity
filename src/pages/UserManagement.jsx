import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Copy, Check, RefreshCw } from 'lucide-react'

const ROLES = ['admin','mekanik','sr_mekanik','inspektor','viewer']

export default function UserManagement() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState({ username: '', nama: '', nip: '', role: 'viewer' })
  const [sql, setSql]         = useState('')
  const [copied, setCopied]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('users')
      .select('id,nama,nip,username,role,aktif,created_at')
      .order('nama')
    setUsers(data || [])
    setLoading(false)
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function generate() {
    const { username, nama, nip, role } = form
    if (!username || !nama) return
    const email = `${username.toLowerCase().replace(/\s+/g,'_')}@eramcore.internal`
    const pass  = `${username.charAt(0).toUpperCase()}${username.slice(1)}@2024`
    const generatedSql = `-- Jalankan di Supabase SQL Editor
-- 1. Buat auth user
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  role, aud, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '${email}',
  crypt('${pass}', gen_salt('bf')),
  now(), 'authenticated', 'authenticated', now(), now()
);

-- 2. Tambah ke tabel users
INSERT INTO users (id, nama, nip, username, role, aktif)
SELECT id, '${nama}', '${nip || ''}', '${username}', '${role}', true
FROM auth.users WHERE email = '${email}';`
    setSql(generatedSql)
  }

  async function copySQL() {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500'
  const lbl = 'text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5'

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Manajemen User</h1>
        <p className="text-slate-400 text-sm mt-1">User yang bisa login ke sistem Pipeline Integrity</p>
      </div>

      {/* Daftar user */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-bold text-white">Daftar User ({users.length})</h2>
          <button onClick={load} className="text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {loading
          ? <p className="text-slate-400 text-sm p-5">Memuat...</p>
          : <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Nama','Username','NIP','Role','Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0
                  ? <tr><td colSpan={5} className="text-center py-10 text-slate-500">Belum ada data user</td></tr>
                  : users.map(u => (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-5 py-3 font-medium text-white">{u.nama || '—'}</td>
                      <td className="px-5 py-3 text-slate-300 font-mono text-sm">{u.username}@eramcore.internal</td>
                      <td className="px-5 py-3 text-slate-400">{u.nip || '—'}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.aktif ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                          {u.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
        }
      </div>

      {/* Form tambah user */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-white">Tambah User Baru</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Username (untuk login)</label>
            <input value={form.username} onChange={e => f('username', e.target.value)}
              placeholder="contoh: budi_santoso" className={inp} />
            {form.username && (
              <p className="text-xs text-slate-500 mt-1">
                Login: {form.username.toLowerCase().replace(/\s+/g,'_')}@eramcore.internal
              </p>
            )}
          </div>
          <div>
            <label className={lbl}>Nama Lengkap</label>
            <input value={form.nama} onChange={e => f('nama', e.target.value)}
              placeholder="Budi Santoso" className={inp} />
          </div>
          <div>
            <label className={lbl}>NIP (opsional)</label>
            <input value={form.nip} onChange={e => f('nip', e.target.value)}
              placeholder="199001012020121001" className={inp} />
          </div>
          <div>
            <label className={lbl}>Role</label>
            <select value={form.role} onChange={e => f('role', e.target.value)} className={inp}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <button onClick={generate} disabled={!form.username || !form.nama}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
          <Users className="w-4 h-4" /> Generate SQL
        </button>
      </div>

      {/* SQL output */}
      {sql && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white">SQL — Jalankan di Supabase Dashboard</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Buka <span className="text-blue-400">supabase.com → project → SQL Editor</span> lalu paste dan Run
              </p>
            </div>
            <button onClick={copySQL}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-2 rounded-xl transition-colors">
              {copied ? <><Check className="w-4 h-4 text-green-400" /> Tersalin</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <pre className="bg-slate-950 rounded-xl p-4 text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap border border-slate-800">
            {sql}
          </pre>
          <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            Password default: <strong>{form.username.charAt(0).toUpperCase()}{form.username.slice(1)}@2024</strong> — minta user ganti setelah login pertama.
          </p>
        </div>
      )}
    </div>
  )
}
