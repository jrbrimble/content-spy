'use client'

import { useState } from 'react'
import { CompetitorWithPosts, Platform } from '@/lib/types'
import YouTubeSection from './YouTubeSection'
import TwitterSection from './TwitterSection'
import InstagramSection from './InstagramSection'
import FacebookSection from './FacebookSection'

interface Props {
  competitors: CompetitorWithPosts[]
}

const PLATFORMS: { key: Platform; label: string; color: string; bgColor: string; icon: React.ReactNode }[] = [
  {
    key: 'youtube', label: 'YouTube', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200',
    icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  },
  {
    key: 'twitter', label: 'Twitter / X', color: 'text-slate-800', bgColor: 'bg-slate-50 border-slate-200',
    icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  },
  {
    key: 'instagram', label: 'Instagram', color: 'text-pink-600', bgColor: 'bg-pink-50 border-pink-200',
    icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  },
  {
    key: 'facebook', label: 'Facebook', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200',
    icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  },
]

const GRADIENT_MAP: Record<string, string> = {
  'dan-martell': 'from-blue-500 to-indigo-600',
  'rick-mulready': 'from-emerald-500 to-teal-600',
  'eric-siu': 'from-orange-500 to-red-600',
  'ai-show-podcast': 'from-purple-500 to-violet-600',
  'sabrina-ramonov': 'from-pink-500 to-rose-600',
  'sean-standberry': 'from-amber-500 to-yellow-600',
}

export default function PlatformView({ competitors }: Props) {
  const [activePlatform, setActivePlatform] = useState<Platform>('youtube')
  const platform = PLATFORMS.find(p => p.key === activePlatform)!

  return (
    <div>
      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PLATFORMS.map(p => (
          <button
            key={p.key}
            onClick={() => setActivePlatform(p.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
              activePlatform === p.key
                ? `${p.bgColor} ${p.color} shadow-sm`
                : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'
            }`}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>

      {/* All competitors for selected platform */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {competitors.map(c => {
          const gradient = GRADIENT_MAP[c.slug] || 'from-slate-500 to-slate-600'
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Competitor mini-header */}
              <div className={`bg-gradient-to-r ${gradient} px-4 py-3 flex items-center gap-3`}>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0 shadow-inner">
                  <img 
                    src={`https://unavatar.io/youtube/${(c.youtube_url || '').split('/').pop()}?fallback=false`}
                    alt={c.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerText = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    }}
                  />
                </div>
                <span className="text-white font-semibold text-sm">{c.name}</span>
              </div>
              <div className="p-4">
                {activePlatform === 'youtube' && <YouTubeSection posts={c.youtube_posts} />}
                {activePlatform === 'twitter' && <TwitterSection posts={c.twitter_posts} />}
                {activePlatform === 'instagram' && <InstagramSection posts={c.instagram_posts} />}
                {activePlatform === 'facebook' && <FacebookSection posts={c.facebook_posts} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
