'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone.startsWith('+263') ? phone : `+263${phone.replace(/^0/, '')}`,
          referral_code: ref,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4 py-10">
      {/* Back to home */}
      <Link href="/" className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Home
      </Link>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)] logo-pulse flex items-center justify-center mb-4">
            <span className="font-display text-white text-xl">BG</span>
          </div>
          <h1 className="font-display text-2xl tracking-wider text-[var(--text-primary)]">Create account</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">4 free analyses per day, no card required</p>
          {ref && (
            <div className="mt-2 px-3 py-1 rounded-full bg-[var(--success)]/10 text-xs text-[var(--success)]">
              Referred by a friend 🎉
            </div>
          )}
        </div>

        <div className="card p-6">
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <Input label="Full name" type="text" placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} required />
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            <Input label="Password" type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            <Input
              label="Zimbabwe phone (+263)"
              type="tel"
              placeholder="0771234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              hint="Required for SMS alerts and account verification"
            />

            {error && (
              <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-4">
          By signing up you agree to our{' '}
          <Link href="/terms" className="text-[var(--accent-primary)] hover:underline">Terms</Link> and{' '}
          <Link href="/privacy" className="text-[var(--accent-primary)] hover:underline">Privacy Policy</Link>
        </p>
        <p className="text-center text-sm text-[var(--text-muted)] mt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--accent-primary)] hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
