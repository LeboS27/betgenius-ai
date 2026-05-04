import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/subscriptions/payment-status?id=<paymentId>
 * Called by the payment page every 3 s to check if the EcoCash push was confirmed.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing payment id' }, { status: 400 })

  const service = createServiceClient()
  const { data: payment } = await service
    .from('pending_payments')
    .select('id, status, tier, user_id')
    .eq('id', id)
    .eq('user_id', user.id) // users may only query their own payments
    .single()

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  return NextResponse.json({
    status: payment.status,  // 'pending' | 'approved' | 'failed' | 'rejected'
    tier:   payment.tier,
  })
}
