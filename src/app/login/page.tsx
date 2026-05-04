'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const FRIENDLY_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password. Use "Forgot password?" below to reset it.',
  'Email not confirmed': 'Please confirm your email first — check your inbox for a verification link.',
  'Too many requests': 'Too many attempts. Please wait a few minutes and try again.',
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(FRIENDLY_ERRORS[error.message] || error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email address above first, then click Forgot password.'); return }
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setResetLoading(false)
    setResetSent(true)
    setError('')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      {/* Back to home */}
      <Link href="/" className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Home
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)] logo-pulse flex items-center justify-center mb-4">
            <span className="font-display text-white text-xl">BG</span>
          </div>
          <h1 className="font-display text-2xl tracking-wider text-[var(--text-primary)]">BetGenius AI</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Welcome back</p>
        </div>

        <div className="card p-6">
          {resetSent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">📧</div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Reset link sent</p>
              <p className="text-xs text-[var(--text-muted)]">Check your inbox for <strong>{email}</strong> and click the link to set a new password.</p>
              <button onClick={() => setResetSent(false)} className="text-xs text-[var(--accent-primary)] mt-4 hover:underline">
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              {error && (
                <div className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded-lg border border-[var(--danger)]/20">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Log in
              </Button>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-xs text-[var(--accent-primary)] hover:underline text-center disabled:opacity-50"
              >
                {resetLoading ? 'Sending…' : 'Forgot password?'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-[var(--text-muted)] mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[var(--accent-primary)] hover:underline font-medium">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
