import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Verify a Paynow webhook hash.
 * Hash = SHA512(reference + amount + paynowreference + pollurl + status + integrationKey)
 */
function verifyPaynowHash(
  reference: string,
  amount: string,
  paynowreference: string,
  pollurl: string,
  status: string,
  hash: string,
  integrationKey: string,
): boolean {
  const raw = reference + amount + paynowreference + pollurl + status + integrationKey
  const expected = crypto.createHash('sha512').update(raw).digest('hex').toUpperCase()
  return expected === hash.toUpperCase()
}

async function upgradeUser(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  tier: string,
  paymentId: string,
  paynowRef: string,
) {
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setMonth(expiresAt.getMonth() + 1)

  await service.from('subscriptions').insert({
    user_id:      userId,
    tier,
    status:       'active',
    started_at:   now.toISOString(),
    expires_at:   expiresAt.toISOString(),
    activated_at: now.toISOString(),
  })

  await service.from('profiles').update({ tier }).eq('id', userId)

  await service.from('pending_payments').update({
    status:         'approved',
    reviewed_at:    now.toISOString(),
    paynow_reference: paynowRef,
  }).eq('id', paymentId)

  // Referral rewards
  const { data: referrals } = await service
    .from('referrals').select('*')
    .eq('referred_user_id', userId).is('converted_at', null)

  if (referrals?.length) {
    for (const ref of referrals) {
      await service.from('referrals').update({ converted_at: now.toISOString() }).eq('id', ref.id)
      const { count } = await service.from('referrals').select('id', { count: 'exact' })
        .eq('referrer_id', ref.referrer_id).not('converted_at', 'is', null)
      if (count && count % 3 === 0) {
        const exp = new Date(); exp.setMonth(exp.getMonth() + 1)
        await service.from('subscriptions').insert({
          user_id: ref.referrer_id, tier: 'pro', status: 'active',
          started_at: now.toISOString(), expires_at: exp.toISOString(), activated_at: now.toISOString(),
        })
        await service.from('profiles').update({ tier: 'pro' }).eq('id', ref.referrer_id)
        await service.from('referrals').update({ rewarded: true, reward_type: '1_month_pro' }).eq('id', ref.id)
      }
    }
  }

  // Confirmation SMS
  try {
    const { data: profile } = await service.from('profiles').select('phone, full_name').eq('id', userId).single()
    const atKey = process.env.AT_API_KEY; const atUser = process.env.AT_USERNAME
    if (atKey && atUser && atUser !== 'sandbox' && profile?.phone) {
      const AT = (await import('africastalking')).default
      const at = AT({ apiKey: atKey, username: atUser })
      await at.SMS.send({
        to: [profile.phone],
        message: `BetGenius AI: Your ${tier} plan is now active! Enjoy unlimited match analysis.`,
        from: process.env.AT_SENDER_ID || 'BetGenius',
      })
    }
  } catch {}
}

/**
 * POST /api/webhooks/paynow
 * Paynow calls this URL after a payment is completed.
 * Configure in Paynow: Receive Payments → Manage Payment Settings → Result URL
 *   https://betgeniusai.vercel.app/api/webhooks/paynow
 */
export async function POST(req: NextRequest) {
  const service = createServiceClient()
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY || ''

  // Parse URL-encoded body
  let body: Record<string, string> = {}
  try {
    const text = await req.text()
    const params = new URLSearchParams(text)
    for (const [k, v] of params.entries()) body[k] = v
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  console.log('Paynow webhook received:', JSON.stringify(body))

  const { reference, amount, paynowreference, pollurl, status, hash } = body

  if (!reference || !status) {
    return NextResponse.json({ received: true, warning: 'missing fields' })
  }

  // Verify hash (skip in test/missing-key scenarios)
  if (integrationKey && hash) {
    const valid = verifyPaynowHash(reference, amount, paynowreference, pollurl, status, hash, integrationKey)
    if (!valid) {
      console.warn('Paynow webhook: invalid hash — possible spoofing attempt')
      return NextResponse.json({ error: 'Invalid hash' }, { status: 400 })
    }
  }

  // Look up the pending payment — reference is our payment UUID
  const { data: payment } = await service
    .from('pending_payments')
    .select('id, user_id, tier, status')
    .eq('id', reference)
    .single()

  if (!payment) {
    console.warn('Paynow webhook: payment not found for reference', reference)
    return NextResponse.json({ received: true, warning: 'payment not found' })
  }

  // Avoid double-processing
  if (payment.status === 'approved') {
    return NextResponse.json({ received: true, note: 'already processed' })
  }

  const paidStatuses = ['paid', 'awaiting delivery', 'delivered']

  if (paidStatuses.includes(status.toLowerCase())) {
    console.log(`Paynow webhook: PAID — upgrading user ${payment.user_id} to ${payment.tier}`)
    await upgradeUser(service, payment.user_id, payment.tier, payment.id, paynowreference || reference)
  } else if (['cancelled', 'disputed', 'failed'].includes(status.toLowerCase())) {
    console.log(`Paynow webhook: FAILED — status=${status}`)
    await service.from('pending_payments').update({
      status: 'failed',
      reviewed_at: new Date().toISOString(),
    }).eq('id', payment.id)
  }

  return NextResponse.json({ received: true })
}
