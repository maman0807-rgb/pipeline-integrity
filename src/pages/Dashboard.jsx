import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AlertTriangle, CheckCircle, Activity, Droplets, GitBranch, Flame, RefreshCw } from 'lucide-react'

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
  const [stats, setStats]       = useState(null)
  const [alerts, setAlerts]     = useState([])
  const [recentLeaks, setRecentLeaks] = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { load() }, [])

  async function refresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function load() {
    const today = new Date().toISOString().slice(0, 10)
    const in90  = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)

    const [
      { count: totalPipes },
      { count: totalSegs },
      { count: badPipes },   { count: badSegs },
      { count: monPipes },   { count: monSegs },
      { count: goodPipes },  { count: goodSegs },
      { count: p1 },
      { data: expiring },
      { data: leaks },
      { data: panjangFlowline },
      { data: panjangTrunkline },
    ] = await Promise.all([
      supabase.from('pipelines').select('*', { count: 'exact', head: true }),
      supabase.from('pipeline_segments').select('*', { count: 'exact', head: true }),
      supabase.from('pipelines').select('*', { count: 'exact', head: true }).eq('integrity_status', 'BAD'),
      supabase.from('pipeline_segments').select('*', { count: 'exact', head: true }).eq('integrity_status', 'BAD'),
      supabase.from('pipelines').select('*', { count: 'exact', head: true }).eq('integrity_status', 'MONITOR'),
      supabase.from('pipeline_segments').select('*', { count: 'exact', head: true }).eq('integrity_status', 'MONITOR'),
      supabase.from('pipelines').select('*', { count: 'exact', head: true }).eq('integrity_status', 'GOOD'),
      supabase.from('pipeline_segments').select('*', { count: 'exact', head: true }).eq('integrity_status', 'GOOD'),
      supabase.from('pipelines').select('*', { count: 'exact', head: true }).eq('priority', 'P1'),
      supabase.from('pipelines').select('id,dari_sumur,sertifikat_berlaku').lte('sertifikat_berlaku', in90).gte('sertifikat_berlaku', today).order('sertifikat_berlaku').limit(10),
      supabase.from('leak_events').select('id,tanggal_kejadian,lokasi,bocor_titik,clamp_titik,sadel_titik,sisip_meter').order('tanggal_kejadian', { ascending: false }).limit(5),
      supabase.from('pipelines').select('panjang_m'),
      supabase.from('pipeline_segments').select('length_m,category').eq('category', 'TRUNKLINE').lt('length_m', 200000),
    ])

    const totalFlowlineM   = (panjangFlowline  || []).reduce((s, r) => s + (r.panjang_m  || 0), 0)
    const totalTrunklineM  = (panjangTrunkline || []).reduce((s, r) => s + (r.length_m   || 0), 0)

    setStats({
      totalPipes:     totalPipes  ?? 0,
      totalSegs:      totalSegs   ?? 0,
      bad:           (badPipes    ?? 0) + (badSegs    ?? 0),
      monitor:       (monPipes    ?? 0) + (monSegs    ?? 0),
      good:          (goodPipes   ?? 0) + (goodSegs   ?? 0),
      p1:             p1          ?? 0,
      flowlineKm:    (totalFlowlineM  / 1000).toFixed(2),
      trunklineKm:   (totalTrunklineM / 1000).toFixed(2),
    })
    setAlerts(expiring || [])
    setRecentLeaks(leaks || [])
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat data...</div>

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Pipeline Integrity — Prabumulih Field</p>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI row 1 — jumlah */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Flowline" value={stats.totalPipes} sub="master register" icon={GitBranch} color="blue" />
        <KpiCard label="Total Segmen" value={stats.totalSegs} sub="monitoring inspeksi" icon={Activity} color="blue" />
        <KpiCard label="Status BAD" value={stats.bad} sub="perlu tindakan segera" icon={AlertTriangle} color="red" />
        <KpiCard label="P1 — Prioritas" value={stats.p1} sub="ganti/repair segera" icon={Flame} color="red" />
      </div>

      {/* KPI row 2 — panjang */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <GitBranch className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Panjang Flowline</p>
            <p className="text-3xl font-bold text-white">{stats.flowlineKm} <span className="text-lg font-semibold text-cyan-400">km</span></p>
            <p className="text-xs text-slate-500 mt-0.5">Total panjang {stats.totalPipes} flowline</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Panjang Trunkline</p>
            <p className="text-3xl font-bold text-white">{stats.trunklineKm} <span className="text-lg font-semibold text-purple-400">km</span></p>
            <p className="text-xs text-slate-500 mt-0.5">Segmen kategori TRUNKLINE</p>
          </div>
        </div>
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
