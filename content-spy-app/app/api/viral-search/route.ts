import { NextResponse } from 'next/server'

const APIFY_TOKEN = process.env.APIFY_API_KEY || ''
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// ─── In-memory cache ────────────────────────────────────────────────────────
interface CacheEntry {
  data: ViralResult[]
  cachedAt: number
}
const cache = new Map<string, CacheEntry>()

// ─── Types ───────────────────────────────────────────────────────────────────
interface ViralResult {
  id: string
  niche: string
  platform: 'tiktok' | 'instagram'
  creator_name: string
  creator_handle: string
  caption: string
  url: string
  views: number
  likes: number
  estimated_reach: number
  published_at: string
  scraped_at: string
}

// ─── Apify helpers ───────────────────────────────────────────────────────────
async function runApifyActor(actorId: string, input: object): Promise<unknown[]> {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  )
  if (!runRes.ok) {
    const text = await runRes.text()
    throw new Error(`Apify actor ${actorId} failed to start: ${runRes.status} ${text}`)
  }
  const runData = await runRes.json() as { data: { id: string; defaultDatasetId: string } }
  const runId = runData.data.id

  // Poll until finished (max 90 seconds)
  const maxWait = 90_000
  const pollInterval = 3_000
  const deadline = Date.now() + maxWait
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, pollInterval))
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    )
    const statusData = await statusRes.json() as { data: { status: string; defaultDatasetId: string } }
    const { status, defaultDatasetId } = statusData.data
    if (status === 'SUCCEEDED') {
      const dataRes = await fetch(
        `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}&limit=50`
      )
      return await dataRes.json() as unknown[]
    }
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Apify actor ${actorId} ended with status: ${status}`)
    }
  }
  throw new Error(`Apify actor ${actorId} timed out after 90s`)
}

// ─── Date helpers ─────────────────────────────────────────────────────────
function sevenDaysAgo(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d
}

function isoDate(ts: number | string | undefined): string {
  if (!ts) return new Date().toISOString().slice(0, 10)
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts)
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
}

function isWithinLastNDays(ts: number | string | undefined, days: number): boolean {
  if (!ts) return false
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts)
  if (isNaN(d.getTime())) return false
  return d >= sevenDaysAgo()
}

// ─── TikTok scrape ────────────────────────────────────────────────────────
async function scrapeTikTok(niche: string): Promise<ViralResult[]> {
  // clockworks/tiktok-scraper supports searchQueries
  const items = await runApifyActor('clockworks~tiktok-scraper', {
    searchQueries: [niche],
    searchSection: 'videos',
    maxResults: 30,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    proxyConfiguration: { useApifyProxy: true },
  })

  const sevenDaysAgoDate = sevenDaysAgo()

  const results: ViralResult[] = []
  for (const item of items as Record<string, unknown>[]) {
    const createTime = item.createTime as number | undefined
    if (!isWithinLastNDays(createTime, 7)) continue

    const playCount = (item.playCount as number) || (item.stats as Record<string, number>)?.playCount || 0
    const diggCount = (item.diggCount as number) || (item.stats as Record<string, number>)?.diggCount || 0
    const webVideoUrl = (item.webVideoUrl as string) || ''
    const authorMeta = item.authorMeta as Record<string, string> | undefined
    const desc = (item.text as string) || (item.desc as string) || ''
    const username = authorMeta?.name || authorMeta?.uniqueId || 'unknown'
    const nickname = authorMeta?.nickName || authorMeta?.name || username

    if (!webVideoUrl || playCount === 0) continue

    results.push({
      id: `tt-${(item.id as string) || Math.random().toString(36).slice(2)}`,
      niche,
      platform: 'tiktok',
      creator_name: nickname,
      creator_handle: `@${username}`,
      caption: desc.slice(0, 200),
      url: webVideoUrl,
      views: playCount,
      likes: diggCount,
      estimated_reach: Math.round(playCount * 1.45),
      published_at: isoDate(createTime),
      scraped_at: new Date().toISOString(),
    })
  }

  return results
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
}

// ─── Instagram scrape ─────────────────────────────────────────────────────
async function scrapeInstagram(niche: string): Promise<ViralResult[]> {
  // apify/instagram-scraper with hashtag mode
  // Strip spaces to form a hashtag (e.g. "AI Agents" → "AIAgents")
  const hashtag = niche.replace(/\s+/g, '')

  const items = await runApifyActor('apify~instagram-scraper', {
    directUrls: [`https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag)}/`],
    resultsType: 'posts',
    resultsLimit: 30,
    addParentData: false,
    proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  })

  const results: ViralResult[] = []
  for (const item of items as Record<string, unknown>[]) {
    const timestamp = (item.timestamp as string) || (item.taken_at_timestamp as number)?.toString()
    if (!isWithinLastNDays(timestamp, 7)) continue

    // Only keep video/reel posts
    const type = (item.type as string) || ''
    const isVideo = type === 'Video' || type === 'Reel' || (item.isVideo as boolean) === true
    if (!isVideo) continue

    const videoPlayCount = (item.videoPlayCount as number) || (item.videoViewCount as number) || 0
    const likesCount = (item.likesCount as number) || (item.likesCount as number) || 0
    const url = (item.url as string) || ''
    const shortCode = (item.shortCode as string) || ''
    const reelUrl = url || (shortCode ? `https://www.instagram.com/reel/${shortCode}/` : '')
    const ownerUsername = (item.ownerUsername as string) || (item.ownerId as string) || 'unknown'
    const ownerFullName = (item.ownerFullName as string) || ownerUsername
    const caption = ((item.caption as string) || '').slice(0, 200)

    if (!reelUrl || videoPlayCount === 0) continue

    results.push({
      id: `ig-${(item.id as string) || Math.random().toString(36).slice(2)}`,
      niche,
      platform: 'instagram',
      creator_name: ownerFullName,
      creator_handle: `@${ownerUsername}`,
      caption,
      url: reelUrl,
      views: videoPlayCount,
      likes: likesCount,
      estimated_reach: Math.round(videoPlayCount * 1.5),
      published_at: isoDate(timestamp),
      scraped_at: new Date().toISOString(),
    })
  }

  return results
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
}

// ─── Route handler ────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const niche: string = (body.niche || 'AI Agents').trim()
    const cacheKey = niche.toLowerCase()

    // Serve from cache if fresh
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        niche,
        posts: cached.data,
        cached: true,
        cachedAt: new Date(cached.cachedAt).toISOString(),
      })
    }

    if (!APIFY_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'APIFY_API_KEY is not configured on the server.' },
        { status: 500 }
      )
    }

    // Run TikTok + Instagram in parallel
    const [tiktokPosts, instagramPosts] = await Promise.allSettled([
      scrapeTikTok(niche),
      scrapeInstagram(niche),
    ])

    const posts: ViralResult[] = [
      ...(tiktokPosts.status === 'fulfilled' ? tiktokPosts.value : []),
      ...(instagramPosts.status === 'fulfilled' ? instagramPosts.value : []),
    ]

    // Cache the result
    cache.set(cacheKey, { data: posts, cachedAt: Date.now() })

    return NextResponse.json({
      success: true,
      niche,
      posts,
      cached: false,
      errors: {
        tiktok: tiktokPosts.status === 'rejected' ? (tiktokPosts.reason as Error).message : null,
        instagram: instagramPosts.status === 'rejected' ? (instagramPosts.reason as Error).message : null,
      },
    })
  } catch (err) {
    console.error('[viral-search]', err)
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', cachedNiches: [...cache.keys()] })
}
