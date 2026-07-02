// Import Integrity_Pipa.xlsx → Supabase
// Usage: node scripts/import-excel.mjs <password>
//   email default: tuyulsumsel02@gmail.com
//   or:  node scripts/import-excel.mjs <email> <password>

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as XLSX from 'xlsx'

const SUPABASE_URL = 'https://llzltyvpzjboynpinmqo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsemx0eXZwempib3lucGlubXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MTgwOTEsImV4cCI6MjA5NzQ5NDA5MX0.9IkzqrI9wVETSqZKt2cZsnhBJfIQA8qb5WsaMqyTdXc'

const args = process.argv.slice(2)
let email = 'tuyulsumsel02@gmail.com'
let password = ''
if (args.length === 1) { password = args[0] }
else if (args.length >= 2) { email = args[0]; password = args[1] }
else { console.error('Usage: node scripts/import-excel.mjs <password>'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── helpers ───────────────────────────────────────────
function toDate(v) {
  if (!v) return null
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return null
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  const s = String(v).trim()
  if (!s) return null
  // format like "12-Feb-1980"
  const m1 = s.match(/^(\d{1,2})[- ](\w+)[- ](\d{2,4})$/)
  if (m1) {
    const months = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12,
                     jan:1,feb:2,mar:3,apr:4,mei:5,jun:6,jul:7,aug:8,sep:9,okt:10,nov:11,des:12 }
    const mo = months[m1[2]] || parseInt(m1[2])
    const yr = m1[3].length === 2 ? 2000 + parseInt(m1[3]) : parseInt(m1[3])
    return `${yr}-${String(mo).padStart(2,'0')}-${String(parseInt(m1[1])).padStart(2,'0')}`
  }
  // YYYY-MM-DD or similar
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.slice(0,10)
  return null
}

function num(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? null : n
}

function str(v) {
  const s = String(v ?? '').trim()
  return s || null
}

async function insertChunked(table, data, label) {
  const CHUNK = 500
  let total = 0
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK)
    const { error } = await supabase.from(table).insert(chunk)
    if (error) {
      console.error(`  ❌ ${label} chunk ${i}–${i+CHUNK}: ${error.message}`)
      return false
    }
    total += chunk.length
    process.stdout.write(`\r  ↳ ${label}: ${total}/${data.length} baris...`)
  }
  console.log(`\r  ✅ ${label}: ${total} baris berhasil`)
  return true
}

// ─── main ──────────────────────────────────────────────
async function main() {
  // 1. Auth
  console.log(`\n🔐 Login sebagai ${email} ...`)
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
  if (authErr) { console.error('❌ Login gagal:', authErr.message); process.exit(1) }
  console.log('✅ Login berhasil\n')

  // 2. Read Excel
  const excelPath = '/Users/azzahrasalsabila/RAM Static/Integrity_Pipa.xlsx'
  console.log(`📂 Membaca: ${excelPath}`)
  const wb = XLSX.readFile(excelPath)
  const raw = (name, skip) =>
    XLSX.utils.sheet_to_json(wb.Sheets[name], { header:1, defval:'' }).slice(skip)

  // ── 3a. Pipelines (Contoh, skip row 0 = header) ───────
  const contohRows = raw('Contoh', 1).filter(r => r[0] && String(r[0]).match(/^\d/))
  console.log(`📋 Contoh: ${contohRows.length} flowlines`)
  const pipes = contohRows.map(r => ({
    wk:                    str(r[1]) ?? 'Prabumulih',
    cluster:               str(r[2]),
    status:                str(r[3]) ?? 'Aktif',
    dari_sumur:            str(r[4]) ?? '',
    ke_stasiun:            str(r[5]),
    nama_flowline:         str(r[6]),
    jenis_sumur:           str(r[7]),
    panjang_m:             num(r[9]),
    tahun_konstruksi:      r[12] ? num(r[12]) : (toDate(r[10]) ? parseInt(toDate(r[10])) : null),
    jumlah_kejadian:       num(r[13]) ?? 0,
    jumlah_titik_inspeksi: num(r[15]),
    priority:              str(r[16]),
    tanggal_inspeksi:      toDate(r[17]),
    note_pengujian:        str(r[18]),
    report_inspeksi:       str(r[19]),
    rla_document:          str(r[21]),
    re_document:           str(r[22]),
    analisa_resiko:        str(r[23]),
    tanggal_coi_plo:       toDate(r[24]),
    sertifikat_berlaku:    toDate(r[25]),
    coi_plo:               str(r[26]),
    rlt_lt3:               num(r[27]),
    rlt_3_5:               num(r[28]),
    rlt_gt5:               num(r[29]),
    integrity_status:      ['GOOD','MONITOR','BAD'].includes(str(r[30])) ? str(r[30]) : null,
  })).filter(p => p.dari_sumur)

  // ── 3b. Pipeline Segments (Monitoring Inspeksi, skip rows 0-3) ─
  const monRows = raw('Monitoring Inspeksi', 4).filter(r => r[0] && String(r[0]).match(/^\d/))
  console.log(`📋 Monitoring Inspeksi: ${monRows.length} segmen`)
  const segs = monRows.map(r => ({
    category:          str(r[1]),
    from_loc:          str(r[2]),
    to_loc:            str(r[3]),
    size_inch:         num(r[4]),
    length_m:          num(r[5]),
    service_fluid:     str(r[6]),
    year_built:        num(r[7]),
    ansi_rating:       str(r[8]),
    corrosion_rate:    num(r[9]),
    remain_life:       num(r[10]),
    design_pressure:   num(r[11]),
    leak_event:        num(r[12]) ?? 0,
    perbaikan:         str(r[13]),
    ndt:               str(r[14]),
    plo:               str(r[15]),
    integrity_status:  ['GOOD','MONITOR','BAD'].includes(str(r[16])) ? str(r[16]) : null,
    memo_inspeksi:     str(r[17]),
    hasil_inspeksi:    str(r[18]),
    tindak_lanjut:     str(r[19]),
  })).filter(s => s.from_loc || s.to_loc)

  // ── 3c. Leak Events (History Kebocoran, skip rows 0-3) ──
  const leakRows = raw('History Kebocoran', 4).filter(r => r[0] && String(r[0]).match(/^\d/))
  console.log(`📋 History Kebocoran: ${leakRows.length} kejadian`)
  const leaks = leakRows.map(r => ({
    deskripsi_pipa:     str(r[1]),
    deskripsi_kegiatan: str(r[2]),
    bocor_titik:        num(r[5]) ?? 0,
    clamp_titik:        num(r[6]) ?? 0,
    sadel_titik:        num(r[7]) ?? 0,
    sisip_meter:        num(r[8]) ?? 0,
    tanggal_kejadian:   toDate(r[9]),
    mulai_perbaikan:    toDate(r[10]),
    selesai_perbaikan:  toDate(r[11]),
    keterangan:         str(r[12]),
    lokasi:             str(r[13]),
    kp:                 str(r[16]),
    struktur:           str(r[17]),
    distrik:            str(r[18]),
    dimensi_pipa:       str(r[19]),
    panjang_pipa:       num(r[20]),
  }))

  // ── 4. Insert ─────────────────────────────────────────
  console.log('\n🚀 Mulai import ke Supabase...')
  await insertChunked('pipelines',        pipes, 'Flowline')
  await insertChunked('pipeline_segments', segs, 'Segmen')
  await insertChunked('leak_events',       leaks, 'Kebocoran')

  console.log('\n🎉 Import selesai!')
  await supabase.auth.signOut()
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
