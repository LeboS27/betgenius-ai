import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'

export default async function LeaderboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const profile = user ? (await supabase.from('profiles').select('*').eq('id', user.id).single()).data : null

  const service = createServiceClient()

  // Top referrers this month
  const { data: topReferrers } = await service
    .from('referrals')
    .select('referrer_id, profiles!referrer_id(full_name, id)')
    .not('signed_up_at', 'is', null)
    .gte('signed_up_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  // Aggregate by referrer
  const referrerCounts: Record<string, { name: string; count: number }> = {}
  for (const r of topReferrers || []) {
    const prof = r.profiles as any
    const name = prof?.full_name || 'Anonymous'
    const id = r.referrer_id
    if (!referrerCounts[id]) referrerCounts[id] = { name, count: 0 }
    referrerCounts[id].count++
  }

  const ranked = Object.entries(referrerCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-[var(--text-primary)] tracking-wide mb-2">
            TOP <span className="text-[var(--accent-primary)]">REFERRERS</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)]">This month&apos;s top referrers. 3 referrals = 1 month Pro free.</p>
        </div>

        <div className="card overflow-hidden">
          {ranked.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">No referrals this month yet. Be the first!</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {ranked.map(([id, data], i) => (
                <div key={id} className="flex items-center gap-4 px-4 py-3">
                  <span className={`font-display text-2xl w-8 text-center ${
                    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-[var(--text-muted)]'
                  }`}>{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{data.name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-mono">
                    <span className="text-[var(--success)] font-bold">{data.count}</span>
                    <span className="text-[var(--text-muted)]">referrals</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
