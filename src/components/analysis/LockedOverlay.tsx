'use client'
import Link from 'next/link'

interface Props {
  type: 'full_report' | 'full_expert_report' | string
  compact?: boolean
}

export function LockedOverlay({ type, compact }: Props) {
  const isPro = type === 'full_expert_report'
  const price = isPro ? '$5/mo' : '$2/mo'
  const tier = isPro ? 'Pro' : 'Premium'

  if (compact) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-sm rounded-xl">
        <Link href="/pricing" className="text-xs bg-[var(--accent-primary)] text-white px-3 py-1.5 rounded-lg">
          Unlock {tier}
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center py-10 px-4">
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4 text-2xl">
        🔒
      </div>
      <h3 className="font-semibold text-[var(--text-primary)] mb-1">{tier} required</h3>
      <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs mx-auto">
        {isPro
          ? 'Every market, tactical breakdown, accumulator builder, player props & PDF export.'
          : 'Top 15 markets, value indicators, risk rating and full match verdict.'}
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 bg-[var(--accent-primary)] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
      >
        Upgrade to {tier} — {price}
      </Link>
    </div>
  )
}
