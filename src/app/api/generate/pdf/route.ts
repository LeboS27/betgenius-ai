import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
  if (profile?.tier !== 'pro') return new NextResponse('Pro required', { status: 403 })

  const matchId = req.nextUrl.searchParams.get('matchId')
  if (!matchId) return new NextResponse('matchId required', { status: 400 })

  const service = createServiceClient()
  const { data: match } = await service.from('matches').select('*').eq('id', matchId).single()
  const { data: analysis } = await service
    .from('cached_analyses')
    .select('report')
    .eq('match_id', matchId)
    .eq('analysis_type', 'full_expert_report')
    .single()

  if (!match || !analysis?.report) return new NextResponse('Analysis not found', { status: 404 })

  const report = analysis.report as any
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>BetGenius AI — ${match.home_team} vs ${match.away_team}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1a1a2e;background:#fff;}
  h1{color:#0004F7;font-size:28px;border-bottom:3px solid #0004F7;padding-bottom:8px;}
  h2{color:#1a1a2e;font-size:18px;margin-top:24px;}
  .meta{color:#666;font-size:13px;margin-bottom:24px;}
  .top-pick{background:#f0f4ff;border:1px solid #0004F7;border-radius:8px;padding:16px;margin:16px 0;}
  .confidence{display:inline-block;background:#0004F7;color:#fff;border-radius:20px;padding:2px 12px;font-size:12px;font-weight:bold;}
  table{width:100%;border-collapse:collapse;margin-top:12px;}
  th{background:#0004F7;color:#fff;padding:8px 12px;text-align:left;font-size:12px;}
  td{padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;}
  tr:nth-child(even){background:#f9f9ff;}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;}
</style></head>
<body>
<h1>BetGenius AI — Match Analysis</h1>
<div class="meta">
  <strong>${match.home_team} vs ${match.away_team}</strong><br>
  ${match.competition} · ${match.stage || ''}<br>
  Kickoff: ${new Date(match.kickoff_utc).toLocaleString()} · Generated: ${new Date().toLocaleString()}
</div>

<h2>Top Pick</h2>
<div class="top-pick">
  <strong>${report.topPick?.category}: ${report.topPick?.selection}</strong>
  <span class="confidence">${report.topPick?.confidence}%</span>
  <p style="margin:8px 0 0;color:#555;font-size:14px;">${report.topPick?.reasoning || ''}</p>
</div>

<h2>Overall Verdict</h2>
<p style="font-style:italic;color:#444;">${report.overallVerdict || 'N/A'}</p>

<h2>Market Analysis</h2>
<table>
  <tr><th>Market</th><th>Selection</th><th>Confidence</th><th>Value</th></tr>
  ${(report.marketAnalysis || []).map((m: any) => `
    <tr>
      <td>${m.marketName}</td>
      <td>${m.isInsufficientData ? '—' : m.recommendedSelection}</td>
      <td>${m.isInsufficientData ? '—' : m.confidence + '%'}</td>
      <td>${m.valueIndicator ? '✓ Value' : ''}</td>
    </tr>
  `).join('')}
</table>

${report.correctScoreTop3?.length ? `
<h2>Correct Score Top 3</h2>
<table>
  <tr><th>Score</th><th>Confidence</th></tr>
  ${report.correctScoreTop3.map((cs: any) => `<tr><td><strong>${cs.score}</strong></td><td>${cs.confidence}%</td></tr>`).join('')}
</table>` : ''}

${report.keyInsights?.length ? `
<h2>Key Insights</h2>
<ul>${report.keyInsights.map((i: string) => `<li>${i}</li>`).join('')}</ul>` : ''}

<div class="footer">
  ⚠️ BetGenius AI provides statistical analysis for informational purposes only. This is not betting advice. Always gamble responsibly.
</div>
</body></html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="betgenius-${match.home_team}-vs-${match.away_team}.html"`,
    },
  })
}
