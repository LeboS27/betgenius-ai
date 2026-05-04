import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import AfricasTalking from 'africastalking'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { message, target } = await req.json()
  const service = createServiceClient()

  let query = service.from('profiles').select('phone').not('phone', 'is', null).eq('phone_verified', true)
  if (target === 'premium') query = query.eq('tier', 'premium')
  else if (target === 'pro') query = query.eq('tier', 'pro')
  else if (target === 'expired') {
    const { data: expiredSubs } = await service.from('subscriptions').select('user_id').eq('status', 'expired')
    const ids = expiredSubs?.map(s => s.user_id) || []
    if (ids.length) query = query.in('id', ids)
  }

  const { data: profiles } = await query.limit(500)
  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  const at = AfricasTalking({ apiKey: process.env.AT_API_KEY!, username: process.env.AT_USERNAME! })
  const phones = profiles.map(p => p.phone).filter(Boolean) as string[]

  // Send in batches of 100
  let sent = 0
  for (let i = 0; i < phones.length; i += 100) {
    const batch = phones.slice(i, i + 100)
    try {
      await at.SMS.send({ to: batch, message, from: process.env.AT_SENDER_ID })
      sent += batch.length
    } catch (e) { console.error('SMS batch error', e) }
  }

  return NextResponse.json({ sent })
}
