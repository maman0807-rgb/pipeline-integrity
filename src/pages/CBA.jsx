import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calculator, Database, RefreshCw, Printer } from 'lucide-react'

const DEF_ECO = {
  oilRate: 300, oilPrice: 78, gasRate: 0.75, gasPrice: 6.5, ghv: 1050, usdIdr: 16300,
  downtime: 18, prodLoss: 80, emergencyCost: 160,
  degradRate: 8, pipeUnitCost: 38, mobilCost: 250, civilCost: 180, contingency: 15,
  capexMachine: 1200, machineLife: 8, salWelder: 18, salFitter: 13, salHelper: 8,
  numHelper: 3, productivity: 4, wacc: 10, horizon: 10, hseFactor: 25,
}

const DEF_TECH = {
  pipeId: '', diameter: 4, totalLength: 1200, replaceLength: 350, pipeAge: 18, leakFreq: 4,
}

function compute(f, isOil) {
  const usd = f.usdIdr
  const oilRevDay = isOil ? f.oilRate * f.oilPrice * usd : 0
  const gasRevDay = isOil ? 0 : (f.gasRate * 1000 * f.ghv / 1000) * f.gasPrice * usd
  const annualLoss = (oilRevDay + gasRevDay) / 24 * f.downtime * (f.prodLoss / 100) * f.leakFreq
  const emergAnnual = f.emergencyCost * 1e6 * f.leakFreq
  const hseLoss = annualLoss * (f.hseFactor / 100)
  const totalAnnualLoss = annualLoss + emergAnnual + hseLoss

  const pipeReplaceCost = f.replaceLength * f.diameter * f.pipeUnitCost * usd
  const crewDays = f.replaceLength / (f.productivity * 0.48)
  const crewMonthlyCost = (f.salWelder + f.salFitter + f.salHelper * f.numHelper) * 1e6
  const crewCost = crewMonthlyCost / 30 * crewDays
  const rawCapex = pipeReplaceCost + f.mobilCost * 1e6 + f.civilCost * 1e6 + crewCost + f.capexMachine * 1e6 / f.machineLife
  const totalCapex = rawCapex * (1 + f.contingency / 100)

  let npv = -totalCapex, payback = null, cum = -totalCapex
  const rows = []
  for (let yr = 1; yr <= f.horizon; yr++) {
    const annLoss = totalAnnualLoss * Math.pow(1 + f.degradRate / 100, yr - 1)
    const pv = annLoss / Math.pow(1 + f.wacc / 100, yr)
    npv += pv; cum += annLoss
    if (payback === null && cum >= 0) payback = yr
    rows.push({ yr, annLoss, pv })
  }
  return { totalAnnualLoss, totalCapex, npv, payback, rows, crewDays: Math.round(crewDays) }
}

