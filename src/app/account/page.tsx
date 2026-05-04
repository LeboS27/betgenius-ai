import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { AccountClient } from './AccountClient'
import Link from 'next/link'

export default async function AccountPage() {
  const supabase = createClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use service client to bypass RLS for all profile-related reads
  const { data: profile } = await service.from('profiles').select('*').eq('id', user.id).single()
  const { data: subscription } = await service
    .from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active')
    .order('expires_at', { ascending: false }).limit(1).maybeSingle()

  const { data: referrals } = await service
    .from('referrals').select('*', { count: 'exact' }).eq('referrer_id', user.id)

  const referralCount = referrals?.length || 0
  const convertedCount = referrals?.filter(r => r.converted_at).length || 0

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Back button */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to matches
        </Link>
        <AccountClient
          profile={profile}
          subscription={subscription}
          referralCount={referralCount}
          convertedCount={convertedCount}
        />
      </main>
    </div>
  )
}
