import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { getAgentQueues, placeCall } from '../services/genesysApi.js'
import Dialpad from '../components/Dialpad.jsx'

export default function DialpadPage() {
  const { token, user }   = useAuth()
  const { addToast }      = useToast()
  const navigate          = useNavigate()
  const { presenceApi }   = useOutletContext()

  const [number,  setNumber]  = useState('')
  const [queues,  setQueues]  = useState([])
  const [queueId, setQueueId] = useState('')
  const [calling, setCalling] = useState(false)
  const [queueError, setQueueError] = useState(null)

  const { currentPresence } = presenceApi
  const isOnQueue = currentPresence?.name === 'On Queue'

  useEffect(() => {
    if (!token || !user?.id) return
    getAgentQueues(token, user.id)
      .then((data) => {
        console.log('[Queues] raw response:', data)
        // Genesys returns { entities: [...] } — each entity has id and name
        const q = data?.entities || []
        console.log('[Queues] entities:', q)
        setQueues(q)
        if (q.length) setQueueId(q[0].id)
        else setQueueError('No queues found. Ensure you are joined to at least one queue in Genesys.')
      })
      .catch((e) => {
        console.error('[Queues] error:', e)
        setQueueError(e.message)
      })
  }, [token, user?.id])

  const handleKey = (key) => setNumber((n) => n + key)
  const handleBackspace = () => setNumber((n) => n.slice(0, -1))

  const handleCall = async () => {
    if (!number.trim() || !queueId || calling) return
    setCalling(true)
    try {
      const result = await placeCall(token, number.trim(), queueId)
      addToast(`Calling ${number}…`, 'success')
      if (result?.id) navigate(`/call/${result.id}`)
    } catch (e) {
      console.error('[Dial] place call error:', e)
      addToast(e.message || 'Failed to place call', 'error')
    } finally {
      setCalling(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-sm mx-auto animate-fade-in">
      <h1 className="text-lg font-semibold mb-6">Dialpad</h1>

      {/* Presence warning */}
      {!isOnQueue && (
        <div className="glass rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5"
          style={{ border: '1px solid rgba(245,166,35,0.3)', background: 'rgba(245,166,35,0.08)' }}>
          <span style={{ color: 'var(--warning)' }}>⚠️</span>
          <span className="text-sm" style={{ color: 'var(--warning)' }}>
            Set presence to <strong>On Queue</strong> before placing calls.
          </span>
        </div>
      )}

      {/* Number display */}
      <div className="glass rounded-xl px-4 py-4 mb-4 text-center">
        <div className="font-mono text-2xl tracking-widest min-h-[2rem]"
          style={{ color: number ? 'var(--text)' : 'var(--text-secondary)' }}>
          {number || <span className="opacity-30">Enter number</span>}
        </div>
      </div>

      {/* Queue selector */}
      <div className="mb-4">
        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Call from queue
        </label>
        {queueError ? (
          <div className="text-xs px-3 py-2 rounded-lg"
            style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--danger)', border: '1px solid rgba(255,59,48,0.25)' }}>
            {queueError}
          </div>
        ) : queues.length === 0 ? (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            Loading queues…
          </div>
        ) : (
          <select
            className="input text-sm"
            value={queueId}
            onChange={(e) => setQueueId(e.target.value)}
          >
            {queues.map((q) => (
              <option key={q.id} value={q.id}>{q.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Dialpad */}
      <div className="mb-4">
        <Dialpad onKey={handleKey} onBackspace={handleBackspace} />
      </div>

      {/* Call button */}
      <button
        onClick={handleCall}
        disabled={!number.trim() || !queueId || calling}
        className="btn btn-success w-full py-4 text-base gap-2"
        style={{ opacity: number.trim() && queueId ? 1 : 0.4 }}
      >
        {calling ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <PhoneIcon />
        )}
        {calling ? 'Placing call…' : 'Call'}
      </button>
    </div>
  )
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}
