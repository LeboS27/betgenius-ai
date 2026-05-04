import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getFixtures } from '@/lib/football-api'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  try {
    const liveFixtures = await getFixtures({ live: 'all' })
    if (!liveFixtures?.length) {
      // Mark all as finished if no live games
      await service.from('matches').update({ status: 'finished' })
        .eq('status', 'live')
        .lte('kickoff_utc', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      return NextResponse.json({ updated: 0 })
    }

    let updated = 0
    for (const fix of liveFixtures) {
      await service.from('matches').update({
        status: 'live',
        live_score: { home: fix.goals.home, away: fix.goals.away, minute: fix.fixture.status.elapsed },
        match_minute: fix.fixture.status.elapsed,
        updated_at: new Date().toISOString(),
      }).eq('id', String(fix.fixture.id))
      updated++
    }

    return NextResponse.json({ updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
