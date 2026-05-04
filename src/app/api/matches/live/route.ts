import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('matches')
    .select('id, home_team, away_team, live_score, match_minute, status')
    .eq('status', 'live')
  return NextResponse.json({ matches: data || [] })
}
