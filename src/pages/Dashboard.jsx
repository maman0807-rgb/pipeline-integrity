import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AlertTriangle, CheckCircle, Activity, Droplets, GitBranch, Flame } from 'lucide-react'

function KpiCard({ label, value, sub, color = 'blue', icon: Icon }) {
  const colors = {
    blue:   'bg-blue-500/10 border-blue-500/20 text-blue-400',
    red:    'bg-red-500/10 border-red-500/20 text-red-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    green:  'bg-green-500/10 border-green-500/20 text-green-400',
  }
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4" />}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  )
}

function IntegrityBadge({ status }) {
  const map = {
    GOOD:    'bg-green-500/20 text-green-400 border-green-500/30',
    MONITOR: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    BAD:     'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${map[status] ?? 'bg-slate-700 text-slate-300'}`}>
      {status ?? '—'}
    </span>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [recentLeaks, setRecentLeaks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: pipes }, { data: segs }, { data: leaks }] = await Promise.all([
      supabase.from('pipelines').select('id,integrity_status,sertifikat_berlaku,priority,dari_sumur'),
      supabase.from('pipeline_segments').select('integrity_status'),
      supabase.from('leak_events').select('id,tanggal_kejadian,lokasi,bocor_titik,clamp_titik,sadel_titik,sisip_meter').order('tanggal_kejadian', { ascending: false }).limit(5),
    ])

    const p = pipes || []
    const s = segs  || []
    const l = leaks || []

    const today = new Date()
    const in90  = new Date(today); in90.setDate(today.getDate() + 90)

    const expiring = p.filter(x => {
      if (!x.sertifikat_berlaku) return false
      const d = new Date(x.sertifikat_berlaku)
      return d <= in90
    })

    setStats({
      totalPipes:   p.length,
      totalSegs:    s.length,
      totalLeaks:   l.length,
      bad:          s.filter(x => x.integrity_status === 'BAD').length + p.filter(x => x.integrity_status === 'BAD').length,
      monitor:      s.filter(x => x.integrity_status === 'MONITOR').length + p.filter(x => x.integrity_status === 'MONITOR').length,
      good:         s.filter(x => x.integrity_status === 'GOOD').length + p.filter(x => x.integrity_status === 'GOOD').length,
      p1:           p.filter(x => x.priority === 'P1').length,
    })
    setAlerts(expiring)
    setRecentLeaks(l)
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat data...</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Pipeline Integrity — Prabumulih Field</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Flowline" value={stats.totalPipes} sub="master register" icon={GitBranch} color="blue" />
        <KpiCard label="Total Segmen" value={stats.totalSegs} sub="monitoring inspeksi" icon={Activity} color="blue" />
        <KpiCard label="Status BAD" value={stats.bad} sub="perlu tindakan segera" icon={AlertTriangle} color="red" />
        <KpiCard label="P1 — Prioritas" value={stats.p1} sub="ganti/repair segera" icon={Flame} color="red" />
      </div>

      {/* Integrity status */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{stats.bad}</p>
          <p className="text-xs font-semibold text-red-400 mt-1 uppercase tracking-wider">BAD</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{stats.monitor}</p>
          <p className="text-xs font-semibold text-yellow-400 mt-1 uppercase tracking-wider">MONITOR</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{stats.good}</p>
          <p className="text-xs font-semibold text-green-400 mt-1 uppercase tracking-wider">GOOD</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Alert COI/PLO */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-white">COI/PLO Akan Berakhir ≤90 Hari</h2>
          </div>
          {alerts.length === 0
            ? <p className="text-slate-500 text-sm">Tidak ada sertifikat yang hampir berakhir</p>
            : <div className="space-y-2">
                {alerts.slice(0,5).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-slate-800 last:border-0">
                    <span className="text-sm text-white font-medium">{a.dari_sumur}</span>
                    <span className="text-xs text-yellow-400">{a.sertifikat_berlaku}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Recent leak events */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Kejadian Kebocoran Terbaru</h2>
          </div>
          {recentLeaks.length === 0
            ? <p className="text-slate-500 text-sm">Belum ada data kebocoran</p>
            : <div className="space-y-2">
                {recentLeaks.map(l => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-slate-800 last:border-0">
                    <div>
                      <p className="text-sm text-white font-medium">{l.lokasi || '—'}</p>
                      <p className="text-xs text-slate-400">
                        Bocor: {l.bocor_titik} · Clamp: {l.clamp_titik} · Sadel: {l.sadel_titik}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">{l.tanggal_kejadian ?? '—'}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}
