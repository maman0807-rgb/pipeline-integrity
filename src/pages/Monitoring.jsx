import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Pencil, X, Check } from 'lucide-react'

const EMPTY = {
  category: 'FLOWLINE', from_loc: '', to_loc: '', size_inch: '',
  length_m: '', service_fluid: '', year_built: '', ansi_rating: '',
  corrosion_rate: '', remain_life: '', design_pressure: '', leak_event: 0,
  perbaikan: '', ndt: '', plo: '', integrity_status: 'GOOD',
  memo_inspeksi: '', hasil_inspeksi: '', tindak_lanjut: '',
}

function Badge({ status }) {
  const map = {
    GOOD:    'bg-green-500/20 text-green-400 border border-green-500/30',
    MONITOR: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    BAD:     'bg-red-500/20 text-red-400 border border-red-500/30',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${map[status] ?? 'bg-slate-700 text-slate-300'}`}>{status ?? '—'}</span>
}

export default function Monitoring() {
  const [rows, setRows]       = useState([])
  const [q, setQ]             = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('pipeline_segments').select('*').order('category').order('from_loc')
    setRows(data || [])
    setLoading(false)
  }

  const filtered = rows.filter(r => {
    const matchQ = !q || [r.from_loc, r.to_loc, r.category, r.service_fluid]
      .some(v => (v || '').toLowerCase().includes(q.toLowerCase()))
    const matchS = filterStatus === 'ALL' || r.integrity_status === filterStatus
    return matchQ && matchS
  })

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  function openAdd()  { setForm(EMPTY); setModal('add') }
  function openEdit(r){ setForm({ ...r }); setModal(r) }

  async function save() {
    setSaving(true)
    const payload = { ...form }
    ;['size_inch','length_m','year_built','corrosion_rate','remain_life','design_pressure','leak_event']
      .forEach(k => { payload[k] = payload[k] === '' ? null : Number(payload[k]) })
    delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.no

    if (modal === 'add') {
      await supabase.from('pipeline_segments').insert(payload)
    } else {
      await supabase.from('pipeline_segments').update(payload).eq('id', modal.id)
    }
    await load()
    setModal(null)
    setSaving(false)
  }

  async function del(id) {
    if (!confirm('Hapus segmen ini?')) return
    await supabase.from('pipeline_segments').delete().eq('id', id)
    setRows(r => r.filter(x => x.id !== id))
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500'
  const lbl = 'text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'

  const counts = { BAD: rows.filter(r => r.integrity_status === 'BAD').length, MONITOR: rows.filter(r => r.integrity_status === 'MONITOR').length, GOOD: rows.filter(r => r.integrity_status === 'GOOD').length }

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitoring Inspeksi</h1>
          <p className="text-slate-400 text-sm">{rows.length} segmen pipa</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Tambah Segmen
        </button>
      </div>

      {/* Filter status */}
      <div className="flex items-center gap-2 flex-wrap">
        {[['ALL','Semua','text-slate-400'],['BAD','BAD','text-red-400'],['MONITOR','MONITOR','text-yellow-400'],['GOOD','GOOD','text-green-400']].map(([v,l,c]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              filterStatus === v ? 'bg-slate-700 border-slate-600 text-white' : `border-slate-800 ${c} hover:border-slate-700`
            }`}>
            {l}{v !== 'ALL' && ` (${counts[v]})`}
          </button>
        ))}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari dari, ke, kategori..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>
      </div>

      {loading
        ? <p className="text-slate-400 text-sm">Memuat...</p>
        : <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Kategori','Dari','Ke','Size (in)','Panjang (m)','Fluid','Thn','Des. Press.','Corr. Rate','Sisa Hidup','Leak','Integrity',''].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={13} className="text-center py-12 text-slate-500">Belum ada data</td></tr>
                    : filtered.map(r => (
                      <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-3 py-3 font-semibold text-white whitespace-nowrap">{r.category || '—'}</td>
                        <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{r.from_loc || '—'}</td>
                        <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{r.to_loc || '—'}</td>
                        <td className="px-3 py-3 text-slate-300 text-right">{r.size_inch ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-300 text-right">{r.length_m ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-400">{r.service_fluid || '—'}</td>
                        <td className="px-3 py-3 text-slate-400">{r.year_built || '—'}</td>
                        <td className="px-3 py-3 text-slate-400 text-right">{r.design_pressure ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-400 text-right">{r.corrosion_rate ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-300 text-right">{r.remain_life ?? '—'}</td>
                        <td className="px-3 py-3 text-red-400 font-bold text-center">{r.leak_event ?? 0}</td>
                        <td className="px-3 py-3"><Badge status={r.integrity_status} /></td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(r)} className="text-slate-400 hover:text-blue-400"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => del(r.id)} className="text-slate-400 hover:text-red-400"><X className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
      }

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl my-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{modal === 'add' ? 'Tambah Segmen' : 'Edit Segmen'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Kategori</label>
                <select value={form.category || ''} onChange={e => f('category', e.target.value)} className={inp}>
                  {['FLOWLINE','TRUNKLINE','GASLINE','STREAMLINE','PIPING'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Service Fluid</label>
                <input value={form.service_fluid || ''} onChange={e => f('service_fluid', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Dari</label>
                <input value={form.from_loc || ''} onChange={e => f('from_loc', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Ke</label>
                <input value={form.to_loc || ''} onChange={e => f('to_loc', e.target.value)} className={inp} />
              </div>
              {[['Size (inch)','size_inch'],['Panjang (m)','length_m'],['Tahun Dibangun','year_built'],['ANSI Rating','ansi_rating'],['Design Pressure','design_pressure'],['Corrosion Rate','corrosion_rate'],['Remain Life','remain_life'],['Leak Event','leak_event']].map(([l,k]) => (
                <div key={k}>
                  <label className={lbl}>{l}</label>
                  <input type="number" value={form[k] ?? ''} onChange={e => f(k, e.target.value)} className={inp} />
                </div>
              ))}
              <div>
                <label className={lbl}>Integrity Status</label>
                <select value={form.integrity_status || ''} onChange={e => f('integrity_status', e.target.value)} className={inp}>
                  {['GOOD','MONITOR','BAD'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Perbaikan</label>
                <input value={form.perbaikan || ''} onChange={e => f('perbaikan', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>NDT</label>
                <input value={form.ndt || ''} onChange={e => f('ndt', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>PLO</label>
                <input value={form.plo || ''} onChange={e => f('plo', e.target.value)} className={inp} />
              </div>
              {[['Memo Inspeksi','memo_inspeksi'],['Hasil Inspeksi','hasil_inspeksi'],['Tindak Lanjut','tindak_lanjut']].map(([l,k]) => (
                <div key={k} className="col-span-2">
                  <label className={lbl}>{l}</label>
                  <textarea value={form[k] || ''} onChange={e => f(k, e.target.value)} rows={2}
                    className={inp + ' resize-none'} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Batal</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                <Check className="w-4 h-4" />{saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
