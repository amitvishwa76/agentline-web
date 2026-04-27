// Supabase REST API service — replaces jsonbin.js
// Uses the auto-generated REST API (no SDK needed, no extra dependency)

const SUPABASE_URL = 'https://ovviarvxnyilsospbtuc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmlhcnZ4bnlpbHNvc3BidHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzI1NzcsImV4cCI6MjA5MjYwODU3N30.GFzFCbDYulCI_ZgnVVAOez8wNQv5w7z9-I58DNrm81A'

function headers() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  }
}

// Fetch contacts for a specific agent
export async function readContacts(agentName) {
  const url = `${SUPABASE_URL}/rest/v1/contacts?agent_name=eq.${encodeURIComponent(agentName)}&order=customer_name.asc`
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase read failed: ${text}`)
  }
  return res.json()
}

// Update a contact after a call (disposition + contacted status)
export async function updateContactAfterCall(contactId, wrapupCode) {
  const url = `${SUPABASE_URL}/rest/v1/contacts?id=eq.${encodeURIComponent(contactId)}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      ...headers(),
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      customer_contacted: 'Yes',
      disposition: wrapupCode,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase update failed: ${text}`)
  }
  return res.json()
}

// Insert a new contact (optional — for bulk import)
export async function insertContact(contact) {
  const url = `${SUPABASE_URL}/rest/v1/contacts`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers(),
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(contact),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase insert failed: ${text}`)
  }
  return res.json()
}

// Bulk upsert contacts (for migration from JSONBin)
export async function upsertContacts(contacts) {
  const url = `${SUPABASE_URL}/rest/v1/contacts`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers(),
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(contacts),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase upsert failed: ${text}`)
  }
  return res.json()
}
