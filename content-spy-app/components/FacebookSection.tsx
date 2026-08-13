'use client'

import { FacebookPost } from '@/lib/types'

interface Props {
  posts: FacebookPost[]
}

export default function FacebookSection({ posts }: Props) {
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
        <div key={post.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              {post.text ? (
                <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
                  &ldquo;{post.text}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">No text content</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  {post.likes.toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {post.comments.toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {post.shares.toLocaleString()}
                </span>
                {post.published_at && (
                  <span className="text-xs text-slate-400">
                    {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-blue-500 transition-colors ml-auto"
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