const rp = v => {
  const abs = Math.abs(v)
  if (abs >= 1e12) return 'Rp ' + (v / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' T'
  if (abs >= 1e9)  return 'Rp ' + (v / 1e9).toLocaleString('id-ID',  { maximumFractionDigits: 2 }) + ' M'
  return 'Rp ' + (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt'
}

export default function CBA() {
  const [segs, setSegs]           = useState([])
  const [selSeg, setSelSeg]       = useState('')
  const [loadingDB, setLoadingDB] = useState(false)
  const [tech, setTech]           = useState(DEF_TECH)
  const [eco, setEco]             = useState(DEF_ECO)
  const [isOil, setIsOil]         = useState(true)
  const [result, setResult]       = useState(null)
  const [segInfo, setSegInfo]     = useState(null)

  useEffect(() => {
    supabase.from('pipeline_segments')
      .select('id,from_loc,to_loc,category,size_inch,service_fluid,corrosion_rate,remain_life,leak_event,year_built,length_m')
      .order('category').order('from_loc')
      .then(({ data }) => setSegs(data || []))
  }, [])

  async function autoFill() {
    if (!selSeg) return
    setLoadingDB(true)
    const seg = segs.find(s => s.id === selSeg)
    if (!seg) { setLoadingDB(false); return }

    const yearNow = new Date().getFullYear()
    const umur    = seg.year_built ? yearNow - seg.year_built : DEF_TECH.pipeAge
    const leakFreq = umur > 0
      ? +((seg.leak_event || 0) / umur).toFixed(1)
      : (seg.leak_event || 0)

    const fluid = (seg.service_fluid || '').toUpperCase()
    setIsOil(!fluid.includes('GAS'))

    setTech({
      pipeId:        `[${seg.category || '—'}] ${seg.from_loc || '—'} → ${seg.to_loc || '—'}`,
      diameter:      seg.size_inch  || DEF_TECH.diameter,
      totalLength:   seg.length_m   || DEF_TECH.totalLength,
      replaceLength: Math.round((seg.length_m || DEF_TECH.totalLength) * 0.3),
      pipeAge:       umur,
      leakFreq:      leakFreq,
    })
    setEco(e => ({
      ...e,
      degradRate: seg.corrosion_rate ? +(seg.corrosion_rate * 2).toFixed(1) : e.degradRate,
    }))
    setSegInfo({
      fluid:       seg.service_fluid || '—',
      remainLife:  seg.remain_life   || '—',
      leakTotal:   seg.leak_event    || 0,
      corrRate:    seg.corrosion_rate || '—',
    })
    setResult(null)
    setLoadingDB(false)
  }

  const setT = (k, v) => setTech(p => ({ ...p, [k]: Number(v) || v }))
  const setE = (k, v) => setEco(p => ({ ...p, [k]: Number(v) || v }))
  const f    = { ...tech, ...eco }

  function calc() { setResult(compute(f, isOil)) }

  function printJustifikasi() {
    if (!result) return
    const tgl = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })
    const noDoc = `PI-CBA-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
    const rekomendasi = result.npv > 0
      ? `Berdasarkan hasil analisis Cost-Benefit Analysis, penggantian pipa <strong>${tech.pipeId || '—'}</strong> sepanjang <strong>${tech.replaceLength} m</strong> dinyatakan <strong>LAYAK secara ekonomi</strong> dengan NPV sebesar <strong>${rp(result.npv)}</strong> dan periode pengembalian investasi selama <strong>${result.payback} tahun</strong>. Direkomendasikan untuk segera diproses pengajuan anggaran dan penerbitan SPK penggantian pipa.`
      : `Berdasarkan hasil analisis Cost-Benefit Analysis, penggantian pipa <strong>${tech.pipeId || '—'}</strong> menunjukkan NPV negatif (<strong>${rp(result.npv)}</strong>) dalam horizon ${f.horizon} tahun. Namun mempertimbangkan aspek keselamatan dan integritas aset, penilaian ulang dengan asumsi yang diperbarui disarankan sebelum pengambilan keputusan.`

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Justifikasi Teknis CBA — ${tech.pipeId || 'Pipa'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 20mm 25mm; }

  /* Header */
  .kop { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
  .kop-logo { width: 64px; height: 64px; background: #1e3a5f; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; font-weight: 900; flex-shrink: 0; }
  .kop-text h1 { font-size: 15pt; font-weight: 900; letter-spacing: 1px; }
  .kop-text p  { font-size: 10pt; color: #444; margin-top: 2px; }

  .doc-title { text-align: center; margin: 20px 0 6px; }
  .doc-title h2 { font-size: 14pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 4px; }
  .doc-meta { text-align: center; font-size: 10pt; color: #555; margin-bottom: 24px; }

  /* Sections */
  h3 { font-size: 11pt; font-weight: 900; text-transform: uppercase; background: #1e3a5f; color: #fff; padding: 5px 12px; margin: 20px 0 10px; letter-spacing: 0.5px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 11pt; margin-bottom: 12px; }
  th { background: #e8eef7; font-weight: 700; padding: 7px 10px; border: 1px solid #999; text-align: left; }
  td { padding: 6px 10px; border: 1px solid #bbb; vertical-align: top; }
  td.label { font-weight: 700; width: 38%; background: #f9f9f9; }
  td.right { text-align: right; font-weight: 700; }
  .val-green { color: #166534; font-weight: 900; }
  .val-red   { color: #991b1b; font-weight: 900; }
  .val-blue  { color: #1e3a8a; font-weight: 900; }
  .val-yellow{ color: #854d0e; font-weight: 900; }

  /* Summary boxes */
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .sum-box { border: 2px solid #1e3a5f; border-radius: 6px; padding: 10px; text-align: center; }
  .sum-box .sum-label { font-size: 9pt; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
  .sum-box .sum-val   { font-size: 13pt; font-weight: 900; margin-top: 4px; }

  /* Verdict */
  .verdict { border: 2px solid; border-radius: 6px; padding: 14px 18px; margin: 16px 0; }
  .verdict.layak    { border-color: #166534; background: #f0fdf4; }
  .verdict.notlayak { border-color: #991b1b; background: #fef2f2; }
  .verdict p { font-size: 11pt; line-height: 1.6; }

  /* Signature */
  .sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 32px; }
  .sig-box { text-align: center; }
  .sig-box .sig-title { font-size: 10pt; font-weight: 700; margin-bottom: 60px; }
  .sig-box .sig-line  { border-top: 1px solid #000; padding-top: 4px; font-size: 10pt; }
  .sig-box .sig-nip   { font-size: 9pt; color: #555; }

  .footer { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9pt; color: #888; text-align: center; }

  @media print {
    body { margin: 0; }
    .page { padding: 15mm 20mm; }
    .no-print { display: none; }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Tombol cetak -->
  <div class="no-print" style="text-align:right;margin-bottom:16px">
    <button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-size:12pt;cursor:pointer;font-weight:700">🖨️ Cetak / Save PDF</button>
  </div>

  <!-- Kop -->
  <div class="kop">
    <div class="kop-logo">PHR</div>
    <div class="kop-text">
      <h1>PT PERTAMINA HULU ROKAN</h1>
      <p>Prabumulih Field — Pipeline Integrity Management System</p>
    </div>
  </div>

  <!-- Judul -->
  <div class="doc-title"><h2>Justifikasi Teknis Penggantian Pipa</h2></div>
  <div class="doc-meta">No. Dokumen: <strong>${noDoc}</strong> &nbsp;|&nbsp; Tanggal: <strong>${tgl}</strong></div>

  <!-- I. Identitas -->
  <h3>I. Identitas Pipa</h3>
  <table>
    <tr><td class="label">Segmen / ID Pipa</td><td>${tech.pipeId || '—'}</td></tr>
    <tr><td class="label">Jenis Fluida</td><td>${isOil ? 'Minyak (Oil)' : 'Gas'}</td></tr>
    <tr><td class="label">Diameter Nominal</td><td>${tech.diameter} inch</td></tr>
    <tr><td class="label">Panjang Total Pipa</td><td>${tech.totalLength.toLocaleString('id-ID')} m</td></tr>
    <tr><td class="label">Panjang Usulan Ganti</td><td><strong>${tech.replaceLength.toLocaleString('id-ID')} m</strong></td></tr>
    <tr><td class="label">Umur Pipa</td><td>${tech.pipeAge} tahun</td></tr>
  </table>

  <!-- II. Kondisi Eksisting -->
  <h3>II. Kondisi Eksisting</h3>
  <table>
    <tr><td class="label">Frekuensi Kebocoran</td><td>${tech.leakFreq} kejadian / tahun</td></tr>
    ${segInfo ? `
    <tr><td class="label">Laju Korosi</td><td>${segInfo.corrRate !== '—' ? segInfo.corrRate + ' mm/tahun' : '—'}</td></tr>
    <tr><td class="label">Estimasi Sisa Umur</td><td>${segInfo.remainLife !== '—' ? segInfo.remainLife + ' tahun' : '—'}</td></tr>
    <tr><td class="label">Total Kebocoran (historis)</td><td>${segInfo.leakTotal} kejadian</td></tr>
    ` : ''}
    <tr><td class="label">Kerugian Produksi/thn</td><td class="val-red">${rp(result.totalAnnualLoss)}</td></tr>
  </table>

  <!-- III. Rincian Biaya -->
  <h3>III. Estimasi Biaya Penggantian (CAPEX)</h3>
  <table>
    <tr><td class="label">Material Pipa</td><td class="right">${rp(tech.replaceLength * tech.diameter * eco.pipeUnitCost * eco.usdIdr)}</td></tr>
    <tr><td class="label">Biaya Mobilisasi</td><td class="right">${rp(eco.mobilCost * 1e6)}</td></tr>
    <tr><td class="label">Civil & Coating</td><td class="right">${rp(eco.civilCost * 1e6)}</td></tr>
    <tr><td class="label">Biaya Crew (${result.crewDays} hari kerja)</td><td class="right">${rp((eco.salWelder + eco.salFitter + eco.salHelper * eco.numHelper) * 1e6 / 30 * result.crewDays)}</td></tr>
    <tr><td class="label">CAPEX Mesin/Alat</td><td class="right">${rp(eco.capexMachine * 1e6 / eco.machineLife)}</td></tr>
    <tr><td class="label">Contingency (${eco.contingency}%)</td><td class="right">sudah termasuk</td></tr>
    <tr style="background:#e8eef7"><td class="label" style="font-size:12pt">TOTAL CAPEX</td><td class="right val-blue" style="font-size:13pt">${rp(result.totalCapex)}</td></tr>
  </table>

  <!-- IV. Hasil CBA -->
  <h3>IV. Hasil Analisis Cost-Benefit</h3>
  <div class="summary-grid">
    <div class="sum-box">
      <div class="sum-label">Kerugian Tahunan</div>
      <div class="sum-val val-red">${rp(result.totalAnnualLoss)}</div>
    </div>
    <div class="sum-box">
      <div class="sum-label">Total CAPEX</div>
      <div class="sum-val val-yellow">${rp(result.totalCapex)}</div>
    </div>
    <div class="sum-box">
      <div class="sum-label">NPV (${eco.horizon} thn)</div>
      <div class="sum-val ${result.npv > 0 ? 'val-green' : 'val-red'}">${rp(result.npv)}</div>
    </div>
    <div class="sum-box">
      <div class="sum-label">Payback Period</div>
      <div class="sum-val val-blue">${result.payback ? result.payback + ' tahun' : `>${eco.horizon} thn`}</div>
    </div>
  </div>

  <!-- V. Tabel Cashflow -->
  <h3>V. Proyeksi Cashflow (${eco.horizon} Tahun)</h3>
  <table>
    <tr><th>Tahun</th><th style="text-align:right">Kerugian / Tahun</th><th style="text-align:right">Present Value</th><th style="text-align:right">NPV Kumulatif</th></tr>
    ${(() => {
      let cumNpv = -result.totalCapex
      return result.rows.map(r => {
        cumNpv += r.pv
        return `<tr>
          <td>Tahun ${r.yr}</td>
          <td class="right">${rp(r.annLoss)}</td>
          <td class="right">${rp(r.pv)}</td>
          <td class="right ${cumNpv >= 0 ? 'val-green' : 'val-red'}">${rp(cumNpv)}</td>
        </tr>`
      }).join('')
    })()}
  </table>

  <!-- VI. Kesimpulan -->
  <h3>VI. Kesimpulan &amp; Rekomendasi</h3>
  <div class="verdict ${result.npv > 0 ? 'layak' : 'notlayak'}">
    <p>${rekomendasi}</p>
  </div>

  <!-- Asumsi -->
  <h3>VII. Asumsi Perhitungan</h3>
  <table>
    <tr><td class="label">WACC</td><td>${eco.wacc}%</td><td class="label">Horizon Analisis</td><td>${eco.horizon} tahun</td></tr>
    <tr><td class="label">Harga ${isOil ? 'Minyak' : 'Gas'}</td><td>${isOil ? eco.oilPrice + ' USD/bbl' : eco.gasPrice + ' USD/MMBTU'}</td><td class="label">Kurs USD/IDR</td><td>Rp ${Number(eco.usdIdr).toLocaleString('id-ID')}</td></tr>
    <tr><td class="label">Downtime/event</td><td>${eco.downtime} jam</td><td class="label">Degradasi Tahunan</td><td>${eco.degradRate}%</td></tr>
  </table>

  <!-- Tanda Tangan -->
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-title">Dibuat Oleh</div>
      <div class="sig-line">( _____________________ )</div>
      <div class="sig-nip">Engineer Pipeline Integrity</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Diperiksa Oleh</div>
      <div class="sig-line">( _____________________ )</div>
      <div class="sig-nip">Supervisor Pemeliharaan</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Disetujui Oleh</div>
      <div class="sig-line">( _____________________ )</div>
      <div class="sig-nip">Superintendent / Manager</div>
    </div>
  </div>

  <div class="footer">
    Dokumen ini digenerate oleh Pipeline Integrity System — PHR Prabumulih Field &nbsp;|&nbsp; pipa-ram.vercel.app &nbsp;|&nbsp; ${tgl}
  </div>
</div>
</body>
</html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500'
  const inpAuto = 'w-full bg-slate-700/50 border border-blue-500/30 rounded-xl px-3 py-2 text-sm text-blue-200 focus:outline-none focus:border-blue-500'
  const lbl = 'text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'

  const ecoFields = isOil
    ? [['Oil Rate (BOPD)','oilRate'],['Harga Oil (USD/bbl)','oilPrice'],['USD/IDR','usdIdr'],
       ['Downtime/event (jam)','downtime'],['Produksi Loss (%)','prodLoss'],['Emergency Cost/event (jt Rp)','emergencyCost'],
       ['Degradasi Tahunan (%)','degradRate'],['Unit Cost pipa USD/in/m','pipeUnitCost'],
       ['Mobilisasi (jt Rp)','mobilCost'],['Civil+Coating (jt Rp)','civilCost'],['Contingency (%)','contingency'],
       ['CAPEX Mesin (jt Rp)','capexMachine'],['Life Mesin (thn)','machineLife'],
       ['Gaji Welder/bln (jt)','salWelder'],['Gaji Fitter/bln (jt)','salFitter'],
       ['Gaji Helper/bln (jt)','salHelper'],['Jml Helper','numHelper'],
       ['Produktivitas (joint/hari)','productivity'],['WACC (%)','wacc'],
       ['Horizon (thn)','horizon'],['HSE Uplift (%)','hseFactor']]
    : [['Gas Rate (MMSCFD)','gasRate'],['Harga Gas (USD/MMBTU)','gasPrice'],['GHV','ghv'],['USD/IDR','usdIdr'],
       ['Downtime/event (jam)','downtime'],['Produksi Loss (%)','prodLoss'],['Emergency Cost/event (jt Rp)','emergencyCost'],
       ['Degradasi Tahunan (%)','degradRate'],['Unit Cost pipa USD/in/m','pipeUnitCost'],
       ['Mobilisasi (jt Rp)','mobilCost'],['Civil+Coating (jt Rp)','civilCost'],['Contingency (%)','contingency'],
       ['CAPEX Mesin (jt Rp)','capexMachine'],['Life Mesin (thn)','machineLife'],
       ['Gaji Welder/bln (jt)','salWelder'],['Gaji Fitter/bln (jt)','salFitter'],
       ['Gaji Helper/bln (jt)','salHelper'],['Jml Helper','numHelper'],
       ['Produktivitas (joint/hari)','productivity'],['WACC (%)','wacc'],
       ['Horizon (thn)','horizon'],['HSE Uplift (%)','hseFactor']]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">CBA Kalkulator</h1>
          <p className="text-slate-400 text-sm">Cost-Benefit Analysis penggantian pipa</p>
        </div>
        <div className="flex gap-2">
          {[['Oil', true],['Gas', false]].map(([l, v]) => (
            <button key={l} onClick={() => { setIsOil(v); setResult(null) }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${isOil === v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-fill dari DB */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-blue-300 uppercase tracking-wider">Auto-fill dari Database</h2>
          <span className="text-xs text-slate-500">— pilih segmen, data teknis terisi otomatis</span>
        </div>

        <div>
          <label className={lbl}>Pilih Segmen Pipa</label>
          <select value={selSeg} onChange={e => { setSelSeg(e.target.value); setResult(null) }} className={inp}>
            <option value="">— Pilih segmen —</option>
            {segs.map(s => (
              <option key={s.id} value={s.id}>
                [{s.category || '—'}] {s.from_loc || '—'} → {s.to_loc || '—'}
                {s.size_inch ? ` · ${s.size_inch}"` : ''}
                {s.service_fluid ? ` · ${s.service_fluid}` : ''}
                {s.leak_event ? ` · ${s.leak_event}× bocor` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Ringkasan data segmen terpilih */}
        {selSeg && (() => {
          const seg = segs.find(s => s.id === selSeg)
          if (!seg) return null
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                ['Fluida',         seg.service_fluid   || '—'],
                ['Diameter',       seg.size_inch       ? `${seg.size_inch}"` : '—'],
                ['Panjang',        seg.length_m        ? `${seg.length_m} m` : '—'],
                ['Year Built',     seg.year_built      || '—'],
                ['Corrosion Rate', seg.corrosion_rate  ? `${seg.corrosion_rate} mm/thn` : '—'],
                ['Remain Life',    seg.remain_life     ? `${seg.remain_life} thn` : '—'],
                ['Total Bocor',    `${seg.leak_event || 0}×`],
                ['Status',         seg.integrity_status || '—'],
              ].map(([l, v]) => (
                <div key={l} className="bg-slate-800/60 rounded-lg px-3 py-2 text-xs">
                  <p className="text-slate-500 uppercase tracking-wider mb-0.5">{l}</p>
                  <p className="text-blue-200 font-semibold">{v}</p>
                </div>
              ))}
            </div>
          )
        })()}

        <button onClick={autoFill} disabled={!selSeg || loadingDB}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${loadingDB ? 'animate-spin' : ''}`} />
          {loadingDB ? 'Mengambil data...' : 'Isi Otomatis dari Segmen Ini'}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">

        {/* Data Teknis — auto-filled */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Data Teknis Pipa</span>
            <span className="text-xs text-slate-500">(auto-fill dari DB, bisa diedit)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[['ID / Nama Pipa','pipeId','text'],['Diameter (inch)','diameter','number'],
              ['Panjang Total (m)','totalLength','number'],['Panjang Ganti (m)','replaceLength','number'],
              ['Umur Pipa (thn)','pipeAge','number'],['Frekuensi Bocor/thn','leakFreq','number'],
            ].map(([label, key, type]) => (
              <div key={key}>
                <label className={lbl}>{label}</label>
                <input type={type} value={tech[key]} onChange={e => setT(key, e.target.value)}
                  className={inpAuto} />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800" />

        {/* Parameter Ekonomi — manual */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parameter Ekonomi</span>
            <span className="text-xs text-slate-500">(isi manual)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {ecoFields.map(([label, key]) => (
              <div key={key}>
                <label className={lbl}>{label}</label>
                <input type="number" value={eco[key]} onChange={e => setE(key, e.target.value)} className={inp} />
              </div>
            ))}
          </div>
        </div>

        <button onClick={calc}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
          <Calculator className="w-4 h-4" /> Hitung CBA
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={printJustifikasi}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl">
              <Printer className="w-4 h-4" /> Cetak Justifikasi
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Kerugian Tahunan', rp(result.totalAnnualLoss), result.totalAnnualLoss > 0 ? 'text-red-400' : 'text-green-400'],
              ['Total CAPEX',      rp(result.totalCapex),      'text-yellow-400'],
              ['NPV',              rp(result.npv),             result.npv > 0 ? 'text-green-400' : 'text-red-400'],
              ['Payback',          result.payback ? `${result.payback} tahun` : `>${f.horizon} thn`, result.payback ? 'text-blue-400' : 'text-slate-400'],
            ].map(([l,v,c]) => (
              <div key={l} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{l}</p>
                <p className={`text-xl font-bold ${c}`}>{v}</p>
              </div>
            ))}
          </div>
          <div className={`rounded-2xl border p-5 ${result.npv > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <p className={`font-bold ${result.npv > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {result.npv > 0
                ? `✅ Penggantian LAYAK — NPV positif, payback ${result.payback} tahun`
                : `⚠️ NPV negatif dalam ${f.horizon} tahun — pertimbangkan ulang atau perbaiki asumsi`}
            </p>
            <p className="text-sm text-slate-300 mt-1">Durasi pekerjaan estimasi: {result.crewDays} hari kerja</p>
            <p className="text-xs text-slate-500 mt-1">
              Pipa: {tech.pipeId || '—'} · {isOil ? 'Oil' : 'Gas'} · {tech.pipeAge} thn · {tech.leakFreq} bocor/thn
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Tahun</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Kerugian/thn</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">PV</th>
              </tr></thead>
              <tbody>
                {result.rows.map(r => (
                  <tr key={r.yr} className="border-b border-slate-800/50">
                    <td className="px-4 py-2 text-slate-300">Tahun {r.yr}</td>
                    <td className="px-4 py-2 text-right text-red-400">{rp(r.annLoss)}</td>
                    <td className="px-4 py-2 text-right text-blue-400">{rp(r.pv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
