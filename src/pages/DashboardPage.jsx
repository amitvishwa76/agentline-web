import { useOutletContext, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { findAgentParticipant, isPhoneNumber } from '../services/genesysApi.js'

const PRESENCE_COLORS = {
  'On Queue':  '#00c896',
  'Available': '#00c896',
  'Away':      '#f5a623',
  'Busy':      '#ff3b30',
  'Break':     '#f5a623',
  'Offline':   'rgba(255,255,255,0.3)',
}

function getCallState(convo) {
  const agentP = findAgentParticipant(convo.participants || [])
  if (!agentP) return null

  const call = agentP.calls?.[0]
  const chat = agentP.chats?.[0]

  if (call) return { type: 'call', state: call.state, mediaType: 'call' }
  if (chat) return { type: 'chat', state: chat.state, mediaType: 'chat' }
  return null
}

function getDisplayName(convo) {
  const customerP = convo.participants?.find((p) => p.purpose === 'customer')
  const raw = customerP?.name || ''
  return isPhoneNumber(raw) ? 'Unknown Caller' : (raw || 'Unknown')
}

function getQueueName(convo) {
  return convo.participants?.find((p) => p.purpose === 'acd')?.queueName || ''
}

function stateColor(state) {
  if (state === 'connected') return 'var(--success)'
  if (state === 'alerting')  return 'var(--warning)'
  if (state === 'held')      return 'var(--warning)'
  return 'var(--text-secondary)'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { conversations, presenceApi } = useOutletContext()
  const navigate = useNavigate()

  const { currentPresence } = presenceApi
  const firstName = user?.name?.split(' ')[0] || 'Agent'
  const presenceName  = currentPresence?.name || '—'
  const presenceColor = PRESENCE_COLORS[presenceName] || 'rgba(255,255,255,0.3)'

  const activeConvos = conversations.filter((c) => {
    const agentP = findAgentParticipant(c.participants || [])
    if (!agentP) return false
    const hasCall = agentP.calls?.some((x) => ['connected','held','alerting'].includes(x.state))
    const hasChat = agentP.chats?.some((x) => x.state === 'connected')
    return hasCall || hasChat
  })

  const handleConvoClick = (convo) => {
    const agentP = findAgentParticipant(convo.participants || [])
    const hasChat = agentP?.chats?.some((x) => x.state === 'connected')
    if (hasChat) navigate(`/chat/${convo.id}`)
    else navigate(`/call/${convo.id}`)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-semibold mb-1">
          Hello, {firstName} 👋
        </h1>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: presenceColor }} />
          {presenceName}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6 md:mb-8">
        <StatCard label="Active" value={activeConvos.length} color="var(--success)" />
        <StatCard label="Presence" value={presenceName} small />
        <StatCard label="Region" value="APS1" small />
      </div>

      {/* Active interactions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase"
            style={{ color: 'var(--text-secondary)' }}>
            Active Interactions
          </h2>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
            Live · 3s poll
          </div>
        </div>

        {activeConvos.length === 0 ? (
          <div className="glass rounded-xl px-5 py-8 text-center">
            <div className="text-3xl mb-2 opacity-30">📵</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No active interactions
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeConvos.map((convo) => {
              const info = getCallState(convo)
              const name = getDisplayName(convo)
              const queue = getQueueName(convo)
              return (
                <button
                  key={convo.id}
                  onClick={() => handleConvoClick(convo)}
                  className="glass rounded-xl px-4 py-3.5 flex items-center gap-3 w-full text-left transition-colors hover:bg-white/5"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: info ? stateColor(info.state) : 'var(--text-secondary)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{name}</div>
                    {queue && (
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {queue}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {info?.type === 'chat' && (
                      <span className="badge text-xs px-2 py-0.5"
                        style={{ background: 'rgba(99,153,255,0.15)', color: 'var(--primary)', border: '1px solid rgba(99,153,255,0.3)' }}>
                        Chat
                      </span>
                    )}
                    <span className="text-xs capitalize px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', color: info ? stateColor(info.state) : 'var(--text-secondary)' }}>
                      {info?.state || 'unknown'}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-secondary)' }}>
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold tracking-wide uppercase mb-3"
          style={{ color: 'var(--text-secondary)' }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <ActionButton
            onClick={() => navigate('/dialpad')}
            icon="📞"
            label="New Call"
            sub="Manual outbound"
          />
          <ActionButton
            onClick={() => navigate('/calling-list')}
            icon="📋"
            label="Calling List"
            sub="My assigned contacts"
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, small }) {
  return (
    <div className="glass rounded-xl px-4 py-3">
      <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className={small ? 'text-sm font-semibold truncate' : 'text-2xl font-bold'}
        style={color ? { color } : {}}>
        {value}
      </div>
    </div>
  )
}

function ActionButton({ onClick, icon, label, sub }) {
  return (
    <button
      onClick={onClick}
      className="glass rounded-xl p-4 text-left transition-colors hover:bg-white/5 active:scale-98"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</div>
    </button>
  )
}
