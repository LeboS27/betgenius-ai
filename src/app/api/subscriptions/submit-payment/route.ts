import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import AfricasTalking from 'africastalking'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tier, paynowReference } = await req.json()
  if (!tier || !paynowReference) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const prices = { premium: 2.00, pro: 5.00 }
  const amount = prices[tier as keyof typeof prices]
  if (!amount) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })

  const service = createServiceClient()
  const { data: profile } = await supabase.from('profiles').select('phone, email, full_name').eq('id', user.id).single()

  // Create pending payment record
  await service.from('pending_payments').insert({
    user_id: user.id,
    tier,
    amount,
    paynow_reference: paynowReference,
    status: 'pending',
  })

  // Notify admin via email
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: 'admin_new_payment',
        to: 'lebohangsbeta20@gmail.com',
        data: {
          user: profile?.full_name || profile?.email,
          tier,
          amount,
          reference: paynowReference,
          userId: user.id,
        },
      }),
    })
  } catch {}

  // Notify user
  try {
    if (profile?.phone) {
      const at = AfricasTalking({ apiKey: process.env.AT_API_KEY!, username: process.env.AT_USERNAME! })
      await at.SMS.send({
        to: [profile.phone],
        message: `BetGenius AI: We received your payment reference ${paynowReference} for ${tier} (${amount} USD). We'll activate within 24 hours. — Team BetGenius`,
        from: process.env.AT_SENDER_ID,
      })
    }
  } catch {}

  return NextResponse.json({ success: true, message: 'Payment submitted. Activation within 24 hours.' })
}
