'use client'

import { useState } from 'react'
import { YouTubePost } from '@/lib/types'

interface Props {
  posts: YouTubePost[]
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function YouTubeSection({ posts }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!posts || posts.length === 0) {
    return (
      <div className="text-slate-500 text-sm italic py-3 px-4 bg-slate-50 rounded-lg border border-slate-100">
        No videos published in the last 14 days.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post, i) => (
        <div key={post.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-red-200 hover:shadow-md transition-all duration-200 group">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-800 hover:text-red-600 transition-colors leading-snug line-clamp-2 text-sm"
                >
                  {post.title}
                </a>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                    {formatViews(post.views)} views
                  </span>
                  {post.published_at && (
                    <span className="text-xs text-slate-400">
                      {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                {post.description && (
                  <button
                    onClick={() => setExpanded(expanded === post.id ? null : post.id)}
                    className="mt-2 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                  >
                    {expanded === post.id ? '▲ Hide description' : '▼ Show description'}
                  </button>
                )}
                {expanded === post.id && post.description && (
                  <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed border border-slate-100">
                    {post.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
