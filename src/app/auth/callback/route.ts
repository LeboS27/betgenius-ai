import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const ref = searchParams.get('ref')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (ref) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('profiles').update({ referral_code: ref }).eq('id', user.id)
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Admin bypasses onboarding entirely
        if (user.email === 'lebohangsebata20@gmail.com') {
          return NextResponse.redirect(`${origin}/dashboard`)
        }
        const { data: profile } = await supabase.from('profiles').select('onboarding_complete').eq('id', user.id).single()
        if (profile && !profile.onboarding_complete) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
