import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateAnalysis } from '@/lib/claude'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  // Find upcoming matches in next 48h without cached full_report
  const { data: matches } = await service
    .from('matches')
    .select('*')
    .eq('status', 'scheduled')
    .lte('kickoff_utc', in48h)
    .order('kickoff_utc', { ascending: true })
    .limit(20)

  if (!matches?.length) return NextResponse.json({ generated: 0, message: 'No matches to pre-generate' })

  let generated = 0
  let skipped = 0

  for (const match of matches) {
    // Check if already cached and not stale
    const { data: existing } = await service
      .from('cached_analyses')
      .select('id, cache_stale, generated_at')
      .eq('match_id', match.id)
      .eq('analysis_type', 'full_report')
      .single()

    if (existing && !existing.cache_stale) { skipped++; continue }

    try {
      // Build minimal context from stored match data
      const ctx = buildMinimalContext(match)
      const report = await generateAnalysis(ctx, 'full_report')

      await service.from('cached_analyses').upsert({
        match_id: match.id,
        analysis_type: 'full_report',
        report,
        cache_stale: false,
        generated_at: new Date().toISOString(),
        odds_snapshot: match.odds,
      }, { onConflict: 'match_id,analysis_type' })

      generated++

      // Stagger requests to respect rate limits
      await new Promise(r => setTimeout(r, 2000))
    } catch (e) {
      console.error(`Pre-gen failed for ${match.id}:`, e)
    }
  }

  return NextResponse.json({ generated, skipped, timestamp: new Date().toISOString() })
}

function buildMinimalContext(match: any): any {
  return {
    match: {
      id: match.id,
      homeTeam: { name: match.home_team, logo: match.home_team_logo },
      awayTeam: { name: match.away_team, logo: match.away_team_logo },
      competition: match.competition,
      stage: match.stage || 'Regular Season',
      kickoff: match.kickoff_utc,
      venue: match.venue || 'TBC',
    },
    last10Results: { homeTeam: [], awayTeam: [] },
    homeTeamForm: { last5: '', goalsFor: 0, goalsAgainst: 0, cleanSheetRate: 0, bttsRate: 0, over25Rate: 0 },
    awayTeamForm: { last5: '', goalsFor: 0, goalsAgainst: 0, cleanSheetRate: 0, bttsRate: 0, over25Rate: 0 },
    headToHead: { lastMeetings: [], homeTeamWins: 0, awayTeamWins: 0, draws: 0, avgGoalsH2H: 0 },
    standings: {
      homeTeam: (match.standings as any)?.homeTeamStanding || { position: 0, points: 0, gd: 0, form: '' },
      awayTeam: (match.standings as any)?.awayTeamStanding || { position: 0, points: 0, gd: 0, form: '' },
      leaguePhase: 'mid-season',
    },
    injuries: { homeTeamInjuries: [], awayTeamInjuries: [] },
    odds: (match.odds as any[]) || [],
    lineups: [],
    recentNews: [],
    userPreferences: { tier: 'pro', preferredMarkets: [] },
    fatigueFactors: { homeTeamDaysSinceLastMatch: 0, homeTeamMatchesLast30Days: 0, awayTeamDaysSinceLastMatch: 0, awayTeamMatchesLast30Days: 0 },
  }
}
