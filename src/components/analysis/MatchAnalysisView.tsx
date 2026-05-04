'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Match, Profile } from '@/types/database'
import { AnalysisReport } from '@/types/analysis'
import { ConfidenceBadge, RiskBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatKickoff, buildWhatsappMessage } from '@/lib/utils'
import { MarketTable } from './MarketTable'
import { AnalysingLoader } from './AnalysingLoader'

interface Props {
  match: Match
  profile: Profile | null
  cachedAnalyses: any[]
}

type AnalysisType = 'full_report' | 'full_expert_report'

const ANALYSIS_TYPES: { id: AnalysisType; label: string; description: string }[] = [
  {
    id: 'full_report',
    label: '📊 Full Report',
    description: 'Top markets across all categories',
  },
  {
    id: 'full_expert_report',
    label: '🔬 Expert Report',
    description: '100+ markets · every category',
  },
]

export function MatchAnalysisView({ match, profile: rawProfile, cachedAnalyses }: Props) {
  const profile = rawProfile ?? { id: '', tier: 'free', full_name: '', email: '' } as any
  const [activeType, setActiveType] = useState<AnalysisType>('full_expert_report')
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isLive = match.status === 'live'
  const liveScore = match.live_score as { home: number; away: number; minute: number } | null

  // Use cached report if available for the active type
  const cachedReport = cachedAnalyses.find(c => c.analysis_type === activeType)?.report as AnalysisReport | undefined
  const displayReport = report || cachedReport || null

  const analyse = async () => {
    setLoading(true)
    setError('')
    setReport(null)
    try {
      const res = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, type: activeType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setReport(data.report)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const whatsappUrl = displayReport?.topPick ? buildWhatsappMessage({
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    date: formatKickoff(match.kickoff_utc),
    competition: match.competition,
    selection: displayReport.topPick.selection,
    confidence: displayReport.topPick.confidence,
    reasoning: displayReport.topPick.reasoning,
    referralCode: profile.id.slice(0, 8).toUpperCase(),
  }) : null

  return (
    <div>
      {/* Match header */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[var(--text-muted)]">{match.competition} · {match.stage}</span>
          {isLive && (
            <span className="text-xs font-mono text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-full live-pulse">
              LIVE {liveScore?.minute}&apos;
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 flex flex-col items-center gap-2">
            {match.home_team_logo && (
              <Image src={match.home_team_logo} alt={match.home_team} width={48} height={48} className="w-12 h-12 object-contain" />
            )}
            <span className="text-base font-semibold text-center text-[var(--text-primary)]">{match.home_team}</span>
          </div>
          <div className="text-center">
            {isLive && liveScore ? (
              <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                {liveScore.home} – {liveScore.away}
              </span>
            ) : (
              <div>
                <div className="font-display text-xl text-[var(--text-muted)]">VS</div>
                <div className="text-xs text-[var(--text-muted)] font-mono mt-1">{formatKickoff(match.kickoff_utc)}</div>
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col items-center gap-2">
            {match.away_team_logo && (
              <Image src={match.away_team_logo} alt={match.away_team} width={48} height={48} className="w-12 h-12 object-contain" />
            )}
            <span className="text-base font-semibold text-center text-[var(--text-primary)]">{match.away_team}</span>
          </div>
        </div>
      </div>

      {/* Analysis type selector */}
      <div className="flex gap-2 mb-5">
        {ANALYSIS_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => { setActiveType(type.id); setReport(null); setError('') }}
            className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium border transition-all text-left ${
              activeType === type.id
                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] bg-[var(--card-bg)]'
            }`}
          >
            <div>{type.label}</div>
            <div className={`text-[10px] mt-0.5 ${activeType === type.id ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
              {type.description}
            </div>
          </button>
        ))}
      </div>

      {/* Analyse button */}
      {!displayReport && !loading && (
        <div className="text-center py-10">
          <p className="text-[var(--text-secondary)] mb-2 text-sm">
            {activeType === 'full_expert_report'
              ? 'Full coverage across 100+ markets and 9 categories'
              : 'Top 35+ markets across all key categories'}
          </p>
          {profile.tier === 'free' && (
            <p className="text-xs text-[var(--text-muted)] mb-5">4 free analyses per day</p>
          )}
          <Button size="lg" onClick={analyse}>Generate Analysis</Button>
        </div>
      )}

      {/* Loading */}
      {loading && <AnalysingLoader type={activeType} homeTeam={match.home_team} awayTeam={match.away_team} />}

      {/* Error */}
      {error && (
        <div className="card p-4 border-[var(--danger)]/30 bg-[var(--danger)]/5 text-sm text-[var(--danger)] mb-4">
          {error}
        </div>
      )}

      {/* Report */}
      {displayReport && !loading && (
        <div>
          {/* Top pick */}
          <div className="card p-5 mb-4 border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Top Pick</span>
              <div className="flex items-center gap-2">
                <ConfidenceBadge confidence={displayReport.topPick.confidence} />
                <RiskBadge rating={displayReport.riskRating} />
              </div>
            </div>
            <div className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              {displayReport.topPick.category}: <span className="text-[var(--accent-primary)]">{displayReport.topPick.selection}</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{displayReport.topPick.reasoning}</p>
          </div>

          {/* Overall verdict */}
          {displayReport.overallVerdict && (
            <div className="card p-4 mb-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">&ldquo;{displayReport.overallVerdict}&rdquo;</p>
            </div>
          )}

          {/* Key insights */}
          {displayReport.keyInsights?.length > 0 && (
            <div className="card p-4 mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Key Insights</h3>
              <ul className="space-y-2">
                {displayReport.keyInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <span className="text-[var(--accent-primary)] mt-0.5 flex-shrink-0">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Market table */}
          <MarketTable markets={displayReport.marketAnalysis || []} />

          {/* Correct scores */}
          {displayReport.correctScoreTop3?.length > 0 && (
            <div className="card p-4 mb-4">
              <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">Correct Score Predictions</h3>
              <div className="space-y-2">
                {displayReport.correctScoreTop3.map((cs, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                    <div>
                      <span className="font-mono font-bold text-[var(--text-primary)] mr-3">{cs.score}</span>
                      {cs.reasoning && <span className="text-xs text-[var(--text-muted)]">{cs.reasoning}</span>}
                    </div>
                    <ConfidenceBadge confidence={cs.confidence} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* News impact */}
          {displayReport.newsImpact && (
            <div className="card p-4 mb-4 border-[var(--warning)]/20 bg-[var(--warning)]/5">
              <h3 className="text-xs font-medium text-[var(--warning)] uppercase tracking-wider mb-2">News Impact</h3>
              <p className="text-sm text-[var(--text-secondary)]">{displayReport.newsImpact}</p>
            </div>
          )}

          {/* No clear edge */}
          {displayReport.topPick.confidence < 65 && (
            <div className="card p-4 mb-4 border-[var(--text-muted)]/20">
              <p className="text-sm text-[var(--text-muted)] text-center">
                &ldquo;Genius found no clear statistical edge in this match. The data is too close to call with confidence.&rdquo;
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" size="md" onClick={analyse} loading={loading} className="flex-1">
              Regenerate
            </Button>
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="success" size="md" className="w-full">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Share
                </Button>
              </a>
            )}
          </div>

          <p className="text-[10px] text-[var(--text-muted)] text-center mt-4 leading-relaxed">
            ⚠️ BetGenius AI provides statistical analysis for informational purposes only. This is not betting advice. Always gamble responsibly.
          </p>
        </div>
      )}
    </div>
  )
}
