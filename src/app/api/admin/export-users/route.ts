import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!p?.is_admin) return new NextResponse('Forbidden', { status: 403 })

  const service = createServiceClient()
  const { data } = await service.from('profiles').select('id, full_name, email, phone, tier, created_at, analyses_today').order('created_at', { ascending: false })

  const rows = [
    ['ID', 'Name', 'Email', 'Phone', 'Tier', 'Joined', 'Analyses Today'],
    ...(data || []).map(u => [u.id, u.full_name || '', u.email, u.phone || '', u.tier, u.created_at, u.analyses_today])
  ]
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="betgenius-users.csv"',
    },
  })
}
