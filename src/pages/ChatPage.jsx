import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { getConversation, patchParticipant, findAgentParticipant } from '../services/genesysApi.js'
import { useElapsedTimer } from '../hooks/useElapsedTimer.js'
import { GENESYS_CONFIG } from '../config/genesys.js'

export default function ChatPage() {
  const { id }       = useParams()
  const { token }    = useAuth()
  const { addToast } = useToast()
  const navigate     = useNavigate()
  const { refresh }  = useOutletContext()

  const [convo,   setConvo]   = useState(null)
  const [messages,setMessages]= useState([])
  const [input,   setInput]   = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef             = useRef(null)

  useEffect(() => {
    if (!token || !id) return
    let cancelled = false
    const load = async () => {
      try {
        const data = await getConversation(token, id)
        if (cancelled) return
        setConvo(data)

        // Fetch messages via Genesys chat API
        const agentP = findAgentParticipant(data.participants || [])
        const chat   = agentP?.chats?.[0]
        if (chat) {
          const res = await fetch(
            `${GENESYS_CONFIG.apiBase}/conversations/chats/${id}/messages`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (res.ok) {
            const msgs = await res.json()
            if (!cancelled) setMessages(msgs.entities || [])
          }
        }

        // Auto-navigate if chat ended
        if (agentP) {
          const c = agentP.chats?.[0]
          if (!c || c.state === 'disconnected') {
            navigate('/dashboard', { replace: true })
          }
        }
      } catch {}
    }
    load()
    const interval = setInterval(load, 3000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [token, id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const agentP     = convo ? findAgentParticipant(convo.participants || []) : null
  const customerP  = convo?.participants?.find((p) => p.purpose === 'customer')
  const startTime  = convo?.startTime
  const elapsed    = useElapsedTimer(startTime)

  const handleSend = async () => {
    if (!input.trim() || !agentP || sending) return
    setSending(true)
    try {
      await fetch(
        `${GENESYS_CONFIG.apiBase}/conversations/chats/${id}/communications/${agentP.chats?.[0]?.id}/messages`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: input.trim() }),
        }
      )
      setInput('')
    } catch { addToast('Failed to send message', 'error') }
    finally { setSending(false) }
  }

  const handleEnd = async () => {
    if (!agentP) return
    try {
      await patchParticipant(token, id, agentP.id, { state: 'disconnected' })
      refresh?.()
      navigate('/dashboard', { replace: true })
    } catch { addToast('Failed to end chat', 'error') }
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-3 md:p-4 gap-3">
      {/* Header */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="badge px-2 py-0.5 gap-1 text-xs"
              style={{ background: 'rgba(99,153,255,0.15)', color: 'var(--primary)', border: '1px solid rgba(99,153,255,0.3)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-blink" style={{ background: 'var(--primary)' }} />
              CHAT
            </div>
            <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{elapsed}</span>
          </div>
          <div className="text-sm font-medium mt-1">{customerP?.name || 'Customer'}</div>
        </div>
        <button onClick={handleEnd} className="btn btn-danger text-xs px-3 py-2">
          End Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 px-1">
        {messages.length === 0 && (
          <div className="text-center text-sm py-8" style={{ color: 'var(--text-secondary)' }}>
            No messages yet
          </div>
        )}
        {messages.map((msg, i) => {
          const isAgent = msg.sender?.participantPurpose === 'agent' ||
                          msg.sender?.participantPurpose === 'user'
          return (
            <div key={i} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-xs px-3.5 py-2.5 rounded-2xl text-sm"
                style={{
                  background: isAgent ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                  borderRadius: isAgent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                }}
              >
                {msg.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 shrink-0">
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          style={{ color: 'var(--text)' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="btn btn-primary text-xs px-3 py-2"
          style={{ opacity: input.trim() ? 1 : 0.4 }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
