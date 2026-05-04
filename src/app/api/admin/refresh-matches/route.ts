import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMatchesByDateRange, getLiveFixtures, mapMatchToRow } from '@/lib/football-api'
import { format, addDays, subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const isDevMode = process.env.NODE_ENV === 'development'
  const adminSecret = req.nextUrl.searchParams.get('secret')
  if (!isDevMode && adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.FOOTBALL_DATA_API_KEY) {
    return NextResponse.json({
      error: 'FOOTBALL_DATA_API_KEY is not set in .env.local',
      hint: 'Register free at https://www.football-data.org/client/register — key arrives by email instantly',
    }, { status: 500 })
  }

  const service = createServiceClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const in7Days = format(addDays(new Date(), 7), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  // Delete old placeholder/seeded data (real football-data.org IDs are 4–6 digits too,
  // but the seeded ones we want to remove were inserted manually with low IDs like 1,2,3)
  await service.from('matches').delete().lt('id', '50000')

  // Also remove finished matches older than yesterday
  await service.from('matches')
    .delete()
    .eq('status', 'finished')
    .lt('kickoff_utc', yesterday + 'T00:00:00Z')

  let fetched = 0
  let errors = 0

  try {
    // Fetch today → 3 days ahead in one request (football-data.org supports date ranges)
    const matches = await getMatchesByDateRange(today, in7Days)
    for (const match of matches) {
      try {
        const row = mapMatchToRow(match)
        await service.from('matches').upsert(row, { onConflict: 'id' })
        fetched++
      } catch (e) {
        errors++
        console.error('Upsert error for match', match?.id, e)
      }
    }
  } catch (e) {
    errors++
    console.error('getMatchesByDateRange error:', e)
  }

  // Update any currently live matches
  try {
    const liveMatches = await getLiveFixtures()
    for (const match of liveMatches) {
      const row = mapMatchToRow(match)
      await service.from('matches').upsert(row, { onConflict: 'id' })
    }
  } catch (e) {
    console.error('Live matches error:', e)
  }

  return NextResponse.json({
    success: true,
    fetched,
    errors,
    dateRange: { from: today, to: in7Days },
    timestamp: new Date().toISOString(),
  })
}
