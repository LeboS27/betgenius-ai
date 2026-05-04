import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/** Normalise a Zimbabwean phone number to +263XXXXXXXXX for Africa's Talking */
function normalisePhone(raw: string): string {
  let p = raw.replace(/\s+/g, '').replace(/-/g, '')
  if (p.startsWith('00263')) p = '+263' + p.slice(5)
  else if (p.startsWith('0263')) p = '+263' + p.slice(4)
  else if (p.startsWith('263')) p = '+' + p
  else if (p.startsWith('0')) p = '+263' + p.slice(1)
  else if (!p.startsWith('+')) p = '+263' + p
  return p
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { phone, action } = body
  const service = createServiceClient()
  const isSandbox = process.env.AT_USERNAME === 'sandbox'
  const isDev = process.env.NODE_ENV === 'development'

  // ── SEND OTP ──────────────────────────────────────────────────
  if (action === 'send') {
    if (!phone?.trim()) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })

    const normalisedPhone = normalisePhone(phone.trim())
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Store OTP in session_token
    const { error: updateErr } = await service
      .from('profiles')
      .update({ session_token: `${otp}:${expires}` })
      .eq('id', user.id)

    if (updateErr) {
      console.error('Failed to store OTP:', updateErr)
      return NextResponse.json({ error: 'Could not generate OTP. Try again.' }, { status: 500 })
    }

    // In sandbox / dev mode — skip real SMS and return OTP directly for testing
    if (isSandbox || isDev) {
      console.info(`[DEV/SANDBOX] OTP for ${normalisedPhone}: ${otp}`)
      return NextResponse.json({
        success: true,
        sandbox: true,
        // Only expose OTP in dev — never in production
        devOtp: isDev ? otp : undefined,
        message: isSandbox
          ? 'Sandbox mode: SMS not sent to real phones. Check server logs for the OTP.'
          : 'OTP generated.',
      })
    }

    // Production — send real SMS via Africa's Talking
    const atKey = process.env.AT_API_KEY
    const atUser = process.env.AT_USERNAME
    if (!atKey || !atUser) {
      return NextResponse.json({ error: 'SMS service not configured.' }, { status: 500 })
    }

    try {
      const AfricasTalking = (await import('africastalking')).default
      const at = AfricasTalking({ apiKey: atKey, username: atUser })
      const result = await at.SMS.send({
        to: [normalisedPhone],
        message: `Your BetGenius AI verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.AT_SENDER_ID || undefined,
      })

      // Check for delivery failure in AT response
      const recipient = result?.SMSMessageData?.Recipients?.[0]
      if (recipient && recipient.status !== 'Success') {
        console.error('AT SMS delivery failed:', JSON.stringify(result))
        return NextResponse.json({
          error: `SMS failed: ${recipient.status || 'unknown error'}. Check the phone number format.`,
        }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    } catch (smsErr: any) {
      console.error('AT SMS error:', smsErr)
      return NextResponse.json({
        error: `SMS failed: ${smsErr?.message || 'Unknown error'}. Check your phone number.`,
      }, { status: 400 })
    }
  }

  // ── VERIFY OTP ────────────────────────────────────────────────
  if (action === 'verify') {
    const { otp } = body
    if (!otp) return NextResponse.json({ error: 'OTP required' }, { status: 400 })

    const { data: profile } = await service
      .from('profiles')
      .select('session_token')
      .eq('id', user.id)
      .single()

    if (!profile?.session_token) {
      return NextResponse.json({ error: 'No OTP sent. Request a new code first.' }, { status: 400 })
    }

    const [storedOtp, expiresAt] = profile.session_token.split(':')
    if (Date.now() > new Date(expiresAt).getTime()) {
      return NextResponse.json({ error: 'OTP expired. Request a new code.' }, { status: 400 })
    }
    if (otp.trim() !== storedOtp) {
      return NextResponse.json({ error: 'Incorrect code. Try again.' }, { status: 400 })
    }

    const normalisedPhone = normalisePhone(phone.trim())
    await service.from('profiles').update({
      phone: normalisedPhone,
      phone_verified: true,
      session_token: null,
    }).eq('id', user.id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
