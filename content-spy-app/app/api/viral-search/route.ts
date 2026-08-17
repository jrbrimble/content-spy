import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

// ─── English Language Filter ──────────────────────────────────────────────
function isEnglishText(text: string): boolean {
  if (!text || text.trim().length === 0) return true

  // 1. Reject non-Latin alphabets (Cyrillic, Arabic, Chinese/Japanese/Korean, Devanagari, Thai, Hebrew)
  const nonLatinRegex = /[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0900-\u097F\u0E00-\u0E7F\u0590-\u05FF]/
  if (nonLatinRegex.test(text)) return false

  // 2. Extract words
  const words = (text.toLowerCase().match(/[a-z]{2,}/g) || [])
  if (words.length === 0) return true

  // Common English words & AI/marketing keywords
  const commonEnglishWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
    'when', 'make', 'can', 'like', 'time', 'no', 'just', 'know', 'take',
    'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
    'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
    'back', 'after', 'use', 'how', 'our', 'work', 'first', 'well', 'way',
    'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
    'is', 'are', 'was', 'were', 'has', 'had', 'ai', 'video', 'tools', 'free', 'save',
    'here', 'why', 'top', 'growth', 'business', 'app', 'code', 'tips', 'guide', 'learn',
    'marketing', 'agent', 'agents', 'automate', 'automation', 'saas', 'workflow',
    'build', 'create', 'prompt', 'chatgpt', 'claude', 'tutorial', 'watch', 'secret',
    'money', 'make', 'scaling', 'client', 'leads', 'revenue', 'content'
  ])

  // Non-English stopword markers (Portuguese, Spanish, French, German, Italian)
  const nonEnglishMarkers = new Set([
    'para', 'com', 'você', 'voce', 'uma', 'não', 'nao', 'mais', 'como', 'por', 'dos', 'das',
    'pero', 'este', 'esta', 'estos', 'estas', 'pour', 'avec', 'dans', 'sur',
    'und', 'der', 'die', 'das', 'nicht', 'mit', 'ist', 'von', 'dem', 'des',
    'una', 'del', 'las', 'los', 'cette', 'votre', 'nous', 'vous', 'sono', 'della'
  ])

  let enMatches = 0
  let nonEnMatches = 0
  for (const w of words) {
    if (commonEnglishWords.has(w)) enMatches++
    if (nonEnglishMarkers.has(w)) nonEnMatches++
  }

  if (nonEnMatches > enMatches && nonEnMatches >= 2) {
    return false
  }

  return true
}

// ─── Niche Hashtag Helpers ────────────────────────────────────────────────
function getNicheHashtags(niche: string): string[] {
  const cleanTag = niche.replace(/[^\w]/g, '').toLowerCase()
  const lower = niche.toLowerCase()

  const map: Record<string, string[]> = {
    'ai agents': ['aiagents', 'aiagent', 'agenticai', 'aiworkflow'],
    'ai automation': ['aiautomation', 'aiworkflow', 'n8n', 'makeautomation'],
    'b2b saas': ['b2bsaas', 'saas', 'saasgrowth', 'b2bmarketing'],
    'growth marketing': ['growthmarketing', 'growthhacks', 'marketingtips', 'digitalmarketing'],
  }

  if (map[lower]) return map[lower]

  const tags = [cleanTag]
  if (cleanTag.endsWith('s')) tags.push(cleanTag.slice(0, -1))
  tags.push(`${cleanTag}tips`, `${cleanTag}tools`)
  return tags.slice(0, 4)
}

