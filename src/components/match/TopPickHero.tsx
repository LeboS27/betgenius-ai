'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Match } from '@/types/database'
import { ConfidenceBadge } from '@/components/ui/Badge'
import { formatKickoff } from '@/lib/utils'

interface TopPickHeroProps {
  match: Match
  confidence: number
  userTier: string
}

export function TopPickHero({ match, confidence, userTier: _userTier }: TopPickHeroProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
        <h2 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Today&apos;s Top Pick</h2>
      </div>
      <Link href={`/match/${match.id}`}>
        <div className="card p-5 border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent hover:border-[var(--accent-primary)]/60 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-[var(--text-muted)]">{match.competition}</span>
            <ConfidenceBadge confidence={confidence} size="sm" />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 flex flex-col items-center gap-2">
              {match.home_team_logo ? (
                <Image src={match.home_team_logo} alt={match.home_team} width={40} height={40} className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)]" />
              )}
              <span className="text-sm font-semibold text-[var(--text-primary)] text-center">{match.home_team}</span>
            </div>

            <div className="text-center flex flex-col gap-1">
              <span className="text-lg font-display tracking-wider text-[var(--text-muted)]">VS</span>
              <span className="text-xs text-[var(--text-muted)] font-mono">{formatKickoff(match.kickoff_utc)}</span>
            </div>

            <div className="flex-1 flex flex-col items-center gap-2">
              {match.away_team_logo ? (
                <Image src={match.away_team_logo} alt={match.away_team} width={40} height={40} className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)]" />
              )}
              <span className="text-sm font-semibold text-[var(--text-primary)] text-center">{match.away_team}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--text-secondary)]">Highest confidence match today</span>
            <span className="text-xs text-[var(--accent-primary)] font-medium">View Analysis →</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
