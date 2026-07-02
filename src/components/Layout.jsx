import { useState } from 'react'
import {
  LayoutDashboard, GitBranch, Activity, Flame,
  Calculator, Grid3x3, LogOut, Menu, X, Droplets, Upload, Users, ShieldCheck, Package, BookOpen
} from 'lucide-react'

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',          icon: LayoutDashboard, adminOnly: false },
  { id: 'flowline',   label: 'Flowline Register',   icon: GitBranch,       adminOnly: false },
  { id: 'monitoring', label: 'Monitoring Inspeksi', icon: Activity,        adminOnly: false },
  { id: 'kebocoran',  label: 'History Kebocoran',   icon: Flame,           adminOnly: false },
  { id: 'cba',        label: 'CBA Kalkulator',      icon: Calculator,      adminOnly: false },
  { id: 'matrix',     label: 'Decision Matrix',     icon: Grid3x3,         adminOnly: false },
  { id: 'gudang',     label: 'Stok Gudang',         icon: Package,         adminOnly: false },
  { id: 'users',      label: 'Manajemen User',      icon: Users,           adminOnly: true  },
  { id: 'import',     label: 'Import Excel',        icon: Upload,          adminOnly: true  },
]

const ROLE_LABEL = {
  admin:      { label: 'Admin',       color: '#f87171' },
  inspektor:  { label: 'Inspektor',   color: '#60a5fa' },
  sr_mekanik: { label: 'Sr. Mekanik', color: '#a78bfa' },
  mekanik:    { label: 'Mekanik',     color: '#34d399' },
  viewer:     { label: 'Viewer',      color: '#94a3b8' },
}

export default function Layout({ page, onNav, onSignOut, profile, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAdmin  = profile?.role === 'admin'
  const visibleNav = NAV.filter(n => !n.adminOnly || isAdmin)
  const roleInfo = ROLE_LABEL[profile?.role] || { label: profile?.role || '—', color: '#94a3b8' }

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
        {visibleNav.map(({ id, label, icon: Icon }) => (
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

      {/* User info */}
      <div style={{ margin: '0 12px 8px', background: '#1e293b', borderRadius: 12, padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <ShieldCheck style={{ width: 14, height: 14, color: roleInfo.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: roleInfo.color, textTransform: 'uppercase', letterSpacing: 1 }}>{roleInfo.label}</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile?.nama || profile?.username || '—'}
        </p>
        {profile?.nip && <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>NIP: {profile.nip}</p>}
      </div>

      {/* Panduan & Logout */}
      <div style={{ padding: '0 12px 20px', borderTop: '1px solid #1e293b', paddingTop: 8 }}>
        <a href="/panduan.html" target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
            width: '100%', fontSize: 14, fontWeight: 500, textDecoration: 'none',
            background: 'transparent', color: '#94a3b8',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
        >
          <BookOpen style={{ width: 18, height: 18 }} /> Panduan
        </a>
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
