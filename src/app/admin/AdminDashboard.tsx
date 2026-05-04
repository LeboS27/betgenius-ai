'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { TierBadge } from '@/components/ui/Badge'

interface Stats { totalUsers: number; premiumUsers: number; proUsers: number }

export function AdminDashboard({
  stats, pendingPayments, recentUsers, config
}: {
  stats: Stats
  pendingPayments: any[]
  recentUsers: any[]
  config: any[]
}) {
  const [tab, setTab] = useState<'overview' | 'payments' | 'users' | 'config'>('overview')
  const [activating, setActivating] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [smsMessage, setSmsMessage] = useState('')
  const [smsTarget, setSmsTarget] = useState('all')
  const [smsSending, setSmsSending] = useState(false)

  const activatePayment = async (payment: any) => {
    setActivating(payment.id)
    await fetch('/api/subscriptions/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': '' },
      body: JSON.stringify({ userId: payment.user_id, tier: payment.tier, paymentId: payment.id }),
    })
    setActivating(null)
    window.location.reload()
  }

  const rejectPayment = async (paymentId: string) => {
    setRejecting(paymentId)
    await fetch(`/api/admin/payments/${paymentId}/reject`, { method: 'POST' })
    setRejecting(null)
    window.location.reload()
  }

  const broadcastSms = async () => {
    if (!smsMessage.trim()) return
    setSmsSending(true)
    await fetch('/api/admin/broadcast-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: smsMessage, target: smsTarget }),
    })
    setSmsSending(false)
    setSmsMessage('')
    alert('SMS broadcast sent!')
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'payments', label: `Payments${pendingPayments.length > 0 ? ` (${pendingPayments.length})` : ''}` },
    { id: 'users', label: 'Users' },
    { id: 'config', label: 'Config' },
  ] as const

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="border-b border-[var(--border)] px-4 sm:px-6 h-14 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mr-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center">
            <span className="font-display text-white text-xs">BG</span>
          </div>
          <span className="font-semibold text-sm text-[var(--text-primary)]">Admin Dashboard</span>
        </div>
        <a href="/dashboard" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">← App</a>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border flex-shrink-0 transition-colors ${
                tab === t.id
                  ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]'
              }`}>{t.label}</button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total registered users', value: stats.totalUsers, color: 'text-[var(--text-primary)]', sub: 'all tiers' },
                { label: '$2/mo Plan — Premium', value: stats.premiumUsers, color: 'text-blue-500', sub: 'premium subscribers' },
                { label: '$5/mo Plan — Pro', value: stats.proUsers, color: 'text-yellow-500', sub: 'pro subscribers' },
                { label: 'MRR estimate', value: `$${(stats.premiumUsers * 2 + stats.proUsers * 5).toFixed(0)}`, color: 'text-[var(--success)]', sub: 'monthly recurring revenue' },
                { label: 'Pending payments', value: pendingPayments.length, color: pendingPayments.length > 0 ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]', sub: 'awaiting activation' },
              ].map(stat => (
                <div key={stat.label} className="card p-4">
                  <div className={`font-display text-3xl ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs font-semibold text-[var(--text-secondary)] mt-1">{stat.label}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Broadcast SMS */}
            <div className="card p-5">
              <h2 className="font-semibold text-sm text-[var(--text-primary)] mb-4">Broadcast SMS</h2>
              <div className="space-y-3">
                <select
                  value={smsTarget}
                  onChange={e => setSmsTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)]"
                >
                  <option value="all">All users</option>
                  <option value="premium">Premium only</option>
                  <option value="pro">Pro only</option>
                  <option value="expired">Expired subscribers</option>
                </select>
                <textarea
                  value={smsMessage}
                  onChange={e => setSmsMessage(e.target.value)}
                  placeholder="SMS message..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none"
                />
                <Button size="sm" onClick={broadcastSms} loading={smsSending} disabled={!smsMessage.trim()}>
                  Send Broadcast
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Payments */}
        {tab === 'payments' && (
          <div className="space-y-3">
            {pendingPayments.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)]">No pending payments</div>
            ) : (
              pendingPayments.map((p: any) => (
                <div key={p.id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-[var(--text-primary)]">{p.profiles?.full_name || p.profiles?.email}</span>
                        <TierBadge tier={p.tier} />
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{p.profiles?.email} · {p.profiles?.phone}</p>
                      <div className="mt-2 font-mono text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded inline-block">
                        Ref: {p.paynow_reference}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        ${p.amount} · {new Date(p.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="success"
                        size="sm"
                        loading={activating === p.id}
                        onClick={() => activatePayment(p)}
                      >Activate</Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={rejecting === p.id}
                        onClick={() => rejectPayment(p.id)}
                      >Reject</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <div className="flex justify-end mb-3">
              <a
                href="/api/admin/export-users"
                className="text-xs text-[var(--accent-primary)] hover:underline"
              >Export CSV</a>
            </div>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                      <th className="text-left px-4 py-3 font-medium">User</th>
                      <th className="text-left px-4 py-3 font-medium">Tier</th>
                      <th className="text-left px-4 py-3 font-medium">Joined</th>
                      <th className="text-right px-4 py-3 font-medium">Today</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {recentUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-[var(--bg-tertiary)]">
                        <td className="px-4 py-3">
                          <div className="text-[var(--text-primary)] text-xs font-medium">{u.full_name || '—'}</div>
                          <div className="text-[var(--text-muted)] text-xs">{u.email}</div>
                        </td>
                        <td className="px-4 py-3"><TierBadge tier={u.tier} /></td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-primary)]">{u.analyses_today}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Config */}
        {tab === 'config' && (
          <div className="card p-5">
            <h2 className="font-semibold text-sm text-[var(--text-primary)] mb-4">Platform Config</h2>
            <div className="space-y-3">
              {config.map((c: any) => (
                <div key={c.key} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-sm font-mono text-[var(--text-secondary)]">{c.key}</span>
                  <span className="text-sm text-[var(--text-primary)] font-mono">{JSON.stringify(c.value)}</span>
                </div>
              ))}
              {config.length === 0 && <p className="text-sm text-[var(--text-muted)]">No config entries yet. Seed your database.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
