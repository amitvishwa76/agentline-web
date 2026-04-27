import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { readContacts } from '../services/supabase.js'
import { getAgentQueues, placeCall } from '../services/genesysApi.js'

export default function CallingListPage() {
  const { token, user }  = useAuth()
  const { addToast }     = useToast()
  const navigate         = useNavigate()
  const { presenceApi }  = useOutletContext()

  const [contacts,  setContacts]  = useState([])
  const [queues,    setQueues]    = useState([])
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [calling,   setCalling]   = useState(null)  // contactId being dialled
  const [queuePicker, setQueuePicker] = useState(null)  // contact waiting for queue pick

  const agentName = user?.name || ''

  const loadContacts = useCallback(async () => {
    if (!agentName) return
    setLoading(true)
    try {
      // Supabase filters by agent_name server-side — much faster than JSONBin
      const contacts = await readContacts(agentName)
      console.log('[CallingList] loaded', contacts.length, 'contacts for', agentName)
      setContacts(contacts)
    } catch (e) {
      console.error('[CallingList] load error:', e.message)
      addToast('Failed to load calling list', 'error')
    }
    finally { setLoading(false) }
  }, [agentName])

  useEffect(() => { loadContacts() }, [loadContacts])

  useEffect(() => {
    if (!token || !user?.id) return
    getAgentQueues(token, user.id)
      .then((d) => {
        console.log('[CallingList] queues:', d)
        setQueues(d?.entities || [])
      })
      .catch((e) => console.error('[CallingList] queue error:', e))
  }, [token, user?.id])

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.customer_name?.toLowerCase().includes(q) ||
      c.account_type?.toLowerCase().includes(q)
    )
  })

  const handleDial = (contact) => {
    if (queues.length === 1) {
      placeCallFor(contact, queues[0].id)
    } else {
      setQueuePicker(contact)
    }
  }

  const placeCallFor = async (contact, queueId) => {
    setQueuePicker(null)
    setCalling(contact.id)
    try {
      const result = await placeCall(token, contact.phone_num, queueId)
      addToast(`Calling ${contact.customer_name}…`, 'success')
      if (result?.id) {
        // Store contact ID so CallPage can write back to JSONBin after wrapup
        sessionStorage.setItem('callingListContactId', contact.id)
        navigate(`/call/${result.id}`)
      }
    } catch (e) {
      addToast(e.message || 'Call failed', 'error')
    } finally {
      setCalling(null)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">My Calling List</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} assigned
          </p>
        </div>
        <button onClick={loadContacts} className="btn btn-ghost text-sm gap-1.5" disabled={loading}>
          {loading
            ? <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
            : <RefreshIcon />
          }
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>
          <SearchIcon />
        </div>
        <input
          className="input pl-9"
          placeholder="Search by name or account type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"
            style={{ color: 'var(--primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl px-5 py-10 text-center">
          <div className="text-3xl mb-2 opacity-30">📋</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {search ? 'No contacts match your search' : 'No contacts assigned to you'}
          </div>
        </div>
      ) : (
        <>
        {/* Desktop table */}
        <div className="hidden md:block glass rounded-xl overflow-hidden">
          <div className="grid px-4 py-2.5 border-b text-xs font-semibold tracking-wide uppercase"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)',
              gridTemplateColumns: '1fr 120px 80px 120px 100px' }}>
            <span>Customer</span>
            <span>Account Type</span>
            <span>Contacted</span>
            <span>Disposition</span>
            <span></span>
          </div>
          {filtered.map((c, i) => (
            <div key={c.id} className="grid px-4 py-3 items-center border-b text-sm"
              style={{ borderColor: 'var(--border)', gridTemplateColumns: '1fr 120px 80px 120px 100px',
                borderBottomWidth: i === filtered.length - 1 ? 0 : 1 }}>
              <span className="font-medium truncate">{c.customer_name}</span>
              <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{c.account_type}</span>
              <span>
                <span className="badge text-xs px-2 py-0.5"
                  style={c.customer_contacted === 'Yes'
                    ? { background: 'rgba(0,200,150,0.15)', color: 'var(--success)', border: '1px solid rgba(0,200,150,0.3)' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {c.customer_contacted === 'Yes' ? 'Yes' : 'No'}
                </span>
              </span>
              <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{c.disposition || '—'}</span>
              <button onClick={() => handleDial(c)} disabled={calling === c.id}
                className="btn btn-success text-xs px-3 py-2 gap-1.5 justify-self-end">
                {calling === c.id
                  ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <MiniPhoneIcon />}
                Dial
              </button>
            </div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-2 md:hidden">
          {filtered.map((c) => (
            <div key={c.id} className="glass rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{c.customer_name}</div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{c.account_type}</div>
                </div>
                <button onClick={() => handleDial(c)} disabled={calling === c.id}
                  className="btn btn-success text-xs px-4 py-2 gap-1.5 shrink-0">
                  {calling === c.id
                    ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <MiniPhoneIcon />}
                  Dial
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge text-xs px-2 py-0.5"
                  style={c.customer_contacted === 'Yes'
                    ? { background: 'rgba(0,200,150,0.15)', color: 'var(--success)', border: '1px solid rgba(0,200,150,0.3)' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {c.customer_contacted === 'Yes' ? 'Contacted' : 'Not contacted'}
                </span>
                {c.disposition && (
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.disposition}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Queue picker modal */}
      {queuePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="glass rounded-2xl w-full max-w-sm animate-slide-up shadow-2xl">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="text-sm font-semibold">Select Queue</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Calling {queuePicker.customer_name}
              </div>
            </div>
            <div className="px-4 py-3 flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {queues.map((q) => (
                <button
                  key={q.id}
                  onClick={() => placeCallFor(queuePicker, q.id)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors hover:bg-white/5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                >
                  {q.name}
                </button>
              ))}
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setQueuePicker(null)}
                className="btn btn-ghost w-full text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
}
function RefreshIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}
function MiniPhoneIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
}
