import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, X, Check, Pencil, Flame } from 'lucide-react'

const EMPTY = {
  deskripsi_pipa: '', deskripsi_kegiatan: '', tanggal_kejadian: '',
  mulai_perbaikan: '', selesai_perbaikan: '', bocor_titik: 0,
  clamp_titik: 0, sadel_titik: 0, sisip_meter: 0,
  lokasi: '', kp: '', struktur: '', distrik: '',
  dimensi_pipa: '', panjang_pipa: '', keterangan: '', pipeline_id: '',
}

export default function Kebocoran() {
  const [rows, setRows]       = useState([])
  const [pipes, setPipes]     = useState([])
  const [q, setQ]             = useState('')
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: leaks }, { data: p }] = await Promise.all([
      supabase.from('leak_events').select('*').order('tanggal_kejadian', { ascending: false }),
      supabase.from('pipelines').select('id,dari_sumur,ke_stasiun').order('dari_sumur'),
    ])
    setRows(leaks || [])
    setPipes(p || [])
    setLoading(false)
  }

  const filtered = rows.filter(r =>
    !q || [r.lokasi, r.distrik, r.struktur, r.deskripsi_pipa, r.keterangan]
      .some(v => (v || '').toLowerCase().includes(q.toLowerCase()))
  )

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  function openAdd()  { setForm(EMPTY); setModal('add') }
  function openEdit(r){ setForm({ ...r }); setModal(r) }

  async function save() {
    setSaving(true)
    const payload = { ...form }
    ;['bocor_titik','clamp_titik','sadel_titik','sisip_meter','panjang_pipa']
      .forEach(k => { payload[k] = payload[k] === '' ? 0 : Number(payload[k]) })
    ;['tanggal_kejadian','mulai_perbaikan','selesai_perbaikan']
      .forEach(k => { if (!payload[k]) payload[k] = null })
    if (!payload.pipeline_id) payload.pipeline_id = null
    delete payload.id; delete payload.created_at; delete payload.updated_at

    if (modal === 'add') {
      await supabase.from('leak_events').insert(payload)
    } else {
      await supabase.from('leak_events').update(payload).eq('id', modal.id)
    }
    await load()
    setModal(null)
    setSaving(false)
  }

  async function del(id) {
    if (!confirm('Hapus kejadian ini?')) return
    await supabase.from('leak_events').delete().eq('id', id)
    setRows(r => r.filter(x => x.id !== id))
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500'
  const lbl = 'text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'

  const totBocor = rows.reduce((s, r) => s + (r.bocor_titik || 0), 0)
  const totClamp = rows.reduce((s, r) => s + (r.clamp_titik || 0), 0)
  const totSadel = rows.reduce((s, r) => s + (r.sadel_titik || 0), 0)
  const totSisip = rows.reduce((s, r) => s + (r.sisip_meter || 0), 0)

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">History Kebocoran</h1>
          <p className="text-slate-400 text-sm">{rows.length} kejadian tercatat</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Catat Kebocoran
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Titik Bocor', totBocor, 'text-red-400'],['Clamp', totClamp, 'text-orange-400'],
          ['Sadel', totSadel, 'text-yellow-400'],['Sisip (m)', totSisip.toFixed(1), 'text-blue-400']
        ].map(([l,v,c]) => (
          <div key={l} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${c}`}>{v}</p>
            <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">{l}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari lokasi, distrik, deskripsi..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
      </div>

      {loading
        ? <p className="text-slate-400 text-sm">Memuat...</p>
        : <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Tanggal','Lokasi','Distrik','Bocor','Clamp','Sadel','Sisip (m)','Mulai Perbaikan','Selesai',''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={10} className="text-center py-12 text-slate-500">Belum ada data</td></tr>
                    : filtered.map(r => (
                      <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{r.tanggal_kejadian || '—'}</td>
                        <td className="px-4 py-3 font-medium text-white">{r.lokasi || '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{r.distrik || '—'}</td>
                        <td className="px-4 py-3 text-red-400 font-bold text-center">{r.bocor_titik || 0}</td>
                        <td className="px-4 py-3 text-orange-400 font-bold text-center">{r.clamp_titik || 0}</td>
                        <td className="px-4 py-3 text-yellow-400 font-bold text-center">{r.sadel_titik || 0}</td>
                        <td className="px-4 py-3 text-blue-400 text-center">{r.sisip_meter || 0}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{r.mulai_perbaikan || '—'}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{r.selesai_perbaikan || '—'}</td>
                        <td className="px-4 py-3">
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
              <h2 className="text-lg font-bold text-white">{modal === 'add' ? 'Catat Kejadian Kebocoran' : 'Edit Kejadian'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={lbl}>Flowline (opsional)</label>
                <select value={form.pipeline_id || ''} onChange={e => f('pipeline_id', e.target.value)} className={inp}>
                  <option value="">— Pilih flowline —</option>
                  {pipes.map(p => <option key={p.id} value={p.id}>{p.dari_sumur}{p.ke_stasiun ? ` → ${p.ke_stasiun}` : ''}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Deskripsi Pipa</label>
                <input value={form.deskripsi_pipa || ''} onChange={e => f('deskripsi_pipa', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Tanggal Kejadian</label>
                <input type="date" value={form.tanggal_kejadian || ''} onChange={e => f('tanggal_kejadian', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Lokasi</label>
                <input value={form.lokasi || ''} onChange={e => f('lokasi', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Distrik</label>
                <input value={form.distrik || ''} onChange={e => f('distrik', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Struktur</label>
                <input value={form.struktur || ''} onChange={e => f('struktur', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>KP</label>
                <input value={form.kp || ''} onChange={e => f('kp', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Dimensi Pipa</label>
                <input value={form.dimensi_pipa || ''} onChange={e => f('dimensi_pipa', e.target.value)} className={inp} />
              </div>

              <div className="col-span-2"><p className="text-xs font-bold text-slate-300 uppercase tracking-wider mt-1">Jenis Repair</p></div>
              {[['Bocor (titik)','bocor_titik'],['Clamp (titik)','clamp_titik'],['Sadel (titik)','sadel_titik'],['Sisip (meter)','sisip_meter']].map(([l,k]) => (
                <div key={k}>
                  <label className={lbl}>{l}</label>
                  <input type="number" min="0" value={form[k] ?? 0} onChange={e => f(k, e.target.value)} className={inp} />
                </div>
              ))}

              <div>
                <label className={lbl}>Mulai Perbaikan</label>
                <input type="date" value={form.mulai_perbaikan || ''} onChange={e => f('mulai_perbaikan', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Selesai Perbaikan</label>
                <input type="date" value={form.selesai_perbaikan || ''} onChange={e => f('selesai_perbaikan', e.target.value)} className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Keterangan</label>
                <textarea value={form.keterangan || ''} onChange={e => f('keterangan', e.target.value)} rows={2}
                  className={inp + ' resize-none'} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Batal</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                <Check className="w-4 h-4" />{saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
