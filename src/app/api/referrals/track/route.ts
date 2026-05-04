import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Called on signup to record referral relationship
export async function POST(req: NextRequest) {
  const { referredUserId, referralCode } = await req.json()
  if (!referredUserId || !referralCode) return NextResponse.json({ ok: false })

  const service = createServiceClient()

  // Find referrer by code (first 8 chars of UUID, no dashes)
  const { data: allProfiles } = await service
    .from('profiles')
    .select('id')
    .limit(1000)

  const referrer = allProfiles?.find(
    p => p.id.replace(/-/g, '').slice(0, 8).toUpperCase() === referralCode.toUpperCase()
  )

  if (!referrer || referrer.id === referredUserId) {
    return NextResponse.json({ ok: false, reason: 'Referrer not found or self-referral' })
  }

  // Check not already tracked
  const { data: existing } = await service
    .from('referrals')
    .select('id')
    .eq('referred_user_id', referredUserId)
    .single()

  if (existing) return NextResponse.json({ ok: false, reason: 'Already tracked' })

  await service.from('referrals').insert({
    referrer_id: referrer.id,
    referred_user_id: referredUserId,
  })

  return NextResponse.json({ ok: true })
}
