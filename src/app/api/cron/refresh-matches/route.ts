import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMatchesByDateRange, getLiveFixtures, mapMatchToRow } from '@/lib/football-api'
import { format, addDays, subDays } from 'date-fns'

function verifyCron(req: NextRequest) {
  if (!process.env.CRON_SECRET) return true // open in dev
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  return secret === process.env.CRON_SECRET
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const in7Days = format(addDays(new Date(), 7), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  // Clean up old finished matches
  await service.from('matches')
    .delete()
    .eq('status', 'finished')
    .lt('kickoff_utc', yesterday + 'T00:00:00Z')

  let fetched = 0
  let errors = 0

  try {
    const matches = await getMatchesByDateRange(today, in7Days)
    for (const match of matches) {
      try {
        await service.from('matches').upsert(mapMatchToRow(match), { onConflict: 'id' })
        fetched++
      } catch (e) {
        errors++
      }
    }
  } catch (e) {
    errors++
    console.error('Cron refresh error:', e)
  }

  // Update live matches
  try {
    const live = await getLiveFixtures()
    for (const match of live) {
      await service.from('matches').upsert(mapMatchToRow(match), { onConflict: 'id' })
    }
  } catch (e) {
    console.error('Live update error:', e)
  }

  return NextResponse.json({ fetched, errors, timestamp: new Date().toISOString() })
}
