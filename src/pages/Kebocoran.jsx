import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, X, Check, Pencil, Flame, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'

const PAGE_SIZE = 50

const EMPTY = {
  deskripsi_pipa: '', deskripsi_kegiatan: '', tanggal_kejadian: '',
  mulai_perbaikan: '', selesai_perbaikan: '', bocor_titik: 0,
  clamp_titik: 0, sadel_titik: 0, sisip_meter: 0,
  lokasi: '', kp: '', struktur: '', distrik: '',
  dimensi_pipa: '', panjang_pipa: '', keterangan: '', pipeline_id: '', segment_id: '',
}

function Pager({ page, total, onChange }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
      <span className="text-xs text-slate-500">{total} data · hal {page + 1}/{pages}</span>
      <div className="flex gap-2">
        <button disabled={page === 0} onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40">← Sebelumnya</button>
        <button disabled={page >= pages - 1} onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40">Selanjutnya →</button>
      </div>
    </div>
  )
}

export default function Kebocoran() {
  const [rows, setRows]       = useState([])
  const [total, setTotal]     = useState(0)
  const [summary, setSummary] = useState({ bocor: 0, clamp: 0, sadel: 0, sisip: 0 })
  const [page, setPage]       = useState(0)
  const [pipes, setPipes]     = useState([])
  const [segs, setSegs]       = useState([])
  const [q, setQ]             = useState('')
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)
  const { toasts, toast }     = useToast()

  useEffect(() => {
    loadPipes()
  }, [])

  useEffect(() => {
    loadPage()
    loadAggregate()
  }, [page, q])

  async function loadPipes() {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('pipelines').select('id,dari_sumur,ke_stasiun').order('dari_sumur'),
      supabase.from('pipeline_segments').select('id,from_loc,to_loc,category').order('from_loc'),
    ])
    setPipes(p || [])
    setSegs(s || [])
  }

  async function loadAggregate() {
    let query = supabase.from('leak_events')
      .select('bocor_titik,clamp_titik,sadel_titik,sisip_meter')
    if (q) {
      query = query.or(`lokasi.ilike.%${q}%,distrik.ilike.%${q}%,struktur.ilike.%${q}%,deskripsi_pipa.ilike.%${q}%`)
    }
    const { data } = await query
    const d = data || []
    setSummary({
      bocor: d.reduce((s, r) => s + (r.bocor_titik || 0), 0),
      clamp: d.reduce((s, r) => s + (r.clamp_titik || 0), 0),
      sadel: d.reduce((s, r) => s + (r.sadel_titik || 0), 0),
      sisip: d.reduce((s, r) => s + (r.sisip_meter || 0), 0),
    })
  }

  async function loadPage() {
    setLoading(true)
    const from = page * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    let query = supabase.from('leak_events').select('*', { count: 'exact' })
      .order('tanggal_kejadian', { ascending: false })
      .range(from, to)
    if (q) {
      query = supabase.from('leak_events').select('*', { count: 'exact' })
        .or(`lokasi.ilike.%${q}%,distrik.ilike.%${q}%,struktur.ilike.%${q}%,deskripsi_pipa.ilike.%${q}%`)
        .order('tanggal_kejadian', { ascending: false })
        .range(from, to)
    }
    const { data, count, error } = await query
    if (error) { toast('Gagal memuat data: ' + error.message, 'error'); setLoading(false); return }
    setRows(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  function openAdd()  { setForm(EMPTY); setModal('add') }
  function openEdit(r){ setForm({ ...r }); setModal(r) }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form }
      ;['bocor_titik','clamp_titik','sadel_titik','sisip_meter','panjang_pipa']
        .forEach(k => { payload[k] = payload[k] === '' ? 0 : Number(payload[k]) })
      ;['tanggal_kejadian','mulai_perbaikan','selesai_perbaikan']
        .forEach(k => { if (!payload[k]) payload[k] = null })
      if (!payload.pipeline_id) payload.pipeline_id = null
      if (!payload.segment_id)  payload.segment_id  = null
      delete payload.id; delete payload.created_at; delete payload.updated_at

      const { error } = modal === 'add'
        ? await supabase.from('leak_events').insert(payload)
        : await supabase.from('leak_events').update(payload).eq('id', modal.id)
      if (error) throw error

      toast(modal === 'add' ? 'Kejadian berhasil dicatat' : 'Data berhasil diupdate')
      setModal(null)
      setPage(0)
      await Promise.all([loadPage(), loadAggregate()])
    } catch (err) {
      toast('Gagal menyimpan: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function del(id) {
    if (!confirm('Hapus kejadian ini?')) return
    const { error } = await supabase.from('leak_events').delete().eq('id', id)
    if (error) { toast('Gagal hapus: ' + error.message, 'error'); return }
    setRows(r => r.filter(x => x.id !== id))
    setTotal(t => t - 1)
    toast('Kejadian dihapus')
    loadAggregate()
  }

  async function doExport() {
    toast('Mempersiapkan export...', 'info')
    const { data } = await supabase.from('leak_events').select('*').order('tanggal_kejadian', { ascending: false })
    if (!data) return
    const ws = XLSX.utils.json_to_sheet(data.map(r => ({
      Tanggal: r.tanggal_kejadian, Lokasi: r.lokasi, Distrik: r.distrik,
      Struktur: r.struktur, 'Deskripsi Pipa': r.deskripsi_pipa,
      'Bocor (titik)': r.bocor_titik, 'Clamp (titik)': r.clamp_titik,
      'Sadel (titik)': r.sadel_titik, 'Sisip (m)': r.sisip_meter,
      'Mulai Perbaikan': r.mulai_perbaikan, 'Selesai Perbaikan': r.selesai_perbaikan,
      Keterangan: r.keterangan,
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Kebocoran')
    XLSX.writeFile(wb, `History_Kebocoran_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500'
  const lbl = 'text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'

  const { bocor: totBocor, clamp: totClamp, sadel: totSadel, sisip: totSisip } = summary

  return (
    <div className="space-y-4 max-w-6xl">
      <Toast toasts={toasts} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">History Kebocoran</h1>
          <p className="text-slate-400 text-sm">{total.toLocaleString()} kejadian tercatat</p>
        </div>
        <div className="flex gap-2">
          <button onClick={doExport}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <Download className="w-4 h-4" /> Export All
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Catat Kebocoran
          </button>
        </div>
      </div>

      {/* Summary — halaman saat ini */}
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
        <input value={q} onChange={e => { setQ(e.target.value); setPage(0) }}
          placeholder="Cari lokasi, distrik, struktur..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
      </div>

      {loading
        ? <p className="text-slate-400 text-sm">Memuat...</p>
        : <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Tanggal','Lokasi','Distrik','Bocor','Clamp','Sadel','Sisip (m)','Deskripsi Pipa',''].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0
                    ? <tr><td colSpan={9} className="text-center py-12 text-slate-500">Belum ada data</td></tr>
                    : rows.map(r => (
                      <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{r.tanggal_kejadian || '—'}</td>
                        <td className="px-3 py-3 text-white font-semibold max-w-[140px] truncate">{r.lokasi || '—'}</td>
                        <td className="px-3 py-3 text-slate-400">{r.distrik || '—'}</td>
                        <td className="px-3 py-3 text-red-400 font-bold text-center">{r.bocor_titik || 0}</td>
                        <td className="px-3 py-3 text-orange-400 font-bold text-center">{r.clamp_titik || 0}</td>
                        <td className="px-3 py-3 text-yellow-400 font-bold text-center">{r.sadel_titik || 0}</td>
                        <td className="px-3 py-3 text-blue-400 text-center">{r.sisip_meter || 0}</td>
                        <td className="px-3 py-3 text-slate-400 max-w-[160px] truncate">{r.deskripsi_pipa || '—'}</td>
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
            <Pager page={page} total={total} onChange={setPage} />
          </div>
      }

      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl my-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-400" />
                {modal === 'add' ? 'Catat Kebocoran' : 'Edit Kejadian'}
              </h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={lbl}>Segmen Pipa <span className="text-blue-400">(untuk update Decision Matrix)</span></label>
                <select value={form.segment_id || ''} onChange={e => f('segment_id', e.target.value)} className={inp}>
                  <option value="">— Pilih Segmen —</option>
                  {segs.map(s => (
                    <option key={s.id} value={s.id}>
                      [{s.category || '—'}] {s.from_loc || '—'} → {s.to_loc || '—'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Flowline Register</label>
                <select value={form.pipeline_id || ''} onChange={e => f('pipeline_id', e.target.value)} className={inp}>
                  <option value="">— Pilih Flowline (opsional) —</option>
                  {pipes.map(p => (
                    <option key={p.id} value={p.id}>{p.dari_sumur}{p.ke_stasiun ? ` → ${p.ke_stasiun}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Deskripsi Pipa</label>
                <input value={form.deskripsi_pipa || ''} onChange={e => f('deskripsi_pipa', e.target.value)} className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Deskripsi Kegiatan</label>
                <textarea value={form.deskripsi_kegiatan || ''} onChange={e => f('deskripsi_kegiatan', e.target.value)}
                  rows={2} className={inp + ' resize-none'} />
              </div>
              {[['Tanggal Kejadian','tanggal_kejadian','date'],['Mulai Perbaikan','mulai_perbaikan','date'],
                ['Selesai Perbaikan','selesai_perbaikan','date'],['Lokasi','lokasi','text'],
                ['KP','kp','text'],['Struktur','struktur','text'],['Distrik','distrik','text'],
                ['Dimensi Pipa','dimensi_pipa','text'],
              ].map(([l,k,t]) => (
                <div key={k}>
                  <label className={lbl}>{l}</label>
                  <input type={t} value={form[k] || ''} onChange={e => f(k, e.target.value)} className={inp} />
                </div>
              ))}
              {[['Bocor (titik)','bocor_titik'],['Clamp (titik)','clamp_titik'],
                ['Sadel (titik)','sadel_titik'],['Sisip (m)','sisip_meter'],['Panjang Pipa','panjang_pipa']
              ].map(([l,k]) => (
                <div key={k}>
                  <label className={lbl}>{l}</label>
                  <input type="number" value={form[k] ?? ''} onChange={e => f(k, e.target.value)} className={inp} />
                </div>
              ))}
              <div className="col-span-2">
                <label className={lbl}>Keterangan</label>
                <textarea value={form.keterangan || ''} onChange={e => f('keterangan', e.target.value)}
                  rows={2} className={inp + ' resize-none'} />
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
