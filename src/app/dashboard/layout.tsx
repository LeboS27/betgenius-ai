import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar, BottomNav } from '@/components/layout/Navbar'
import { headers } from 'next/headers'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Admin always bypasses onboarding — they go straight to the dashboard
  const isAdmin = user.email === 'lebohangsebata20@gmail.com'
  if (!isAdmin && profile && !profile.onboarding_complete) redirect('/onboarding')

  const headersList = headers()
  const pathname = headersList.get('x-invoke-path') || '/dashboard'

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-16 md:pb-0">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
      <BottomNav pathname={pathname} />
    </div>
  )
}
