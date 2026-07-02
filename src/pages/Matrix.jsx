import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COLORS = ['#d1fae5','#a7f3d0','#fde68a','#fdba74','#dc2626']
const LABELS = { 1:'Low',2:'Low-Med',3:'Medium',4:'High',5:'Extreme' }
const RISK = [
  [1,1,1,2,3],[1,1,2,3,3],[1,2,2,3,4],[2,2,3,4,4],[2,3,4,4,5]
]

function pof(leakCount) {
  if (leakCount >= 15) return 5
  if (leakCount >= 8)  return 4
  if (leakCount >= 4)  return 3
  if (leakCount >= 2)  return 2
  return 1
}
function cof(status) {
  if (status === 'BAD')     return 5
  if (status === 'MONITOR') return 3
  return 1
}

export default function Matrix() {
  const [items, setItems]     = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('pipeline_segments').select('*').then(({ data }) => {
      setItems((data || []).map(d => ({
        ...d,
        pof: pof(d.leak_event || 0),
        cof: cof(d.integrity_status),
        risk: RISK[pof(d.leak_event || 0) - 1][cof(d.integrity_status) - 1],
      })))
      setLoading(false)
    })
  }, [])

  // build 5×5 grid: rows = PoF 5→1, cols = CoF 1→5
  const cells = {}
  items.forEach(it => {
    const key = `${it.pof}-${it.cof}`
    if (!cells[key]) cells[key] = []
    cells[key].push(it)
  })

  if (loading) return <div className="text-slate-400 text-sm p-8">Memuat...</div>

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Decision Matrix</h1>
        <p className="text-slate-400 text-sm">PoF × CoF — berdasarkan leak count & integrity status</p>
      </div>

      <div className="flex gap-2 flex-wrap text-xs font-bold">
        {[1,2,3,4,5].map(i => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: COLORS[i-1] }} />
            <span className="text-slate-300">{LABELS[i]}</span>
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: '40px repeat(5,minmax(100px,1fr))' }}>
          {/* Header row CoF */}
          <div />
          {[1,2,3,4,5].map(c => (
            <div key={c} className="text-center text-xs font-bold text-slate-400 pb-1">CoF {c}</div>
          ))}
          {/* Matrix rows PoF 5→1 */}
          {[5,4,3,2,1].map(p => (
            <>
              <div key={`lbl-${p}`} className="flex items-center justify-center text-xs font-bold text-slate-400">P{p}</div>
              {[1,2,3,4,5].map(c => {
                const key   = `${p}-${c}`
                const list  = cells[key] || []
                const risk  = RISK[p-1][c-1]
                const bg    = COLORS[risk-1]
                return (
                  <div key={key}
                    onClick={() => setSelected({ p, c, list, risk })}
                    className="rounded-xl p-2 cursor-pointer hover:opacity-80 transition-opacity min-h-16 relative"
                    style={{ background: bg + '33', border: `1px solid ${bg}66` }}
                  >
                    <span className="absolute top-1.5 right-2 text-[10px] font-black" style={{ color: bg }}>R{risk}</span>
                    {list.slice(0,3).map(it => (
                      <div key={it.id} className="text-[10px] text-slate-200 truncate bg-black/20 rounded px-1 mb-0.5">
                        {it.from_loc || '?'} → {it.to_loc || '?'}
                      </div>
                    ))}
                    {list.length > 3 && <div className="text-[10px] text-slate-400">+{list.length - 3} lagi</div>}
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white">PoF {selected.p} × CoF {selected.c} — Risiko {LABELS[selected.risk]}</h2>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xs">✕ Tutup</button>
          </div>
          {selected.list.length === 0
            ? <p className="text-slate-500 text-sm">Tidak ada segmen di sel ini</p>
            : <div className="divide-y divide-slate-800">
                {selected.list.map(it => (
                  <div key={it.id} className="py-2.5 grid grid-cols-3 gap-2 text-sm">
                    <span className="text-white font-medium">{it.from_loc || '—'} → {it.to_loc || '—'}</span>
                    <span className="text-slate-400">{it.category} · {it.service_fluid || '—'}</span>
                    <span className={`font-bold ${it.integrity_status==='BAD'?'text-red-400':it.integrity_status==='MONITOR'?'text-yellow-400':'text-green-400'}`}>
                      {it.integrity_status || '—'}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  )
}
