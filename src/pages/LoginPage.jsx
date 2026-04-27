import { useAuth } from '../context/AuthContext.jsx'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated])

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-6"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background grid */}
      <div className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(99,153,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,153,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(99,153,255,0.08) 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(99,153,255,0.12)', border: '1px solid rgba(99,153,255,0.3)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  fill="var(--primary)" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Agentline</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Genesys Cloud Agent Desktop
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 shadow-2xl">
          <h2 className="text-base font-semibold mb-1">Sign in to get started</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            You'll be redirected to Genesys Cloud to authenticate securely.
          </p>

          <button onClick={login} className="btn btn-primary w-full text-base py-3 gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign in with Genesys
          </button>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs px-2" style={{ color: 'var(--text-secondary)' }}>OAuth 2.0 + PKCE</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>
        </div>

        {/* Region badge */}
        <div className="flex justify-center mt-5">
          <span className="badge text-xs px-3 py-1"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            Region: APS1
          </span>
        </div>
      </div>
    </div>
  )
}
