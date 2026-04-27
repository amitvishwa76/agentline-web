import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import BottomNav from './BottomNav.jsx'
import { useConversations } from '../hooks/useConversations.js'
import { usePresence } from '../hooks/usePresence.js'
import IncomingCallAlert from './IncomingCallAlert.jsx'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AppShell() {
  const { conversations, refresh } = useConversations()
  const presenceApi = usePresence()
  const navigate    = useNavigate()
  const location    = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const alertingCall = conversations.find((c) =>
    c.participants?.some((p) =>
      p.purpose === 'agent' &&
      p.calls?.some((call) => call.state === 'alerting')
    )
  )

  const activeCall = conversations.find((c) =>
    c.participants?.some((p) =>
      (p.purpose === 'agent' || p.purpose === 'user') &&
      p.calls?.some((call) => ['connected', 'held'].includes(call.state))
    )
  )

  const activeChat = conversations.find((c) =>
    c.participants?.some((p) =>
      (p.purpose === 'agent' || p.purpose === 'user') &&
      p.chats?.some((chat) => chat.state === 'connected')
    )
  )

  useEffect(() => {
    if (activeCall) navigate(`/call/${activeCall.id}`, { replace: false })
  }, [activeCall?.id])

  useEffect(() => {
    if (activeChat) navigate(`/chat/${activeChat.id}`, { replace: false })
  }, [activeChat?.id])

  useEffect(() => {
    if (alertingCall)     document.title = '📞 Incoming Call — Agentline'
    else if (activeCall)  document.title = '🟢 On Call — Agentline'
    else                  document.title = 'Agentline'
  }, [alertingCall, activeCall])

  // Close sidebar when route changes on mobile
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const isCallOrChat = location.pathname.startsWith('/call') || location.pathname.startsWith('/chat')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex md:flex-col md:w-64 md:shrink-0">
        <Sidebar presenceApi={presenceApi} conversations={conversations} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-72 animate-slide-right"
            style={{ background: '#0d1428', borderRight: '1px solid var(--border)' }}>
            <Sidebar presenceApi={presenceApi} conversations={conversations} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto relative flex flex-col">
        {/* Mobile top bar — hidden on desktop */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <HamburgerIcon />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>AGENTLINE</span>
          <div className="w-9" /> {/* spacer */}
        </div>

        {alertingCall && (
          <IncomingCallAlert conversation={alertingCall} onRefresh={refresh} />
        )}

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet context={{ conversations, refresh, presenceApi }} />
        </div>

        {/* Mobile bottom nav — hidden on desktop, hidden during call/chat */}
        {!isCallOrChat && (
          <div className="md:hidden">
            <BottomNav conversations={conversations} presenceApi={presenceApi} />
          </div>
        )}
      </main>
    </div>
  )
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
