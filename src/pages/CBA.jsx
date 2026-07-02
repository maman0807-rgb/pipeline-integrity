import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calculator, Database, RefreshCw } from 'lucide-react'

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

const rp = v => 'Rp ' + (v / 1e6).toFixed(1) + ' jt'

export default function CBA() {
  const [pipes, setPipes]       = useState([])
  const [segs, setSegs]         = useState([])
  const [selPipe, setSelPipe]   = useState('')
  const [selSeg, setSelSeg]     = useState('')
  const [loadingDB, setLoadingDB] = useState(false)
  const [tech, setTech]         = useState(DEF_TECH)
  const [eco, setEco]           = useState(DEF_ECO)
  const [isOil, setIsOil]       = useState(true)
  const [result, setResult]     = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('pipelines').select('id,dari_sumur,ke_stasiun,panjang_m,tahun_konstruksi').order('dari_sumur'),
      supabase.from('pipeline_segments').select('id,from_loc,to_loc,category,size_inch,service_fluid,corrosion_rate,remain_life').order('from_loc'),
    ]).then(([{ data: p }, { data: s }]) => {
      setPipes(p || [])
      setSegs(s || [])
    })
  }, [])

  async function autoFill() {
    if (!selPipe) return
    setLoadingDB(true)
    const pipe = pipes.find(p => p.id === selPipe)
    const seg  = segs.find(s => s.id === selSeg)

    // Hitung frekuensi bocor dari leak_events
    const { count: leakCount } = await supabase
      .from('leak_events').select('*', { count: 'exact', head: true })
      .eq('pipeline_id', selPipe)

    const yearNow  = new Date().getFullYear()
    const tahun    = pipe?.tahun_konstruksi || yearNow - 10
    const umur     = yearNow - tahun
    const leakFreq = umur > 0 ? +((leakCount || 0) / umur).toFixed(1) : (leakCount || 0)

    // Auto-detect oil/gas dari service_fluid segmen
    const fluid = (seg?.service_fluid || '').toUpperCase()
    if (fluid.includes('GAS')) setIsOil(false)
    else setIsOil(true)

    setTech({
      pipeId:        pipe ? `${pipe.dari_sumur}${pipe.ke_stasiun ? ' → ' + pipe.ke_stasiun : ''}` : '',
      diameter:      seg?.size_inch       || DEF_TECH.diameter,
      totalLength:   pipe?.panjang_m      || DEF_TECH.totalLength,
      replaceLength: Math.round((pipe?.panjang_m || DEF_TECH.totalLength) * 0.3),
      pipeAge:       umur,
      leakFreq:      leakFreq,
    })
    setEco(e => ({
      ...e,
      degradRate: seg?.corrosion_rate ? +(seg.corrosion_rate * 2).toFixed(1) : e.degradRate,
    }))
    setResult(null)
    setLoadingDB(false)
  }

  const setT = (k, v) => setTech(p => ({ ...p, [k]: Number(v) || v }))
  const setE = (k, v) => setEco(p => ({ ...p, [k]: Number(v) || v }))
  const f    = { ...tech, ...eco }

  function calc() { setResult(compute(f, isOil)) }

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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Pilih Flowline</label>
            <select value={selPipe} onChange={e => { setSelPipe(e.target.value); setSelSeg('') }} className={inp}>
              <option value="">— Pilih Flowline —</option>
              {pipes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.dari_sumur}{p.ke_stasiun ? ` → ${p.ke_stasiun}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Pilih Segmen (untuk ukuran & fluida)</label>
            <select value={selSeg} onChange={e => setSelSeg(e.target.value)} className={inp} disabled={!selPipe}>
              <option value="">— Pilih Segmen (opsional) —</option>
              {segs.map(s => (
                <option key={s.id} value={s.id}>
                  [{s.category || '—'}] {s.from_loc || '—'} → {s.to_loc || '—'}
                  {s.size_inch ? ` (${s.size_inch}")` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={autoFill} disabled={!selPipe || loadingDB}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${loadingDB ? 'animate-spin' : ''}`} />
          {loadingDB ? 'Mengambil data...' : 'Ambil Data dari DB'}
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
