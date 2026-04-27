import { useState, useEffect, useRef, useCallback } from 'react'
import { getConversations } from '../services/genesysApi.js'
import { useAuth } from '../context/AuthContext.jsx'

export function useConversations() {
  const { token } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const intervalRef                       = useRef(null)

  const fetchConversations = useCallback(async () => {
    if (!token) return
    try {
      const data = await getConversations(token)
      setConversations(data?.entities || [])
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    fetchConversations()
    intervalRef.current = setInterval(fetchConversations, 3000)
    return () => clearInterval(intervalRef.current)
  }, [fetchConversations, token])

  return { conversations, loading, error, refresh: fetchConversations }
}
