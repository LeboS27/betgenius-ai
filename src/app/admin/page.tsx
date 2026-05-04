import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminDashboard } from './AdminDashboard'

const ADMIN_EMAIL = 'lebohangsebata20@gmail.com'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only the hardcoded admin email may access this page
  if (user.email !== ADMIN_EMAIL) redirect('/dashboard')

  const service = createServiceClient()

  // Ensure admin flags are always correct — auto-repair on every page load
  await service
    .from('profiles')
    .update({ is_admin: true, onboarding_complete: true })
    .eq('id', user.id)

  // Stats — use service client to bypass RLS for aggregate queries
  const [
    { count: totalUsers },
    { count: premiumUsers },
    { count: proUsers },
    { data: pendingPayments },
    { data: recentUsers },
  ] = await Promise.all([
    service.from('profiles').select('id', { count: 'exact', head: true }),
    service.from('profiles').select('id', { count: 'exact', head: true }).eq('tier', 'premium'),
    service.from('profiles').select('id', { count: 'exact', head: true }).eq('tier', 'pro'),
    service.from('pending_payments').select('*, profiles(email, full_name, phone)').eq('status', 'pending').order('submitted_at', { ascending: false }),
    service.from('profiles').select('id, full_name, email, tier, created_at, analyses_today, is_admin').order('created_at', { ascending: false }).limit(50),
  ])

  const { data: config } = await service.from('platform_config').select('*')

  return (
    <AdminDashboard
      stats={{ totalUsers: totalUsers || 0, premiumUsers: premiumUsers || 0, proUsers: proUsers || 0 }}
      pendingPayments={pendingPayments || []}
      recentUsers={recentUsers || []}
      config={config || []}
    />
  )
}
