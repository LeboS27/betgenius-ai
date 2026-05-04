import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface BetSlipSelection {
  matchId: string
  homeTeam: string
  awayTeam: string
  competition: string
  kickoff: string
  market: string
  selection: string
  confidence: number
  impliedOdds: number
  reasoning: string
}

interface BetSlip {
  selections: BetSlipSelection[]
  totalOdds: number
  riskLabel: 'Safe' | 'Balanced' | 'Bold'
  generatedAt: string
  matchCount: number
}

/** Convert confidence % to decimal odds with a small bookmaker margin */
function confidenceToOdds(confidence: number): number {
  const rawOdds = 100 / confidence
  // Add ~5% margin to make odds realistic
  return Math.round(rawOdds * 1.05 * 100) / 100
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // Get today's and tomorrow's matches
  const now = new Date()
  const endOfTomorrow = new Date(now)
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2)
  endOfTomorrow.setHours(23, 59, 59, 999)

  const { data: todayMatches } = await service
    .from('matches')
    .select('id, home_team, away_team, competition, competition_id, kickoff_utc, status')
    .in('status', ['scheduled', 'live'])
    .gte('kickoff_utc', now.toISOString())
    .lte('kickoff_utc', endOfTomorrow.toISOString())
    .order('kickoff_utc', { ascending: true })
    .limit(50)

  if (!todayMatches?.length) {
    return NextResponse.json({ error: 'No matches available today. Run a match refresh first.' }, { status: 404 })
  }

  // Get all cached analyses for those matches
  const matchIds = todayMatches.map(m => m.id)
  const { data: cachedAnalyses } = await service
    .from('cached_analyses')
    .select('match_id, report, analysis_type')
    .in('match_id', matchIds)

  // Build a map: matchId → best cached analysis (prefer expert over full)
  const analysisMap: Record<string, any> = {}
  cachedAnalyses?.forEach(ca => {
    const existing = analysisMap[ca.match_id]
    if (!existing || ca.analysis_type === 'full_expert_report') {
      analysisMap[ca.match_id] = ca.report
    }
  })

  // Collect eligible selections (confidence > 68%)
  const candidates: BetSlipSelection[] = []

  for (const match of todayMatches) {
    const report = analysisMap[match.id]
    if (!report?.topPick) continue

    const { confidence, selection, category, reasoning } = report.topPick
    if (confidence < 68) continue

    candidates.push({
      matchId: match.id,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      competition: match.competition,
      kickoff: match.kickoff_utc,
      market: category || 'Match',
      selection,
      confidence,
      impliedOdds: confidenceToOdds(confidence),
      reasoning: reasoning || '',
    })
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence)

  // Build accumulator targeting 5–12x total odds
  // Strategy: keep adding selections while accumulated odds < 12 and have at least 3
  let selections: BetSlipSelection[] = []
  let accumulatedOdds = 1

  for (const c of candidates) {
    const newOdds = accumulatedOdds * c.impliedOdds
    if (newOdds > 14) break // would push too high
    selections.push(c)
    accumulatedOdds = newOdds
    if (selections.length >= 8) break
  }

  // If we don't have enough to reach 5x yet, take best available up to 8
  if (accumulatedOdds < 5 && selections.length < candidates.length) {
    while (accumulatedOdds < 5 && selections.length < candidates.length && selections.length < 8) {
      const next = candidates[selections.length]
      if (next) {
        selections.push(next)
        accumulatedOdds *= next.impliedOdds
      } else break
    }
  }

  if (selections.length === 0) {
    return NextResponse.json({
      error: 'Not enough analysed matches today to build a bet slip. Run some analyses first.',
    }, { status: 404 })
  }

  // Recalculate final odds
  const finalOdds = selections.reduce((acc, s) => acc * s.impliedOdds, 1)
  const roundedOdds = Math.round(finalOdds * 100) / 100

  const riskLabel: BetSlip['riskLabel'] =
    roundedOdds <= 7 ? 'Safe' : roundedOdds <= 10 ? 'Balanced' : 'Bold'

  const betSlip: BetSlip = {
    selections,
    totalOdds: roundedOdds,
    riskLabel,
    generatedAt: new Date().toISOString(),
    matchCount: todayMatches.length,
  }

  return NextResponse.json({ betSlip })
}
