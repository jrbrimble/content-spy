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
