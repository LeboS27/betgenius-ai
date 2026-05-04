import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateAnalysis } from '@/lib/claude'
import { AnalysisType } from '@/types/database'
import { MatchAnalysisContext } from '@/types/analysis'
import {
  getMatchHead2Head,
  getTeamRecentMatches,
  getCompetitionStandings,
  buildFormString,
  findTeamStanding,
} from '@/lib/football-api'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const service = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await service.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.is_banned) return NextResponse.json({ error: 'Account restricted' }, { status: 403 })

  const { matchId, type } = await req.json() as { matchId: string; type: AnalysisType }

  // All tiers can run Full Report and Expert Report — free users have a daily cap
  if (profile.tier === 'free') {
    const today = new Date().toDateString()
    const resetDate = profile.analyses_reset ? new Date(profile.analyses_reset).toDateString() : null
    const todayCount = resetDate === today ? (profile.analyses_today ?? 0) : 0
    if (todayCount >= 4) {
      return NextResponse.json({
        error: `You've used your 4 free analyses today. Upgrade to Premium for unlimited access.`,
        limitReached: true,
      }, { status: 429 })
    }
  }

  // Expert analysis always runs fresh — no cache served

  // Fetch match
  const { data: match } = await service.from('matches').select('*').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // Build enriched context — fall back to basic if enrichment fails
  let ctx: MatchAnalysisContext
  let enrichedStandings: any = null
  try {
    const result = await buildEnrichedContext(match, profile)
    ctx = result.ctx
    enrichedStandings = result.standings
  } catch (enrichErr: any) {
    console.error('Enrichment failed, using basic context:', enrichErr?.message)
    ctx = buildBasicContext(match, profile)
  }

  // Write form strings back to the match row so MatchCard can display them
  if (enrichedStandings) {
    await service.from('matches').update({ standings: enrichedStandings }).eq('id', matchId)
  }

  try {
    const report = await generateAnalysis(ctx, type)

    // Cache result
    await service.from('cached_analyses').upsert({
      match_id: matchId,
      analysis_type: type,
      report,
      cache_stale: false,
      generated_at: new Date().toISOString(),
      odds_snapshot: match.odds,
    }, { onConflict: 'match_id,analysis_type' })

    // Log to history
    await service.from('prediction_history').insert({
      user_id: user.id, match_id: matchId, analysis_type: type, report,
    })

    // Increment daily count for free users
    if (profile.tier === 'free') {
      const today = new Date().toDateString()
      const resetDate = profile.analyses_reset ? new Date(profile.analyses_reset).toDateString() : null
      const newCount = (resetDate === today ? profile.analyses_today : 0) + 1
      await service.from('profiles').update({
        analyses_today: newCount,
        analyses_reset: new Date().toISOString(),
      }).eq('id', user.id)
    }

    return NextResponse.json({ report })
  } catch (err: any) {
    console.error('Analysis error:', err)
    const message = process.env.NODE_ENV === 'development'
      ? `Analysis failed: ${err?.message ?? err}`
      : 'Analysis failed. Please try again.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Minimal context used when enrichment API calls fail */
function buildBasicContext(match: any, profile: any): MatchAnalysisContext {
  return {
    match: {
      id: match.id,
      homeTeam: { name: match.home_team, logo: match.home_team_logo },
      awayTeam: { name: match.away_team, logo: match.away_team_logo },
      competition: match.competition,
      stage: match.stage || 'Regular Season',
      kickoff: match.kickoff_utc,
      venue: match.venue || 'Unknown venue',
    },
    last10Results: { homeTeam: [], awayTeam: [] },
    homeTeamForm: { last5: '', goalsFor: 0, goalsAgainst: 0, cleanSheetRate: 0, bttsRate: 0, over25Rate: 0 },
    awayTeamForm: { last5: '', goalsFor: 0, goalsAgainst: 0, cleanSheetRate: 0, bttsRate: 0, over25Rate: 0 },
    headToHead: { lastMeetings: [], homeTeamWins: 0, awayTeamWins: 0, draws: 0, avgGoalsH2H: 0 },
    standings: {
      homeTeam: { position: 0, points: 0, gd: 0, form: '' },
      awayTeam: { position: 0, points: 0, gd: 0, form: '' },
      leaguePhase: match.stage || 'Regular Season',
    },
    injuries: { homeTeamInjuries: [], awayTeamInjuries: [] },
    odds: match.odds || [],
    lineups: [],
    recentNews: [],
    userPreferences: { tier: profile.tier, preferredMarkets: profile.preferred_markets || [] },
    fatigueFactors: { homeTeamDaysSinceLastMatch: 0, homeTeamMatchesLast30Days: 0, awayTeamDaysSinceLastMatch: 0, awayTeamMatchesLast30Days: 0 },
  }
}

async function buildEnrichedContext(match: any, profile: any): Promise<{ ctx: MatchAnalysisContext; standings: any }> {
  const homeTeamId = match.home_team_id
  const awayTeamId = match.away_team_id
  const competitionId = match.competition_id
  const matchNumericId = parseInt(match.id, 10)

  // Fetch enrichment data in parallel — don't let any failure block the analysis
  const [homeMatches, awayMatches, h2hMatches, standings] = await Promise.allSettled([
    homeTeamId ? getTeamRecentMatches(homeTeamId, 10) : Promise.resolve([]),
    awayTeamId ? getTeamRecentMatches(awayTeamId, 10) : Promise.resolve([]),
    matchNumericId ? getMatchHead2Head(matchNumericId) : Promise.resolve([]),
    competitionId ? getCompetitionStandings(competitionId) : Promise.resolve([]),
  ])

  const homeRecentMatches = homeMatches.status === 'fulfilled' ? homeMatches.value : []
  const awayRecentMatches = awayMatches.status === 'fulfilled' ? awayMatches.value : []
  const h2h = h2hMatches.status === 'fulfilled' ? h2hMatches.value : []
  const standingsData = standings.status === 'fulfilled' ? standings.value : []

  // Build form strings
  const homeFormStr = homeTeamId ? buildFormString(homeRecentMatches, homeTeamId) : ''
  const awayFormStr = awayTeamId ? buildFormString(awayRecentMatches, awayTeamId) : ''

  // Build last-10 results
  const mapMatches = (matches: any[], teamId: number) =>
    matches.slice(-10).map((m: any) => {
      const isHome = m.homeTeam?.id === teamId
      const opponent = isHome ? m.awayTeam?.name : m.homeTeam?.name
      const homeG = m.score?.fullTime?.home ?? 0
      const awayG = m.score?.fullTime?.away ?? 0
      const score = `${homeG}-${awayG}`
      let result: 'W' | 'D' | 'L' = 'D'
      if (homeG !== awayG) {
        result = (isHome ? homeG > awayG : awayG > homeG) ? 'W' : 'L'
      }
      return { opponent: opponent ?? 'Unknown', score, result, venue: isHome ? 'home' : 'away' }
    })

  const homeLast10 = homeTeamId ? mapMatches(homeRecentMatches, homeTeamId) : []
  const awayLast10 = awayTeamId ? mapMatches(awayRecentMatches, awayTeamId) : []

  // Calculate form stats
  const calcStats = (matches: any[], teamId: number) => {
    const finished = matches.filter((m: any) => m.status === 'FINISHED')
    if (!finished.length) return { goalsFor: 0, goalsAgainst: 0, cleanSheetRate: 0, bttsRate: 0, over25Rate: 0 }
    let gf = 0, ga = 0, cs = 0, btts = 0, over25 = 0
    for (const m of finished) {
      const isHome = m.homeTeam?.id === teamId
      const hg = m.score?.fullTime?.home ?? 0
      const ag = m.score?.fullTime?.away ?? 0
      gf += isHome ? hg : ag
      ga += isHome ? ag : hg
      if ((isHome ? ag : hg) === 0) cs++
      if (hg > 0 && ag > 0) btts++
      if (hg + ag > 2) over25++
    }
    const n = finished.length
    return {
      goalsFor: parseFloat((gf / n).toFixed(2)),
      goalsAgainst: parseFloat((ga / n).toFixed(2)),
      cleanSheetRate: parseFloat((cs / n).toFixed(2)),
      bttsRate: parseFloat((btts / n).toFixed(2)),
      over25Rate: parseFloat((over25 / n).toFixed(2)),
    }
  }

  const homeStats = calcStats(homeRecentMatches, homeTeamId)
  const awayStats = calcStats(awayRecentMatches, awayTeamId)

  // H2H data
  const h2hMeetings = h2h.slice(0, 5).map((m: any) => ({
    date: m.utcDate?.slice(0, 10) ?? '',
    homeTeam: m.homeTeam?.name ?? '',
    awayTeam: m.awayTeam?.name ?? '',
    score: `${m.score?.fullTime?.home ?? '?'}-${m.score?.fullTime?.away ?? '?'}`,
  }))

  let homeWins = 0, awayWins = 0, draws = 0, totalGoals = 0
  for (const m of h2h) {
    const hg = m.score?.fullTime?.home ?? 0
    const ag = m.score?.fullTime?.away ?? 0
    totalGoals += hg + ag
    if (hg > ag && m.homeTeam?.name === match.home_team) homeWins++
    else if (ag > hg && m.awayTeam?.name === match.away_team) awayWins++
    else draws++
  }

  // Standings
  const homeStanding = homeTeamId ? findTeamStanding(standingsData, homeTeamId) : null
  const awayStanding = awayTeamId ? findTeamStanding(standingsData, awayTeamId) : null

  // Standings object written back to DB so MatchCard form pills populate
  const standingsForDB = (homeStanding || awayStanding) ? {
    homeTeam: {
      form: homeFormStr,
      ...(homeStanding ?? { position: 0, points: 0, gd: 0 }),
    },
    awayTeam: {
      form: awayFormStr,
      ...(awayStanding ?? { position: 0, points: 0, gd: 0 }),
    },
  } : null

  const ctx: MatchAnalysisContext = {
    match: {
      id: match.id,
      homeTeam: { name: match.home_team, logo: match.home_team_logo },
      awayTeam: { name: match.away_team, logo: match.away_team_logo },
      competition: match.competition,
      stage: match.stage || 'Regular Season',
      kickoff: match.kickoff_utc,
      venue: match.venue || 'Unknown venue',
    },
    last10Results: {
      homeTeam: homeLast10,
      awayTeam: awayLast10,
    },
    homeTeamForm: {
      last5: homeFormStr,
      ...homeStats,
    },
    awayTeamForm: {
      last5: awayFormStr,
      ...awayStats,
    },
    headToHead: {
      lastMeetings: h2hMeetings,
      homeTeamWins: homeWins,
      awayTeamWins: awayWins,
      draws,
      avgGoalsH2H: h2h.length ? parseFloat((totalGoals / h2h.length).toFixed(2)) : 0,
    },
    standings: {
      homeTeam: homeStanding ?? { position: 0, points: 0, gd: 0, form: '' },
      awayTeam: awayStanding ?? { position: 0, points: 0, gd: 0, form: '' },
      leaguePhase: match.stage || 'mid-table',
    },
    injuries: {
      homeTeamInjuries: [],
      awayTeamInjuries: [],
    },
    odds: match.odds || [],
    lineups: match.lineups_available ? ['Lineups available'] : [],
    recentNews: [],
    userPreferences: {
      tier: profile.tier,
      preferredMarkets: profile.preferred_markets || [],
    },
    fatigueFactors: {
      homeTeamDaysSinceLastMatch: homeRecentMatches.length
        ? Math.floor((Date.now() - new Date(homeRecentMatches[homeRecentMatches.length - 1]?.utcDate ?? Date.now()).getTime()) / 86400000)
        : 0,
      homeTeamMatchesLast30Days: homeRecentMatches.filter((m: any) => {
        const d = new Date(m.utcDate ?? 0)
        return Date.now() - d.getTime() < 30 * 86400000
      }).length,
      awayTeamDaysSinceLastMatch: awayRecentMatches.length
        ? Math.floor((Date.now() - new Date(awayRecentMatches[awayRecentMatches.length - 1]?.utcDate ?? Date.now()).getTime()) / 86400000)
        : 0,
      awayTeamMatchesLast30Days: awayRecentMatches.filter((m: any) => {
        const d = new Date(m.utcDate ?? 0)
        return Date.now() - d.getTime() < 30 * 86400000
      }).length,
    },
  }

  return { ctx, standings: standingsForDB }
}
