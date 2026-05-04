'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const PLANS = {
  premium: { label: 'Premium', price: '$2.00', usd: 2, color: '#2563EB', features: ['Full Report analysis', '30 analyses/month', 'Priority leagues'] },
  pro:     { label: 'Pro',     price: '$5.00', usd: 5, color: '#FACC15', features: ['Expert Report (100+ markets)', 'Unlimited analyses', 'PDF reports + Bet slip builder'] },
}

type Step = 'enter_phone' | 'waiting' | 'success' | 'failed' | 'manual'

function PaymentForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tier = (searchParams.get('tier') || 'premium') as keyof typeof PLANS
  const plan = PLANS[tier] || PLANS.premium

  const [phone, setPhone]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [step, setStep]             = useState<Step>('enter_phone')
  const [error, setError]           = useState('')
  const [confirmedPhone, setPhone2] = useState('')
  const [paymentId, setPaymentId]   = useState('')
  const [manualInfo, setManualInfo] = useState<{ amount: string; merchant: string; reference: string } | null>(null)
  const [secondsLeft, setSecs]      = useState(180)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Countdown timer while waiting ──────────────────────────────────
  useEffect(() => {
    if (step !== 'waiting') return
    setSecs(180)
    const t = setInterval(() => setSecs(s => {
      if (s <= 1) {
        clearInterval(t)
        // Timeout — fall back gracefully
        if (manualInfo) setStep('manual')
        else setStep('failed')
      }
      return Math.max(0, s - 1)
    }), 1000)
    return () => clearInterval(t)
  }, [step]) // eslint-disable-line

  // ── Poll payment status every 3 s ─────────────────────────────────
  useEffect(() => {
    if (step !== 'waiting' || !paymentId) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/subscriptions/payment-status?id=${paymentId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'approved') {
          clearInterval(pollRef.current!)
          setStep('success')
        } else if (data.status === 'failed' || data.status === 'rejected') {
          clearInterval(pollRef.current!)
          setError('Payment was declined or cancelled. Please try again.')
          setStep('failed')
        }
      } catch { /* network hiccup — keep polling */ }
    }, 3000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [step, paymentId])

  // ── Auto-redirect after success ────────────────────────────────────
  useEffect(() => {
    if (step !== 'success') return
    const t = setTimeout(() => router.push('/dashboard'), 3500)
    return () => clearTimeout(t)
  }, [step, router])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ── Initiate payment ───────────────────────────────────────────────
  const initiatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) { setError('Enter your EcoCash number'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/subscriptions/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment initiation failed')

      setPaymentId(data.paymentId)
      setPhone2(data.phone || phone)

      if (data.method === 'push') {
        setStep('waiting')
      } else {
        setManualInfo(data.manual)
        setStep('manual')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUCCESS
  // ─────────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          {/* Animated checkmark */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="font-display text-3xl text-[var(--text-primary)] mb-2 tracking-wide">
            Payment Confirmed!
          </h1>
          <p className="text-[var(--text-secondary)] mb-2">
            Your <span className="font-semibold" style={{ color: plan.color }}>{plan.label}</span> plan is now active.
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-8">Redirecting to dashboard…</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 rounded-2xl bg-[var(--accent-primary)] text-white font-semibold text-base hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard →
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // WAITING — polling for EcoCash PIN confirmation
  // ─────────────────────────────────────────────────────────────────────
  if (step === 'waiting') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="card p-8 text-center">
            {/* Pulsing phone */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <span className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-green-400/30 animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="relative w-20 h-20 rounded-full bg-green-50 border-2 border-green-400 flex items-center justify-center">
                <svg className="w-9 h-9 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <h2 className="font-display text-xl text-[var(--text-primary)] mb-1 tracking-wide">
              Check Your Phone
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              EcoCash payment request sent to
            </p>
            <p className="font-mono text-lg font-bold text-[var(--accent-primary)] mb-5">
              {confirmedPhone}
            </p>

            {/* Steps */}
            <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 text-left mb-6 space-y-2.5">
              {[
                'A popup will appear on your phone',
                'Enter your 4-digit EcoCash PIN',
                'This page will update automatically',
              ].map((txt, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  {txt}
                </div>
              ))}
            </div>

            {/* Live status indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] mb-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Waiting for confirmation…
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-6">
              Expires in <span className="font-mono font-semibold text-[var(--text-secondary)]">{formatTime(secondsLeft)}</span>
            </p>

            <button
              onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStep('enter_phone'); setPhone('') }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline underline-offset-2 transition-colors"
            >
              Wrong number? Start over
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // FAILED
  // ─────────────────────────────────────────────────────────────────────
  if (step === 'failed') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-400 flex items-center justify-center mx-auto mb-5">
            <svg className="w-9 h-9 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="font-display text-xl text-[var(--text-primary)] mb-2">Payment Failed</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {error || 'The payment was not completed. Please try again.'}
          </p>
          <button
            onClick={() => { setStep('enter_phone'); setError(''); setPhone('') }}
            className="w-full py-3.5 rounded-2xl bg-[var(--accent-primary)] text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // MANUAL FALLBACK — only shown if AT push is not configured
  // ─────────────────────────────────────────────────────────────────────
  if (step === 'manual' && manualInfo) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-8">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to pricing
          </Link>

          <div className="card p-6 mb-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">EC</span>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Manual EcoCash Payment</p>
                <p className="text-xs text-[var(--text-muted)]">STK push unavailable — follow steps below</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { label: 'Amount',       value: manualInfo.amount,   mono: true, bold: true },
                { label: 'Pay to',       value: manualInfo.merchant, mono: true, highlight: true },
                { label: 'Reference',    value: manualInfo.reference, mono: true, copy: true },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-[var(--border)] last:border-0">
                  <span className="text-sm text-[var(--text-muted)]">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${row.mono ? 'font-mono' : ''} ${row.bold ? 'font-bold text-[var(--text-primary)]' : ''} ${row.highlight ? 'font-bold text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                      {row.value}
                    </span>
                    {row.copy && (
                      <button
                        onClick={() => navigator.clipboard.writeText(row.value)}
                        className="text-[10px] font-medium text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 px-1.5 py-0.5 rounded hover:bg-[var(--accent-primary)]/5"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-sm space-y-1.5 text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)] text-xs uppercase tracking-wide mb-2">How to pay</p>
              {[
                <>Dial <span className="font-mono text-[var(--text-primary)]">*151*2*1#</span> or open EcoCash app</>,
                <>Choose <em>Send Money</em></>,
                <>Enter merchant: <span className="font-mono text-[var(--text-primary)]">{manualInfo.merchant}</span></>,
                <>Amount: <span className="font-mono text-[var(--text-primary)]">{manualInfo.amount}</span></>,
                <>Reference: <span className="font-mono text-[var(--text-primary)]">{manualInfo.reference}</span> then confirm</>,
              ].map((step, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="text-[var(--accent-primary)] font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={async () => {
              // Poll once to see if admin already activated
              if (paymentId) {
                const r = await fetch(`/api/subscriptions/payment-status?id=${paymentId}`)
                const d = await r.json()
                if (d.status === 'approved') { setStep('success'); return }
              }
              setStep('success') // user declares they've paid — admin activates
            }}
            className="w-full py-4 rounded-2xl bg-[var(--accent-primary)] text-white font-semibold text-base hover:bg-blue-700 transition-colors"
          >
            ✓ I've completed the payment
          </button>
          <p className="text-xs text-[var(--text-muted)] text-center mt-3">
            Activation within 24 hours · SMS confirmation sent
          </p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // ENTER PHONE (default)
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to pricing
        </Link>

        {/* Plan badge */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl tracking-wider text-[var(--text-primary)]">
              Upgrade to <span style={{ color: plan.color }}>{plan.label}</span>
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-0.5">Cancel anytime · Instant activation</p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl text-[var(--accent-primary)]">{plan.price}</p>
            <p className="text-xs text-[var(--text-muted)]">/month</p>
          </div>
        </div>

        {/* What's included */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 mb-6 space-y-2">
          {plan.features.map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {f}
            </div>
          ))}
        </div>

        {/* EcoCash form */}
        <div className="card p-6">
          {/* EcoCash logo / header */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--border)]">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Pay with EcoCash</p>
              <p className="text-xs text-[var(--text-muted)]">A PIN prompt will appear on your phone</p>
            </div>
          </div>

          <form onSubmit={initiatePayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Your EcoCash number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="07X XXX XXXX"
                required
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-base placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] transition-colors"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                Zimbabwe number — e.g. 0777501038
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-[.98] text-white font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Sending request…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Pay {plan.price} with EcoCash
                </>
              )}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-4 mt-5 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure payment
          </span>
          <span>·</span>
          <span>Instant activation</span>
          <span>·</span>
          <span>EcoCash Zimbabwe</span>
        </div>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentForm />
    </Suspense>
  )
}
