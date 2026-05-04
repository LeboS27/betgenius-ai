import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!p?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const [
    { count: total },
    { count: premium },
    { count: pro },
    { count: pending },
  ] = await Promise.all([
    service.from('profiles').select('id', { count: 'exact', head: true }),
    service.from('profiles').select('id', { count: 'exact', head: true }).eq('tier', 'premium'),
    service.from('profiles').select('id', { count: 'exact', head: true }).eq('tier', 'pro'),
    service.from('pending_payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  return NextResponse.json({
    totalUsers: total,
    premiumUsers: premium,
    proUsers: pro,
    pendingPayments: pending,
    mrr: ((premium || 0) * 2) + ((pro || 0) * 5),
  })
}
