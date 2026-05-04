import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // Get all active cached analyses with their match odds
  const { data: caches } = await service
    .from('cached_analyses')
    .select('id, match_id, odds_snapshot, regeneration_count')
    .eq('cache_stale', false)

  if (!caches?.length) return NextResponse.json({ staled: 0 })

  let staled = 0
  for (const cache of caches) {
    const { data: match } = await service
      .from('matches')
      .select('odds, kickoff_utc')
      .eq('id', cache.match_id)
      .single()

    if (!match) continue

    // Skip if match is too far in future (>48h)
    const kickoff = new Date(match.kickoff_utc).getTime()
    if (kickoff - Date.now() > 48 * 60 * 60 * 1000) continue

    // Check if odds have moved >10%
    const currentOdds = match.odds as any[] || []
    const snapshotOdds = (cache.odds_snapshot as any[]) || []

    let hasSignificantChange = false
    for (const current of currentOdds) {
      const snapshot = snapshotOdds.find(s => s.marketName === current.marketName)
      if (!snapshot) continue
      const change = Math.abs(current.odds - snapshot.odds) / snapshot.odds
      if (change > 0.1) { hasSignificantChange = true; break }
    }

    if (hasSignificantChange) {
      await service.from('cached_analyses').update({ cache_stale: true }).eq('id', cache.id)
      staled++
    }
  }

  return NextResponse.json({ staled, checked: caches.length, timestamp: new Date().toISOString() })
}
