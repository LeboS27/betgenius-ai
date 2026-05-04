import { AnalysisType, RiskRating } from './database'

export interface MarketAnalysis {
  category: string
  marketName: string
  recommendedSelection: string
  confidence: number
  reasoning: string
  valueIndicator: boolean
  isInsufficientData: boolean
}

export interface CorrectScorePrediction {
  score: string
  confidence: number
  reasoning: string
}

export interface AccumulatorLeg {
  matchId: string
  teams: string
  market: string
  selection: string
  confidence: number
  combinedOdds: number
  reasoning: string
}

export interface AnalysisReport {
  matchId: string
  summary: string
  generatedAt: string
  analysisType: AnalysisType
  overallVerdict: string
  topPick: {
    category: string
    selection: string
    confidence: number
    reasoning: string
  }
  riskRating: RiskRating
  riskTier: 'safe_acca' | 'balanced_acca' | 'high_risk_acca'
  marketAnalysis: MarketAnalysis[]
  correctScoreTop3: CorrectScorePrediction[]
  accumulatorBuilder: AccumulatorLeg[]
  keyInsights: string[]
  newsImpact: string | null
  dataQualityNote: string | null
}

export interface MatchAnalysisContext {
  match: {
    id: string
    homeTeam: { name: string; logo: string | null }
    awayTeam: { name: string; logo: string | null }
    competition: string
    stage: string
    kickoff: string
    venue: string
  }
  last10Results: {
    homeTeam: Array<{ opponent: string; score: string; result: 'W' | 'D' | 'L'; venue: string }>
    awayTeam: Array<{ opponent: string; score: string; result: 'W' | 'D' | 'L'; venue: string }>
  }
  homeTeamForm: {
    last5: string
    goalsFor: number
    goalsAgainst: number
    cleanSheetRate: number
    bttsRate: number
    over25Rate: number
  }
  awayTeamForm: {
    last5: string
    goalsFor: number
    goalsAgainst: number
    cleanSheetRate: number
    bttsRate: number
    over25Rate: number
  }
  headToHead: {
    lastMeetings: Array<{ date: string; homeTeam: string; awayTeam: string; score: string }>
    homeTeamWins: number
    awayTeamWins: number
    draws: number
    avgGoalsH2H: number
  }
  standings: {
    homeTeam: { position: number; points: number; gd: number; form: string }
    awayTeam: { position: number; points: number; gd: number; form: string }
    leaguePhase: string
  }
  injuries: {
    homeTeamInjuries: Array<{ name: string; status: string }>
    awayTeamInjuries: Array<{ name: string; status: string }>
  }
  odds: {
    marketName: string
    selection: string
    odds: number
    impliedProbability: number
  }[]
  lineups: string[]
  recentNews: Array<{ headline: string; summary: string; source: string; publishedAt: string }>
  userPreferences: {
    tier: string
    preferredMarkets: string[]
  }
  fatigueFactors: {
    homeTeamDaysSinceLastMatch: number
    homeTeamMatchesLast30Days: number
    awayTeamDaysSinceLastMatch: number
    awayTeamMatchesLast30Days: number
  }
}
