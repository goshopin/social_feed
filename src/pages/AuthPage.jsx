import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  function switchMode(next) {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) setError(error.message)
      else setMessage('Check your email for a password reset link.')
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (error) setError(error.message)
      else setMessage('Check your email for a confirmation link!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#6366f1" />
            <path d="M8 22L14 10L20 18L24 14L28 22H8Z" fill="white" fillOpacity="0.9" />
          </svg>
          <span>SocialFeed</span>
        </div>

        {mode === 'forgot' ? (
          <>
            <h2 className="auth-heading">Reset password</h2>
            <p className="auth-sub">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="auth-form">
              <input
                type="email"
                className="input"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
              {error && <p className="form-error">{error}</p>}
              {message && <p className="form-success">{message}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <button type="button" className="auth-back-link" onClick={() => switchMode('login')}>
                ← Back to login
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="auth-heading">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
            <div className="auth-tabs">
              <button
                className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => switchMode('login')}
              >
                Login
              </button>
              <button
                className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => switchMode('signup')}
              >
                Sign Up
              </button>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
              {mode === 'signup' && (
                <input
                  type="text"
                  className="input"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              )}
              <input
                type="email"
                className="input"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                className="input"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {error && <p className="form-error">{error}</p>}
              {message && <p className="form-success">{message}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create Account'}
              </button>
              {mode === 'login' && (
                <button type="button" className="auth-back-link" onClick={() => switchMode('forgot')}>
                  Forgot password?
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}
