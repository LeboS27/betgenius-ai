import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@betgeniusai.vercel.app'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://betgeniusai.vercel.app'

type Template =
  | 'email_verification'
  | 'welcome'
  | 'subscription_confirmed'
  | 'expiry_warning'
  | 'payment_received'
  | 'admin_new_payment'

function buildHtml(template: Template, data: Record<string, any>): { subject: string; html: string } {
  const base = (content: string) => `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"/></head>
    <body style="background:#0A0E1A;color:#fff;font-family:'DM Sans',Arial,sans-serif;margin:0;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0F1629;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
          <tr><td style="background:#0004F7;padding:20px 32px;text-align:center;">
            <span style="font-family:'Bebas Neue',Impact,sans-serif;font-size:24px;color:#fff;letter-spacing:2px;">BETGENIUS AI</span>
          </td></tr>
          <tr><td style="padding:32px;">${content}</td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
            <p style="font-size:11px;color:#4A5568;margin:0;">⚠️ BetGenius AI is an analysis platform only — not betting advice.</p>
            <p style="font-size:11px;color:#4A5568;margin:8px 0 0;">© 2024 BetGenius AI · <a href="${APP_URL}/terms" style="color:#0004F7;">Terms</a> · <a href="${APP_URL}/privacy" style="color:#0004F7;">Privacy</a></p>
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>`

  const btn = (text: string, url: string) =>
    `<a href="${url}" style="display:inline-block;background:#0004F7;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">${text}</a>`

  const h1 = (text: string) => `<h1 style="color:#fff;font-size:22px;margin:0 0 16px;">${text}</h1>`
  const p = (text: string) => `<p style="color:#A9B5C8;font-size:15px;line-height:1.6;margin:0 0 16px;">${text}</p>`

  switch (template) {
    case 'email_verification':
      return {
        subject: 'Verify your BetGenius AI email',
        html: base(`${h1('Verify your email')}${p(`Hi${data.name ? ` ${data.name}` : ''},`)}${p('Click below to verify your email address and activate your BetGenius AI account.')}<br>${btn('Verify Email', data.verifyUrl || APP_URL)}`),
      }

    case 'welcome':
      return {
        subject: 'Welcome to BetGenius AI — your free tier is active',
        html: base(`${h1('Welcome to BetGenius AI')}${p(`Hi ${data.name || 'there'}!`)}${p("Your free tier is active. You get <strong style='color:#fff;'>4 analyses per day</strong>. Upgrade anytime for unlimited access.")}<br>${btn('Go to Dashboard', `${APP_URL}/dashboard`)}<br><br>${p(`Your referral link: <a href="${APP_URL}/ref/${data.referralCode}" style="color:#0004F7;">${APP_URL}/ref/${data.referralCode}</a>`)}`),
      }

    case 'subscription_confirmed':
      return {
        subject: `Your ${data.tier} subscription is now active`,
        html: base(`${h1('Subscription Confirmed ✓')}${p(`Your <strong style="color:#fff;">${data.tier}</strong> subscription is now active until <strong style="color:#fff;">${data.expiresAt}</strong>.`)}${p('Enjoy unlimited analyses.')}<br>${btn('Start Analysing', `${APP_URL}/dashboard`)}`),
      }

    case 'expiry_warning':
      return {
        subject: `Your ${data.tier} subscription expires in ${data.days} days`,
        html: base(`${h1('Subscription Expiring Soon')}${p(`Your <strong style="color:#fff;">${data.tier}</strong> subscription expires in <strong style="color:#fff;">${data.days} days</strong>.`)}${p('Renew now to keep your access.')}<br>${btn('Renew Subscription', `${APP_URL}/pricing`)}`),
      }

    case 'payment_received':
      return {
        subject: 'Payment reference received — activating within 24 hours',
        html: base(`${h1('Payment Received')}${p(`We received your payment reference: <strong style="color:#fff;">${data.reference}</strong>.`)}${p('Our team will verify and activate your subscription within 24 hours.')}`),
      }

    case 'admin_new_payment':
      return {
        subject: `New payment pending: ${data.user} — ${data.tier}`,
        html: base(`${h1('New Payment Pending')}${p(`<strong>User:</strong> ${data.user}`)}<p style="color:#A9B5C8;">Tier: ${data.tier} · Amount: $${data.amount}<br>Reference: ${data.reference}</p><br>${btn('Review in Admin', `${APP_URL}/admin`)}`),
      }

    default:
      return { subject: 'BetGenius AI', html: base(p('Notification from BetGenius AI.')) }
  }
}

export async function POST(req: NextRequest) {
  const { template, to, data } = await req.json() as { template: Template; to: string; data: Record<string, any> }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { subject, html } = buildHtml(template, data)
    await resend.emails.send({ from: `BetGenius AI <${FROM}>`, to, subject, html })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
