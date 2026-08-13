'use client'

import { useState } from 'react'
import { CompetitorWithPosts } from '@/lib/types'
import YouTubeSection from './YouTubeSection'
import TwitterSection from './TwitterSection'
import InstagramSection from './InstagramSection'
import FacebookSection from './FacebookSection'

interface Props {
  competitor: CompetitorWithPosts
  onEdit?: (competitor: CompetitorWithPosts) => void
  onDelete?: (competitor: CompetitorWithPosts) => void
}

const PLATFORMS = [
  { key: 'youtube', label: 'YouTube', color: 'red', icon: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )},
  { key: 'twitter', label: 'Twitter / X', color: 'sky', icon: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )},
  { key: 'instagram', label: 'Instagram', color: 'pink', icon: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )},
  { key: 'facebook', label: 'Facebook', color: 'blue', icon: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )},
] as const

const colorMap: Record<string, { tab: string, active: string }> = {
  red:  { tab: 'text-red-600',  active: 'border-red-500 text-red-600 bg-red-50' },
  sky:  { tab: 'text-sky-600',  active: 'border-sky-500 text-sky-600 bg-sky-50' },
  pink: { tab: 'text-pink-600', active: 'border-pink-500 text-pink-600 bg-pink-50' },
  blue: { tab: 'text-blue-600', active: 'border-blue-500 text-blue-600 bg-blue-50' },
}

const INITIALS: Record<string, string> = {
  'dan-martell': 'DM',
  'rick-mulready': 'RM',
  'eric-siu': 'ES',
  'ai-show-podcast': 'AI',
  'sabrina-ramonov': 'SR',
  'sean-standberry': 'SS',
}

const GRADIENT_MAP: Record<string, string> = {
  'dan-martell': 'from-blue-500 to-indigo-600',
  'rick-mulready': 'from-emerald-500 to-teal-600',
  'eric-siu': 'from-orange-500 to-red-600',
  'ai-show-podcast': 'from-purple-500 to-violet-600',
  'sabrina-ramonov': 'from-pink-500 to-rose-600',
  'sean-standberry': 'from-amber-500 to-yellow-600',
}

export default function CompetitorCard({ competitor, onEdit, onDelete }: Props) {
  const [activeTab, setActiveTab] = useState<string>('youtube')
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  const gradient = GRADIENT_MAP[competitor.slug] || 'from-slate-500 to-slate-600'
  const initials = INITIALS[competitor.slug] || competitor.name.slice(0, 2).toUpperCase()

  const postCounts = {
    youtube: competitor.youtube_posts.length,
    twitter: competitor.twitter_posts.length,
    instagram: competitor.instagram_posts.length,
    facebook: competitor.facebook_posts.length,
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${isExpanded ? 'ring-2 ring-slate-900/10' : ''}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <div className={`bg-gradient-to-br ${gradient} p-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0 shadow-inner">
                <img 
                  src={`https://unavatar.io/youtube/${competitor.youtube_url?.split('/').pop()}?fallback=false`}
                  alt={competitor.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerText = initials;
                  }}
                />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg leading-tight">{competitor.name}</h3>
                <div className="flex gap-2 mt-1.5">
                  {PLATFORMS.map(p => (
                    <span
                      key={p.key}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        postCounts[p.key as keyof typeof postCounts] > 0
                          ? 'bg-white/30 text-white'
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {postCounts[p.key as keyof typeof postCounts]} {p.key === 'youtube' ? 'vids' : p.key === 'twitter' ? 'tweets' : 'posts'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onEdit && (
                <div
                  role="button"
                  title="Edit Handles & URLs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(competitor)
                  }}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              )}

              {onDelete && (
                <div
                  role="button"
                  title="Remove Competitor"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(competitor)
                  }}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-red-500/40 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              )}

              <div className={`w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* AI Summary Banner */}
      {competitor.ai_summary && (
        <div className="border-b border-slate-100">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition-colors text-left"
          >
            <span className="text-purple-500">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
            </span>
            <span className="text-xs font-semibold text-violet-700 flex-1">AI Intelligence Summary</span>
            {competitor.ai_summary_at && (
              <span className="text-xs text-violet-400">
                {new Date(competitor.ai_summary_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
            <svg className={`w-3.5 h-3.5 text-violet-400 transition-transform duration-200 ${showSummary ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showSummary && (
            <div className="px-4 py-3 bg-gradient-to-r from-violet-50/50 to-purple-50/50 border-t border-violet-100">
              <p className="text-sm text-slate-700 leading-relaxed italic">"{competitor.ai_summary}"</p>
            </div>
          )}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4">
          {/* Platform tabs */}
          <div className="flex gap-1 bg-slate-50 rounded-xl p-1 mb-4">
            {PLATFORMS.map(p => {
              const colors = colorMap[p.color]
              const isActive = activeTab === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => setActiveTab(p.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? `${colors.active} border border-current shadow-sm`
                      : `text-slate-500 hover:text-slate-700 hover:bg-white`
                  }`}
                >
                  <span className={isActive ? '' : 'opacity-50'}>{p.icon}</span>
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              )
            })}
          </div>

          {/* Platform content */}
          <div>
            {activeTab === 'youtube' && <YouTubeSection posts={competitor.youtube_posts} />}
            {activeTab === 'twitter' && <TwitterSection posts={competitor.twitter_posts} />}
            {activeTab === 'instagram' && <InstagramSection posts={competitor.instagram_posts} />}
            {activeTab === 'facebook' && <FacebookSection posts={competitor.facebook_posts} />}
          </div>
        </div>
      )}
    </div>
  )
}
