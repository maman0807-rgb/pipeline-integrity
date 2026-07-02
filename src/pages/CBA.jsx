import { useState } from 'react'
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react'

const DEF = {
  pipeId:'FL-PBM-01', diameter:4, totalLength:1200, replaceLength:350, pipeAge:18,
  oilRate:300, oilPrice:78, gasRate:0.75, gasPrice:6.5, ghv:1050, usdIdr:16300,
  leakFreq:4, downtime:18, prodLoss:80, emergencyCost:160,
  degradRate:8, pipeUnitCost:38, mobilCost:250, civilCost:180, contingency:15,
  capexMachine:1200, machineLife:8, salWelder:18, salFitter:13, salHelper:8,
  numHelper:3, productivity:4, wacc:10, horizon:10, hseFactor:25,
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

  let npv = -totalCapex
  let payback = null
  let cum = -totalCapex
  const rows = []
  for (let yr = 1; yr <= f.horizon; yr++) {
    const annLoss = totalAnnualLoss * Math.pow(1 + f.degradRate / 100, yr - 1)
    const pv = annLoss / Math.pow(1 + f.wacc / 100, yr)
    npv += pv
    cum += annLoss
    if (payback === null && cum >= 0) payback = yr
    rows.push({ yr, annLoss, pv })
  }

  return { totalAnnualLoss, totalCapex, npv, payback, rows, crewDays: Math.round(crewDays) }
}

const rp = v => 'Rp ' + (v / 1e6).toFixed(1) + ' jt'

export default function CBA() {
  const [f, setF] = useState(DEF)
  const [isOil, setIsOil] = useState(true)
  const [result, setResult] = useState(null)
  const ff = (k, v) => setF(p => ({ ...p, [k]: Number(v) || v }))

  function calc() { setResult(compute(f, isOil)) }

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500'
  const lbl = 'text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'
  const fields = isOil
    ? [['ID Pipa','pipeId','text'],['Diameter (inch)','diameter','number'],['Panjang Total (m)','totalLength','number'],['Panjang Ganti (m)','replaceLength','number'],['Umur Pipa (thn)','pipeAge','number'],['Oil Rate (BOPD)','oilRate','number'],['Harga Oil (USD/bbl)','oilPrice','number'],['USD/IDR','usdIdr','number'],['Frekuensi Bocor/thn','leakFreq','number'],['Downtime/event (jam)','downtime','number'],['Produksi Loss (%)','prodLoss','number'],['Emergency Cost/event (jt Rp)','emergencyCost','number'],['Degradasi Tahunan (%)','degradRate','number'],['Unit Cost pipa USD/in/m','pipeUnitCost','number'],['Mobilisasi (jt Rp)','mobilCost','number'],['Civil+Coating (jt Rp)','civilCost','number'],['Contingency (%)','contingency','number'],['CAPEX Mesin (jt Rp)','capexMachine','number'],['Life Mesin (thn)','machineLife','number'],['Gaji Welder/bln (jt)','salWelder','number'],['Gaji Fitter/bln (jt)','salFitter','number'],['Gaji Helper/bln (jt)','salHelper','number'],['Jml Helper','numHelper','number'],['Produktivitas (joint/hari)','productivity','number'],['WACC (%)','wacc','number'],['Horizon (thn)','horizon','number'],['HSE Uplift (%)','hseFactor','number']]
    : [['ID Pipa','pipeId','text'],['Diameter (inch)','diameter','number'],['Panjang Total (m)','totalLength','number'],['Panjang Ganti (m)','replaceLength','number'],['Gas Rate (MMSCFD)','gasRate','number'],['Harga Gas (USD/MMBTU)','gasPrice','number'],['GHV','ghv','number'],['USD/IDR','usdIdr','number'],['Frekuensi Bocor/thn','leakFreq','number'],['Downtime/event (jam)','downtime','number'],['Produksi Loss (%)','prodLoss','number'],['Emergency Cost/event (jt Rp)','emergencyCost','number'],['Degradasi Tahunan (%)','degradRate','number'],['Unit Cost pipa USD/in/m','pipeUnitCost','number'],['Mobilisasi (jt Rp)','mobilCost','number'],['Civil+Coating (jt Rp)','civilCost','number'],['Contingency (%)','contingency','number'],['CAPEX Mesin (jt Rp)','capexMachine','number'],['Life Mesin (thn)','machineLife','number'],['Gaji Welder/bln (jt)','salWelder','number'],['Gaji Fitter/bln (jt)','salFitter','number'],['Gaji Helper/bln (jt)','salHelper','number'],['Jml Helper','numHelper','number'],['Produktivitas (joint/hari)','productivity','number'],['WACC (%)','wacc','number'],['Horizon (thn)','horizon','number'],['HSE Uplift (%)','hseFactor','number']]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">CBA Kalkulator</h1>
          <p className="text-slate-400 text-sm">Cost-Benefit Analysis penggantian pipa</p>
        </div>
        <div className="flex gap-2">
          {[['Oil','true'],['Gas','false']].map(([l,v]) => (
            <button key={l} onClick={() => { setIsOil(v==='true'); setResult(null) }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${isOil===(v==='true') ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {fields.map(([label, key, type]) => (
            <div key={key}>
              <label className={lbl}>{label}</label>
              <input type={type} value={f[key]} onChange={e => ff(key, e.target.value)} className={inp} />
            </div>
          ))}
        </div>
        <button onClick={calc}
          className="mt-5 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
          <Calculator className="w-4 h-4" /> Hitung CBA
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Kerugian Tahunan', rp(result.totalAnnualLoss), result.totalAnnualLoss > 0 ? 'text-red-400' : 'text-green-400'],
              ['Total CAPEX', rp(result.totalCapex), 'text-yellow-400'],
              ['NPV', rp(result.npv), result.npv > 0 ? 'text-green-400' : 'text-red-400'],
              ['Payback', result.payback ? `${result.payback} tahun` : `>${f.horizon} thn`, result.payback ? 'text-blue-400' : 'text-slate-400'],
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
