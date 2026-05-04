'use client'
import { useState } from 'react'
import { formatKickoff } from '@/lib/utils'

interface Selection {
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
  selections: Selection[]
  totalOdds: number
  riskLabel: 'Safe' | 'Balanced' | 'Bold'
  generatedAt: string
  matchCount: number
}

const RISK_STYLES = {
  Safe:     { bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  Balanced: { bg: 'bg-blue-50 border-blue-200',   badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  Bold:     { bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
}

export function BetSlipButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [betSlip, setBetSlip] = useState<BetSlip | null>(null)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    setBetSlip(null)
    setOpen(true)
    try {
      const res = await fetch('/api/analysis/bet-slip')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not generate bet slip')
      setBetSlip(data.betSlip)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const riskStyle = betSlip ? RISK_STYLES[betSlip.riskLabel] : null

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60 shadow-sm whitespace-nowrap"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        {loading ? 'Generating…' : 'Bet Slip'}
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Modal panel */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-display text-lg tracking-wide text-gray-900">Daily Bet Slip</h2>
                {betSlip && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Built from {betSlip.matchCount} matches · {new Date(betSlip.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Analysing today&apos;s matches…</p>
                </div>
              )}

              {error && (
                <div className="p-5">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {error}
                    <p className="mt-2 text-xs text-red-500">Tip: Run some match analyses first so Genius has data to build from.</p>
                  </div>
                </div>
              )}

              {betSlip && !loading && (
                <div className="p-5 space-y-4">
                  {/* Summary banner */}
                  <div className={`rounded-xl border p-4 ${riskStyle?.bg}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskStyle?.badge}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${riskStyle?.dot}`} />
                        {betSlip.riskLabel} Acca
                      </span>
                      <span className="text-xs text-gray-500">{betSlip.selections.length} selections</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl text-gray-900">{betSlip.totalOdds.toFixed(2)}x</span>
                      <span className="text-sm text-gray-500">total odds</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      $1 stake → <strong className="text-gray-700">${betSlip.totalOdds.toFixed(2)}</strong> return
                    </p>
                  </div>

                  {/* Selections */}
                  <div className="space-y-3">
                    {betSlip.selections.map((s, i) => (
                      <div key={s.matchId} className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 truncate">{s.competition}</p>
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {s.homeTeam} vs {s.awayTeam}
                            </p>
                            <p className="text-xs text-gray-400">{formatKickoff(s.kickoff)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs font-mono font-bold text-blue-600">{s.impliedOdds.toFixed(2)}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              s.confidence >= 80 ? 'bg-green-100 text-green-700' :
                              s.confidence >= 72 ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {s.confidence}%
                            </span>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{s.market}</p>
                          <p className="text-sm font-bold text-[var(--accent-primary)]">{s.selection}</p>
                          {s.reasoning && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.reasoning}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Disclaimer */}
                  <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                    ⚠️ Statistical analysis only — not betting advice. Gamble responsibly.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {betSlip && !loading && (
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={generate}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Regenerate
                </button>
                <button
                  onClick={() => {
                    const text = betSlip.selections.map(s =>
                      `${s.homeTeam} vs ${s.awayTeam}\n${s.market}: ${s.selection} @ ${s.impliedOdds.toFixed(2)}`
                    ).join('\n\n') + `\n\nTotal Odds: ${betSlip.totalOdds.toFixed(2)}x\nGenerated by BetGenius AI`
                    navigator.clipboard.writeText(text)
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Copy Slip
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
