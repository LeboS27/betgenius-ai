/**
 * football-data.org API v4
 * Free tier: 10 req/min, covers PL, La Liga, Bundesliga, Serie A, Ligue 1, UCL, UEL
 * Auth: X-Auth-Token header
 */

const BASE_URL = 'https://api.football-data.org/v4'

// football-data.org competition IDs → maps to our competition_id field
export const COMPETITION_IDS = [2021, 2014, 2002, 2019, 2015, 2001, 2146]
// 2021=PL, 2014=La Liga, 2002=Bundesliga, 2019=Serie A, 2015=Ligue 1, 2001=UCL, 2146=UEL

async function apiFetch(path: string) {
  const key = process.env.FOOTBALL_DATA_API_KEY
  if (!key) {
    console.warn('FOOTBALL_DATA_API_KEY not set — skipping football API call')
    return null
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'X-Auth-Token': key },
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error(`football-data.org ${res.status} for ${path}:`, body)
      return null
    }
    return res.json()
  } catch (err) {
    console.error('football-data.org fetch failed:', err)
    return null
  }
}

/** Get matches across all supported competitions for a date range.
 *  Tries the global endpoint first (paid tiers), then falls back to
 *  per-competition queries for the free tier.
 */
export async function getMatchesByDateRange(dateFrom: string, dateTo: string) {
  // Try global endpoint first (works on paid tiers)
  const global = await apiFetch(
    `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED,IN_PLAY,PAUSED,FINISHED`
  )
  if (global?.matches?.length) return global.matches

  // Free-tier fallback: query each competition individually with rate-limit delay
  const allMatches: any[] = []
  for (const id of COMPETITION_IDS) {
    try {
      const data = await apiFetch(
        `/competitions/${id}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED,IN_PLAY,PAUSED,FINISHED`
      )
      if (data?.matches?.length) allMatches.push(...data.matches)
      // Respect free-tier rate limit: 10 req/min
      await new Promise(r => setTimeout(r, 700))
    } catch {
      // continue to next competition
    }
  }
  return allMatches
}

/** Quick fetch — top 3 competitions only (UCL, PL, La Liga).
 *  Used by the dashboard for a fast live-seed when the DB is empty.
 *  Returns results in ~3 seconds, well within serverless timeout.
 */
export async function getMatchesQuick(dateFrom: string, dateTo: string) {
  const QUICK_IDS = [2001, 2021, 2014] // UCL, Premier League, La Liga
  const allMatches: any[] = []
  for (const id of QUICK_IDS) {
    try {
      const data = await apiFetch(
        `/competitions/${id}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED,IN_PLAY,PAUSED,FINISHED`
      )
      if (data?.matches?.length) allMatches.push(...data.matches)
      await new Promise(r => setTimeout(r, 700))
    } catch {
      // continue
    }
  }
  return allMatches
}

