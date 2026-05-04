import { NextRequest, NextResponse } from 'next/server'
import { format, addDays } from 'date-fns'

// Dev-only: test football-data.org API connection
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const key = process.env.FOOTBALL_DATA_API_KEY
  if (!key) {
    return NextResponse.json({
      error: 'FOOTBALL_DATA_API_KEY not set',
      hint: 'Register free at https://www.football-data.org/client/register',
    })
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const in2Days = format(addDays(new Date(), 2), 'yyyy-MM-dd')

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${in2Days}`,
      { headers: { 'X-Auth-Token': key }, cache: 'no-store' }
    )
    const data = await res.json()
    const matches = data?.matches ?? []
    return NextResponse.json({
      status: res.status,
      keySet: true,
      matchCount: matches.length,
      dateRange: { from: today, to: in2Days },
      sample: matches.slice(0, 3).map((m: any) => ({
        id: m.id,
        home: m.homeTeam?.name,
        away: m.awayTeam?.name,
        competition: m.competition?.name,
        date: m.utcDate,
        status: m.status,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
