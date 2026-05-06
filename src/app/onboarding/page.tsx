'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const CONTINENTS: Record<string, { id: number; name: string }[]> = {
  Europe: [
    { id: 39, name: 'Premier League' }, { id: 140, name: 'La Liga' },
    { id: 135, name: 'Serie A' }, { id: 78, name: 'Bundesliga' },
    { id: 61, name: 'Ligue 1' }, { id: 2, name: 'UEFA Champions League' },
  ],
  Africa: [
    { id: 12, name: 'AFCON' }, { id: 29, name: 'CAF Champions League' },
    { id: 288, name: 'Premier Soccer League (SA)' }, { id: 656, name: 'Zimbabwe PSL' },
  ],
  Americas: [
    { id: 71, name: 'Brasileirao' }, { id: 128, name: 'Liga Profesional (ARG)' },
    { id: 253, name: 'MLS' },
  ],
  Asia: [
    { id: 169, name: 'K-League 1' }, { id: 98, name: 'J1 League' },
  ],
  Oceania: [
    { id: 188, name: 'A-League' },
  ],
}

const MARKETS = [
  'Match Result', 'Both Teams To Score', 'Total Goals', 'Asian Handicap',
  'Correct Score', 'Half Time/Full Time', 'Player Props', 'Corners', 'Cards',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedLeagues, setSelectedLeagues] = useState<number[]>([])
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])
  const [notifications, setNotifications] = useState({
    match_alerts: true,
    expiry_reminders: true,
    weekly_digest: true,
  })
  const [saving, setSaving] = useState(false)

  const toggleLeague = (id: number) => {
    setSelectedLeagues(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    )
  }

  const toggleMarket = (m: string) => {
    setSelectedMarkets(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    )
  }

  const handleComplete = async () => {
    if (selectedLeagues.length === 0) return
    setSaving(true)

    // Use server-side API route (service client) so RLS never blocks this write
    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        favourite_leagues: selectedLeagues,
        preferred_markets: selectedMarkets,
        notification_preferences: notifications,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('Onboarding save failed:', data.error)
      setSaving(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)] logo-pulse flex items-center justify-center mb-4">
            <span className="font-display text-white text-xl">BG</span>
          </div>
          <h1 className="font-display text-2xl tracking-wider text-[var(--text-primary)]">Set up your profile</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Step {step} of 3</p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[var(--bg-tertiary)] rounded-full mb-8">
          <div
            className="h-1 bg-[var(--accent-primary)] rounded-full transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Step 1: Leagues */}
        {step === 1 && (
          <div className="step-animate">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Favourite leagues & continents</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Select at least 1 league. AI will prioritise these in reports.</p>

            {Object.entries(CONTINENTS).map(([continent, leagues]) => (
              <div key={continent} className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{continent}</span>
                  <button
                    onClick={() => {
                      const ids = leagues.map(l => l.id)
                      const allSelected = ids.every(id => selectedLeagues.includes(id))
                      if (allSelected) setSelectedLeagues(prev => prev.filter(id => !ids.includes(id)))
                      else setSelectedLeagues(prev => [...new Set([...prev, ...ids])])
                    }}
                    className="text-xs text-[var(--accent-primary)] hover:underline"
                  >
                    Select all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {leagues.map(league => (
                    <button
                      key={league.id}
                      onClick={() => toggleLeague(league.id)}
                      className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                        selectedLeagues.includes(league.id)
                          ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
                      }`}
                    >
                      {league.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <Button
              size="lg"
              className="w-full mt-4"
              disabled={selectedLeagues.length === 0}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Bet types */}
        {step === 2 && (
          <div className="step-animate">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Preferred bet types</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">AI will prioritise these markets in your reports.</p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {MARKETS.map(market => (
                <button
                  key={market}
                  onClick={() => toggleMarket(market)}
                  className={`px-3 py-2.5 rounded-xl text-sm border text-left transition-colors ${
                    selectedMarkets.includes(market)
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
                  }`}
                >
                  {market}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button size="lg" className="flex-1" onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 3: Notifications */}
        {step === 3 && (
          <div className="step-animate">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Notification preferences</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">SMS alerts via Africa&apos;s Talking. Phone number editable in account.</p>

            <div className="card p-4 flex flex-col gap-4 mb-6">
              {[
                { key: 'match_alerts', label: 'Match alerts', desc: '2 hours before saved matches kick off' },
                { key: 'expiry_reminders', label: 'Subscription reminders', desc: '3 days before expiry' },
                { key: 'weekly_digest', label: 'Weekly top picks', desc: 'Every Sunday morning' },
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{item.label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{item.desc}</div>
                  </div>
                  <div
                    onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                      notifications[item.key as keyof typeof notifications] ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border)]'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      notifications[item.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button size="lg" className="flex-1" loading={saving} onClick={handleComplete}>
                Go to dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
