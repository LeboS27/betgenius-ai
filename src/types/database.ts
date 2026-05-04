export type Tier = 'free' | 'premium' | 'pro'
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'
export type MatchStatus = 'scheduled' | 'live' | 'finished'
export type AnalysisType = 'quick_pick' | 'full_report' | 'full_expert_report'
export type PaymentStatus = 'pending' | 'approved' | 'rejected'
export type RiskRating = 'safe' | 'medium' | 'risky'

export interface Profile {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  phone_verified: boolean
  email_verified: boolean
  tier: Tier
  is_admin: boolean
  onboarding_complete: boolean
  favourite_leagues: number[]
  preferred_markets: string[]
  notification_preferences: {
    match_alerts: boolean
    expiry_reminders: boolean
    weekly_digest: boolean
  }
  theme: 'dark' | 'light'
  lite_mode: boolean
  analyses_today: number
  analyses_reset: string
  session_token: string | null
  is_banned: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  tier: Exclude<Tier, 'free'>
  status: SubscriptionStatus
  started_at: string
  expires_at: string
  paynow_reference: string | null
  activated_at: string | null
}

export interface PendingPayment {
  id: string
  user_id: string
  tier: Exclude<Tier, 'free'>
  amount: number
  paynow_reference: string | null
  submitted_at: string
  status: PaymentStatus
  reviewed_by: string | null
  reviewed_at: string | null
}

export interface Match {
  id: string
  home_team: string
  home_team_id: number
  home_team_logo: string | null
  away_team: string
  away_team_id: number
  away_team_logo: string | null
  competition: string
  competition_id: number
  stage: string | null
  kickoff_utc: string
  venue: string | null
  status: MatchStatus
  live_score: object | null
  match_minute: number | null
  h2h: object | null
  standings: object | null
  lineups_available: boolean
  odds: object | null
  last_odds_update: string | null
  created_at: string
  updated_at: string
}

export interface CachedAnalysis {
  id: string
  match_id: string
  analysis_type: AnalysisType
  report: object | null
  cache_stale: boolean
  generated_at: string
  regeneration_count: number
  odds_snapshot: object | null
}

export interface PredictionHistory {
  id: string
  user_id: string
  match_id: string
  analysis_type: AnalysisType
  report: object | null
  viewed_at: string
}

export interface Referral {
  id: string
  referrer_id: string
  referred_user_id: string
  signed_up_at: string
  converted_at: string | null
  rewarded: boolean
  reward_type: string | null
}

export interface PlatformConfig {
  key: string
  value: object
  updated_at: string
}

export interface NewsCache {
  id: string
  team_name: string
  headlines: NewsItem[]
  cached_at: string
}

export interface NewsItem {
  title: string
  description: string
  url: string
  publishedAt: string
  source: string
}
