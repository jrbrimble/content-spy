'use client'

import { useState, useEffect } from 'react'
import { ViralPost, ViralPlatform } from '@/lib/types'
import { getViralPosts } from '@/lib/data'
import ViralPostCard from './ViralPostCard'

const DEFAULT_NICHES = ['AI Agents', 'AI Automation', 'B2B SaaS', 'Growth Marketing']

export default function ViralFinderView() {
  const [niches, setNiches] = useState<string[]>(DEFAULT_NICHES)
  const [selectedNiche, setSelectedNiche] = useState('AI Agents')
  const [customNiche, setCustomNiche] = useState('')
  const [activePlatform, setActivePlatform] = useState<ViralPlatform>('tiktok')
  const [posts, setPosts] = useState<ViralPost[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null)

  // Load niches from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('content_spy_niches')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNiches(parsed)
          if (!parsed.includes(selectedNiche)) {
            setSelectedNiche(parsed[0])
          }
        }
      }
    } catch (e) {
      // localStorage error fallback
    }
  }, [])

  // Save niches to localStorage whenever updated
  const saveNiches = (updatedNiches: string[]) => {
    setNiches(updatedNiches)
    try {
      localStorage.setItem('content_spy_niches', JSON.stringify(updatedNiches))
    } catch (e) {
      // localStorage error fallback
    }
  }

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
          setScrapeMessage('✅ Updated top 5 viral posts for ' + selectedNiche + '!')
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
    const trimmed = customNiche.trim()
    if (trimmed) {
      if (!niches.includes(trimmed)) {
        const nextNiches = [...niches, trimmed]
        saveNiches(nextNiches)
      }
      setSelectedNiche(trimmed)
      setCustomNiche('')
    }
  }

  const handleRemoveNiche = (nicheToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = niches.filter(n => n !== nicheToRemove)
    saveNiches(updated)

    if (selectedNiche === nicheToRemove) {
      if (updated.length > 0) {
        setSelectedNiche(updated[0])
      } else {
        setSelectedNiche('AI Agents')
      }
    }
  }

  const filteredPosts = posts
    .filter(p => p.platform === activePlatform)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

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
              Top 5 highest-reach viral posts on TikTok, Instagram &amp; Facebook ranked by views (last 7 days).
            </p>

            {/* Niche Selector Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Target Niche:</span>
              {niches.map(niche => (
                <div
                  key={niche}
                  className={`group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedNiche === niche
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  onClick={() => setSelectedNiche(niche)}
                >
                  <span>{niche}</span>
                  <button
                    type="button"
                    title={`Remove ${niche}`}
                    onClick={(e) => handleRemoveNiche(niche, e)}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[11px] hover:bg-red-500/20 hover:text-red-300 transition-colors text-slate-400 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Custom Niche Input Form */}
              <form onSubmit={handleCustomNicheSubmit} className="flex items-center gap-1.5 ml-1">
                <input
                  type="text"
                  value={customNiche}
                  onChange={(e) => setCustomNiche(e.target.value)}
                  placeholder="+ Add Target Niche..."
                  className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 w-36"
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
            {
              key: 'tiktok',
              label: 'TikTok Videos',
              icon: (
                <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.901 2.89 2.896 2.896 0 0 1-2.902-2.89 2.897 2.897 0 0 1 2.902-2.894c.328 0 .64.062.934.175V9.45a6.31 6.31 0 0 0-.934-.07 6.34 6.34 0 0 0-6.339 6.344 6.34 6.34 0 0 0 6.339 6.342 6.34 6.34 0 0 0 6.339-6.342V8.136a8.21 8.21 0 0 0 4.801 1.547V6.238a4.834 4.834 0 0 1-1.028.448z"/>
                </svg>
              ),
              count: posts.filter(p => p.platform === 'tiktok').length,
            },
            {
              key: 'instagram',
              label: 'Instagram Reels',
              icon: (
                <svg className="w-4 h-4 text-pink-500 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              ),
              count: posts.filter(p => p.platform === 'instagram').length,
            },
            {
              key: 'facebook',
              label: 'Facebook Reels',
              icon: (
                <svg className="w-4 h-4 text-blue-500 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              ),
              count: posts.filter(p => p.platform === 'facebook').length,
            },
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
