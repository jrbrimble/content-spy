export interface Competitor {
  id: string
  name: string
  slug: string
  youtube_url: string | null
  twitter_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  ai_summary: string | null
  ai_summary_at: string | null
  last_scraped_at: string | null
}

export interface CompetitorInput {
  name: string
  youtube_url?: string
  twitter_url?: string
  instagram_url?: string
  facebook_url?: string
}

export interface YouTubePost {
  id: string
  competitor_id: string
  title: string
  url: string
  views: number
  published_at: string | null
  description: string | null
  scraped_at: string
}

export interface TwitterPost {
  id: string
  competitor_id: string
  text: string
  url: string
  views: number
  published_at: string | null
  scraped_at: string
}

export interface InstagramPost {
  id: string
  competitor_id: string
  caption: string | null
  url: string
  likes: number
  comments: number
  is_reel: boolean
  transcript: string | null
  published_at: string | null
  scraped_at: string
}

export interface FacebookPost {
  id: string
  competitor_id: string
  text: string | null
  url: string
  likes: number
  comments: number
  shares: number
  published_at: string | null
  scraped_at: string
}

export interface CompetitorWithPosts extends Competitor {
  youtube_posts: YouTubePost[]
  twitter_posts: TwitterPost[]
  instagram_posts: InstagramPost[]
  facebook_posts: FacebookPost[]
}

export type ViewMode = 'competitor' | 'platform'
export type Platform = 'youtube' | 'twitter' | 'instagram' | 'facebook'

export interface ScrapeStatus {
  running: boolean
  message: string
  startedAt?: string
}
