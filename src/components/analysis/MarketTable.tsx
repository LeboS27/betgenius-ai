'use client'
import { MarketAnalysis } from '@/types/analysis'
import { ConfidenceBadge } from '@/components/ui/Badge'
import { useState } from 'react'

const TABS = ['All', 'Match', 'Totals', 'Handicaps', 'Halves', 'Minutes', 'Combos', 'Players', 'Corners', 'Fouls']

/** Map any market category/name Claude returns → a tab bucket */
function resolveTab(market: MarketAnalysis): string {
  const text = `${market.category} ${market.marketName}`.toLowerCase()

  if (/corner/.test(text))
    return 'Corners'
  if (/foul|card|booking|yellow|red card|sent off|disciplin/.test(text))
    return 'Fouls'
  if (/player|scorer|anytime|to score|first goal scorer|last goal scorer|assist|shot on target|clean sheet/.test(text))
    return 'Players'
  if (/ht.?ft|half.?time.?full|double result|scorecast|wincast|score.*result|outcome.*total|both.*score.*result|outcome and|chance and|correct score/.test(text))
    return 'Combos'
  if (/handicap|asian|spread|dnb|draw no bet/.test(text))
    return 'Handicaps'
  if (/1st half|2nd half|halftime|half time|first half|second half|\bht\b/.test(text))
    return 'Halves'
  if (/\d+.?\d*\s*min|1-15|1-30|1-60|1-75|time of goal|first team to score|last team to score|race to/.test(text))
    return 'Minutes'
  if (/over|under|total goal|goal line|exact goal|btts|both teams to score/.test(text))
    return 'Totals'
  return 'Match'
}

interface Props {
  markets: MarketAnalysis[]
  isLocked?: boolean
}

export function MarketTable({ markets, isLocked }: Props) {
  const [activeTab, setActiveTab] = useState('All')

  const filtered = activeTab === 'All'
    ? markets
    : markets.filter(m => resolveTab(m) === activeTab)

  // Count per tab so user can see which tabs have data
  const tabCounts: Record<string, number> = { All: markets.length }
  for (const m of markets) {
    const t = resolveTab(m)
    tabCounts[t] = (tabCounts[t] ?? 0) + 1
  }

  return (
    <div className={`card mb-4 overflow-hidden ${isLocked ? 'relative' : ''}`}>
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-sm rounded-xl">
          <div className="text-2xl mb-2">🔒</div>
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Premium required</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">Unlock all 15+ markets for $2/mo</p>
          <a href="/pricing" className="text-sm bg-[var(--accent-primary)] text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors">
            Upgrade to Premium
          </a>
        </div>
      )}

      <div className={isLocked ? 'blurred-content' : ''}>
        {/* Category tabs */}
        <div className="flex gap-1 p-3 overflow-x-auto border-b border-[var(--border)]">
          {TABS.filter(tab => tab === 'All' || (tabCounts[tab] ?? 0) > 0).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab}
              {tab !== 'All' && (tabCounts[tab] ?? 0) > 0 && (
                <span className={`text-[10px] px-1 rounded-full ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'
                }`}>
                  {tabCounts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="divide-y divide-[var(--border)]">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-2 text-xs text-[var(--text-muted)] font-medium">
            <span className="col-span-4">Market</span>
            <span className="col-span-4">Selection</span>
            <span className="col-span-3">Confidence</span>
            <span className="col-span-1 text-center">Value</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No markets in this category
            </div>
          ) : (
            filtered.map((market, i) => (
              <div key={i} className={`grid grid-cols-12 px-4 py-3 items-center text-sm ${market.isInsufficientData ? 'opacity-50' : ''}`}>
                <span className="col-span-4 text-[var(--text-muted)] text-xs truncate">{market.marketName}</span>
                <span className="col-span-4 font-medium text-[var(--text-primary)] text-xs truncate">
                  {market.isInsufficientData ? 'Insufficient data' : market.recommendedSelection}
                </span>
                <span className="col-span-3">
                  {market.isInsufficientData ? (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  ) : (
                    <ConfidenceBadge confidence={market.confidence} size="sm" />
                  )}
                </span>
                <span className="col-span-1 flex justify-center">
                  {market.valueIndicator && !market.isInsufficientData && (
                    <span className="w-2 h-2 rounded-full bg-[var(--success)]" title="Value Bet" />
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
