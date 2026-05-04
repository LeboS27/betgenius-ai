import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ReferralPage({ params }: { params: { code: string } }) {
  const service = createServiceClient()

  // Find referrer by code (first 8 chars of UUID)
  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name')
    .limit(500)

  const referrer = profiles?.find(p => p.id.replace(/-/g, '').slice(0, 8).toUpperCase() === params.code.toUpperCase())

  if (referrer) {
    redirect(`/signup?ref=${params.code}`)
  } else {
    redirect('/signup')
  }
}
