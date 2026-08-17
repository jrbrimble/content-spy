'use client'

import { TwitterPost } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface Props {
  posts: TwitterPost[]
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function TwitterSection({ posts }: Props) {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-slate-500 text-sm italic py-3 px-4 bg-slate-50 rounded-lg border border-slate-100">
        No posts published in the last 7 days.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post, i) => (
        <div key={post.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-sky-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 leading-relaxed">
                &ldquo;{post.text}&rdquo;
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {post.views > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                    {formatViews(post.views)} views
                  </span>
                )}
                {post.published_at && (
                  <span className="text-xs text-slate-400">
                    {formatDate(post.published_at)}
                  </span>
                )}
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-sky-500 transition-colors ml-auto"
                >
                  View post →
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
