import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Pencil, X, Check, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'

const PAGE_SIZE = 50

const EMPTY = {
  wk: 'Prabumulih', cluster: '', status: 'Aktif', dari_sumur: '', ke_stasiun: '',
  nama_flowline: '', jenis_sumur: '', panjang_m: '', tahun_konstruksi: '',
  jumlah_kejadian: 0, priority: 'P3', tanggal_inspeksi: '', rla_document: '',
  re_document: '', tanggal_coi_plo: '', sertifikat_berlaku: '', coi_plo: '',
  rlt_lt3: '', rlt_3_5: '', rlt_gt5: '', integrity_status: 'GOOD', catatan: '',
}

function Badge({ status }) {
  const map = {
    GOOD:    'bg-green-500/20 text-green-400',
    MONITOR: 'bg-yellow-500/20 text-yellow-400',
    BAD:     'bg-red-500/20 text-red-400',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${map[status] ?? 'bg-slate-700 text-slate-300'}`}>{status ?? '—'}</span>
}

function PriorityBadge({ p }) {
  const map = { P1: 'text-red-400', P2: 'text-orange-400', P3: 'text-yellow-400', P4: 'text-green-400' }
  return <span className={`text-xs font-black ${map[p] ?? 'text-slate-400'}`}>{p ?? '—'}</span>
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

export default function Flowline() {
  const [rows, setRows]       = useState([])
  const [q, setQ]             = useState('')
  const [page, setPage]       = useState(0)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)
  const { toasts, toast }     = useToast()

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(0) }, [q])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('pipelines').select('*').order('dari_sumur')
    if (error) { toast('Gagal memuat data: ' + error.message, 'error'); setLoading(false); return }
    setRows(data || [])
    setLoading(false)
  }

  const filtered = rows.filter(r =>
    !q || [r.dari_sumur, r.ke_stasiun, r.cluster, r.nama_flowline, r.integrity_status]
      .some(v => (v || '').toLowerCase().includes(q.toLowerCase()))
  )
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function openAdd()  { setForm(EMPTY); setModal('add') }
  function openEdit(r){ setForm({ ...r }); setModal(r) }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form }
      ;['panjang_m','tahun_konstruksi','jumlah_kejadian','rlt_lt3','rlt_3_5','rlt_gt5']
        .forEach(k => { payload[k] = payload[k] === '' ? null : Number(payload[k]) })
      ;['tanggal_inspeksi','tanggal_coi_plo','sertifikat_berlaku']
        .forEach(k => { if (!payload[k]) payload[k] = null })
      delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.no

      const { error } = modal === 'add'
        ? await supabase.from('pipelines').insert(payload)
        : await supabase.from('pipelines').update(payload).eq('id', modal.id)
      if (error) throw error

      toast(modal === 'add' ? 'Flowline berhasil ditambahkan' : 'Flowline berhasil diupdate')
      await load()
      setModal(null)
    } catch (err) {
      toast('Gagal menyimpan: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function del(id) {
    if (!confirm('Hapus flowline ini?')) return
    const { error } = await supabase.from('pipelines').delete().eq('id', id)
    if (error) { toast('Gagal hapus: ' + error.message, 'error'); return }
    setRows(r => r.filter(x => x.id !== id))
    toast('Flowline dihapus')
  }

  function doExport() {
    const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
      'Dari Sumur': r.dari_sumur, 'Ke Stasiun': r.ke_stasiun, Cluster: r.cluster,
      'Nama Flowline': r.nama_flowline, 'Jenis Sumur': r.jenis_sumur,
      'Panjang (m)': r.panjang_m, 'Tahun Konstruksi': r.tahun_konstruksi,
      'Integrity Status': r.integrity_status, Priority: r.priority,
      'COI/PLO Berlaku': r.sertifikat_berlaku, 'Catatan': r.catatan,
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Flowline')
    XLSX.writeFile(wb, `Flowline_Register_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500'
  const lbl = 'text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'

  return (
    <div className="space-y-4 max-w-6xl">
      <Toast toasts={toasts} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Flowline Register</h1>
          <p className="text-slate-400 text-sm">{rows.length} flowline terdaftar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={doExport}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Tambah Flowline
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari sumur, stasiun, cluster..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
      </div>

      {loading
        ? <p className="text-slate-400 text-sm">Memuat...</p>
        : <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Dari Sumur','Ke Stasiun','Cluster','Panjang (m)','Thn','Integrity','Priority','COI/PLO Berlaku',''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0
                    ? <tr><td colSpan={9} className="text-center py-12 text-slate-500">Belum ada data</td></tr>
                    : paged.map(r => (
                      <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">{r.dari_sumur}</td>
                        <td className="px-4 py-3 text-slate-300">{r.ke_stasiun || '—'}</td>
                        <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{r.cluster || '—'}</td>
                        <td className="px-4 py-3 text-slate-300 text-right">{r.panjang_m ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{r.tahun_konstruksi || '—'}</td>
                        <td className="px-4 py-3"><Badge status={r.integrity_status} /></td>
                        <td className="px-4 py-3"><PriorityBadge p={r.priority} /></td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{r.sertifikat_berlaku || '—'}</td>
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
            <Pager page={page} total={filtered.length} onChange={setPage} />
          </div>
      }

      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl my-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{modal === 'add' ? 'Tambah Flowline' : 'Edit Flowline'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Dari Sumur *','dari_sumur','text'],['Ke Stasiun','ke_stasiun','text'],
                ['Cluster','cluster','text'],['Nama Flowline','nama_flowline','text'],
                ['Jenis Sumur','jenis_sumur','text'],['Panjang (m)','panjang_m','number'],
                ['Tahun Konstruksi','tahun_konstruksi','number'],['Jml Kejadian','jumlah_kejadian','number'],
                ['Tanggal Inspeksi','tanggal_inspeksi','date'],['Dokumen RLA','rla_document','text'],
                ['Dokumen RE','re_document','text'],['COI/PLO','coi_plo','text'],
                ['Tgl Terbit COI/PLO','tanggal_coi_plo','date'],['Berlaku s/d','sertifikat_berlaku','date'],
                ['RLT <3 thn','rlt_lt3','number'],['RLT 3-5 thn','rlt_3_5','number'],['RLT >5 thn','rlt_gt5','number'],
              ].map(([label, key, type]) => (
                <div key={key} className={key === 'nama_flowline' ? 'col-span-2' : ''}>
                  <label className={lbl}>{label}</label>
                  <input type={type} value={form[key] ?? ''} onChange={e => f(key, e.target.value)} className={inp} />
                </div>
              ))}
              <div>
                <label className={lbl}>Integrity Status</label>
                <select value={form.integrity_status || ''} onChange={e => f('integrity_status', e.target.value)} className={inp}>
                  {['GOOD','MONITOR','BAD'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Priority</label>
                <select value={form.priority || ''} onChange={e => f('priority', e.target.value)} className={inp}>
                  {['P1','P2','P3','P4'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Catatan</label>
                <textarea value={form.catatan || ''} onChange={e => f('catatan', e.target.value)} rows={2}
                  className={inp + ' resize-none'} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Batal</button>
              <button onClick={save} disabled={saving || !form.dari_sumur}
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
