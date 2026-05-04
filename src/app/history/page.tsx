import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import Link from 'next/link'
import { ConfidenceBadge } from '@/components/ui/Badge'

export default async function HistoryPage() {
  const supabase = createClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use service client to bypass RLS for profile and history reads
  const { data: profile } = await service.from('profiles').select('*').eq('id', user.id).single()

  const limit = profile?.tier === 'free' ? 20 : profile?.tier === 'premium' ? 50 : 200
  const since = profile?.tier === 'premium'
    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    : undefined

  let query = service
    .from('prediction_history')
    .select('*, matches(home_team, away_team, competition, kickoff_utc, home_team_logo, away_team_logo)')
    .eq('user_id', user.id)
    .order('viewed_at', { ascending: false })
    .limit(limit)

  if (since) query = query.gte('viewed_at', since)

  const { data: history } = await query

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Back button */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to matches
        </Link>
        <h1 className="font-display text-2xl tracking-wider text-[var(--text-primary)] mb-6">
          Prediction <span className="text-[var(--accent-primary)]">History</span>
        </h1>

        {profile?.tier === 'free' && (
          <div className="card p-4 mb-4 border-[var(--warning)]/30 bg-[var(--warning)]/5">
            <p className="text-sm text-[var(--warning)]">
              Free plan — 4 analyses/day. <Link href="/pricing" className="underline">Upgrade</Link> for unlimited access.
            </p>
          </div>
        )}

        {!history?.length ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-[var(--text-secondary)]">No analyses yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Go to the dashboard and run your first analysis</p>
            <Link href="/dashboard" className="inline-block mt-4">
              <button className="bg-[var(--accent-primary)] text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
                Browse matches
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry: any) => {
              const report = entry.report as any
              const match = entry.matches as any
              const typeLabel = { quick_pick: '⚡ Quick', full_report: '📊 Full', full_expert_report: '🔬 Expert Analysis' }[entry.analysis_type as string] || entry.analysis_type

              return (
                <Link key={entry.id} href={`/match/${entry.match_id}`}>
                  <div className="card p-4 hover:border-[var(--accent-primary)]/40 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[var(--text-muted)]">
                        {match?.competition} · {new Date(entry.viewed_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">{typeLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {match?.home_team} vs {match?.away_team}
                        </p>
                        {report?.topPick && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            Top pick: <span className="text-[var(--accent-primary)]">{report.topPick.selection}</span>
                          </p>
                        )}
                      </div>
                      {report?.topPick?.confidence && (
                        <ConfidenceBadge confidence={report.topPick.confidence} size="sm" />
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