/** Get matches for a specific competition by date range */
export async function getCompetitionMatches(competitionId: number, dateFrom: string, dateTo: string) {
  const data = await apiFetch(
    `/competitions/${competitionId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
  )
  return data?.matches ?? []
}

/** Get live/in-play matches */
export async function getLiveFixtures() {
  const data = await apiFetch('/matches?status=IN_PLAY,PAUSED')
  return data?.matches ?? []
}

/** Get standings for a competition */
export async function getStandings(competitionId: number) {
  const data = await apiFetch(`/competitions/${competitionId}/standings`)
  return data?.standings ?? []
}

/** Get head-to-head for a specific match */
export async function getH2HByMatchId(matchId: number) {
  const data = await apiFetch(`/matches/${matchId}/head2head?limit=10`)
  return data?.matches ?? []
}

/** Get a single match by ID */
export async function getFixture(matchId: number) {
  const data = await apiFetch(`/matches/${matchId}`)
  return data ?? null
}

/** Map football-data.org match status → our DB status */
export function mapStatus(fdStatus: string): 'scheduled' | 'live' | 'finished' {
  if (['IN_PLAY', 'PAUSED', 'HALFTIME'].includes(fdStatus)) return 'live'
  if (['FINISHED', 'AWARDED'].includes(fdStatus)) return 'finished'
  return 'scheduled'
}

/** Map a football-data.org match object → our matches table row */
export function mapMatchToRow(match: any) {
  const status = mapStatus(match.status)
  const isLive = status === 'live'

  return {
    id: String(match.id),
    home_team: match.homeTeam?.name ?? match.homeTeam?.shortName ?? 'Unknown',
    home_team_id: match.homeTeam?.id ?? null,
    home_team_logo: match.homeTeam?.crest ?? null,
    away_team: match.awayTeam?.name ?? match.awayTeam?.shortName ?? 'Unknown',
    away_team_id: match.awayTeam?.id ?? null,
    away_team_logo: match.awayTeam?.crest ?? null,
    competition: match.competition?.name ?? 'Unknown',
    competition_id: match.competition?.id ?? null,
    stage: match.matchday ? `Matchday ${match.matchday}` : (match.stage ?? 'Regular Season'),
    kickoff_utc: match.utcDate,
    venue: match.venue ?? null,
    status,
    live_score: isLive
      ? {
          home: match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? 0,
          away: match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? 0,
          minute: null,
        }
      : null,
    match_minute: null,
    odds: [],
    standings: null,
    h2h: null,
    lineups_available: false,
    updated_at: new Date().toISOString(),
  }
}

/** Get head-to-head history for a specific match ID */
export async function getMatchHead2Head(matchId: string | number) {
  const data = await apiFetch(`/matches/${matchId}/head2head?limit=10`)
  return data?.matches ?? []
}

/** Get recent finished matches for a team (for form calculation) */
export async function getTeamRecentMatches(teamId: number, limit = 10) {
  const data = await apiFetch(`/teams/${teamId}/matches?status=FINISHED&limit=${limit}`)
  return data?.matches ?? []
}

/** Get competition standings */
export async function getCompetitionStandings(competitionId: number) {
  const data = await apiFetch(`/competitions/${competitionId}/standings`)
  return data?.standings ?? []
}

/** Build form string like "WWDLW" from recent matches for a given team ID */
export function buildFormString(matches: any[], teamId: number): string {
  return matches
    .slice(-5)
    .map((m: any) => {
      const isHome = m.homeTeam?.id === teamId
      const homeGoals = m.score?.fullTime?.home ?? 0
      const awayGoals = m.score?.fullTime?.away ?? 0
      if (homeGoals === awayGoals) return 'D'
      if (isHome) return homeGoals > awayGoals ? 'W' : 'L'
      return awayGoals > homeGoals ? 'W' : 'L'
    })
    .join('')
}

/** Find a team's standing entry from standings response */
export function findTeamStanding(standings: any[], teamId: number) {
  for (const group of standings) {
    const entry = group.table?.find((t: any) => t.team?.id === teamId)
    if (entry) {
      return {
        position: entry.position,
        points: entry.points,
        gd: entry.goalDifference,
        form: entry.form ?? '',
        playedGames: entry.playedGames,
        won: entry.won,
        draw: entry.draw,
        lost: entry.lost,
        goalsFor: entry.goalsFor,
        goalsAgainst: entry.goalsAgainst,
      }
    }
  }
  return null
}

// Legacy exports kept for any existing callers
export async function getFixtures(params: { date?: string; league?: number; season?: number; live?: string }) {
  if (params.live) return getLiveFixtures()
  if (params.date) {
    return getMatchesByDateRange(params.date, params.date)
  }
  return []
}
export async function getOdds(_fixture: number) { return [] }
export async function getLineups(_fixture: number) { return [] }
export async function getInjuries(_team: number, _fixture: number) { return [] }
export async function getPlayerStats(_fixture: number) { return [] }
export async function getLeagues() { return [] }
export async function getTeamStatistics(_team: number, _league: number, _season: number) { return null }
export async function getH2H(_t1: number, _t2: number) { return [] }
