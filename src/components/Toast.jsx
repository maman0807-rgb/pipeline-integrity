const COLORS = {
  success: { bg: '#16a34a', border: '#22c55e' },
  error:   { bg: '#dc2626', border: '#ef4444' },
  warn:    { bg: '#d97706', border: '#f59e0b' },
  info:    { bg: '#2563eb', border: '#3b82f6' },
}

export default function Toast({ toasts }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.success
        return (
          <div key={t.id} style={{
            background: c.bg, border: `1px solid ${c.border}`,
            color: 'white', padding: '10px 18px', borderRadius: 12,
            fontSize: 14, fontWeight: 600, maxWidth: 340,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            {t.msg}
          </div>
        )
      })}
    </div>
  )
}
