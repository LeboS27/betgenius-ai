import { createClient, createServiceClient } from '@/lib/supabase/server'
import { MatchCard } from '@/components/match/MatchCard'
import { TopPickHero } from '@/components/match/TopPickHero'
import { ContinentTabs } from '@/components/match/ContinentTabs'
import { BetSlipButton } from '@/components/dashboard/BetSlipButton'

const CONTINENTS = ['All', 'Europe', 'Americas', 'Africa', 'Asia']

// Competition priority order — highest first.
// All are football-data.org free-tier IDs.
const COMPETITION_PRIORITY: Record<number, number> = {
  2001: 1,  // UEFA Champions League
  2146: 2,  // UEFA Europa League
  2021: 3,  // Premier League (England)
  2139: 4,  // UEFA Conference League
  2014: 5,  // La Liga (Spain)
  2002: 6,  // Bundesliga (Germany)
  2019: 7,  // Serie A (Italy)
  2015: 8,  // Ligue 1 (France)
  2003: 9,  // Eredivisie (Netherlands)
  2017: 10, // Primeira Liga (Portugal)
  2016: 11, // Championship (England 2nd tier)
  2013: 12, // Brasileirão (Brazil)
  2152: 13, // Copa Libertadores
  2000: 14, // FIFA World Cup
}

// European continent competition IDs
const CONTINENT_LEAGUES: Record<string, number[]> = {
  Europe: [2001, 2002, 2003, 2014, 2015, 2016, 2017, 2019, 2021, 2139, 2146],
  Americas: [2000, 2013, 2152],
  Africa: [2000],
  Asia: [2000],
}

function sortMatchesByPriority(matches: any[]) {
  return [...matches].sort((a, b) => {
    const pa = COMPETITION_PRIORITY[a.competition_id] ?? 99
    const pb = COMPETITION_PRIORITY[b.competition_id] ?? 99
    if (pa !== pb) return pa - pb
    // Within same competition, sort by kickoff time
    return new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime()
  })
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { continent?: string; q?: string }
}) {
  const supabase = createClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await service.from('profiles').select('*').eq('id', user!.id).single()

  const continent = searchParams.continent || 'All'
  const query = searchParams.q || ''

  // Fetch matches — next 14 days
  const now = new Date().toISOString()
  const in7Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  let matchQuery = service
    .from('matches')
    .select('*')
    .in('status', ['scheduled', 'live'])
    .gte('kickoff_utc', now)
    .lte('kickoff_utc', in7Days)
    .order('kickoff_utc', { ascending: true })
    .limit(150)

  if (continent !== 'All' && CONTINENT_LEAGUES[continent]) {
    matchQuery = matchQuery.in('competition_id', CONTINENT_LEAGUES[continent])
  }

  if (query) {
    matchQuery = matchQuery.or(`home_team.ilike.%${query}%,away_team.ilike.%${query}%,competition.ilike.%${query}%`)
  }

  const { data: rawMatches } = await matchQuery

  // Sort: priority competitions (CL, UEL, EPL…) always at the top
  const matches = rawMatches ? sortMatchesByPriority(rawMatches) : []

  // Fetch cached expert analyses for confidence display
  const matchIds = matches.map(m => m.id)
  const { data: cachedAnalyses } = matchIds.length
    ? await service
        .from('cached_analyses')
        .select('match_id, report, analysis_type')
        .in('match_id', matchIds)
    : { data: [] }

  const confidenceMap: Record<string, number> = {}
  cachedAnalyses?.forEach(ca => {
    const report = ca.report as any
    if (report?.topPick?.confidence) {
      // Prefer expert report confidence, fall back to any cached report
      if (!confidenceMap[ca.match_id] || ca.analysis_type === 'full_expert_report') {
        confidenceMap[ca.match_id] = report.topPick.confidence
      }
    }
  })

  // Top pick — highest-confidence match from today's scheduled matches
  const topPickMatch = matches.find(m => (confidenceMap[m.id] ?? 0) >= 75)

  // Fallback: look 30 days ahead (still date-filtered — never show past games)
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const fallbackMatches = !matches.length ? await service
    .from('matches')
    .select('*')
    .in('status', ['scheduled', 'live'])
    .gte('kickoff_utc', now)
    .lte('kickoff_utc', in30Days)
    .order('kickoff_utc', { ascending: true })
    .limit(20) : null

  // If DB is completely empty of upcoming fixtures, trigger a background refresh
  if (!matches.length && !fallbackMatches?.data?.length) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://betgeniusai.vercel.app'
    const cronSecret = process.env.CRON_SECRET || ''
    fetch(`${appUrl}/api/cron/refresh-matches?secret=${cronSecret}`, { cache: 'no-store' })
      .catch(() => {}) // fire-and-forget, don't block render
  }

  const displayMatches = matches.length ? matches : (fallbackMatches?.data ? sortMatchesByPriority(fallbackMatches.data) : [])

  return (
    <div>
      {/* Top Pick Hero */}
      {topPickMatch && confidenceMap[topPickMatch.id] && (
        <TopPickHero
          match={topPickMatch}
          confidence={confidenceMap[topPickMatch.id]}
          userTier={profile?.tier || 'free'}
        />
      )}

      {/* Header row: Continent tabs + Bet Slip button */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex-1 min-w-0">
          <ContinentTabs continents={CONTINENTS} active={continent} query={query} />
        </div>
        <div className="flex-shrink-0 pt-0.5">
          <BetSlipButton />
        </div>
      </div>

      {/* Match grid */}
      {displayMatches.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">⚽</div>
          <p className="text-[var(--text-secondary)] font-medium">No matches found</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Try a different filter or check back later</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {displayMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              cachedConfidence={confidenceMap[match.id]}
              userTier={profile?.tier || 'free'}
            />
          ))}
        </div>
      )}

      {!matches.length && fallbackMatches?.data?.length && (
        <p className="text-center text-xs text-[var(--text-muted)] mt-4">
          Showing upcoming matches — run /api/admin/refresh-matches to populate today&apos;s fixtures
        </p>
      )}
    </div>
  )
}
