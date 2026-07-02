import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Copy, Check, RefreshCw, Eye, EyeOff, Shuffle, Trash2, X } from 'lucide-react'

const ROLES = ['admin','mekanik','sr_mekanik','spv','sr_spv','astmen','sm']

function genPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function UserManagement() {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState({ username: '', nama: '', nip: '', role: 'viewer', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [sql, setSql]           = useState('')
  const [copied, setCopied]     = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [deleting, setDeleting]   = useState(false)
  const [delSql, setDelSql]       = useState('')

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
    const { username, nama, nip, role, password } = form
    if (!username || !nama || !password) return
    const email = `${username.toLowerCase().replace(/\s+/g,'_')}@eramcore.internal`
    const pass  = password
    const generatedSql = `-- Jalankan di Supabase SQL Editor
DO $$
DECLARE
  new_uid uuid;
BEGIN
  -- Cek apakah auth user sudah ada
  SELECT id INTO new_uid FROM auth.users WHERE email = '${email}';

  IF new_uid IS NULL THEN
    new_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_uid, 'authenticated', 'authenticated', '${email}',
      crypt('${pass}', gen_salt('bf', 10)),
      now(), '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
      now(), now(), '', '', '', ''
    );
    RAISE NOTICE 'Auth user dibuat: %', new_uid;
  ELSE
    RAISE NOTICE 'Auth user sudah ada (id: %), lewati insert.', new_uid;
  END IF;

  INSERT INTO users (id, nama, nip, username, role, aktif)
  VALUES (new_uid, '${nama}', '${nip || ''}', '${username}', '${role}', true)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Selesai. User % berhasil ditambahkan.', '${nama}';
END;
$$;`
    setSql(generatedSql)
  }

  async function handleDelete() {
    if (!delTarget) return
    setDeleting(true)
    const { error } = await supabase.from('users').delete().eq('id', delTarget.id)
    if (error) {
      alert(`Gagal hapus: ${error.message}`)
    } else {
      const email = `${delTarget.username}@eramcore.internal`
      setDelSql(`-- Hapus auth user (jalankan di Supabase SQL Editor)\nDELETE FROM auth.users WHERE email = '${email}';`)
      setUsers(u => u.filter(x => x.id !== delTarget.id))
      setDelTarget(null)
    }
    setDeleting(false)
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
                  {['Nama','Username','NIP','Role','Status',''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0
                  ? <tr><td colSpan={6} className="text-center py-10 text-slate-500">Belum ada data user</td></tr>
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
                      <td className="px-5 py-3">
                        <button onClick={() => setDelTarget(u)}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          <div className="col-span-2">
            <label className={lbl}>Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => f('password', e.target.value)}
                  placeholder="Masukkan password atau klik Generate"
                  className={inp + ' pr-10'}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button type="button"
                onClick={() => { const p = genPassword(); f('password', p); setShowPass(true) }}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-2 rounded-xl whitespace-nowrap">
                <Shuffle className="w-4 h-4" /> Generate
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Min. 6 karakter. Berikan password ini ke user setelah dibuat.</p>
          </div>
        </div>
        <button onClick={generate} disabled={!form.username || !form.nama || !form.password}
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
            ⚠️ Simpan password ini sebelum ditutup: <strong className="font-mono text-sm">{form.password}</strong> — berikan ke user dan minta ganti setelah login pertama.
          </p>
        </div>
      )}

      {/* SQL hapus auth.users */}
      {delSql && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white">Selesaikan Penghapusan User</h2>
              <p className="text-xs text-slate-400 mt-0.5">Data di tabel <code>users</code> sudah dihapus. Jalankan SQL ini untuk hapus dari <code>auth.users</code>.</p>
            </div>
            <button onClick={() => setDelSql('')} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <pre className="bg-slate-950 rounded-xl p-4 text-xs text-red-300 font-mono overflow-x-auto whitespace-pre-wrap border border-slate-800">
            {delSql}
          </pre>
        </div>
      )}

      {/* Modal konfirmasi hapus */}
      {delTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Hapus User?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tindakan ini tidak bisa dibatalkan.</p>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-sm space-y-1">
              <p className="text-white font-semibold">{delTarget.nama}</p>
              <p className="text-slate-400 font-mono text-xs">{delTarget.username}@eramcore.internal</p>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">{delTarget.role}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDelTarget(null)} className="flex-1 py-2.5 border border-slate-700 rounded-xl text-sm text-slate-300 hover:bg-slate-800">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold">
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
