import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import AfricasTalking from 'africastalking'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  const { data: expiringSoon } = await service
    .from('subscriptions')
    .select('user_id, tier, expires_at, profiles(phone, email, full_name)')
    .eq('status', 'active')
    .gte('expires_at', now)
    .lte('expires_at', in3Days)

  if (!expiringSoon?.length) return NextResponse.json({ sent: 0 })

  const at = AfricasTalking({ apiKey: process.env.AT_API_KEY!, username: process.env.AT_USERNAME! })
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://betgeniusai.vercel.app'
  let sent = 0

  for (const sub of expiringSoon) {
    const profile = sub.profiles as any
    if (!profile?.phone) continue

    const daysLeft = Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    try {
      await at.SMS.send({
        to: [profile.phone],
        message: `BetGenius AI: Your ${sub.tier} subscription expires in ${daysLeft} day(s). Renew now to keep access: ${APP_URL}/pricing`,
        from: process.env.AT_SENDER_ID,
      })

      // Also send email reminder
      if (profile.email) {
        await fetch(`${APP_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'expiry_warning',
            to: profile.email,
            data: { tier: sub.tier, days: daysLeft, name: profile.full_name },
          }),
        })
      }
      sent++
    } catch (e) { console.error('Reminder SMS error', e) }
  }

  return NextResponse.json({ sent, timestamp: new Date().toISOString() })
}
