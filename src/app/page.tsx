import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-[var(--border)] px-4 sm:px-6 h-14 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] logo-pulse flex items-center justify-center">
            <span className="font-display text-white text-sm">BG</span>
          </div>
          <span className="font-display text-lg text-[var(--text-primary)] tracking-wider">
            BetGenius <span className="text-[var(--accent-primary)]">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Log in
          </Link>
          <Link href="/signup" className="text-sm bg-[var(--accent-primary)] text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)]">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] live-pulse" />
          Live match data from 900+ leagues
        </div>

        <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl text-[var(--text-primary)] mb-6 tracking-wide max-w-4xl">
          FOOTBALL ANALYSIS <span className="text-[var(--accent-primary)]">REIMAGINED</span>
        </h1>

        <p className="text-[var(--text-secondary)] text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
          AI-powered match analysis for every league, every market. Confidence scores, value bets,
          accumulator builders — all driven by real data, not hunches.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link href="/signup" className="bg-[var(--accent-primary)] text-white text-base font-medium px-8 py-4 rounded-xl hover:bg-blue-600 transition-colors inline-flex items-center justify-center gap-2">
            Start Free — 4 analyses/day
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link href="/pricing" className="border border-[var(--border)] text-[var(--text-primary)] text-base font-medium px-8 py-4 rounded-xl hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors inline-flex items-center justify-center">
            View Plans
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 sm:gap-12 mb-20">
          {[
            { value: '900+', label: 'Leagues covered' },
            { value: '15+', label: 'Markets per match' },
            { value: '< 5s', label: 'Analysis time' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-3xl sm:text-4xl text-[var(--accent-primary)]">{stat.value}</div>
              <div className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl w-full">
          {[
            {
              icon: '⚡',
              title: 'Quick Pick',
              desc: 'Top recommended selection with confidence % in under 5 seconds.',
              tier: 'Free',
            },
            {
              icon: '📊',
              title: 'Full Report',
              desc: 'Top 15 markets with value flags, risk rating and verdict.',
              tier: 'Premium $2/mo',
            },
            {
              icon: '🔬',
              title: 'Expert Report',
              desc: 'Every market, tactical breakdown, player props, acca builder & PDF.',
              tier: 'Pro $5/mo',
            },
          ].map(feat => (
            <div key={feat.title} className="card p-5 text-left">
              <div className="text-2xl mb-3">{feat.icon}</div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-1">{feat.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">{feat.desc}</p>
              <span className="text-xs text-[var(--accent-primary)] font-medium">{feat.tier}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer footer */}
      <footer className="border-t border-[var(--border)] px-4 py-6 text-center">
        <p className="text-xs text-[var(--text-muted)] max-w-2xl mx-auto">
          ⚠️ BetGenius AI provides statistical analysis and probability assessments for informational purposes only.
          This is not betting advice. Always gamble responsibly. You are solely responsible for your betting decisions.
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Link href="/terms" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Terms of Service</Link>
          <Link href="/privacy" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Privacy Policy</Link>
          <Link href="/pricing" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Pricing</Link>
        </div>
      </footer>
    </main>
  )
}
