// One-time migration tool — JSONBin → Supabase
// Visit /migrate after setting up Supabase, then delete this file

import { useState } from 'react'
import { JSONBIN_CONFIG } from '../config/jsonbin.js'
import { upsertContacts } from '../services/supabase.js'

export default function MigratePage() {
  const [status, setStatus]   = useState('')
  const [done,   setDone]     = useState(false)
  const [error,  setError]    = useState(null)
  const [preview, setPreview] = useState(null)

  const handleFetch = async () => {
    setStatus('Reading from JSONBin...')
    setError(null)
    try {
      const res = await fetch(JSONBIN_CONFIG.baseUrl, {
        headers: {
          'X-Master-Key': JSONBIN_CONFIG.apiKey,
          'X-Bin-Meta': 'false',
        },
      })
      if (!res.ok) throw new Error(`JSONBin read failed: ${res.status}`)
      const data = await res.json()
      const contacts = data.contacts || []
      setPreview(contacts)
      setStatus(`Found ${contacts.length} contacts. Click Migrate to insert into Supabase.`)
    } catch (e) {
      setError(e.message)
      setStatus('')
    }
  }

  const handleMigrate = async () => {
    if (!preview?.length) return
    setStatus('Migrating to Supabase...')
    try {
      await upsertContacts(preview)
      setStatus(`✅ Successfully migrated ${preview.length} contacts to Supabase!`)
      setDone(true)
    } catch (e) {
      setError(e.message)
      setStatus('')
    }
  }

  return (
    <div className="p-8 max-w-xl mx-auto animate-fade-in">
      <h1 className="text-xl font-semibold mb-2">JSONBin → Supabase Migration</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        One-time tool. Delete <code>MigratePage.jsx</code> and the route after use.
      </p>

      <div className="glass rounded-xl p-5 mb-4">
        <div className="flex gap-3 mb-4">
          <button onClick={handleFetch} className="btn btn-ghost text-sm" disabled={done}>
            1. Fetch from JSONBin
          </button>
          <button
            onClick={handleMigrate}
            className="btn btn-primary text-sm"
            disabled={!preview || done}
          >
            2. Migrate to Supabase
          </button>
        </div>

        {status && (
          <div className="text-sm py-2 px-3 rounded-lg mb-3"
            style={{ background: done ? 'rgba(0,200,150,0.1)' : 'rgba(255,255,255,0.05)',
                     color: done ? 'var(--success)' : 'var(--text)' }}>
            {status}
          </div>
        )}

        {error && (
          <div className="text-sm py-2 px-3 rounded-lg mb-3"
            style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--danger)' }}>
            Error: {error}
          </div>
        )}

        {preview && (
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Preview ({preview.length} contacts):
            <div className="mt-2 max-h-48 overflow-y-auto font-mono text-xs"
              style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
              {preview.slice(0, 5).map((c, i) => (
                <div key={i}>{c.customer_name} | {c.agent_name} | {c.customer_contacted}</div>
              ))}
              {preview.length > 5 && <div>...and {preview.length - 5} more</div>}
            </div>
          </div>
        )}
      </div>

      {done && (
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Migration complete. You can now delete <code>/migrate</code> route and <code>MigratePage.jsx</code>.
        </div>
      )}
    </div>
  )
}
