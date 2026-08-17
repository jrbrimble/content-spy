'use client'

import { ViralPost } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface Props {
  post: ViralPost
  rank: number
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const PLATFORM_COLORS = {
  tiktok: 'from-pink-500 to-rose-600 border-pink-500/30 text-pink-400',
  instagram: 'from-purple-500 to-pink-600 border-pink-500/30 text-pink-400',
  facebook: 'from-blue-500 to-indigo-600 border-blue-500/30 text-blue-400',
}

const PLATFORM_LABELS = {
  tiktok: 'TikTok Video',
  instagram: 'Instagram Reel',
  facebook: 'Facebook Reel',
}

const PLATFORM_ICONS = {
  tiktok: (
    <svg className="w-3 h-3 fill-current text-white" viewBox="0 0 24 24">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.901 2.89 2.896 2.896 0 0 1-2.902-2.89 2.897 2.897 0 0 1 2.902-2.894c.328 0 .64.062.934.175V9.45a6.31 6.31 0 0 0-.934-.07 6.34 6.34 0 0 0-6.339 6.344 6.34 6.34 0 0 0 6.339 6.342 6.34 6.34 0 0 0 6.339-6.342V8.136a8.21 8.21 0 0 0 4.801 1.547V6.238a4.834 4.834 0 0 1-1.028.448z"/>
    </svg>
  ),
  instagram: (
    <svg className="w-3 h-3 fill-current text-pink-400" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  facebook: (
    <svg className="w-3 h-3 fill-current text-blue-400" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
}

export default function ViralPostCard({ post, rank }: Props) {
  const isTopThree = rank <= 3

  return (
    <div className={`relative bg-slate-900/90 border rounded-2xl p-5 shadow-xl transition-all duration-300 hover:border-violet-500/50 hover:shadow-violet-500/10 flex flex-col justify-between gap-4 ${
      isTopThree ? 'border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-900/95' : 'border-slate-800'
    }`}>
      {/* Rank Badge + Platform */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-inner ${
            rank === 1 ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 ring-2 ring-amber-400/50' :
            rank === 2 ? 'bg-slate-300 text-slate-950 font-bold' :
            rank === 3 ? 'bg-amber-700 text-amber-100 font-bold' :
            'bg-slate-800 text-slate-400'
          }`}>
            #{rank}
          </div>

          <div>
            <h4 className="text-white font-bold text-sm leading-snug">{post.creator_name}</h4>
            <p className="text-slate-400 text-xs font-mono">{post.creator_handle}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border bg-slate-950 ${PLATFORM_COLORS[post.platform]}`}>
            {PLATFORM_ICONS[post.platform]}
            <span>{PLATFORM_LABELS[post.platform]}</span>
          </span>
          {post.published_at && (
            <span className="text-[10px] text-slate-400 font-medium">
              📅 {formatDate(post.published_at)}
            </span>
          )}
        </div>
      </div>

      {/* Caption Snippet */}
      <p className="text-slate-300 text-xs leading-relaxed line-clamp-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 font-sans">
        "{post.caption || 'No caption provided.'}"
      </p>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-slate-800/60">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl py-2 px-3">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Views</p>
          <p className="text-base font-extrabold text-violet-400 mt-0.5">
            🔥 {formatNumber(post.views)}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl py-2 px-3">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Est. Reach</p>
          <p className="text-base font-extrabold text-emerald-400 mt-0.5">
            📈 {formatNumber(post.estimated_reach)}
          </p>
        </div>
      </div>

      {/* Action Link Button */}
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-center text-white bg-slate-800 hover:bg-violet-600 transition-colors flex items-center justify-center gap-2 border border-slate-700/60 hover:border-violet-500 shadow-md group"
      >
        <span>View Original Post</span>
        <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )
}

