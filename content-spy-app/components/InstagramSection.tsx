'use client'

import { useState } from 'react'
import { InstagramPost } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface Props {
  posts: InstagramPost[]
}

export default function InstagramSection({ posts }: Props) {
  const [openTranscript, setOpenTranscript] = useState<string | null>(null)

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
        <div key={post.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-pink-200 hover:shadow-md transition-all duration-200">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                {/* Reel badge */}
                {post.is_reel && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full mb-2">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                    </svg>
                    Reel
                  </span>
                )}

                {/* Caption */}
                {post.caption ? (
                  <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
                    &ldquo;{post.caption}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No caption</p>
                )}

                {/* Metrics */}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
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
                  {post.published_at && (
                    <span className="text-xs text-slate-400">
                      {formatDate(post.published_at)}
                    </span>
                  )}
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-pink-500 transition-colors ml-auto"
                  >
                    View post →
                  </a>
                </div>

                {/* Transcript accordion — only for reels */}
                {post.is_reel && (
                  <div className="mt-3">
                    {post.transcript ? (
                      <>
                        <button
                          onClick={() => setOpenTranscript(openTranscript === post.id ? null : post.id)}
                          className="flex items-center gap-2 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {openTranscript === post.id ? 'Hide Transcript' : 'View Transcript'}
                          <span className={`ml-1 transition-transform duration-200 ${openTranscript === post.id ? 'rotate-180' : ''}`}>▾</span>
                        </button>
                        {openTranscript === post.id && (
                          <div className="mt-2 bg-purple-50 border border-purple-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">Reel Transcript</p>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {post.transcript}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Transcript not available
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
