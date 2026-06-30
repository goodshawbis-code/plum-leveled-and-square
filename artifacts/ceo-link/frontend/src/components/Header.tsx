/**
 * Header — Trademarked PLS seal + navigation
 * Solid Gold (#D4A84B) / Navy (#14181B) palette
 * Multi-target: responsive for iPhone/iPad/Watch
 */
import { useNavigate, useLocation } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path

  return (
    <header style={{
      background: 'var(--navy-light)',
      borderBottom: '1px solid var(--border)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'linear-gradient(135deg, #D4A84B, #B8922F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 18, color: '#14181B',
        }}>PLS</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#D4A84B' }}>PLUMB LEVELED & SQUARE</div>
          <div style={{ fontSize: 11, color: '#A0A0A0', letterSpacing: '0.5px' }}>CONSTRUCTION CONTROL CENTER</div>
        </div>
      </div>
      <nav style={{ display: 'flex', gap: '8px' }}>
        {[
          { path: '/control-center', label: 'Command' },
          { path: '/masonry-ai', label: 'AI Takeoff' },
          { path: '/watch', label: 'Foreman' },
        ].map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              background: isActive(item.path) ? '#D4A84B' : 'transparent',
              color: isActive(item.path) ? '#14181B' : '#A0A0A0',
              border: isActive(item.path) ? 'none' : '1px solid #2A2F35',
              padding: '8px 16px', fontSize: 13, fontWeight: 600,
              borderRadius: 8, cursor: 'pointer', minHeight: 36,
            }}
          >{item.label}</button>
        ))}
      </nav>
    </header>
  )
}
