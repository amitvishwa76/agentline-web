import { GENESYS_CONFIG } from '../config/genesys.js'
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useElapsedTimer } from '../hooks/useElapsedTimer.js'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js'
import {
  getConversation,
  setMute,
  setHold,
  disconnectCallComm,
  disconnectCallParticipant,
  submitWrapup,
  findAgentParticipant,
  isPhoneNumber,
  getCampaign,
} from '../services/genesysApi.js'
import { updateContactAfterCall } from '../services/supabase.js'
import ScreenPopCard from '../components/ScreenPopCard.jsx'
import WrapupModal from '../components/WrapupModal.jsx'
import { NOISE_EXACT, NOISE_PREFIXES, NOISE_SUBSTRINGS } from '../config/screenPopConfig.js'

function isNoisy(key) {
  const k = key.toLowerCase()
  if (NOISE_EXACT.includes(k)) return true
  if (NOISE_PREFIXES.some((p) => k.startsWith(p))) return true
  if (NOISE_SUBSTRINGS.some((s) => k.includes(s))) return true
  return false
}

export default function CallPage() {
  const { id }       = useParams()
  const { token }    = useAuth()
  const { addToast } = useToast()
  const navigate     = useNavigate()
  const { refresh }  = useOutletContext()

  const [convo,         setConvo]         = useState(null)
  const [muted,         setMuted]         = useState(false)
  const [held,          setHeld]          = useState(false)
  const [showWrapup,    setShowWrapup]    = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [screenPop,     setScreenPop]     = useState({})
  const [contactId,     setContactId]     = useState(null)
  const [isOutbound,    setIsOutbound]    = useState(false)
  const [wrapupContext, setWrapupContext] = useState('')
  const [wrapupQueueId,  setWrapupQueueId]  = useState('')

  useEffect(() => {
    if (!token || !id) return
    let cancelled = false

    const load = async () => {
      try {
        const data = await getConversation(token, id)
        if (cancelled) return
        setConvo(data)

        const agentP = findAgentParticipant(data.participants || [])
        const call   = agentP?.calls?.[0]
        const outbound = call?.direction === 'outbound'
        setIsOutbound(outbound)

        if (call) {
          setMuted(call.muted || false)
          setHeld(call.held || false)
        }

        const customerP = data.participants?.find(p => p.purpose === 'customer')

        // Collect attributes from ALL participants (matches mobile fetchScreenPopData)
        const allRawAttrs = {}
        for (const p of (data.participants || [])) {
          Object.assign(allRawAttrs, p.attributes      || {})
          Object.assign(allRawAttrs, p.participantData || {})
        }
        console.log('[CallPage] all raw attribute keys:', Object.keys(allRawAttrs).join(', '))

        // Extract IDs for contact list lookup
        const cidFromAttrs =
          allRawAttrs.dialerContactId     ||
          allRawAttrs.dialercontactid      ||
          allRawAttrs['Dialer.ContactId']  ||
          allRawAttrs.contactId            ||
          allRawAttrs.ContactId            ||
          customerP?.attributes?.dialerContactId || null

        const clid =
          allRawAttrs.dialerContactListId    ||
          allRawAttrs.dialercontactlistid     ||
          allRawAttrs['Dialer.ContactListId'] ||
          allRawAttrs.contactListId           ||
          customerP?.attributes?.dialerContactListId || null

        // contactId from sessionStorage (manual outbound from calling list)
        const cidFromSession = sessionStorage.getItem('callingListContactId') || null
        const cid = cidFromAttrs || cidFromSession
        console.log('[CallPage] contactId:', cid, '| contactListId:', clid)
        setContactId(cid)

        // Start with cleaned conversation attributes
        const clean = {}
        Object.entries(allRawAttrs).forEach(([k, v]) => {
          if (v && !isNoisy(k)) clean[k] = v
        })

        // Fetch contact list record for outbound/dialler calls (matches mobile exactly)
        if (cidFromAttrs && clid) {
          try {
            const cRes = await fetch(
              `${GENESYS_CONFIG.apiBase}/outbound/contactlists/${clid}/contacts/${cidFromAttrs}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (cRes.ok) {
              const cData = await cRes.json()
              console.log('[CallPage] contact list record:', JSON.stringify(cData))
              // Mobile uses cData.data || cData.columnData || cData.fields
              const dataToUse = cData.data || cData.columnData || cData.fields || null
              if (dataToUse) {
                const contactClean = {}
                Object.entries(dataToUse).forEach(([k, v]) => {
                  if (v && !isNoisy(k)) contactClean[k] = v
                })
                // Contact list data takes priority over conversation attrs
                Object.assign(clean, contactClean)
                // Resolve caller name from contact record
                const firstName = dataToUse.firstName || dataToUse.FirstName || ''
                const lastName  = dataToUse.lastName  || dataToUse.LastName  || ''
                const fullName  = firstName && lastName
                  ? `${firstName} ${lastName}`.trim()
                  : dataToUse.name || dataToUse.Name || dataToUse.customerName || ''
                if (fullName && !cancelled) {
                  // Store resolved name in clean attrs for display
                  clean.customerName = fullName
                }
              }
            } else {
              console.warn('[CallPage] contact list fetch failed:', cRes.status)
            }
          } catch (e) {
            console.warn('[CallPage] contact list error:', e.message)
          }
        }

        setScreenPop(clean)

        // Log full participant structure so we can see where queue info lives
        console.log('[CallPage] ALL participants dump:',
          JSON.stringify(data.participants?.map(p => ({
            id: p.id,
            purpose: p.purpose,
            queueName: p.queueName,
            queueId: p.queueId,
            attributes: p.attributes,
            calls: p.calls?.map(c => ({
              id: c.id, state: c.state, direction: c.direction,
              queueId: c.queueId, queueName: c.queueName,
            }))
          })), null, 2)
        )
        console.log('[CallPage] customer attrs:', JSON.stringify(allRawAttrs, null, 2))

        // Queue info — acdP has queueName + queueId directly
        const acdP      = data.participants?.find(p => p.purpose === 'acd')
        const queueName = acdP?.queueName || data.participants?.map(p => p.queueName).find(n => n?.trim()) || ''
        const queueId   = acdP?.queueId   || data.participants?.map(p => p.queueId).find(q => q?.trim())   || ''

        console.log('[CallPage] queueName:', queueName, '| queueId:', queueId)

        if (queueId)   setWrapupQueueId(queueId)
        if (queueName) setWrapupContext(queueName)

        // Outbound campaign: get campaign name from allRawAttrs
        if (!queueName && outbound) {
          const campaignId = allRawAttrs.campaignId || allRawAttrs.dialerCampaignId || allRawAttrs['Dialer.CampaignId'] || null
          if (campaignId) {
            getCampaign(token, campaignId)
              .then(c => { if (!cancelled && c?.name) setWrapupContext(c.name) })
              .catch(() => {})
          }
        }
      } catch (e) {
        console.error('[CallPage] load error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 3000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [token, id])

  const agentP   = convo ? findAgentParticipant(convo.participants || []) : null
  const call     = agentP?.calls?.[0]
  const agentPId = agentP?.id
  const commId   = call?.id   // communication ID for disconnect

  const customerP  = convo?.participants?.find(p => p.purpose === 'customer')
  const rawName = customerP?.name || ''
  // Match mobile resolveCallerName: prefer contact list data, fall back to participant name
  const callerName = isOutbound
    ? (screenPop.customerName || (!isPhoneNumber(rawName) && rawName) || 'Unknown')
    : (isPhoneNumber(rawName)
        ? (screenPop.customerName || 'Unknown Caller')
        : (rawName || screenPop.customerName || 'Unknown Caller'))

  const acdP      = convo?.participants?.find(p => p.purpose === 'acd')
  const queueName = acdP?.queueName || ''
  const startTime = call?.connectedTime || call?.startTime || convo?.startTime
  const elapsed   = useElapsedTimer(startTime)

  // Navigate away when call disconnects (but not while wrapup is open)
  useEffect(() => {
    if (!convo || !agentP || showWrapup) return
    const c = agentP.calls?.[0]
    if (c?.state === 'disconnected' || agentP?.state === 'wrapup') {
      if (!showWrapup) setShowWrapup(true)
    }
  }, [convo, showWrapup])

  // Mute — participant-level, matches mobile muteCall exactly
  const handleMute = async () => {
    if (!agentPId) { addToast('Call not ready', 'error'); return }
    const next = !muted
    try {
      await setMute(token, id, agentPId, next)
      setMuted(next)
      addToast(next ? 'Muted' : 'Unmuted', 'info')
    } catch (e) {
      console.error('[Mute] error:', e.message)
      addToast(`Mute failed: ${e.message}`, 'error')
    }
  }

  // Hold — participant-level { held: true/false }, matches mobile holdCall/resumeCall
  const handleHold = async () => {
    if (!agentPId) { addToast('Call not ready', 'error'); return }
    const next = !held
    try {
      await setHold(token, id, agentPId, next)
      setHeld(next)
      addToast(next ? 'On Hold' : 'Resumed', 'info')
    } catch (e) {
      console.error('[Hold] error:', e.message)
      addToast(`Hold failed: ${e.message}`, 'error')
    }
  }

  // End call — opens wrapup modal, then disconnects on submit (matches mobile)
  const handleEndCall = async () => {
    if (!agentPId) { addToast('Call not ready', 'error'); return }
    try {
      // Disconnect via communication object (matches mobile disconnectCall)
      if (commId) {
        await disconnectCallComm(token, id, agentPId, commId)
      } else {
        await disconnectCallParticipant(token, id, agentPId)
      }
    } catch (e) {
      console.error('[EndCall] disconnect error:', e.message)
      // Still show wrapup even if disconnect fails
    }
    setShowWrapup(true)
  }

  // Wrapup submit — matches mobile handleSubmitWrapup exactly (wrapup + state in one PATCH)
  const handleWrapupSubmit = async (code, notes) => {
    if (!agentPId) { addToast('Call not ready', 'error'); return }
    try {
      await submitWrapup(token, id, agentPId, code, notes)
      if (contactId) {
        console.log('[Wrapup] updating Supabase contactId:', contactId, 'code:', code.name)
        await updateContactAfterCall(contactId, code.name)
          .then(() => console.log('[Wrapup] JSONBin updated OK'))
          .catch(e => console.error('[Wrapup] JSONBin update failed:', e.message))
        sessionStorage.removeItem('callingListContactId')
      } else {
        console.log('[Wrapup] no contactId — skipping Supabase update')
      }
      addToast('Wrap-up submitted', 'success')
      refresh?.()
      navigate('/dashboard', { replace: true })
    } catch (e) {
      console.error('[Wrapup] submit error:', e.message)
      addToast(`Wrap-up failed: ${e.message}`, 'error')
    }
  }

  const handleSkipWrapup = async () => {
    try {
      if (agentPId) await disconnectCallParticipant(token, id, agentPId)
    } catch (e) { console.log('[Skip wrapup]', e.message) }
    refresh?.()
    navigate('/dashboard', { replace: true })
  }

  useKeyboardShortcuts({ mute: handleMute, hold: handleHold, end: handleEndCall })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin"
          style={{ color: 'var(--primary)' }} />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto animate-fade-in">
      {/* Live badge + timer */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="badge px-3 py-1 gap-1.5"
            style={{ background: 'rgba(0,200,150,0.15)', color: 'var(--success)', border: '1px solid rgba(0,200,150,0.3)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-blink" style={{ background: 'var(--success)' }} />
            LIVE
          </div>
          <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{elapsed}</span>
        </div>
        {isOutbound && (
          <span className="badge px-2 py-1 text-xs"
            style={{ background: 'rgba(244,166,35,0.15)', color: 'var(--warning)', border: '1px solid rgba(244,166,35,0.3)' }}>
            Outbound
          </span>
        )}
      </div>

      {/* Caller info */}
      <div className="glass rounded-2xl px-5 py-5 mb-4">
        <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
          {isOutbound ? 'Calling' : 'Caller'}
        </div>
        <div className="text-xl md:text-2xl font-semibold mb-2">{callerName}</div>
        {isOutbound && customerP?.address && (
          <div className="text-sm font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>
            {customerP.address}
          </div>
        )}
        {(queueName || wrapupContext) && (
          <span className="badge text-xs px-2.5 py-1"
            style={{ background: 'rgba(99,153,255,0.12)', color: 'var(--primary)', border: '1px solid rgba(99,153,255,0.25)' }}>
            {queueName || wrapupContext}
          </span>
        )}
        <div className="flex gap-3 mt-2">
          {held  && <div className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>⏸ On Hold</div>}
          {muted && <div className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>🔇 Muted</div>}
        </div>
        {/* Remote phone note — matches mobile UI */}
        <div className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
          🎧 Audio on remote phone
        </div>
      </div>

      {/* Screen pop */}
      {Object.keys(screenPop).length > 0 && (
        <div className="mb-4">
          <ScreenPopCard attributes={screenPop} />
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
        <ControlBtn label={muted ? 'Unmute' : 'Mute'}  icon={muted ? <MuteOffIcon /> : <MuteIcon />} active={muted} onClick={handleMute} shortcut="M" />
        <ControlBtn label={held  ? 'Resume' : 'Hold'}  icon={<HoldIcon />} active={held}  onClick={handleHold} shortcut="H" />
        <ControlBtn label="End Call" icon={<EndIcon />} danger onClick={handleEndCall} shortcut="E" />
      </div>

      {showWrapup && (
        <WrapupModal
          queueName={wrapupContext}
          queueId={wrapupQueueId}
          onSubmit={handleWrapupSubmit}
          onCancel={handleSkipWrapup}
          cancelLabel="Skip"
        />
      )}
    </div>
  )
}

function ControlBtn({ label, icon, onClick, active, danger, shortcut }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl transition-all active:scale-95"
      style={{
        background: danger ? 'rgba(255,59,48,0.15)' : active ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${danger ? 'rgba(255,59,48,0.3)' : active ? 'rgba(245,166,35,0.4)' : 'var(--border)'}`,
        color: danger ? 'var(--danger)' : active ? 'var(--warning)' : 'var(--text)',
      }}>
      {icon}
      <span className="text-xs font-medium">{label}</span>
      {shortcut && (
        <kbd className="text-xs px-1 py-0.5 rounded font-mono opacity-40"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '9px' }}>
          {shortcut}
        </kbd>
      )}
    </button>
  )
}

function MuteIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="currentColor" />
    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
}
function MuteOffIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
}
function HoldIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
  </svg>
}
function EndIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      transform="rotate(135 12 12)" />
  </svg>
}
