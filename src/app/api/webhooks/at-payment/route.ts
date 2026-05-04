import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/webhooks/at-payment
 *
 * Africa's Talking calls this URL when a Mobile Checkout payment is finalised.
 * Configure in the AT dashboard → Payments → your product → Callback URL:
 *   https://betgeniusai.vercel.app/api/webhooks/at-payment
 *
 * AT sends either JSON or URL-encoded form data depending on SDK version.
 * Payload includes the requestMetadata we passed at checkout time:
 *   { userId, tier, paymentId }
 */

export const dynamic = 'force-dynamic'

async function upgradeUser(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  tier: string,
  paymentId: string,
) {
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setMonth(expiresAt.getMonth() + 1)

  // 1. Create active subscription
  await service.from('subscriptions').insert({
    user_id: userId,
    tier,
    status: 'active',
    started_at:   now.toISOString(),
    expires_at:   expiresAt.toISOString(),
    activated_at: now.toISOString(),
  })

  // 2. Update profile tier
  await service.from('profiles').update({ tier }).eq('id', userId)

  // 3. Mark payment approved
  await service.from('pending_payments').update({
    status: 'approved',
    reviewed_at: now.toISOString(),
  }).eq('id', paymentId)

  // 4. Process referral rewards
  const { data: referrals } = await service
    .from('referrals')
    .select('*')
    .eq('referred_user_id', userId)
    .is('converted_at', null)

  if (referrals?.length) {
    for (const ref of referrals) {
      await service.from('referrals')
        .update({ converted_at: now.toISOString() })
        .eq('id', ref.id)

      const { count } = await service
        .from('referrals')
        .select('id', { count: 'exact' })
        .eq('referrer_id', ref.referrer_id)
        .not('converted_at', 'is', null)

      if (count && count % 3 === 0) {
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

  // 5. Send confirmation SMS if profile has phone
  try {
    const { data: profile } = await service
      .from('profiles')
      .select('phone, email, full_name')
      .eq('id', userId)
      .single()

    const atKey  = process.env.AT_API_KEY
    const atUser = process.env.AT_USERNAME
    if (atKey && atUser && atUser !== 'sandbox' && profile?.phone) {
      const AfricasTalking = (await import('africastalking')).default
      const at = AfricasTalking({ apiKey: atKey, username: atUser })
      await at.SMS.send({
        to: [profile.phone],
        message: `BetGenius AI: Your ${tier} plan is now active! Enjoy unlimited match analysis. — Team BetGenius`,
        from: process.env.AT_SENDER_ID || 'BetGenius',
      })
    }
  } catch (smsErr) {
    console.warn('Confirmation SMS failed (non-fatal):', smsErr)
  }
}

export async function POST(req: NextRequest) {
  const service = createServiceClient()

  // ── Parse body — AT sends JSON or URL-encoded depending on SDK version ──
  let body: Record<string, any> = {}
  const contentType = req.headers.get('content-type') || ''

  try {
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      const text = await req.text()
      const params = new URLSearchParams(text)
      // Flatten into a plain object
      for (const [key, val] of params.entries()) {
        body[key] = val
      }
    }
  } catch (parseErr) {
    console.error('Webhook parse error:', parseErr)
    return NextResponse.json({ error: 'Bad request body' }, { status: 400 })
  }

  console.log('AT webhook received:', JSON.stringify(body))

  const { transactionId, status } = body

  // ── Extract our metadata ─────────────────────────────────────────────
  let metadata: Record<string, string> = {}

  if (body.requestMetadata) {
    if (typeof body.requestMetadata === 'string') {
      try { metadata = JSON.parse(body.requestMetadata) } catch {}
    } else if (typeof body.requestMetadata === 'object') {
      metadata = body.requestMetadata
    }
  }

  // AT also sends metadata as requestMetadata[key]=value in form-encoded bodies
  if (!metadata.paymentId) {
    metadata = {
      userId:    body['requestMetadata[userId]']    || body['requestMetadata%5BuserId%5D']    || '',
      tier:      body['requestMetadata[tier]']      || body['requestMetadata%5Btier%5D']      || '',
      paymentId: body['requestMetadata[paymentId]'] || body['requestMetadata%5BpaymentId%5D'] || '',
    }
  }

  const { userId, tier, paymentId } = metadata

  if (!paymentId || !userId || !tier) {
    console.warn('AT webhook: missing metadata', { paymentId, userId, tier, body })
    // Still return 200 so AT doesn't keep retrying with bad data
    return NextResponse.json({ received: true, warning: 'missing metadata' })
  }

  // ── Handle payment outcome ───────────────────────────────────────────
  if (status === 'Success') {
    console.log(`AT webhook: payment SUCCESS — upgrading user ${userId} to ${tier}`)
    await upgradeUser(service, userId, tier, paymentId)
  } else if (status === 'Failed' || status === 'InvalidRequest') {
    console.log(`AT webhook: payment FAILED — status=${status}`)
    await service.from('pending_payments').update({
      status: 'failed',
      reviewed_at: new Date().toISOString(),
    }).eq('id', paymentId)
  } else {
    // PendingValidation, PendingConfirmation — still waiting, do nothing
    console.log(`AT webhook: intermediate status=${status} — no action`)
  }

  // Always return 200 so AT doesn't retry
  return NextResponse.json({ received: true })
}
