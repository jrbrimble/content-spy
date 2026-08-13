'use client'

import { useState, useEffect } from 'react'
import { ViralPost, ViralPlatform } from '@/lib/types'
import { getViralPosts } from '@/lib/data'
import ViralPostCard from './ViralPostCard'

const PRESET_NICHES = ['AI Agents', 'AI Automation', 'B2B SaaS', 'Growth Marketing']

export default function ViralFinderView() {
  const [selectedNiche, setSelectedNiche] = useState('AI Agents')
  const [customNiche, setCustomNiche] = useState('')
  const [activePlatform, setActivePlatform] = useState<ViralPlatform>('tiktok')
  const [posts, setPosts] = useState<ViralPost[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await getViralPosts(selectedNiche)
      setPosts(data)
      setLoading(false)
    }
    loadData()
  }, [selectedNiche])

  const handleTriggerScrape = async () => {
    try {
      setScraping(true)
      setScrapeMessage('🔥 Searching web for top viral videos... This takes 1–2 minutes.')
      const res = await fetch('/api/viral-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: selectedNiche }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setTimeout(async () => {
          const freshData = await getViralPosts(selectedNiche)
          setPosts(freshData)
          setScraping(false)
          setScrapeMessage('✅ Updated top 10 viral posts for ' + selectedNiche + '!')
          setTimeout(() => setScrapeMessage(null), 4000)
        }, 5000)
      } else {
        setScrapeMessage(json.message || 'Scraper failed to start.')
        setScraping(false)
      }
    } catch (err) {
      setScrapeMessage('Failed to connect to viral scraper.')
      setScraping(false)
    }
  }

  const handleCustomNicheSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customNiche.trim()) {
      setSelectedNiche(customNiche.trim())
      setCustomNiche('')
    }
  }

  const filteredPosts = posts
    .filter(p => p.platform === activePlatform)
    .sort((a, b) => b.views - a.views)

  return (
    <div className="space-y-6">
      {/* Top Banner / Niche Selection */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🔥</span>
              <h2 className="text-xl font-bold text-white tracking-tight">Viral Content Finder</h2>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Top 10 highest-reach viral posts on TikTok, Instagram &amp; Facebook ranked by views.
            </p>

            {/* Niche Selector Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Target Niche:</span>
              {PRESET_NICHES.map(niche => (
                <button
                  key={niche}
                  onClick={() => setSelectedNiche(niche)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedNiche === niche
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {niche}
                </button>
              ))}

              {/* Custom Niche Input Form */}
              <form onSubmit={handleCustomNicheSubmit} className="flex items-center gap-1.5 ml-1">
                <input
                  type="text"
                  value={customNiche}
                  onChange={(e) => setCustomNiche(e.target.value)}
                  placeholder="+ Custom Niche..."
                  className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 w-32"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full"
                >
                  Add
                </button>
              </form>
            </div>
          </div>

          {/* Trigger Button */}
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleTriggerScrape}
              disabled={scraping}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                scraping
                  ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold shadow-amber-500/20 active:scale-95'
              }`}
            >
              {scraping ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-amber-200" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Searching Viral Posts...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Find Viral Content
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400">Independent trigger for <strong className="text-slate-300">{selectedNiche}</strong></span>
          </div>
        </div>

        {/* Status Message */}
        {scrapeMessage && (
          <div className="mt-4 flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-300 text-xs">
            {scrapeMessage}
          </div>
        )}
      </div>

      {/* Platform Sub-tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {[
            { key: 'tiktok', label: 'TikTok Videos', icon: '🎵', count: posts.filter(p => p.platform === 'tiktok').length },
            { key: 'instagram', label: 'Instagram Reels', icon: '📸', count: posts.filter(p => p.platform === 'instagram').length },
            { key: 'facebook', label: 'Facebook Reels', icon: '📘', count: posts.filter(p => p.platform === 'facebook').length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActivePlatform(tab.key as ViralPlatform)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all ${
                activePlatform === tab.key
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950 text-slate-400">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 font-medium">
          Showing top {filteredPosts.length} viral posts in <span className="text-violet-400 font-semibold">{selectedNiche}</span>
        </p>
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs">Fetching viral leaderboard...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
          <p className="text-slate-400 text-sm font-semibold">No viral posts found yet for {selectedNiche}</p>
          <p className="text-slate-500 text-xs mt-1 mb-4">Click "Find Viral Content" to trigger an automated viral search across social media.</p>
          <button
            onClick={handleTriggerScrape}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            Find Viral Content Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post, idx) => (
            <ViralPostCard key={post.id || idx} post={post} rank={idx + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
