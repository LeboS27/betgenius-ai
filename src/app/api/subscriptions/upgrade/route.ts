import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, tier, paymentId } = await req.json()
  const service = createServiceClient()

  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setMonth(expiresAt.getMonth() + 1)

  // Create subscription record
  await service.from('subscriptions').insert({
    user_id: userId,
    tier,
    status: 'active',
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    activated_at: now.toISOString(),
  })

  // Update profile tier
  await service.from('profiles').update({ tier }).eq('id', userId)

  // Mark payment as approved
  if (paymentId) {
    await service.from('pending_payments').update({
      status: 'approved',
      reviewed_at: now.toISOString(),
    }).eq('id', paymentId)
  }

  // Check and reward referrals
  const { data: referrals } = await service
    .from('referrals')
    .select('*')
    .eq('referred_user_id', userId)
    .is('converted_at', null)

  if (referrals && referrals.length > 0) {
    for (const ref of referrals) {
      await service.from('referrals').update({
        converted_at: now.toISOString(),
      }).eq('id', ref.id)

      // Count referrer's total conversions
      const { count } = await service
        .from('referrals')
        .select('id', { count: 'exact' })
        .eq('referrer_id', ref.referrer_id)
        .not('converted_at', 'is', null)

      if (count && count % 3 === 0) {
        // Grant 1 month Pro
        const referrerExpiry = new Date()
        referrerExpiry.setMonth(referrerExpiry.getMonth() + 1)
        await service.from('subscriptions').insert({
          user_id: ref.referrer_id, tier: 'pro', status: 'active',
          started_at: now.toISOString(), expires_at: referrerExpiry.toISOString(),
          activated_at: now.toISOString(),
        })
        await service.from('profiles').update({ tier: 'pro' }).eq('id', ref.referrer_id)
        await service.from('referrals').update({ rewarded: true, reward_type: '1_month_pro' }).eq('id', ref.id)
      }
    }
  }

  // Send confirmation email
  try {
    const { data: profile } = await service.from('profiles').select('email, full_name').eq('id', userId).single()
    if (profile?.email) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: 'subscription_confirmed',
          to: profile.email,
          data: { name: profile.full_name, tier, expiresAt: expiresAt.toLocaleDateString() },
        }),
      })
    }
  } catch {}

  return NextResponse.json({ success: true })
}
