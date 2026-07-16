import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import * as XLSX from 'xlsx'
import {
  Package, Plus, Search, Pencil, Trash2, X,
  ArrowUpCircle, ArrowDownCircle, ClipboardList,
  AlertTriangle, Download, Upload, RefreshCw,
} from 'lucide-react'

const KATEGORI = ['Pipe Fittings','Valve & Actuator','Gasket & Seal','Chemical','Tools & Equipment','Consumable','Spare Part','Safety Equipment']
const SAFETY_DEFAULT = 5

const EMPTY = {
  kimap: '', part_number: '', description: '', category: 'Spare Part', satuan: '',
  stok: 0, safety_stock: SAFETY_DEFAULT, unit_price: '', lead_time_days: '',
  penyimpanan: '', tgl_masuk: '',
}

const rp = n => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID')
const today = () => new Date().toISOString().slice(0, 10)

function StokBadge({ stok, safety }) {
  const limit = Number(safety) > 0 ? Number(safety) : SAFETY_DEFAULT
  if (stok <= 0)      return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">Habis</span>
  if (stok <= limit)  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Menipis</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">Tersedia</span>
}

function KatBadge({ kat }) {
  const colors = {
    'Pipe Fittings':    'bg-blue-500/15 text-blue-300',
    'Valve & Actuator': 'bg-purple-500/15 text-purple-300',
    'Gasket & Seal':    'bg-cyan-500/15 text-cyan-300',
    'Chemical':         'bg-orange-500/15 text-orange-300',
    'Tools & Equipment':'bg-yellow-500/15 text-yellow-300',
    'Consumable':       'bg-green-500/15 text-green-300',
    'Spare Part':       'bg-slate-500/15 text-slate-300',
    'Safety Equipment': 'bg-red-500/15 text-red-300',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[kat] ?? 'bg-slate-700 text-slate-400'}`}>{kat || '—'}</span>
}

export default function StokGudang() {
  const [tab, setTab]               = useState('stok')
  const [mats, setMats]             = useState([])
  const [txs, setTxs]               = useState([])
  const [loading, setLoading]       = useState(true)
  const [txLoading, setTxLoading]   = useState(false)
  const [q, setQ]                   = useState('')
  const [txQ, setTxQ]               = useState('')
  const [stockF, setStockF]         = useState('all')
  const [katF, setKatF]             = useState('Semua')
  const [txTypeF, setTxTypeF]       = useState('all')
  const [modal, setModal]           = useState(null)  // 'add'|'edit'|'adjust'|'tx'
  const [form, setForm]             = useState(EMPTY)
  const [selected, setSelected]     = useState(null)
  const [adjDir, setAdjDir]         = useState('masuk')
  const [adjVal, setAdjVal]         = useState('')
  const [adjKet, setAdjKet]         = useState('')
  const [adjTgl, setAdjTgl]         = useState(today())
  const [txPart, setTxPart]         = useState(null)
  const [txPartQ, setTxPartQ]       = useState('')
  const [txPartDrop, setTxPartDrop] = useState(false)
  const [txDir, setTxDir]           = useState('masuk')
  const [txJml, setTxJml]           = useState('')
  const [txKet, setTxKet]           = useState('')
  const [txTgl, setTxTgl]           = useState(today())
  const [saving, setSaving]         = useState(false)
  const [delConfirm, setDelConfirm] = useState(null)
  const { toasts, toast }           = useToast()
  const fileRef                     = useRef()
  const dropRef                     = useRef()

  useEffect(() => { loadMats() }, [])
  useEffect(() => { if (tab === 'riwayat') loadTxs() }, [tab])
  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setTxPartDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function loadMats() {
    setLoading(true)
    const { data, error } = await supabase.from('gudang_materials').select('*').order('description')
    if (error) toast('Gagal memuat data: ' + error.message, 'error')
    setMats(data || [])
    setLoading(false)
  }

  async function loadTxs() {
    setTxLoading(true)
    const { data, error } = await supabase.from('gudang_transactions')
      .select('*').order('created_at', { ascending: false }).limit(500)
    if (error) toast('Gagal memuat riwayat: ' + error.message, 'error')
    setTxs(data || [])
    setTxLoading(false)
  }

  async function adjustStock(mat, delta, ket, tgl, userName) {
    const stokBefore = mat.stok
    const stokAfter  = stokBefore + delta
    const { error: e1 } = await supabase.from('gudang_materials')
      .update({ stok: stokAfter, updated_at: new Date().toISOString() }).eq('id', mat.id)
    if (e1) throw e1
    const { error: e2 } = await supabase.from('gudang_transactions').insert({
      material_id: mat.id, part_number: mat.part_number, description: mat.description,
      tipe: delta > 0 ? 'masuk' : 'keluar',
      jumlah: Math.abs(delta),
      stok_sebelum: stokBefore, stok_sesudah: stokAfter,
      keterangan: ket || null, tanggal: tgl, user_name: userName || null,
    })
    if (e2) throw e2
  }

  const filtered = mats.filter(m => {
    const kw = q.toLowerCase()
    const matchQ = !kw || m.part_number?.toLowerCase().includes(kw) || m.description?.toLowerCase().includes(kw) || m.penyimpanan?.toLowerCase().includes(kw)
    const limit = Number(m.safety_stock) > 0 ? Number(m.safety_stock) : SAFETY_DEFAULT
    const matchStok = stockF === 'all' ? true : stockF === 'habis' ? m.stok <= 0 : stockF === 'menipis' ? m.stok > 0 && m.stok <= limit : m.stok > limit
    const matchKat = katF === 'Semua' || m.category === katF
    return matchQ && matchStok && matchKat
  })

  const txFiltered = txs.filter(t => {
    const kw = txQ.toLowerCase()
    const matchQ = !kw || t.part_number?.toLowerCase().includes(kw) || t.description?.toLowerCase().includes(kw) || t.keterangan?.toLowerCase().includes(kw)
    const matchT = txTypeF === 'all' || t.tipe === txTypeF
    return matchQ && matchT
  })

  async function handleSave() {
    if (!form.kimap?.trim()) { toast('KIMAP wajib diisi', 'error'); return }
    if (!form.description) { toast('Deskripsi wajib diisi', 'error'); return }
    setSaving(true)
    const payload = {
      ...form,
      stok: Number(form.stok) || 0,
      safety_stock: Number(form.safety_stock) || SAFETY_DEFAULT,
      unit_price: form.unit_price ? Number(form.unit_price) : null,
      lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
      tgl_masuk: form.tgl_masuk || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = modal === 'add'
      ? await supabase.from('gudang_materials').insert(payload)
      : await supabase.from('gudang_materials').update(payload).eq('id', selected.id)
    if (error) { toast('Gagal simpan: ' + error.message, 'error') }
    else { toast(modal === 'add' ? 'Material ditambahkan' : 'Material diperbarui'); setModal(null); loadMats() }
    setSaving(false)
  }

  async function handleAdjust() {
    const jumlah = Number(adjVal)
    if (!jumlah || jumlah <= 0) { toast('Jumlah harus lebih dari 0', 'error'); return }
    setSaving(true)
    try {
      await adjustStock(selected, adjDir === 'masuk' ? jumlah : -jumlah, adjKet, adjTgl, 'user')
      toast(`Stok ${adjDir} berhasil dicatat`)
      setModal(null); loadMats()
    } catch (e) { toast('Gagal adjust: ' + e.message, 'error') }
    setSaving(false)
  }

  async function handleTxSave() {
    if (!txPart) { toast('Pilih part terlebih dahulu', 'error'); return }
    const jumlah = Number(txJml)
    if (!jumlah || jumlah <= 0) { toast('Jumlah harus lebih dari 0', 'error'); return }
    setSaving(true)
    try {
      await adjustStock(txPart, txDir === 'masuk' ? jumlah : -jumlah, txKet, txTgl, 'user')
      toast(`Transaksi ${txDir} berhasil dicatat`)
      setModal(null); setTxPart(null); setTxJml(''); setTxKet('')
      loadMats(); loadTxs()
    } catch (e) { toast('Gagal catat: ' + e.message, 'error') }
    setSaving(false)
  }

  async function handleDelete() {
    const { error } = await supabase.from('gudang_materials').delete().eq('id', delConfirm.id)
    if (error) toast('Gagal hapus: ' + error.message, 'error')
    else { toast('Material dihapus'); setDelConfirm(null); loadMats() }
  }

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const wb  = XLSX.read(ev.target.result)
      const ws  = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const get = (r, ...keys) => {
        for (const k of keys) {
          const found = Object.keys(r).find(x => x.trim().toLowerCase().replace(/[\s_-]/g,'') === k.replace(/[\s_-]/g,''))
          if (found && r[found] !== '') return String(r[found]).trim()
        }
        return ''
      }
      const rows = raw.map(r => ({
        part_number:    get(r,'part number','partnumber','kode','no part'),
        description:    get(r,'description','deskripsi','nama','material'),
        category:       get(r,'kategori','category') || 'Spare Part',
        satuan:         get(r,'satuan','unit','uom'),
        stok:           Number(get(r,'qty','stok','quantity','jumlah')) || 0,
        safety_stock:   Number(get(r,'safety stock','safetystock')) || SAFETY_DEFAULT,
        unit_price:     Number(get(r,'harga satuan','harga','unitprice','price')) || null,
        lead_time_days: Number(get(r,'lead time','leadtime')) || null,
        kimap:          get(r,'kimap','ki map','kode kimap','no kimap'),
        penyimpanan:    get(r,'penyimpanan','lokasi','rak'),
        tgl_masuk:      get(r,'tgl masuk','tglmasuk','tanggal masuk') || null,
      })).filter(r => r.kimap)
      if (rows.length === 0) { toast('Tidak ada data valid — pastikan kolom KIMAP terisi', 'error'); return }
      // Dedupe by KIMAP — ON CONFLICT DO UPDATE gagal kalau 1 statement punya KIMAP duplikat. Baris terakhir menang.
      const dedupMap = new Map(rows.map(r => [r.kimap, r]))
      const dedupRows = [...dedupMap.values()]
      const dupCount = rows.length - dedupRows.length
      const { error } = await supabase.from('gudang_materials').upsert(dedupRows, { onConflict: 'kimap', ignoreDuplicates: false })
      if (error) toast('Gagal import: ' + error.message, 'error')
      else { toast(`${dedupRows.length} part berhasil diimport${dupCount ? ` (${dupCount} baris duplikat KIMAP di-skip)` : ''}`); loadMats() }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function exportExcel() {
    const rows = filtered.map(m => ({
      'Part Number':      m.part_number,
      'Description':      m.description,
      'Kategori':         m.category || '',
      'Satuan':           m.satuan || '',
      'Stok':             m.stok ?? 0,
      'Safety Stock':     m.safety_stock ?? SAFETY_DEFAULT,
      'Harga Satuan':     m.unit_price ?? '',
      'Lead Time (hari)': m.lead_time_days ?? '',
      'KIMAP':            m.kimap || '',
      'Penyimpanan':      m.penyimpanan || '',
      'Tgl Masuk':        m.tgl_masuk || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Gudang')
    XLSX.writeFile(wb, `stok-gudang-pipa-${today()}.xlsx`)
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Part Number','Description','Kategori','Satuan','Stok','Safety Stock','Harga Satuan','Lead Time (hari)','KIMAP','Penyimpanan','Tgl Masuk'],
      ['PIP-001','Pipa CS 2" SCH 40','Pipe Fittings','Btg',10,3,1500000,30,'KM-001','GD-01','2026-01-01'],
      ['VLV-001','Ball Valve 2" SS','Valve & Actuator','Pcs',5,2,2800000,45,'KM-002','GD-02','2026-01-01'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'template_stok_gudang.xlsx')
  }

  const lowStok = mats.filter(m => { const l = Number(m.safety_stock) > 0 ? Number(m.safety_stock) : SAFETY_DEFAULT; return m.stok > 0 && m.stok <= l }).length
  const habis   = mats.filter(m => m.stok <= 0).length

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500'
  const lbl = 'text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'

  return (
    <div className="space-y-6 max-w-6xl">
      <Toast toasts={toasts} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Stok Gudang</h1>
          <p className="text-slate-400 text-sm">Material & spare part pipa Prabumulih Field</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={loadMats} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-3 py-2 rounded-xl">
            <RefreshCw className="w-4 h-4" />
          </button>
          {tab === 'stok' && <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
            <button onClick={downloadTemplate} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-3 py-2 rounded-xl">
              <Download className="w-4 h-4" /> Template
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-3 py-2 rounded-xl">
              <Upload className="w-4 h-4" /> Import
            </button>
            <button onClick={exportExcel} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-3 py-2 rounded-xl">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => { setForm(EMPTY); setModal('add') }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl">
              <Plus className="w-4 h-4" /> Tambah Material
            </button>
          </>}
          {tab === 'riwayat' && (
            <button onClick={() => { setTxPart(null); setTxPartQ(''); setTxDir('masuk'); setTxJml(''); setTxKet(''); setTxTgl(today()); setModal('tx') }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl">
              <Plus className="w-4 h-4" /> Catat Transaksi
            </button>
          )}
        </div>
      </div>

      {/* Alert stok menipis/habis */}
      {(lowStok > 0 || habis > 0) && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-4 py-3 text-sm text-yellow-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {habis > 0 && <span><strong>{habis}</strong> material stok habis.</span>}
          {lowStok > 0 && <span><strong>{lowStok}</strong> material stok menipis.</span>}
          <span className="text-yellow-500">Segera restock.</span>
        </div>
      )}

      {/* Tab */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1 w-fit">
        {[['stok','Stok Material', Package],['riwayat','Riwayat Transaksi', ClipboardList]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ─── Tab Stok ─── */}
      {tab === 'stok' && <>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Total Material', mats.length, 'text-blue-400'],
            ['Stok Menipis',   lowStok,     'text-yellow-400'],
            ['Stok Habis',     habis,        'text-red-400'],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className={`text-3xl font-bold ${c}`}>{v}</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{l}</p>
            </div>
          ))}
        </div>

        {/* Filter Status */}
        <div className="flex gap-2 flex-wrap">
          {[
            ['all','Semua','bg-slate-700'],
            ['tersedia','Tersedia','bg-green-600'],
            ['menipis','Menipis','bg-yellow-500'],
            ['habis','Habis','bg-red-600'],
          ].map(([v, l, cls]) => (
            <button key={v} onClick={() => setStockF(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${stockF === v ? `${cls} text-white` : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Filter Kategori */}
        <div className="flex gap-2 flex-wrap">
          {['Semua', ...KATEGORI].map(k => (
            <button key={k} onClick={() => setKatF(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${katF === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}>
              {k}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari part number atau deskripsi..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              {q ? 'Tidak ditemukan' : 'Belum ada material. Import Excel atau tambah manual.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Part Number','Deskripsi','Kategori','KIMAP','Penyimpanan','Stok','Harga','Status','Aksi'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-300 whitespace-nowrap">{m.part_number}</td>
                      <td className="px-4 py-3 text-slate-200 max-w-xs">{m.description}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><KatBadge kat={m.category} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap font-mono">{m.kimap || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{m.penyimpanan || '—'}</td>
                      <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                        {m.stok} <span className="text-xs font-normal text-slate-400">{m.satuan || ''}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {m.unit_price ? rp(m.unit_price) : '—'}
                      </td>
                      <td className="px-4 py-3"><StokBadge stok={m.stok} safety={m.safety_stock} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setSelected(m); setAdjDir('masuk'); setAdjVal(''); setAdjKet(''); setAdjTgl(today()); setModal('adjust') }}
                            title="Adjust Stok"
                            className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-400">
                            <ArrowUpCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelected(m); setForm({ ...m, unit_price: m.unit_price ?? '', lead_time_days: m.lead_time_days ?? '', tgl_masuk: m.tgl_masuk ?? '' }); setModal('edit') }}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDelConfirm(m)}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-slate-800 text-xs text-slate-500">
                {filtered.length} material ditampilkan dari {mats.length} total
              </div>
            </div>
          )}
        </div>
      </>}

      {/* ─── Tab Riwayat ─── */}
      {tab === 'riwayat' && <>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={txQ} onChange={e => setTxQ(e.target.value)}
              placeholder="Cari part number, keterangan..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex gap-2">
            {[['all','Semua'],['masuk','Masuk'],['keluar','Keluar']].map(([v, l]) => (
              <button key={v} onClick={() => setTxTypeF(v)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${txTypeF === v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {txLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Memuat riwayat...</div>
          ) : txFiltered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Belum ada transaksi
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Tanggal','Part Number','Deskripsi','Tipe','Jumlah','Stok','Keterangan'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txFiltered.map(t => (
                    <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{t.tanggal || t.created_at?.slice(0,10) || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-300 whitespace-nowrap">{t.part_number}</td>
                      <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{t.description}</td>
                      <td className="px-4 py-3">
                        {t.tipe === 'masuk'
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full w-fit"><ArrowUpCircle className="w-3 h-3" />Masuk</span>
                          : <span className="flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full w-fit"><ArrowDownCircle className="w-3 h-3" />Keluar</span>
                        }
                      </td>
                      <td className="px-4 py-3 font-bold text-white">{t.jumlah}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{t.stok_sebelum} → {t.stok_sesudah}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{t.keterangan || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-slate-800 text-xs text-slate-500">
                {txFiltered.length} dari {txs.length} transaksi
              </div>
            </div>
          )}
        </div>
      </>}

      {/* ─── Modal Add/Edit ─── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg my-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{modal === 'add' ? 'Tambah Material' : 'Edit Material'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {[
                ['KIMAP','kimap','text',true],['Deskripsi','description','text',true],
                ['Part Number','part_number','text'],['Satuan','satuan','text'],
                ['Stok','stok','number'],['Safety Stock','safety_stock','number'],
                ['Harga Satuan (Rp)','unit_price','number'],['Lead Time (hari)','lead_time_days','number'],
                ['Penyimpanan','penyimpanan','text'],['Tgl Masuk','tgl_masuk','date'],
              ].map(([l, k, t, req]) => (
                <div key={k}>
                  <label className={lbl}>{l}{req && <span className="text-red-400 ml-1">*</span>}</label>
                  <input type={t} value={form[k] ?? ''} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} className={inp} />
                </div>
              ))}
              <div>
                <label className={lbl}>Kategori</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inp}>
                  {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-slate-700 rounded-xl text-sm text-slate-300 hover:bg-slate-800">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Adjust Stok ─── */}
      {modal === 'adjust' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Adjust Stok</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-sm">
              <p className="font-mono text-xs font-bold text-blue-300">{selected.part_number}</p>
              <p className="text-slate-200 mt-0.5">{selected.description}</p>
              <p className="text-slate-400 mt-1">Stok saat ini: <span className="font-bold text-white">{selected.stok}</span></p>
            </div>
            <div className="flex gap-2">
              {['masuk','keluar'].map(d => (
                <button key={d} onClick={() => setAdjDir(d)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${adjDir === d ? (d === 'masuk' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600') : 'border-slate-700 text-slate-400'}`}>
                  {d === 'masuk' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                  {d === 'masuk' ? 'Stok Masuk' : 'Stok Keluar'}
                </button>
              ))}
            </div>
            <div><label className={lbl}>Jumlah</label><input type="number" min="1" value={adjVal} onChange={e => setAdjVal(e.target.value)} className={inp} placeholder="Masukkan jumlah..." /></div>
            <div><label className={lbl}>Keterangan</label><input value={adjKet} onChange={e => setAdjKet(e.target.value)} className={inp} placeholder="Opsional..." /></div>
            <div><label className={lbl}>Tanggal</label><input type="date" value={adjTgl} onChange={e => setAdjTgl(e.target.value)} className={inp} /></div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-slate-700 rounded-xl text-sm text-slate-300 hover:bg-slate-800">Batal</button>
              <button onClick={handleAdjust} disabled={saving}
                className={`flex-1 py-2.5 disabled:opacity-40 text-white rounded-xl text-sm font-semibold ${adjDir === 'masuk' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
                {saving ? 'Menyimpan...' : adjDir === 'masuk' ? 'Catat Masuk' : 'Catat Keluar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Catat Transaksi ─── */}
      {modal === 'tx' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Catat Transaksi</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Pilih Part */}
            <div ref={dropRef} className="relative">
              <label className={lbl}>Part / Material</label>
              {txPart ? (
                <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="font-mono text-xs font-bold text-blue-300">{txPart.part_number}</p>
                    <p className="text-sm text-slate-300">{txPart.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Stok: {txPart.stok}</p>
                  </div>
                  <button onClick={() => { setTxPart(null); setTxPartQ('') }} className="text-slate-400 hover:text-red-400 ml-2"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input value={txPartQ} onChange={e => { setTxPartQ(e.target.value); setTxPartDrop(true) }}
                    onFocus={() => txPartQ && setTxPartDrop(true)}
                    placeholder="Cari part number..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                  {txPartDrop && txPartQ.length >= 1 && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                      {mats.filter(m => m.part_number?.toLowerCase().includes(txPartQ.toLowerCase()) || m.description?.toLowerCase().includes(txPartQ.toLowerCase())).slice(0, 8).map(m => (
                        <button key={m.id} type="button" onClick={() => { setTxPart(m); setTxPartDrop(false) }}
                          className="w-full text-left px-3 py-2.5 hover:bg-blue-500/10 border-b border-slate-700 last:border-0">
                          <p className="font-mono text-xs font-bold text-blue-300">{m.part_number}</p>
                          <p className="text-xs text-slate-300">{m.description}</p>
                          <p className="text-xs text-slate-400">Stok: {m.stok}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {['masuk','keluar'].map(d => (
                <button key={d} onClick={() => setTxDir(d)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${txDir === d ? (d === 'masuk' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600') : 'border-slate-700 text-slate-400'}`}>
                  {d === 'masuk' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                  {d === 'masuk' ? 'Stok Masuk' : 'Stok Keluar'}
                </button>
              ))}
            </div>

            <div><label className={lbl}>Jumlah</label>
              <input type="number" min="1" value={txJml} onChange={e => setTxJml(e.target.value)} className={inp} />
              {txPart && txDir === 'keluar' && Number(txJml) > txPart.stok && (
                <p className="text-xs text-yellow-400 mt-1">⚠ Melebihi stok tersedia ({txPart.stok})</p>
              )}
            </div>
            <div><label className={lbl}>Keterangan</label><input value={txKet} onChange={e => setTxKet(e.target.value)} className={inp} placeholder="Supplier, PO, WO, dll..." /></div>
            <div><label className={lbl}>Tanggal</label><input type="date" value={txTgl} onChange={e => setTxTgl(e.target.value)} className={inp} /></div>

            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-slate-700 rounded-xl text-sm text-slate-300 hover:bg-slate-800">Batal</button>
              <button onClick={handleTxSave} disabled={saving}
                className={`flex-1 py-2.5 disabled:opacity-40 text-white rounded-xl text-sm font-semibold ${txDir === 'masuk' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
                {saving ? 'Menyimpan...' : txDir === 'masuk' ? 'Catat Masuk' : 'Catat Keluar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Konfirmasi Hapus ─── */}
      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <div>
                <h3 className="font-bold text-white">Hapus Material?</h3>
                <p className="text-sm text-slate-400 mt-0.5">Riwayat transaksi ikut terhapus.</p>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-sm">
              <p className="font-mono text-xs font-bold text-blue-300">{delConfirm.part_number}</p>
              <p className="text-slate-300 mt-0.5">{delConfirm.description}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDelConfirm(null)} className="flex-1 py-2.5 border border-slate-700 rounded-xl text-sm text-slate-300 hover:bg-slate-800">Batal</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
