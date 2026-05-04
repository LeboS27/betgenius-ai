import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { TierBadge } from '@/components/ui/Badge'

const FEATURES = [
  { name: 'Analyses per day', free: '4 (resets midnight CAT)', premium: 'Unlimited', pro: 'Unlimited' },
  { name: 'Expert Analysis (100+ markets)', free: true, premium: true, pro: true },
  { name: 'All market categories', free: true, premium: true, pro: true },
  { name: 'Top Pick + Verdict', free: true, premium: true, pro: true },
  { name: 'Key Insights', free: true, premium: true, pro: true },
  { name: 'Value Bet Indicators', free: true, premium: true, pro: true },
  { name: 'Correct Score Top 3', free: true, premium: true, pro: true },
  { name: 'Player Props Analysis', free: true, premium: true, pro: true },
  { name: 'WhatsApp Share', free: true, premium: true, pro: true },
  { name: 'SMS Alerts', free: false, premium: true, pro: true },
  { name: 'Analysis History', free: 'Last 20', premium: 'Last 30 days', pro: 'Full unlimited history' },
  { name: 'Accumulator Builder', free: false, premium: true, pro: true },
  { name: 'PDF Download', free: false, premium: false, pro: true },
  { name: 'Priority support', free: false, premium: false, pro: true },
]

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <span className="text-[var(--success)]">✓</span>
  if (value === false) return <span className="text-[var(--danger)]">✗</span>
  return <span className="text-xs text-[var(--text-secondary)]">{value}</span>
}

export default async function PricingPage() {
  const supabase = createClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Use service client so profile loads even under RLS
  const profile = user
    ? (await service.from('profiles').select('*').eq('id', user.id).single()).data
    : null

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar profile={profile} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-20">

        {/* Back button */}
        <Link
          href={user ? '/dashboard' : '/'}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {user ? 'Back to matches' : 'Back to home'}
        </Link>

        <div className="text-center mb-12">
          <h1 className="font-display text-4xl sm:text-5xl text-[var(--text-primary)] mb-3 tracking-wide">
            SIMPLE <span className="text-[var(--accent-primary)]">PRICING</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
            Every plan includes full Expert Analysis — 100+ markets per match. Upgrade for unlimited analyses and extra features.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            {
              tier: 'free' as const,
              price: '$0',
              period: 'forever',
              headline: 'Try it out',
              features: [
                '4 Expert Analyses per day',
                'All 100+ markets covered',
                'All global leagues',
                'WhatsApp share',
              ],
              cta: user ? (profile?.tier === 'free' ? 'Current plan' : null) : 'Get started free',
              ctaHref: user ? null : '/signup',
              highlight: false,
            },
            {
              tier: 'premium' as const,
              price: '$2',
              period: '/month',
              headline: 'For serious punters',
              features: [
                'Unlimited Expert Analyses',
                'SMS alerts on top picks',
                '30-day analysis history',
                'Accumulator builder',
                'Value bet indicators',
              ],
              cta: profile?.tier === 'premium' ? 'Current plan' : 'Upgrade to Premium',
              ctaHref: user ? '/payment?tier=premium' : '/signup',
              highlight: true,
            },
            {
              tier: 'pro' as const,
              price: '$5',
              period: '/month',
              headline: 'Full power',
              features: [
                'Everything in Premium',
                'Full unlimited history',
                'PDF export',
                'Priority support',
              ],
              cta: profile?.tier === 'pro' ? 'Current plan' : 'Upgrade to Pro',
              ctaHref: user ? '/payment?tier=pro' : '/signup',
              highlight: false,
            },
          ].map(plan => (
            <div key={plan.tier} className={`card p-6 flex flex-col ${plan.highlight ? 'border-[var(--accent-primary)]/60 ring-1 ring-[var(--accent-primary)]/30' : ''}`}>
              {plan.highlight && (
                <div className="text-xs text-center text-[var(--accent-primary)] font-medium mb-3 -mt-2">Most popular</div>
              )}
              <TierBadge tier={plan.tier} />
              <div className="mt-4 mb-1">
                <span className="font-display text-4xl text-[var(--text-primary)]">{plan.price}</span>
                <span className="text-[var(--text-muted)] text-sm ml-1">{plan.period}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-5">{plan.headline}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <span className="text-[var(--success)] flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.cta && plan.ctaHref ? (
                <Link
                  href={plan.ctaHref}
                  className={`text-center py-3 rounded-xl text-sm font-medium transition-colors ${
                    plan.highlight
                      ? 'bg-[var(--accent-primary)] text-white hover:bg-blue-600'
                      : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : plan.cta ? (
                <div className="text-center py-3 rounded-xl text-sm font-medium text-[var(--success)] bg-[var(--success)]/10">
                  {plan.cta}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Feature comparison table */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Full feature comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">Feature</th>
                  <th className="text-center px-4 py-3 text-[var(--text-muted)] font-medium">Free</th>
                  <th className="text-center px-4 py-3 text-[var(--accent-primary)] font-medium">Premium</th>
                  <th className="text-center px-4 py-3 text-yellow-400 font-medium">Pro</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feat, i) => (
                  <tr key={feat.name} className={`border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? '' : 'bg-[var(--bg-secondary)]'}`}>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{feat.name}</td>
                    <td className="px-4 py-3 text-center"><Cell value={feat.free} /></td>
                    <td className="px-4 py-3 text-center"><Cell value={feat.premium} /></td>
                    <td className="px-4 py-3 text-center"><Cell value={feat.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-8">
          Payments processed via EcoCash Zimbabwe. Instant activation after payment confirmation.
        </p>
      </main>
    </div>
  )
}
