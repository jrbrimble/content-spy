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
        `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}&limit=100`
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
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return d >= cutoff
}

// ─── TikTok scrape ────────────────────────────────────────────────────────
// Uses clockworks/tiktok-scraper with hashtag input (most reliable for keyword discovery)
async function scrapeTikTok(niche: string): Promise<ViralResult[]> {
  // Convert niche to hashtag format (remove spaces, lowercase)
  const hashtag = niche.replace(/\s+/g, '').toLowerCase()

  const items = await runApifyActor('clockworks~tiktok-scraper', {
    hashtags: [hashtag],
    resultsPerPage: 40,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadAvatars: false,
    scrapeRelatedVideos: false,
    excludePinnedPosts: false,
  })

  console.log(`[TikTok] Got ${items.length} raw items for hashtag #${hashtag}`)

  const results: ViralResult[] = []
  for (const item of items as Record<string, unknown>[]) {
    // createTime is unix seconds; createTimeISO is ISO string
    const createTime = (item.createTime as number) || undefined
    const createTimeISO = (item.createTimeISO as string) || undefined
    const ts = createTimeISO || createTime

    // Strictly filter to the last 7 days ONLY
    if (ts && !isWithinLastNDays(ts, 7)) continue

    const playCount = (item.playCount as number) || 0
    const diggCount = (item.diggCount as number) || 0
    const webVideoUrl = (item.webVideoUrl as string) || ''

    // authorMeta is nested object
    const authorMeta = item.authorMeta as Record<string, string | number | boolean> | undefined
    const username = (authorMeta?.name as string) || 'unknown'
    const nickname = (authorMeta?.nickName as string) || username
    const desc = (item.text as string) || ''

    if (!webVideoUrl) continue
    if (playCount === 0) continue

    results.push({
      id: `tt-${(item.id as string) || Math.random().toString(36).slice(2)}`,
      niche,
      platform: 'tiktok',
      creator_name: nickname,
      creator_handle: `@${username}`,
      caption: desc.slice(0, 250),
      url: webVideoUrl,
      views: playCount,
      likes: diggCount,
      estimated_reach: Math.round(playCount * 1.45),
      published_at: isoDate(ts),
      scraped_at: new Date().toISOString(),
    })
  }

  // Sort by views desc, return top 5
  return results
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
}

// ─── Instagram Reels scrape ───────────────────────────────────────────────
// Uses apify/instagram-scraper with hashtag explore URL + resultsType: reels
async function scrapeInstagram(niche: string): Promise<ViralResult[]> {
  // Use the hashtag explore URL — no spaces, just the term
  const hashtag = niche.replace(/\s+/g, '').toLowerCase()
  const hashtagUrl = `https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag)}/`

  const items = await runApifyActor('apify~instagram-scraper', {
    directUrls: [hashtagUrl],
    resultsType: 'reels',
    resultsLimit: 40,
    addParentData: false,
  })

  console.log(`[Instagram] Got ${items.length} raw items for #${hashtag}`)

  const results: ViralResult[] = []
  for (const item of items as Record<string, unknown>[]) {
    const timestamp = (item.timestamp as string) || undefined

    // Strictly filter to the last 7 days ONLY
    if (timestamp && !isWithinLastNDays(timestamp, 7)) continue

    const videoPlayCount = (item.videoPlayCount as number) || (item.videoViewCount as number) || 0
    const likesCount = (item.likesCount as number) || 0
    const shortCode = (item.shortCode as string) || ''
    const ownerUsername = (item.ownerUsername as string) || 'unknown'
    const ownerFullName = (item.ownerFullName as string) || ownerUsername
    const caption = ((item.caption as string) || '').slice(0, 250)
    const type = (item.type as string) || ''

    // Build direct reel URL from shortCode — Instagram reels use /reel/ path
    const reelUrl = shortCode
      ? `https://www.instagram.com/reel/${shortCode}/`
      : (item.url as string) || ''

    // Only keep video items with some plays
    if (!reelUrl || type === 'Image') continue
    if (videoPlayCount === 0 && likesCount === 0) continue

    results.push({
      id: `ig-${(item.id as string) || shortCode || Math.random().toString(36).slice(2)}`,
      niche,
      platform: 'instagram',
      creator_name: ownerFullName,
      creator_handle: `@${ownerUsername}`,
      caption,
      url: reelUrl,
      views: videoPlayCount || likesCount * 8, // fallback estimate if views not available
      likes: likesCount,
      estimated_reach: Math.round((videoPlayCount || likesCount * 8) * 1.5),
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
    const [tiktokResult, instagramResult] = await Promise.allSettled([
      scrapeTikTok(niche),
      scrapeInstagram(niche),
    ])

    const tiktokPosts = tiktokResult.status === 'fulfilled' ? tiktokResult.value : []
    const instagramPosts = instagramResult.status === 'fulfilled' ? instagramResult.value : []
    const posts: ViralResult[] = [...tiktokPosts, ...instagramPosts]

    const errors = {
      tiktok: tiktokResult.status === 'rejected' ? (tiktokResult.reason as Error).message : null,
      instagram: instagramResult.status === 'rejected' ? (instagramResult.reason as Error).message : null,
    }

    console.log(`[viral-search] "${niche}": ${tiktokPosts.length} TikTok, ${instagramPosts.length} Instagram posts`)

    // Cache the result
    cache.set(cacheKey, { data: posts, cachedAt: Date.now() })

    return NextResponse.json({
      success: true,
      niche,
      posts,
      cached: false,
      errors,
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
