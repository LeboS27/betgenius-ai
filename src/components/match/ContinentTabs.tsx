'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

interface ContinentTabsProps {
  continents: string[]
  active: string
  query: string
}

export function ContinentTabs({ continents, active, query }: ContinentTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(query)

  const navigate = (continent: string, q?: string) => {
    const params = new URLSearchParams()
    if (continent !== 'All') params.set('continent', continent)
    if (q) params.set('q', q)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="mb-6">
      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search teams, leagues..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && navigate(active, search)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        />
      </div>

      {/* Continent tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {continents.map(continent => (
          <button
            key={continent}
            onClick={() => navigate(continent, search)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              active === continent
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            {continent}
          </button>
        ))}
      </div>
    </div>
  )
}
