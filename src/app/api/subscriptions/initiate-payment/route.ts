import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const PLANS = {
  premium: { label: 'Premium', amount: 2.00 },
  pro:     { label: 'Pro',     amount: 5.00 },
}

const PAYNOW_INIT_URL = 'https://www.paynow.co.zw/interface/remotetransaction'

/** Normalise to local Zimbabwe format 07XXXXXXXX for Paynow EcoCash */
function toPaynowPhone(raw: string): string {
  let p = raw.replace(/[\s\-]/g, '')
  if (p.startsWith('+263'))    p = '0' + p.slice(4)
  else if (p.startsWith('263')) p = '0' + p.slice(3)
  else if (p.startsWith('00263')) p = '0' + p.slice(5)
  if (!p.startsWith('0')) p = '0' + p
  return p
}

/** Normalise to +263XXXXXXXXX for display */
function toDisplayPhone(raw: string): string {
  let p = toPaynowPhone(raw)
  return '+263' + p.slice(1)
}

/**
 * Paynow hash: SHA512 of core fields concatenated + integration key.
 * Fields: id, reference, amount, additionalinfo, returnurl, resulturl, status
 */
function paynowHash(
  id: string, reference: string, amount: string, additionalinfo: string,
  returnurl: string, resulturl: string, status: string, key: string
): string {
  const raw = id + reference + amount + additionalinfo + returnurl + resulturl + status + key
  return crypto.createHash('sha512').update(raw).digest('hex').toUpperCase()
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tier, phone } = await req.json() as { tier: string; phone: string }
  const plan = PLANS[tier as keyof typeof PLANS]
  if (!plan)  return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })

  const paynowPhone  = toPaynowPhone(phone.trim())
  const displayPhone = toDisplayPhone(phone.trim())
  const service = createServiceClient()

  // Create a pending payment record — its UUID becomes the Paynow reference
  const { data: payment, error: insertErr } = await service
    .from('pending_payments')
    .insert({
      user_id: user.id,
      tier,
      amount: plan.amount,
      paynow_reference: 'PENDING',
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertErr || !payment) {
    console.error('pending_payments insert error:', insertErr)
    return NextResponse.json({ error: 'Could not create payment record' }, { status: 500 })
  }

  const paymentId  = payment.id
  const integrationId  = process.env.PAYNOW_INTEGRATION_ID  || ''
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY || ''
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'https://betgeniusai.vercel.app'
  const returnUrl  = `${appUrl}/dashboard`
  const resultUrl  = `${appUrl}/api/webhooks/paynow`
  const reference  = paymentId   // use our UUID so the webhook can find the record
  const amount     = plan.amount.toFixed(2)
  const info       = `BetGenius AI ${plan.label} Subscription`

  // ── Paynow EcoCash Mobile Checkout ────────────────────────────────
  if (integrationId && integrationKey) {
    try {
      const hash = paynowHash(integrationId, reference, amount, info, returnUrl, resultUrl, 'Message', integrationKey)

      const body = new URLSearchParams({
        id:             integrationId,
        reference,
        amount,
        additionalinfo: info,
        authemail:      user.email || '',
        phone:          paynowPhone,
        method:         'ecocash',
        returnurl:      returnUrl,
        resulturl:      resultUrl,
        status:         'Message',
        hash,
      })

      const res  = await fetch(PAYNOW_INIT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    body.toString(),
      })

      const text   = await res.text()
      const result = Object.fromEntries(new URLSearchParams(text))
      console.log('Paynow initiate response:', JSON.stringify(result))

      if (result.status?.toLowerCase() === 'ok') {
        // Store Paynow's poll URL so we can check status
        const pollUrl = result.pollurl || ''
        await service.from('pending_payments')
          .update({ paynow_reference: pollUrl || reference })
          .eq('id', paymentId)

        return NextResponse.json({
          success: true,
          method:  'push',
          paymentId,
          phone:   displayPhone,
          pollUrl,
        })
      }

      console.warn('Paynow error response:', result.error || result.status)
    } catch (err: any) {
      console.error('Paynow initiate error:', err?.message)
    }
  }

  // ── Manual fallback ────────────────────────────────────────────────
  const merchant = process.env.ECOCASH_MERCHANT_NUMBER || '0777501038'
  const fallbackRef = `BG-${user.id.slice(0, 6).toUpperCase()}`
  await service.from('pending_payments')
    .update({ paynow_reference: fallbackRef })
    .eq('id', paymentId)

  return NextResponse.json({
    success: true,
    method:  'manual',
    paymentId,
    phone:   displayPhone,
    manual: {
      amount:    `$${plan.amount.toFixed(2)} USD`,
      merchant,
      reference: fallbackRef,
    },
  })
}
