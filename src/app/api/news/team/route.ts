import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const team = searchParams.get('team')
  if (!team) return NextResponse.json({ error: 'team required' }, { status: 400 })

  const supabase = createServiceClient()

  // Check cache (30 min TTL)
  const { data: cached } = await supabase
    .from('news_cache')
    .select('*')
    .eq('team_name', team)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at).getTime()
    if (age < 30 * 60 * 1000) {
      return NextResponse.json({ headlines: cached.headlines, cached: true })
    }
  }

  // Fetch from Google News RSS
  try {
    const query = encodeURIComponent(`${team} football`)
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en&gl=ZW&ceid=ZW:en`
    const res = await fetch(rssUrl, { next: { revalidate: 0 } })

    if (!res.ok) throw new Error('RSS fetch failed')

    const xml = await res.text()

    // Simple XML parsing for news items
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || []
    const headlines = items.slice(0, 5).map(item => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || ''
      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || ''
      const url = item.match(/<link>(.*?)<\/link>/)?.[1] || ''
      const publishedAt = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
      const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || 'Google News'
      return { title: title.slice(0, 120), description: description.replace(/<[^>]+>/g, '').slice(0, 200), url, publishedAt, source }
    })

    // Store in cache
    await supabase.from('news_cache').upsert(
      { team_name: team, headlines, cached_at: new Date().toISOString() },
      { onConflict: 'team_name' }
    )

    return NextResponse.json({ headlines })
  } catch (e) {
    console.error('News fetch error:', e)
    // Return empty, don't break analysis
    return NextResponse.json({ headlines: [], error: 'News unavailable' })
  }
}
