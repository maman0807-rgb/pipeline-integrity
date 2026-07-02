import { useState } from 'react'
import {
  LayoutDashboard, GitBranch, Activity, Flame,
  Calculator, Grid3x3, LogOut, Menu, X, Droplets, Upload, Users
} from 'lucide-react'

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'flowline',   label: 'Flowline Register',   icon: GitBranch },
  { id: 'monitoring', label: 'Monitoring Inspeksi', icon: Activity },
  { id: 'kebocoran',  label: 'History Kebocoran',   icon: Flame },
  { id: 'cba',        label: 'CBA Kalkulator',      icon: Calculator },
  { id: 'matrix',     label: 'Decision Matrix',     icon: Grid3x3 },
  { id: 'users',      label: 'Manajemen User',      icon: Users },
  { id: 'import',     label: 'Import Excel',        icon: Upload },
]

export default function Layout({ page, onNav, onSignOut, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const Sidebar = () => (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Droplets style={{ width: 22, height: 22, color: 'white' }} />
        </div>
        <div>
          <p style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2 }}>PHR Prabumulih</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Pipeline Integrity</p>
        </div>
      </div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => { onNav(id); setMobileOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
              width: '100%', textAlign: 'left', fontSize: 14, fontWeight: 500,
              background: page === id ? '#2563eb' : 'transparent',
              color: page === id ? 'white' : '#94a3b8',
            }}
            onMouseEnter={e => { if (page !== id) { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = 'white' } }}
            onMouseLeave={e => { if (page !== id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' } }}
          >
            <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
            {label}
          </button>
        ))}
      </nav>
      {/* Logout */}
      <div style={{ padding: '12px 12px 20px', borderTop: '1px solid #1e293b' }}>
        <button onClick={onSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
            width: '100%', fontSize: 14, fontWeight: 500,
            background: 'transparent', color: '#94a3b8',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
        >
          <LogOut style={{ width: 18, height: 18 }} /> Keluar
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#020817', overflow: 'hidden' }}>

      {/* Sidebar — always visible on screen ≥ 768px */}
      <aside className="sidebar-desktop" style={{
        width: 260, flexShrink: 0, background: '#0f172a',
        borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column'
      }}>
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-mobile-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}
        >
          <div onClick={() => setMobileOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <aside style={{
            position: 'relative', width: 260, background: '#0f172a',
            borderRight: '1px solid #1e293b', zIndex: 1, display: 'flex', flexDirection: 'column'
          }}>
            <button onClick={() => setMobileOpen(false)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X style={{ width: 20, height: 20 }} />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile topbar */}
        <div className="mobile-topbar" style={{
          display: 'none', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: '#0f172a', borderBottom: '1px solid #1e293b'
        }}>
          <button onClick={() => setMobileOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <Menu style={{ width: 24, height: 24 }} />
          </button>
          <span style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>
            {NAV.find(n => n.id === page)?.label ?? 'Pipeline Integrity'}
          </span>
        </div>

        <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .mobile-topbar { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
