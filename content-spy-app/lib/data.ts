import { supabase } from './supabase'
import type { CompetitorWithPosts } from './types'

export async function getAllCompetitorsWithPosts(): Promise<CompetitorWithPosts[]> {
  const { data: competitors, error } = await supabase
    .from('competitors')
    .select('id, name, slug, youtube_url, twitter_url, instagram_url, facebook_url, ai_summary, ai_summary_at, last_scraped_at')
    .order('name')

  if (error || !competitors) return []

  const results: CompetitorWithPosts[] = []

  for (const competitor of competitors) {
    const [yt, tw, ig, fb] = await Promise.all([
      supabase
        .from('youtube_posts')
        .select('*')
        .eq('competitor_id', competitor.id)
        .order('views', { ascending: false })
        .limit(3),
      supabase
        .from('twitter_posts')
        .select('*')
        .eq('competitor_id', competitor.id)
        .order('views', { ascending: false })
        .limit(3),
      supabase
        .from('instagram_posts')
        .select('*')
        .eq('competitor_id', competitor.id)
        .order('likes', { ascending: false })
        .limit(3),
      supabase
        .from('facebook_posts')
        .select('*')
        .eq('competitor_id', competitor.id)
        .order('likes', { ascending: false })
        .limit(3),
    ])

    results.push({
      ...competitor,
      youtube_posts: yt.data || [],
      twitter_posts: tw.data || [],
      instagram_posts: ig.data || [],
      facebook_posts: fb.data || [],
    })
  }

  return results
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function addCompetitor(input: import('./types').CompetitorInput): Promise<{ success: boolean; error?: string }> {
  const slug = slugify(input.name)
  const { error } = await supabase.from('competitors').insert({
    name: input.name.trim(),
    slug: slug || `comp-${Date.now()}`,
    youtube_url: input.youtube_url?.trim() || null,
    twitter_url: input.twitter_url?.trim() || null,
    instagram_url: input.instagram_url?.trim() || null,
    facebook_url: input.facebook_url?.trim() || null,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateCompetitor(id: string, input: import('./types').CompetitorInput): Promise<{ success: boolean; error?: string }> {
  const slug = slugify(input.name)
  const { error } = await supabase.from('competitors').update({
    name: input.name.trim(),
    slug: slug || `comp-${Date.now()}`,
    youtube_url: input.youtube_url?.trim() || null,
    twitter_url: input.twitter_url?.trim() || null,
    instagram_url: input.instagram_url?.trim() || null,
    facebook_url: input.facebook_url?.trim() || null,
  }).eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteCompetitor(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('competitors').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getViralPosts(niche: string = 'AI Agents'): Promise<import('./types').ViralPost[]> {
  try {
    const { data, error } = await supabase
      .from('viral_posts')
      .select('*')
      .ilike('niche', `%${niche}%`)
      .order('views', { ascending: false })
      .limit(30)

    if (!error && data && data.length > 0) {
      return data as import('./types').ViralPost[]
    }
  } catch (err) {
    console.error('Error fetching viral posts from Supabase:', err)
  }
  return []
}

export async function getLatestViralPosts(): Promise<{ posts: import('./types').ViralPost[]; niche: string; scrapedAt: string } | null> {
  try {
    const { data, error } = await supabase
      .from('viral_posts')
      .select('*')
      .order('scraped_at', { ascending: false })
      .limit(30)

    if (!error && data && data.length > 0) {
      const niche = data[0]?.niche || 'AI Agents'
      const scrapedAt = data[0]?.scraped_at || new Date().toISOString()
      return {
        posts: data as import('./types').ViralPost[],
        niche,
        scrapedAt,
      }
    }
  } catch (err) {
    console.error('Error fetching latest viral posts from Supabase:', err)
  }
  return null
}


