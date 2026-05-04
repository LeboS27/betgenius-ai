import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!p?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, days, tier } = await req.json()
  const service = createServiceClient()

  const expires = new Date()
  expires.setDate(expires.getDate() + days)

  await service.from('subscriptions').insert({
    user_id: userId, tier, status: 'active',
    started_at: new Date().toISOString(),
    expires_at: expires.toISOString(),
    activated_at: new Date().toISOString(),
  })
  await service.from('profiles').update({ tier }).eq('id', userId)

  return NextResponse.json({ success: true })
}
