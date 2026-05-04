import { format, parseISO } from 'date-fns'

export function formatKickoff(utc: string): string {
  try {
    const date = parseISO(utc)
    const now = new Date()
    const diff = date.getTime() - now.getTime()

    if (diff < 0 && diff > -7200000) return 'In progress'
    if (diff < 86400000 && diff > 0) return format(date, 'HH:mm') + ' CAT'
    return format(date, 'dd MMM HH:mm') + ' CAT'
  } catch {
    return utc
  }
}

export function getFormColor(result: string): string {
  if (result === 'W') return 'form-W'
  if (result === 'L') return 'form-L'
  return 'form-D'
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 75) return 'var(--success)'
  if (confidence >= 55) return 'var(--warning)'
  return 'var(--text-muted)'
}

export function tierCanAccess(tier: string, required: string): boolean {
  const levels = { free: 0, premium: 1, pro: 2 }
  return (levels[tier as keyof typeof levels] ?? 0) >= (levels[required as keyof typeof levels] ?? 0)
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.startsWith('263')) return `+${clean}`
  if (clean.startsWith('0')) return `+263${clean.slice(1)}`
  return `+263${clean}`
}

export function buildWhatsappMessage(params: {
  homeTeam: string
  awayTeam: string
  date: string
  competition: string
  selection: string
  confidence: number
  reasoning: string
  referralCode: string
}): string {
  const { homeTeam, awayTeam, date, competition, selection, confidence, reasoning, referralCode } = params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://betgeniusai.vercel.app'
  const message = `🧠 *BetGenius AI — Match Analysis*\n\n🌐 ${homeTeam} vs ${awayTeam}\n📅 ${date} | ${competition}\n\n🎯 *Top Pick:* ${selection}\n📊 *Confidence:* ${confidence}%\n💡 ${reasoning}\n\n⚠️ _This is analysis only, not betting advice._\n\n🔗 Get your free analysis → ${appUrl}/ref/${referralCode}`
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function generateReferralCode(userId: string): string {
  return userId.replace(/-/g, '').slice(0, 8).toUpperCase()
}
