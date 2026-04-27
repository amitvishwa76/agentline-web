import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useState } from 'react'

const PRESENCE_COLORS = {
  'On Queue':  '#00c896',
  'Available': '#00c896',
  'Away':      '#f5a623',
  'Busy':      '#ff3b30',
  'Break':     '#f5a623',
  'Offline':   'rgba(255,255,255,0.3)',
}

export default function Sidebar({ presenceApi, conversations, onClose }) {
  const { user, logout } = useAuth()
  const { addToast }     = useToast()
  const navigate         = useNavigate()
  const [showPresence, setShowPresence] = useState(false)

  const { definitions, currentPresence, changePresence } = presenceApi

  const activeCount = conversations?.filter((c) =>
    c.participants?.some((p) =>
      ['agent','user'].includes(p.purpose) &&
      (p.calls?.some((x) => ['connected','held','alerting'].includes(x.state)) ||
       p.chats?.some((x) => x.state === 'connected'))
    )
  ).length || 0

  const presenceName  = currentPresence?.name || 'Unknown'
  const presenceColor = PRESENCE_COLORS[presenceName] || 'rgba(255,255,255,0.3)'
  const firstName     = user?.name?.split(' ')[0] || 'Agent'

  const handleLogout = async () => {
    await logout()
    addToast('Signed out', 'info')
    navigate('/login')
  }

  const handlePresenceChange = async (def) => {
    await changePresence(def.id, def.name)
    addToast(`Presence set to ${def.name}`, 'success')
    setShowPresence(false)
  }

  return (
    <aside
      className="flex flex-col w-full h-full border-r shrink-0 relative"
      style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.3)' }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: 'var(--primary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  fill="var(--primary)" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide" style={{ color: 'var(--primary)' }}>
              AGENTLINE
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Web Desktop
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden absolute top-4 right-4 p-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Agent info + presence */}
      <div className="px-4 py-4 border-b relative" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ background: 'var(--primary)', color: '#fff' }}>
            {firstName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name || 'Agent'}</div>
            <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {user?.email || ''}
            </div>
          </div>
        </div>

        {/* Presence button */}
        <button
          onClick={() => setShowPresence((s) => !s)}
          className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg w-full text-left transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
        >
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: presenceColor }} />
            {presenceName === 'On Queue' && (
              <div className="absolute inset-0 rounded-full animate-pulse-ring"
                style={{ background: presenceColor, opacity: 0.4 }} />
            )}
          </div>
          <span className="text-xs font-medium flex-1">{presenceName}</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--text-secondary)' }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Presence dropdown */}
        {showPresence && (
          <div className="absolute left-4 right-4 top-full mt-1 glass rounded-xl z-50 overflow-hidden shadow-2xl animate-slide-up">
            {definitions.map((def) => {
              const color = PRESENCE_COLORS[def.name] || 'rgba(255,255,255,0.3)'
              return (
                <button
                  key={def.id}
                  onClick={() => handlePresenceChange(def)}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  {def.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        <NavItem to="/dashboard" icon={<GridIcon />} label="Dashboard">
          {activeCount > 0 && (
            <span className="badge text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: 'var(--danger)', color: '#fff', fontSize: '10px' }}>
              {activeCount}
            </span>
          )}
        </NavItem>
        <NavItem to="/calling-list" icon={<ListIcon />} label="Calling List" />
        <NavItem to="/dialpad"      icon={<DialIcon />} label="Dialpad" />
      </nav>

      {/* Keyboard shortcuts legend */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          Shortcuts
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {[['A','Answer'],['D','Decline'],['M','Mute'],['H','Hold'],['E','End']].map(([k,v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded text-xs font-mono"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)' }}>
                {k}
              </kbd>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div className="px-3 pb-5">
        <button
          onClick={handleLogout}
          className="btn btn-ghost w-full text-sm gap-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <SignOutIcon />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

function NavItem({ to, icon, label, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'text-white'
            : 'text-white/50 hover:text-white hover:bg-white/5'
        }`
      }
      style={({ isActive }) => isActive
        ? { background: 'rgba(99,153,255,0.15)', color: 'var(--primary)' }
        : {}
      }
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {children}
    </NavLink>
  )
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function DialIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="1.5" fill="currentColor" />
      <circle cx="15" cy="7" r="1.5" fill="currentColor" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="9" cy="17" r="1.5" fill="currentColor" />
      <circle cx="15" cy="17" r="1.5" fill="currentColor" />
    </svg>
  )
}
function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
