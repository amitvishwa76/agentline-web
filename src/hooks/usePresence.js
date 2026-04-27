import { useState, useEffect, useCallback } from 'react'
import { getPresenceDefinitions, setPresence } from '../services/genesysApi.js'
import { useAuth } from '../context/AuthContext.jsx'
import { GENESYS_CONFIG } from '../config/genesys.js'

const PRESENCE_ORDER = ['On Queue', 'Available', 'Away', 'Busy', 'Break', 'Offline']

// Genesys presence definitions have languageLabels for display names,
// with systemPresence as a fallback.
function normaliseDefinition(def) {
  const displayName =
    def.languageLabels?.en_US ||
    def.languageLabels?.['en-US'] ||
    def.name ||
    def.systemPresence ||
    'Unknown'
  return { ...def, name: displayName }
}

export function usePresence() {
  const { token, user } = useAuth()
  const [definitions,     setDefinitions]     = useState([])
  const [currentPresence, setCurrentPresence] = useState(null)
  const [loading,         setLoading]         = useState(false)

  // Load all presence definitions
  useEffect(() => {
    if (!token) return
    getPresenceDefinitions(token)
      .then((data) => {
        console.log('[Presence] raw definitions:', data)
        const all = (data?.entities || []).map(normaliseDefinition)
        const sorted = all.sort((a, b) => {
          const ai = PRESENCE_ORDER.indexOf(a.name)
          const bi = PRESENCE_ORDER.indexOf(b.name)
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
        })
        setDefinitions(sorted)
      })
      .catch((e) => console.error('[Presence] definitions error:', e))
  }, [token])

  // Fetch agent's current presence on load
  useEffect(() => {
    if (!token || !user?.id) return
    fetch(`${GENESYS_CONFIG.apiBase}/users/${user.id}/presences/PURECLOUD`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        console.log('[Presence] current:', data)
        if (data?.presenceDefinition) {
          const def = normaliseDefinition(data.presenceDefinition)
          setCurrentPresence({ id: def.id, name: def.name })
        }
      })
      .catch((e) => console.error('[Presence] current presence error:', e))
  }, [token, user?.id])

  const changePresence = useCallback(async (presenceId, presenceName) => {
    if (!token || !user) return
    setLoading(true)
    try {
      await setPresence(token, user.id, presenceId)
      setCurrentPresence({ id: presenceId, name: presenceName })
    } catch (e) {
      console.error('[Presence] set presence error:', e)
    } finally {
      setLoading(false)
    }
  }, [token, user])

  return { definitions, currentPresence, setCurrentPresence, changePresence, loading }
}
