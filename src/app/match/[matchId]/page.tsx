import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { MatchAnalysisView } from '@/components/analysis/MatchAnalysisView'
import Link from 'next/link'

export default async function MatchPage({ params }: { params: { matchId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use service client to bypass RLS for server-side profile fetch
  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('*').eq('id', user.id).single()
  const { data: match } = await service.from('matches').select('*').eq('id', params.matchId).single()
  if (!match) notFound()

  const { data: cached } = await service
    .from('cached_analyses')
    .select('*')
    .eq('match_id', params.matchId)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Back button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to matches
        </Link>
        <MatchAnalysisView match={match} profile={profile} cachedAnalyses={cached || []} />
      </main>
    </div>
  )
}
