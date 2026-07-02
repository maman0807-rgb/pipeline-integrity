import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'

function toDate(v) {
  if (!v) return null
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return null
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  const s = String(v).trim()
  if (!s) return null
  const parts = s.match(/(\d{1,2})[-\/](\w+)[-\/](\d{2,4})/)
  if (parts) {
    const months = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 }
    const m = months[parts[2]] || parseInt(parts[2])
    const y = parts[3].length === 2 ? 2000 + parseInt(parts[3]) : parseInt(parts[3])
    return `${y}-${String(m).padStart(2,'0')}-${String(parseInt(parts[1])).padStart(2,'0')}`
  }
  return s.slice(0, 10) || null
}

function parseNum(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? null : n
}

export default function ImportExcel() {
  const [step, setStep]       = useState('idle') // idle | preview | importing | done
  const [preview, setPreview] = useState(null)
  const [log, setLog]         = useState([])
  const fileRef = useRef()

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const buf  = await file.arrayBuffer()
    const wb   = XLSX.read(buf, { type: 'array' })

    const sheetContoh     = wb.Sheets['Contoh']
    const sheetMonitoring = wb.Sheets['Monitoring Inspeksi']
    const sheetKebocoran  = wb.Sheets['History Kebocoran']

    const raw = (sheet, skip = 0) =>
      sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }).slice(skip) : []

    // --- Pipelines dari sheet "Contoh" ---
    const contohRows = raw(sheetContoh, 1).filter(r => r[0] && String(r[0]).match(/^\d/))
    const pipes = contohRows.map(r => ({
      wk: r[1] || 'Prabumulih',
      cluster: r[2] || null,
      status: r[3] || 'Aktif',
      dari_sumur: String(r[4] || '').trim(),
      ke_stasiun: r[5] || null,
      nama_flowline: r[6] || null,
      jenis_sumur: r[7] || null,
      panjang_m: parseNum(r[9]),
      tahun_konstruksi: parseNum(r[10]) || parseNum(r[12]),
      jumlah_kejadian: parseNum(r[13]) || 0,
      jumlah_titik_inspeksi: parseNum(r[15]),
      priority: r[16] || null,
      tanggal_inspeksi: toDate(r[17]),
      rla_document: r[20] || null,
      re_document: r[21] || null,
      tanggal_coi_plo: toDate(r[23]),
      sertifikat_berlaku: toDate(r[24]),
      coi_plo: r[25] || null,
      rlt_lt3: parseNum(r[26]),
      rlt_3_5: parseNum(r[27]),
      rlt_gt5: parseNum(r[28]),
      integrity_status: ['GOOD','MONITOR','BAD'].includes(r[29]) ? r[29] : null,
    })).filter(p => p.dari_sumur)

    // --- Pipeline segments dari sheet "Monitoring Inspeksi" ---
    const monRows = raw(sheetMonitoring, 3).filter(r => r[0] && String(r[0]).match(/^\d/))
    const segs = monRows.map(r => ({
      category: r[1] || null,
      from_loc: r[2] || null,
      to_loc: r[3] || null,
      size_inch: parseNum(r[4]),
      length_m: parseNum(r[5]),
      service_fluid: r[6] || null,
      year_built: parseNum(r[7]),
      ansi_rating: r[8] || null,
      corrosion_rate: parseNum(r[9]),
      remain_life: parseNum(r[10]),
      design_pressure: parseNum(r[11]),
      leak_event: parseNum(r[12]) || 0,
      perbaikan: r[13] || null,
      ndt: r[14] || null,
      plo: r[15] || null,
      integrity_status: ['GOOD','MONITOR','BAD'].includes(r[16]) ? r[16] : null,
      memo_inspeksi: r[17] || null,
      hasil_inspeksi: r[18] || null,
      tindak_lanjut: r[19] || null,
    })).filter(s => s.from_loc || s.to_loc)

    // --- Leak events dari sheet "History Kebocoran" ---
    const leakRows = raw(sheetKebocoran, 3).filter(r => r[0] && String(r[0]).match(/^\d/))
    const leaks = leakRows.map(r => ({
      deskripsi_pipa: r[1] || null,
      deskripsi_kegiatan: r[2] || null,
      bocor_titik: parseNum(r[5]) || 0,
      clamp_titik: parseNum(r[6]) || 0,
      sadel_titik: parseNum(r[7]) || 0,
      sisip_meter: parseNum(r[8]) || 0,
      tanggal_kejadian: toDate(r[9]),
      mulai_perbaikan: toDate(r[10]),
      selesai_perbaikan: toDate(r[11]),
      keterangan: r[12] || null,
      lokasi: r[13] || null,
      kp: r[16] || null,
      struktur: r[17] || null,
      distrik: r[18] || null,
      dimensi_pipa: r[19] || null,
      panjang_pipa: parseNum(r[20]),
    }))

    setPreview({ pipes, segs, leaks })
    setStep('preview')
    e.target.value = ''
  }

  async function doImport() {
    if (!preview) return
    setStep('importing')
    const logs = []

    const CHUNK = 200
    const insertChunked = async (table, data, label) => {
      let ok = 0
      for (let i = 0; i < data.length; i += CHUNK) {
        const { error } = await supabase.from(table).insert(data.slice(i, i + CHUNK))
        if (error) { logs.push(`❌ ${label} chunk ${i}: ${error.message}`); return }
        ok += Math.min(CHUNK, data.length - i)
      }
      logs.push(`✅ ${label}: ${ok} baris berhasil diimport`)
    }

    await insertChunked('pipelines',         preview.pipes, 'Flowline (Contoh)')
    await insertChunked('pipeline_segments',  preview.segs,  'Segmen (Monitoring Inspeksi)')
    await insertChunked('leak_events',        preview.leaks, 'Kebocoran (History Kebocoran)')

    setLog(logs)
    setStep('done')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Import Excel</h1>
        <p className="text-slate-400 text-sm mt-1">Upload Integrity_Pipa.xlsx untuk import data awal</p>
      </div>

      {step === 'idle' && (
        <div
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-12 text-center cursor-pointer transition-colors"
        >
          <FileSpreadsheet className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-white font-semibold">Klik untuk pilih file Excel</p>
          <p className="text-slate-400 text-sm mt-1">Integrity_Pipa.xlsx — sheet: Contoh, Monitoring Inspeksi, History Kebocoran</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-bold text-white">Preview Data</h2>
            {[
              ['Flowline Register (Contoh)', preview.pipes.length, 'text-blue-400'],
              ['Segmen Pipa (Monitoring Inspeksi)', preview.segs.length, 'text-green-400'],
              ['Kejadian Kebocoran (History Kebocoran)', preview.leaks.length, 'text-red-400'],
            ].map(([l, n, c]) => (
              <div key={l} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <span className="text-sm text-slate-300">{l}</span>
                <span className={`font-bold ${c}`}>{n.toLocaleString()} baris</span>
              </div>
            ))}
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-300">Data akan ditambahkan ke database. Kalau sudah ada data sebelumnya, import ini akan menambah (bukan menimpa). Jalankan hanya sekali untuk data awal.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('idle')} className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-xl">Batal</button>
            <button onClick={doImport}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-xl">
              <Upload className="w-4 h-4" /> Import Sekarang
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold">Mengimport data...</p>
          <p className="text-slate-400 text-sm mt-1">Mohon tunggu, jangan tutup halaman ini</p>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            {log.map((l, i) => <p key={i} className="text-sm text-slate-200 font-mono">{l}</p>)}
          </div>
          <button onClick={() => { setStep('idle'); setPreview(null); setLog([]) }}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">
            <Check className="w-4 h-4" /> Selesai
          </button>
        </div>
      )}
    </div>
  )
}
