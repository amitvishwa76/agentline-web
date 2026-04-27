import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { patchParticipant, getConversation, findAgentParticipant, isPhoneNumber } from '../services/genesysApi.js'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js'
import { INBOUND_DISPLAY, buildScreenPopRows, NOISE_EXACT, NOISE_PREFIXES, NOISE_SUBSTRINGS } from '../config/screenPopConfig.js'
import { GENESYS_CONFIG } from '../config/genesys.js'

function isNoisy(key) {
  const k = key.toLowerCase()
  if (NOISE_EXACT.includes(k)) return true
  if (NOISE_PREFIXES.some(p => k.startsWith(p))) return true
  if (NOISE_SUBSTRINGS.some(s => k.includes(s))) return true
  return false
}

export default function IncomingCallAlert({ conversation, onRefresh }) {
  const { token }  = useAuth()
  const navigate   = useNavigate()

  const [loading,    setLoading]    = useState(true)
  const [callerName, setCallerName] = useState('Incoming Call')
  const [queueName,  setQueueName]  = useState('')
  const [screenPop,  setScreenPop]  = useState([])   // array of { label, value } rows

  const agentP = conversation ? findAgentParticipant(conversation.participants || []) : null

  useEffect(() => {
    if (!conversation || !token) return
    let cancelled = false

    const load = async () => {
      try {
        const data = await getConversation(token, conversation.id)
        if (cancelled) return

        const customerP = data.participants?.find(p => p.purpose === 'customer' || p.purpose === 'external')
        const acdP      = data.participants?.find(p => p.purpose === 'acd')

        // Resolve caller name
        const rawName = customerP?.name || ''
        const allRawAttrs = {}
        for (const p of (data.participants || [])) {
          Object.assign(allRawAttrs, p.attributes      || {})
          Object.assign(allRawAttrs, p.participantData || {})
        }

        const resolvedName = isPhoneNumber(rawName)
          ? (INBOUND_DISPLAY.showCallerNumber
              ? rawName
              : (allRawAttrs.customerName || allRawAttrs.CustomerName || allRawAttrs.Firstname || 'Unknown Caller'))
          : (rawName || 'Unknown Caller')
        setCallerName(resolvedName)

        // Queue name
        const qn = acdP?.queueName || ''
        setQueueName(qn)

        // Build screen pop rows from configured fields
        // First try architect/conversation attributes
        const clean = {}
        Object.entries(allRawAttrs).forEach(([k, v]) => {
          if (v && !isNoisy(k)) clean[k] = v
        })

        // For outbound/dialler calls, also fetch contact list record
        const contactId =
          allRawAttrs.dialerContactId    ||
          allRawAttrs['Dialer.ContactId'] ||
          allRawAttrs.contactId          || null
        const contactListId =
          allRawAttrs.dialerContactListId    ||
          allRawAttrs['Dialer.ContactListId'] ||
          allRawAttrs.contactListId          || null

        if (contactId && contactListId) {
          try {
            const cRes = await fetch(
              `${GENESYS_CONFIG.apiBase}/outbound/contactlists/${contactListId}/contacts/${contactId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (cRes.ok) {
              const cData = await cRes.json()
              const dataToUse = cData.data || cData.columnData || cData.fields || null
              if (dataToUse) {
                Object.entries(dataToUse).forEach(([k, v]) => {
                  if (v && !isNoisy(k)) clean[k] = v
                })
              }
            }
          } catch (e) { /* non-fatal */ }
        }

        // Build display rows using the central config
        const rows = buildScreenPopRows(clean)
        if (!cancelled) setScreenPop(rows)

      } catch (e) {
        console.error('[IncomingAlert] screen pop error:', e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [conversation?.id, token])

  // Browser notification
  useEffect(() => {
    if (Notification.permission === 'granted') {
      new Notification('📞 Incoming Call', {
        body: `${callerName}${queueName ? ` — ${queueName}` : ''}`,
        icon: '/favicon.svg',
      })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
  }, [callerName])

  // Ringtone
  useEffect(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      let running = true
      const ring = () => {
        if (!running) return
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
        setTimeout(() => running && ring(), 1800)
      }
      ring()
      return () => { running = false; ctx.close() }
    } catch { /* ignore */ }
  }, [])

  const handleAnswer = async () => {
    if (!agentP) return
    await patchParticipant(token, conversation.id, agentP.id, { state: 'connected' })
    onRefresh?.()
    navigate(`/call/${conversation.id}`)
  }

  const handleDecline = async () => {
    if (!agentP) return
    await patchParticipant(token, conversation.id, agentP.id, { state: 'disconnected' })
    onRefresh?.()
  }

  useKeyboardShortcuts({ answer: handleAnswer, decline: handleDecline })

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-16 pointer-events-none">
      <div
        className="glass rounded-2xl shadow-2xl pointer-events-auto animate-slide-up overflow-hidden"
        style={{ width: 'min(400px, calc(100vw - 32px))', border: '1px solid rgba(0,200,150,0.3)' }}
      >
        {/* Pulsing top bar */}
        <div className="h-1 w-full" style={{ background: 'var(--success)', opacity: 0.8 }} />

        <div className="px-6 py-5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative">
              <div className="w-3 h-3 rounded-full" style={{ background: 'var(--success)' }} />
              <div className="absolute inset-0 rounded-full animate-pulse-ring" style={{ background: 'var(--success)' }} />
            </div>
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--success)' }}>
              Incoming Call
            </span>
          </div>

          {/* Caller name + queue */}
          <div className="mb-4">
            <div className="text-xl font-semibold mb-1">{callerName}</div>
            {INBOUND_DISPLAY.showQueueName && queueName && (
              <span className="badge text-xs"
                style={{ background: 'rgba(99,153,255,0.15)', color: 'var(--primary)', border: '1px solid rgba(99,153,255,0.3)' }}>
                {queueName}
              </span>
            )}
          </div>

          {/* Screen pop — loading spinner */}
          {INBOUND_DISPLAY.showLoadingSpinner && loading && (
            <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              Loading customer data…
            </div>
          )}

          {/* Screen pop — customer fields */}
          {!loading && screenPop.length > 0 && (
            <div className="rounded-xl mb-4 overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
              <div className="grid grid-cols-2 gap-x-4 px-4 pb-3">
                {screenPop.map((row, i) => (
                  <div key={i} className="pt-3">
                    <div className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{row.label}</div>
                    <div className="text-sm font-medium truncate">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No data state */}
          {!loading && screenPop.length === 0 && (
            <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              No customer data available
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={handleDecline} className="btn btn-danger flex-1">
              <PhoneIcon rotate />
              <span>Decline</span>
              <Kbd>D</Kbd>
            </button>
            <button onClick={handleAnswer} className="btn btn-success flex-1">
              <PhoneIcon />
              <span>Answer</span>
              <Kbd>A</Kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PhoneIcon({ rotate }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
      style={rotate ? { transform: 'rotate(135deg)' } : {}}>
      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}

function Kbd({ children }) {
  return (
    <kbd className="px-1 py-0.5 rounded text-xs font-mono ml-1 opacity-70"
      style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}>
      {children}
    </kbd>
  )
}
