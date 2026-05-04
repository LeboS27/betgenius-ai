'use client'
import { useEffect, useState } from 'react'

const STEPS = {
  quick_pick: [
    'Fetching live odds...',
    'Scraping team news...',
    'Analysing 500+ markets...',
    'Building your pick...',
    'Genius is ready.',
  ],
  full_report: [
    'Fetching live odds...',
    'Scraping team news...',
    'Analysing 500+ markets...',
    'Calculating value indicators...',
    'Genius is ready.',
  ],
  full_expert_report: [
    'Fetching live odds...',
    'Scraping team news...',
    'Analysing all market categories...',
    'Building tactical breakdown...',
    'Generating accumulator builder...',
    'Genius is ready.',
  ],
}

interface Props {
  type: 'quick_pick' | 'full_report' | 'full_expert_report'
  homeTeam: string
  awayTeam: string
}

export function AnalysingLoader({ type, homeTeam, awayTeam }: Props) {
  const steps = STEPS[type]
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (currentStep >= steps.length - 1) return
    const interval = type === 'quick_pick' ? 800 : type === 'full_report' ? 3500 : 7000
    const timer = setTimeout(() => setCurrentStep(s => s + 1), interval)
    return () => clearTimeout(timer)
  }, [currentStep, steps.length, type])

  return (
    <div className="card p-8 text-center">
      {/* Pulsing BG logo */}
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)] logo-pulse flex items-center justify-center mx-auto mb-6">
        <span className="font-display text-white text-2xl">BG</span>
      </div>

      <p className="text-sm text-[var(--text-muted)] mb-1">Analysing</p>
      <p className="font-semibold text-[var(--text-primary)] mb-6">{homeTeam} vs {awayTeam}</p>

      <div className="space-y-2 text-left max-w-xs mx-auto">
        {steps.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-3 text-sm transition-opacity duration-500 ${
              i <= currentStep ? 'opacity-100' : 'opacity-20'
            } ${i === currentStep ? 'step-animate' : ''}`}
          >
            <span className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${
              i < currentStep
                ? 'bg-[var(--success)]'
                : i === currentStep
                  ? 'bg-[var(--accent-primary)] animate-pulse'
                  : 'bg-[var(--bg-tertiary)]'
            }`}>
              {i < currentStep && (
                <svg className="w-2.5 h-2.5 text-[var(--bg-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className={i === currentStep ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
