import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getQueueWrapupCodes } from '../services/genesysApi.js'

export default function WrapupModal({ queueName, queueId, onSubmit, onCancel, cancelLabel = "Cancel" }) {
  const { token }   = useAuth()
  const [codes, setCodes]       = useState([])
  const [selected, setSelected] = useState(null)
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    getQueueWrapupCodes(token, queueName || '', queueId || '')
      .then(setCodes)
      .catch(() => setCodes([]))
      .finally(() => setLoading(false))
  }, [token, queueName, queueId])

  const handleSubmit = () => {
    if (!selected) return
    onSubmit(selected, notes)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="glass rounded-2xl w-full max-w-md animate-slide-up shadow-2xl mx-4 md:mx-0">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="text-base font-semibold">Wrap-up</div>
          {queueName && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{queueName}</div>
          )}
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading codes…
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto mb-4 pr-1">
              {codes.map((code) => (
                <button
                  key={code.id}
                  onClick={() => setSelected(code)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors"
                  style={{
                    background: selected?.id === code.id ? 'rgba(99,153,255,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selected?.id === code.id ? 'rgba(99,153,255,0.4)' : 'var(--border)'}`,
                  }}
                >
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: selected?.id === code.id ? 'var(--primary)' : 'rgba(255,255,255,0.2)' }}>
                    {selected?.id === code.id && (
                      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
                    )}
                  </div>
                  {code.name}
                </button>
              ))}
              {!codes.length && (
                <div className="text-sm py-2" style={{ color: 'var(--text-secondary)' }}>
                  No wrap-up codes found.
                </div>
              )}
            </div>
          )}

          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Notes (optional)
          </label>
          <textarea
            className="input resize-none text-sm"
            rows={3}
            placeholder="Add call notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onCancel} className="btn btn-ghost flex-1 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="btn btn-primary flex-1 text-sm"
            style={{ opacity: selected ? 1 : 0.4 }}
          >
            Submit Wrap-up
          </button>
        </div>
      </div>
    </div>
  )
}
