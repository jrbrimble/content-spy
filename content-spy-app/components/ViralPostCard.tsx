'use client'

import { ViralPost } from '@/lib/types'

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

        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border bg-slate-950 ${PLATFORM_COLORS[post.platform]}`}>
          {PLATFORM_LABELS[post.platform]}
        </span>
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
