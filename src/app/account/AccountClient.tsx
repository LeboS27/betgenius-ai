'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Profile, Subscription } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TierBadge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  profile: Profile | null
  subscription: Subscription | null
  referralCount: number
  convertedCount: number
}

// Always use the real deployed origin so referral links never show localhost
const getAppUrl = () => {
  if (typeof window !== 'undefined') {
    // Use the current host — works correctly in both dev and production
    const { protocol, hostname, port } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // In dev, use the configured app URL (Vercel / ngrok etc.)
      return process.env.NEXT_PUBLIC_APP_URL || `${protocol}//${hostname}${port ? ':' + port : ''}`
    }
    return `${protocol}//${hostname}`
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://betgeniusai.vercel.app'
}

export function AccountClient({ profile, subscription, referralCount, convertedCount }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [liteMode, setLiteMode] = useState(profile?.lite_mode || false)

  // If profile failed to load show a simple error state
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-[var(--text-secondary)]">Could not load account details.</p>
        <Button size="sm" onClick={() => router.refresh()}>Retry</Button>
      </div>
    )
  }

  const referralCode = profile.id.slice(0, 8).toUpperCase()
  const referralLink = `${getAppUrl()}/ref/${referralCode}`

  const saveProfile = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const sendOtp = async () => {
    setOtpSending(true)
    setOtpError('')
    const res = await fetch('/api/auth/verify-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, action: 'send' }),
    })
    const data = await res.json()
    setOtpSending(false)
    if (res.ok) {
      setOtpSent(true)
    } else {
      setOtpError(data.error || 'Failed to send OTP')
    }
  }

  const verifyOtp = async () => {
    setVerifying(true)
    setOtpError('')
    const res = await fetch('/api/auth/verify-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, action: 'verify' }),
    })
    const data = await res.json()
    setVerifying(false)
    if (res.ok) {
      setOtpSent(false)
      router.refresh()
    } else {
      setOtpError(data.error || 'Verification failed')
    }
  }

  const changePassword = async () => {
    setPwSaving(true)
    await supabase.auth.updateUser({ password: newPw })
    setPwSaving(false)
    setNewPw('')
  }

  const updateLiteMode = async (val: boolean) => {
    setLiteMode(val)
    await supabase.from('profiles').update({ lite_mode: val }).eq('id', profile.id)
  }

  const deleteAccount = async () => {
    if (!confirm('Are you sure? This will anonymise your data and remove access.')) return
    await supabase.from('profiles').update({ is_banned: true }).eq('id', profile.id)
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-wider text-[var(--text-primary)]">Account</h1>
        <TierBadge tier={profile.tier} />
      </div>

      {/* Profile */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Profile</h2>
        <div className="space-y-4">
          <Input label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
          <Input label="Email" value={profile.email} disabled hint="Email cannot be changed" />
          <Button size="md" onClick={saveProfile} loading={saving}>
            {saved ? '✓ Saved' : 'Save changes'}
          </Button>
        </div>
      </div>

      {/* Phone verification */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Phone number
          {profile.phone_verified && <span className="ml-2 text-xs text-[var(--success)]">✓ Verified</span>}
        </h2>
        <div className="space-y-3">
          <Input
            label="Zimbabwe phone (+263)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="0771234567"
          />
          {!otpSent ? (
            <Button variant="secondary" size="sm" onClick={sendOtp} loading={otpSending}>
              Send OTP via SMS
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input placeholder="6-digit code" value={otp} onChange={e => setOtp(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={verifyOtp} loading={verifying}>Verify</Button>
              </div>
              <button onClick={() => { setOtpSent(false); setOtpError('') }} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                ← Resend code
              </button>
            </div>
          )}
          {otpError && (
            <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded-lg">{otpError}</p>
          )}
        </div>
      </div>

      {/* Subscription */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Subscription</h2>
        {subscription ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Plan</span>
              <TierBadge tier={subscription.tier} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Expires</span>
              <span className="text-[var(--text-primary)]">{new Date(subscription.expires_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Status</span>
              <span className="text-[var(--success)]">Active</span>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-3">Free plan — 4 analyses/day</p>
            <Link href="/pricing">
              <Button size="sm">Upgrade Plan</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Referral */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Referral programme</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">Refer 3 friends who sign up → get 1 month Pro free</p>
        <div className="bg-[var(--bg-tertiary)] rounded-xl px-3 py-2 font-mono text-sm text-[var(--text-primary)] mb-3 flex items-center justify-between">
          <span className="truncate">{referralLink}</span>
          <button
            onClick={() => navigator.clipboard.writeText(referralLink)}
            className="text-[var(--accent-primary)] text-xs ml-2 flex-shrink-0"
          >Copy</button>
        </div>
        <div className="flex gap-4 text-sm">
          <div><span className="text-[var(--text-muted)]">Signups: </span><span className="font-semibold text-[var(--text-primary)]">{referralCount}</span></div>
          <div><span className="text-[var(--text-muted)]">Converted: </span><span className="font-semibold text-[var(--success)]">{convertedCount}</span></div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Preferences</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[var(--text-primary)]">Lite mode</div>
            <div className="text-xs text-[var(--text-muted)]">Reduces animations for low bandwidth</div>
          </div>
          <div
            onClick={() => updateLiteMode(!liteMode)}
            className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${liteMode ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border)]'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${liteMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Change password</h2>
        <div className="space-y-3">
          <Input label="New password" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 characters" />
          <Button size="sm" onClick={changePassword} loading={pwSaving} disabled={newPw.length < 8}>
            Update password
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-5 border-[var(--danger)]/20">
        <h2 className="text-sm font-semibold text-[var(--danger)] mb-3">Danger zone</h2>
        <Button variant="danger" size="sm" onClick={deleteAccount}>
          Delete account
        </Button>
        <p className="text-xs text-[var(--text-muted)] mt-2">Data anonymised and retained for AI training.</p>
      </div>
    </div>
  )
}
