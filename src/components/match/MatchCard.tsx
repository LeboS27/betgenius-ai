'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Match } from '@/types/database'
import { ConfidenceBadge } from '@/components/ui/Badge'
import { formatKickoff } from '@/lib/utils'

interface MatchCardProps {
  match: Match
  cachedConfidence?: number
  userTier: 'free' | 'premium' | 'pro'
}

export function MatchCard({ match, cachedConfidence, userTier: _userTier }: MatchCardProps) {
  const isLive = match.status === 'live'
  const liveScore = match.live_score as { home: number; away: number; minute: number } | null

  const standings = match.standings as any
  const homeFormStr: string = standings?.homeTeam?.form || ''
  const awayFormStr: string = standings?.awayTeam?.form || ''
  const homeForm = homeFormStr.replace(/[^WDL]/g, '').split('').slice(-5)
  const awayForm = awayFormStr.replace(/[^WDL]/g, '').split('').slice(-5)

  return (
    <Link href={`/match/${match.id}`} className="block">
      <div className={`card p-4 hover:border-[var(--accent-primary)]/40 transition-all ${isLive ? 'border-[var(--success)]/40 live-pulse' : ''}`}>
        {/* Competition + time */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[var(--text-muted)] font-medium truncate">{match.competition}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLive && liveScore && (
              <span className="text-xs font-mono text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-full">
                LIVE {liveScore.minute}&apos;
              </span>
            )}
            <span className="text-xs text-[var(--text-muted)] font-mono">{formatKickoff(match.kickoff_utc)}</span>
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center gap-3 mb-3">
          {/* Home team */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {match.home_team_logo ? (
              <Image src={match.home_team_logo} alt={match.home_team} width={24} height={24} className="w-6 h-6 object-contain flex-shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">{match.home_team}</span>
          </div>

          {/* Score or vs */}
          <div className="flex-shrink-0 text-center">
            {isLive && liveScore ? (
              <span className="font-mono font-bold text-base text-[var(--text-primary)]">
                {liveScore.home} – {liveScore.away}
              </span>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">VS</span>
            )}
          </div>

          {/* Away team */}
          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate text-right">{match.away_team}</span>
            {match.away_team_logo ? (
              <Image src={match.away_team_logo} alt={match.away_team} width={24} height={24} className="w-6 h-6 object-contain flex-shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Form pills */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">
            {homeForm.slice(-5).map((r: string, i: number) => (
              <span key={i} className={`w-5 h-5 rounded-sm text-[10px] font-bold flex items-center justify-center form-${r}`}>{r}</span>
            ))}
          </div>
          <div className="flex gap-1">
            {awayForm.slice(-5).map((r: string, i: number) => (
              <span key={i} className={`w-5 h-5 rounded-sm text-[10px] font-bold flex items-center justify-center form-${r}`}>{r}</span>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          {cachedConfidence !== undefined ? (
            <ConfidenceBadge confidence={cachedConfidence} size="sm" />
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Tap to analyse</span>
          )}
          <span className="text-xs text-[var(--accent-primary)] font-medium">Analyse →</span>
        </div>
      </div>
    </Link>
  )
}
