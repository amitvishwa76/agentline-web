import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { exchangeCodeForToken } from '../services/genesysApi.js'

export default function CallbackPage() {
  const { saveSession } = useAuth()
  const navigate        = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const code     = params.get('code')
    const verifier = localStorage.getItem('pkce_verifier')

    if (!code || !verifier) {
      setError('Missing OAuth code or verifier. Please try signing in again.')
      return
    }

    localStorage.removeItem('pkce_verifier')

    exchangeCodeForToken(code, verifier)
      .then(({ access_token }) => saveSession(access_token))
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((e) => setError(e.message || 'Authentication failed. Please try again.'))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="glass rounded-2xl p-6 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-base font-semibold mb-2">Authentication Error</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary w-full">
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-current border-t-transparent rounded-full animate-spin"
          style={{ color: 'var(--primary)' }} />
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Signing you in…</div>
      </div>
    </div>
  )
}