// ─── TikTok scrape ────────────────────────────────────────────────────────
// Uses clockworks/tiktok-scraper with hashtag input
async function scrapeTikTok(niche: string): Promise<ViralResult[]> {
  const hashtags = getNicheHashtags(niche)

  const items = await runApifyActor('clockworks~tiktok-scraper', {
    hashtags: hashtags.slice(0, 3),
    resultsPerPage: 40,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadAvatars: false,
    scrapeRelatedVideos: false,
    excludePinnedPosts: false,
  })

  console.log(`[TikTok] Got ${items.length} raw items for #${hashtags.join(', #')}`)

  const results: ViralResult[] = []
  const seenUrls = new Set<string>()

  for (const item of items as Record<string, unknown>[]) {
    const createTime = (item.createTime as number) || undefined
    const createTimeISO = (item.createTimeISO as string) || undefined
    const ts = createTimeISO || createTime

    // 1. Strictly filter to the last 7 days ONLY
    if (ts && !isWithinLastNDays(ts, 7)) continue

    const playCount = (item.playCount as number) || 0
    const diggCount = (item.diggCount as number) || 0
    const webVideoUrl = (item.webVideoUrl as string) || ''
    const desc = (item.text as string) || ''

    // 2. Filter strictly for English content
    if (!isEnglishText(desc)) continue

    // Author metadata
    const authorMeta = item.authorMeta as Record<string, string | number | boolean> | undefined
    const username = (authorMeta?.name as string) || 'unknown'
    const nickname = (authorMeta?.nickName as string) || username

    if (!webVideoUrl || playCount === 0) continue
    if (seenUrls.has(webVideoUrl)) continue
    seenUrls.add(webVideoUrl)

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

  // Sort strictly by views descending and return the exact Top 5
  return results
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
}

// ─── Instagram Reels scrape ───────────────────────────────────────────────
// Uses apify/instagram-scraper with hashtag explore URL + resultsType: reels
async function scrapeInstagram(niche: string): Promise<ViralResult[]> {
  const hashtags = getNicheHashtags(niche)
  const exploreUrls = hashtags.slice(0, 3).map(
    t => `https://www.instagram.com/explore/tags/${encodeURIComponent(t)}/`
  )

  const items = await runApifyActor('apify~instagram-scraper', {
    directUrls: exploreUrls,
    resultsType: 'reels',
    resultsLimit: 40,
    addParentData: false,
  })

  console.log(`[Instagram] Got ${items.length} raw items for #${hashtags.join(', #')}`)

  const results: ViralResult[] = []
  const seenUrls = new Set<string>()

  for (const item of items as Record<string, unknown>[]) {
    const timestamp = (item.timestamp as string) || undefined

    // 1. Strictly filter to the last 7 days ONLY
    if (timestamp && !isWithinLastNDays(timestamp, 7)) continue

    const caption = ((item.caption as string) || '').slice(0, 250)

    // 2. Filter strictly for English content
    if (!isEnglishText(caption)) continue

    const videoPlayCount = (item.videoPlayCount as number) || (item.videoViewCount as number) || 0
    const likesCount = (item.likesCount as number) || 0
    const shortCode = (item.shortCode as string) || ''
    const ownerUsername = (item.ownerUsername as string) || 'unknown'
    const ownerFullName = (item.ownerFullName as string) || ownerUsername
    const type = (item.type as string) || ''

    const reelUrl = shortCode
      ? `https://www.instagram.com/reel/${shortCode}/`
      : (item.url as string) || ''

    if (!reelUrl || type === 'Image') continue
    if (videoPlayCount === 0 && likesCount === 0) continue
    if (seenUrls.has(reelUrl)) continue
    seenUrls.add(reelUrl)

    results.push({
      id: `ig-${(item.id as string) || shortCode || Math.random().toString(36).slice(2)}`,
      niche,
      platform: 'instagram',
      creator_name: ownerFullName,
      creator_handle: `@${ownerUsername}`,
      caption,
      url: reelUrl,
      views: videoPlayCount || likesCount * 8,
      likes: likesCount,
      estimated_reach: Math.round((videoPlayCount || likesCount * 8) * 1.5),
      published_at: isoDate(timestamp),
      scraped_at: new Date().toISOString(),
    })
  }

  // Sort strictly by views descending and return the exact Top 5
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

    console.log(`[viral-search] "${niche}": ${tiktokPosts.length} TikTok, ${instagramPosts.length} Instagram English posts from last 7 days`)

    // Cache the result in-memory
    cache.set(cacheKey, { data: posts, cachedAt: Date.now() })

    // Persist to Supabase viral_posts table for global multi-browser sync
    if (posts.length > 0) {
      try {
        await supabase.from('viral_posts').delete().ilike('niche', `%${niche}%`)
        const rows = posts.map(p => ({
          niche: p.niche,
          platform: p.platform,
          creator_name: p.creator_name,
          creator_handle: p.creator_handle,
          caption: p.caption,
          url: p.url,
          views: p.views,
          likes: p.likes,
          estimated_reach: p.estimated_reach,
          published_at: p.published_at,
          scraped_at: p.scraped_at,
        }))
        await supabase.from('viral_posts').insert(rows)
      } catch (dbErr) {
        console.warn('[viral-search] Supabase write notice:', dbErr)
      }
    }

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
