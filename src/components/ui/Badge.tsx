'use client'

interface BadgeProps {
  confidence: number
  size?: 'sm' | 'md' | 'lg'
}

export function ConfidenceBadge({ confidence, size = 'md' }: BadgeProps) {
  const color =
    confidence >= 75 ? 'text-[var(--success)] border-[var(--success)]' :
    confidence >= 55 ? 'text-[var(--warning)] border-[var(--warning)]' :
    'text-[var(--text-muted)] border-[var(--text-muted)]'

  const label =
    confidence >= 75 ? 'Strong Edge' :
    confidence >= 55 ? 'Moderate Edge' :
    'No Clear Edge'

  const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1', lg: 'text-base px-4 py-1.5' }

  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full font-mono font-medium ${color} ${sizes[size]}`}>
      <span className={`w-2 h-2 rounded-full ${
        confidence >= 75 ? 'bg-[var(--success)]' :
        confidence >= 55 ? 'bg-[var(--warning)]' :
        'bg-[var(--text-muted)]'
      }`} />
      {confidence}% · {label}
    </span>
  )
}

interface TierBadgeProps {
  tier: 'free' | 'premium' | 'pro'
}

export function TierBadge({ tier }: TierBadgeProps) {
  const styles = {
    free: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
    premium: 'bg-blue-500/20 text-blue-400',
    pro: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${styles[tier]}`}>
      {tier}
    </span>
  )
}

interface RiskBadgeProps {
  rating: 'safe' | 'medium' | 'risky'
}

export function RiskBadge({ rating }: RiskBadgeProps) {
  const styles = {
    safe: 'bg-[var(--success)]/10 text-[var(--success)]',
    medium: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    risky: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  }
  const labels = { safe: 'Safe', medium: 'Medium Risk', risky: 'High Risk' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[rating]}`}>
      {labels[rating]}
    </span>
  )
}
