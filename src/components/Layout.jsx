import { useState } from 'react'
import {
  LayoutDashboard, GitBranch, Activity, Flame,
  Calculator, Grid3x3, LogOut, Menu, X, Droplets, Upload
} from 'lucide-react'

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'flowline',   label: 'Flowline Register',  icon: GitBranch },
  { id: 'monitoring', label: 'Monitoring Inspeksi',icon: Activity },
  { id: 'kebocoran',  label: 'History Kebocoran',  icon: Flame },
  { id: 'cba',        label: 'CBA Kalkulator',     icon: Calculator },
  { id: 'matrix',     label: 'Decision Matrix',    icon: Grid3x3 },
  { id: 'import',     label: 'Import Excel',       icon: Upload },
]

export default function Layout({ page, onNav, onSignOut, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-slate-900 border-r border-slate-800 shrink-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">PHR Prabumulih</p>
            <p className="text-sm font-bold text-white truncate">Pipeline Integrity</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id} onClick={() => onNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                page === id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-4 border-t border-slate-800 pt-3">
          <button onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white">Pipeline Integrity</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { onNav(id); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    page === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}>
                  <Icon className="w-4 h-4 shrink-0" />{label}
                </button>
              ))}
            </nav>
            <div className="px-3 pb-4 border-t border-slate-800 pt-3">
              <button onClick={onSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800">
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800">
          <button onClick={() => setOpen(true)} className="text-slate-400"><Menu className="w-5 h-5" /></button>
          <span className="text-sm font-bold text-white">{NAV.find(n => n.id === page)?.label ?? 'Pipeline Integrity'}</span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
