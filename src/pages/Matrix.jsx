import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const RISK_COLORS = {
  1: { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  text: '#4ade80', label: 'Low' },
  2: { bg: 'rgba(250,204,21,0.15)', border: 'rgba(250,204,21,0.4)', text: '#facc15', label: 'Low-Med' },
  3: { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)', text: '#fb923c', label: 'Medium' },
  4: { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#f87171', label: 'High' },
  5: { bg: 'rgba(185,28,28,0.3)',   border: 'rgba(185,28,28,0.6)',  text: '#fca5a5', label: 'Extreme' },
}

const RISK = [
  [1,1,1,2,3],
  [1,1,2,3,3],
  [1,2,2,3,4],
  [2,2,3,4,4],
  [2,3,4,4,5],
]

function pof(leakCount) {
  if (leakCount >= 15) return 5
  if (leakCount >= 8)  return 4
  if (leakCount >= 4)  return 3
  if (leakCount >= 2)  return 2
  return 1
}

function cof(status, fluid) {
  const isGas = (fluid || '').toUpperCase().includes('GAS')
  if (status === 'BAD')     return 5
  if (status === 'MONITOR') return isGas ? 4 : 3
  if (status === 'GOOD')    return isGas ? 2 : 1
  return 1
}

const COF_DESC = {
  5: 'BAD — kegagalan berdampak besar',
  4: 'MONITOR + Gas — potensi bahaya tinggi',
  3: 'MONITOR + Oil/Lain — perlu pengawasan',
  2: 'GOOD + Gas — potensi risiko residual',
  1: 'GOOD — kondisi normal',
}

export default function Matrix() {
  const [items, setItems]       = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.from('pipeline_segments')
      .select('id,from_loc,to_loc,category,service_fluid,integrity_status,leak_event,size_inch,length_m')
      .then(({ data }) => {
        setItems((data || []).map(d => {
          const p = pof(d.leak_event || 0)
          const c = cof(d.integrity_status, d.service_fluid)
          return { ...d, _pof: p, _cof: c, _risk: RISK[p-1][c-1] }
        }))
        setLoading(false)
      })
  }, [])

  const cells = {}
  items.forEach(it => {
    const key = `${it._pof}-${it._cof}`
    if (!cells[key]) cells[key] = []
    cells[key].push(it)
  })

  const riskSummary = [1,2,3,4,5].map(r => ({
    r, count: items.filter(i => i._risk === r).length
  }))

  if (loading) return (
    <div style={{ color: '#94a3b8', padding: 32 }}>Memuat data segmen...</div>
  )

  const CELL_SIZE = 160

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0 }}>Decision Matrix</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
            PoF (Probability of Failure) × CoF (Consequence of Failure) — {items.length} segmen
          </p>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {riskSummary.map(({ r, count }) => {
            const c = RISK_COLORS[r]
            return (
              <div key={r} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: c.bg, border: `1px solid ${c.border}`,
                borderRadius: 10, padding: '6px 14px'
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c.text, flexShrink: 0 }} />
                <span style={{ color: c.text, fontSize: 13, fontWeight: 700 }}>{c.label}</span>
                <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* CoF legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[1,2,3,4,5].map(c => (
          <div key={c} style={{ background: '#1e293b', borderRadius: 8, padding: '4px 12px', fontSize: 11, color: '#94a3b8' }}>
            <span style={{ color: 'white', fontWeight: 700 }}>CoF {c}:</span> {COF_DESC[c]}
          </div>
        ))}
      </div>

      {/* Matrix grid */}
      <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <div style={{ display: 'inline-block', minWidth: 'max-content' }}>

          {/* CoF header */}
          <div style={{ display: 'flex', marginLeft: 64, marginBottom: 8, gap: 8 }}>
            {[1,2,3,4,5].map(c => (
              <div key={c} style={{
                width: CELL_SIZE, textAlign: 'center',
                color: '#64748b', fontSize: 13, fontWeight: 700, letterSpacing: 1,
                textTransform: 'uppercase'
              }}>
                CoF {c}
              </div>
            ))}
          </div>

          {/* PoF label + rows */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 64, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[5,4,3,2,1].map(p => (
                <div key={p} style={{
                  height: CELL_SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 2
                }}>
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>PoF</span>
                  <span style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>{p}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[5,4,3,2,1].map(p => (
                <div key={p} style={{ display: 'flex', gap: 8 }}>
                  {[1,2,3,4,5].map(c => {
                    const key  = `${p}-${c}`
                    const list = cells[key] || []
                    const risk = RISK[p-1][c-1]
                    const col  = RISK_COLORS[risk]
                    const isSelected = selected?.p === p && selected?.c === c
                    return (
                      <div key={key}
                        onClick={() => setSelected(isSelected ? null : { p, c, list, risk })}
                        style={{
                          width: CELL_SIZE, height: CELL_SIZE,
                          background: col.bg,
                          border: `2px solid ${isSelected ? col.text : col.border}`,
                          borderRadius: 14, padding: 12,
                          cursor: 'pointer', position: 'relative',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? `0 0 0 2px ${col.text}40` : 'none',
                          overflow: 'hidden',
                        }}
                        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
                        onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                      >
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          background: col.text + '22', border: `1px solid ${col.text}55`,
                          borderRadius: 6, padding: '1px 7px',
                          fontSize: 11, fontWeight: 800, color: col.text,
                        }}>
                          R{risk}
                        </div>

                        {list.length > 0 && (
                          <div style={{
                            position: 'absolute', bottom: 8, right: 8,
                            background: 'rgba(0,0,0,0.35)',
                            borderRadius: 6, padding: '2px 8px',
                            fontSize: 12, fontWeight: 700, color: 'white',
                          }}>
                            {list.length}
                          </div>
                        )}

                        <div style={{ paddingTop: 4 }}>
                          {list.slice(0, 3).map(it => (
                            <div key={it.id} style={{
                              fontSize: 11, color: '#e2e8f0',
                              background: 'rgba(0,0,0,0.25)',
                              borderRadius: 5, padding: '2px 6px',
                              marginBottom: 3, whiteSpace: 'nowrap',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {it.from_loc || '—'}
                            </div>
                          ))}
                          {list.length > 3 && (
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>+{list.length - 3} lagi</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                background: RISK_COLORS[selected.risk].bg,
                border: `1px solid ${RISK_COLORS[selected.risk].border}`,
                borderRadius: 8, padding: '4px 14px',
              }}>
                <span style={{ color: RISK_COLORS[selected.risk].text, fontWeight: 800, fontSize: 13 }}>
                  R{selected.risk} — {RISK_COLORS[selected.risk].label}
                </span>
              </div>
              <span style={{ color: 'white', fontWeight: 700 }}>
                PoF {selected.p} × CoF {selected.c} — {selected.list.length} segmen
              </span>
              <span style={{ color: '#64748b', fontSize: 12 }}>{COF_DESC[selected.c]}</span>
            </div>
            <button onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>

          {selected.list.length === 0
            ? <p style={{ color: '#64748b' }}>Tidak ada segmen di sel ini</p>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
                {selected.list.map(it => (
                  <div key={it.id} style={{
                    background: '#1e293b', borderRadius: 10, padding: '12px 16px',
                    display: 'flex', flexDirection: 'column', gap: 4
                  }}>
                    <div style={{ fontWeight: 600, color: 'white', fontSize: 14 }}>
                      {it.from_loc || '—'} → {it.to_loc || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>{it.category || '—'}</span>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>{it.service_fluid || '—'}</span>
                      {it.size_inch && <span style={{ color: '#94a3b8', fontSize: 12 }}>{it.size_inch}"</span>}
                      {it.length_m  && <span style={{ color: '#94a3b8', fontSize: 12 }}>{it.length_m} m</span>}
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: it.integrity_status==='BAD'?'#f87171':it.integrity_status==='MONITOR'?'#facc15':'#4ade80'
                      }}>
                        {it.integrity_status || '—'}
                      </span>
                      <span style={{ color: '#f87171', fontSize: 12 }}>Leak: {it.leak_event || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  )
}
