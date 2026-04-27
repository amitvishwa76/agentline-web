import { NavLink, useNavigate } from 'react-router-dom'
import { findAgentParticipant } from '../services/genesysApi.js'

const PRESENCE_COLORS = {
  'On Queue':  '#00c896',
  'Available': '#00c896',
  'Away':      '#f5a623',
  'Busy':      '#ff3b30',
  'Break':     '#f5a623',
  'Offline':   'rgba(255,255,255,0.3)',
}

export default function BottomNav({ conversations, presenceApi }) {
  const { currentPresence } = presenceApi

  const activeCount = conversations?.filter((c) =>
    c.participants?.some((p) =>
      ['agent','user'].includes(p.purpose) &&
      (p.calls?.some((x) => ['connected','held','alerting'].includes(x.state)) ||
       p.chats?.some((x) => x.state === 'connected'))
    )
  ).length || 0

  const presenceColor = PRESENCE_COLORS[currentPresence?.name] || 'rgba(255,255,255,0.3)'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 pb-safe"
      style={{
        background: 'rgba(10,15,30,0.95)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        paddingTop: '8px',
        height: '64px',
      }}>
      <NavItem to="/dashboard" label="Home" icon={<HomeIcon />} badge={activeCount} />
      <NavItem to="/calling-list" label="Contacts" icon={<ListIcon />} />
      <NavItem to="/dialpad" label="Dialpad" icon={<DialIcon />} />

      {/* Presence dot as last nav item */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: presenceColor }}>
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: presenceColor }} />
        </div>
        <span className="text-xs" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
          {currentPresence?.name?.split(' ')[0] || 'Status'}
        </span>
      </div>
    </nav>
  )
}

function NavItem({ to, label, icon, badge }) {
  return (
    <NavLink to={to} className={({ isActive }) =>
      `flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${
        isActive ? 'text-white' : 'text-white/40'
      }`
    }
    style={({ isActive }) => isActive ? { color: 'var(--primary)' } : {}}>
      <div className="relative">
        {icon}
        {badge > 0 && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
            style={{ background: 'var(--danger)', fontSize: '9px', fontWeight: 700 }}>
            {badge}
          </div>
        )}
      </div>
      <span style={{ fontSize: '10px', fontWeight: 500 }}>{label}</span>
    </NavLink>
  )
}

function HomeIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 21h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
}
function ListIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
}
function DialIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="7"  r="1.5" fill="currentColor"/>
    <circle cx="15" cy="7"  r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="12" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="17" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="17" r="1.5" fill="currentColor"/>
  </svg>
}
