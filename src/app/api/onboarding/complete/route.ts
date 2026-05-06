import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Authenticate the caller
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { favourite_leagues, preferred_markets, notification_preferences } = await req.json()

  // Use service client to bypass RLS — ensures onboarding_complete is always written
  const service = createServiceClient()
  const { error } = await service
    .from('profiles')
    .update({
      favourite_leagues: favourite_leagues ?? [],
      preferred_markets: preferred_markets ?? [],
      notification_preferences: notification_preferences ?? {},
      onboarding_complete: true,
    })
    .eq('id', user.id)

  if (error) {
    console.error('onboarding complete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
