import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const now = new Date().toISOString()

  // Find expired active subscriptions
  const { data: expired } = await service
    .from('subscriptions')
    .select('user_id, tier')
    .eq('status', 'active')
    .lte('expires_at', now)

  if (!expired?.length) return NextResponse.json({ downgraded: 0 })

  let downgraded = 0
  for (const sub of expired) {
    await service.from('subscriptions').update({ status: 'expired' })
      .eq('user_id', sub.user_id).eq('status', 'active')

    await service.from('profiles').update({ tier: 'free' }).eq('id', sub.user_id)
    downgraded++
  }

  return NextResponse.json({ downgraded, timestamp: now })
}
