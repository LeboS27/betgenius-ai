import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .in('status', ['scheduled', 'live'])
    .order('kickoff_utc', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ matches: data })
}
