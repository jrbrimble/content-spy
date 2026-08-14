'use client'

import { useState, useEffect, useRef } from 'react'
import { ViralPost, ViralPlatform } from '@/lib/types'
import ViralPostCard from './ViralPostCard'

const DEFAULT_NICHES = ['AI Agents', 'AI Automation', 'B2B SaaS', 'Growth Marketing']

type SearchStatus = 'idle' | 'searching' | 'done' | 'error'

export default function ViralFinderView() {
  const [niches, setNiches] = useState<string[]>(DEFAULT_NICHES)
  const [selectedNiche, setSelectedNiche] = useState('AI Agents')
  const [customNiche, setCustomNiche] = useState('')
  const [activePlatform, setActivePlatform] = useState<'tiktok' | 'instagram'>('tiktok')
  const [posts, setPosts] = useState<ViralPost[]>([])
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [lastSearchedNiche, setLastSearchedNiche] = useState<string | null>(null)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load niches from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('content_spy_niches')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNiches(parsed)
          if (!parsed.includes(selectedNiche)) setSelectedNiche(parsed[0])
        }
      }
    } catch { /* ignore */ }
  }, [])

  const saveNiches = (updatedNiches: string[]) => {
    setNiches(updatedNiches)
    try { localStorage.setItem('content_spy_niches', JSON.stringify(updatedNiches)) } catch { /* ignore */ }
  }

  const handleSearch = async (niche?: string) => {
    const target = (niche ?? selectedNiche).trim()
    if (!target || searchStatus === 'searching') return

    // Start timer
    setElapsed(0)
    setSearchStatus('searching')
    setStatusMessage(null)
    setCachedAt(null)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    try {
      const res = await fetch('/api/viral-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: target }),
      })
      const json = await res.json()

      if (timerRef.current) clearInterval(timerRef.current)

      if (!res.ok || !json.success) {
        setSearchStatus('error')
        setStatusMessage(json.error || 'Search failed — please try again.')
        return
      }

      // Map API response to ViralPost shape
      const mapped: ViralPost[] = (json.posts || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        niche: p.niche as string,
        platform: p.platform as ViralPlatform,
        creator_name: p.creator_name as string,
        creator_handle: p.creator_handle as string,
        caption: p.caption as string,
        url: p.url as string,
        views: p.views as number,
        likes: p.likes as number,
        estimated_reach: p.estimated_reach as number,
        published_at: p.published_at as string,
        scraped_at: p.scraped_at as string,
      }))

      setPosts(mapped)
      setLastSearchedNiche(target)
      setSearchStatus('done')

      if (json.cached && json.cachedAt) {
        setCachedAt(json.cachedAt)
        setStatusMessage(`⚡ Instant results from cache (refreshes hourly)`)
      } else {
        setStatusMessage(`✅ Found ${mapped.length} viral posts for "${target}"`)
      }

      // Warn about partial failures
      if (json.errors?.tiktok) console.warn('[TikTok]', json.errors.tiktok)
      if (json.errors?.instagram) console.warn('[Instagram]', json.errors.instagram)

      setTimeout(() => setStatusMessage(null), 5000)
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current)
      setSearchStatus('error')
      setStatusMessage('Connection error — check your network and try again.')
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleCustomNicheSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = customNiche.trim()
    if (!trimmed) return
    if (!niches.includes(trimmed)) saveNiches([...niches, trimmed])
    setSelectedNiche(trimmed)
    setCustomNiche('')
  }

  const handleRemoveNiche = (nicheToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = niches.filter(n => n !== nicheToRemove)
    saveNiches(updated)
    if (selectedNiche === nicheToRemove) setSelectedNiche(updated[0] || 'AI Agents')
  }

  const tiktokPosts = posts.filter(p => p.platform === 'tiktok').sort((a, b) => b.views - a.views).slice(0, 5)
  const instagramPosts = posts.filter(p => p.platform === 'instagram').sort((a, b) => b.views - a.views).slice(0, 5)
  const filteredPosts = activePlatform === 'tiktok' ? tiktokPosts : instagramPosts

  const isSearching = searchStatus === 'searching'

  return (
    <div className="space-y-6">
      {/* Header / Niche Selection */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🔥</span>
              <h2 className="text-xl font-bold text-white tracking-tight">Viral Content Finder</h2>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Enter your niche — the system scrapes <strong className="text-slate-300">real live data</strong> from TikTok & Instagram, ranked by actual views from the last 7 days.
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
                  placeholder="+ Add niche..."
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

          {/* Search Button */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={() => handleSearch()}
              disabled={isSearching}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                isSearching
                  ? 'bg-amber-600/40 text-amber-300 cursor-not-allowed border border-amber-500/30'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/20 active:scale-95'
              }`}
            >
              {isSearching ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-amber-300" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Searching... {elapsed}s
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find Viral Content
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400">
              Searching for <strong className="text-slate-300">{selectedNiche}</strong>
            </span>
          </div>
        </div>

        {/* Status / Info Bar */}
        {isSearching && (
          <div className="mt-4 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 animate-spin text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <div>
              <p className="text-amber-300 text-xs font-semibold">
                Scraping TikTok & Instagram for &ldquo;{selectedNiche}&rdquo; — this takes 20–60 seconds for fresh results.
              </p>
              <p className="text-amber-400/60 text-[10px] mt-0.5">Results are cached for 1 hour — subsequent searches are instant ⚡</p>
            </div>
          </div>
        )}

        {statusMessage && !isSearching && (
          <div className={`mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs ${
            searchStatus === 'error'
              ? 'bg-red-500/10 border border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
          }`}>
            {statusMessage}
          </div>
        )}
      </div>

      {/* Platform Sub-tabs (TikTok + Instagram only) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {[
            {
              key: 'tiktok' as const,
              label: 'TikTok Videos',
              count: tiktokPosts.length,
              icon: (
                <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.901 2.89 2.896 2.896 0 0 1-2.902-2.89 2.897 2.897 0 0 1 2.902-2.894c.328 0 .64.062.934.175V9.45a6.31 6.31 0 0 0-.934-.07 6.34 6.34 0 0 0-6.339 6.344 6.34 6.34 0 0 0 6.339 6.342 6.34 6.34 0 0 0 6.339-6.342V8.136a8.21 8.21 0 0 0 4.801 1.547V6.238a4.834 4.834 0 0 1-1.028.448z"/>
                </svg>
              ),
            },
            {
              key: 'instagram' as const,
              label: 'Instagram Reels',
              count: instagramPosts.length,
              icon: (
                <svg className="w-4 h-4 text-pink-400 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              ),
            },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActivePlatform(tab.key)}
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

        {lastSearchedNiche && (
          <p className="text-xs text-slate-400 font-medium">
            Top {filteredPosts.length} viral posts for <span className="text-violet-400 font-semibold">{lastSearchedNiche}</span>
          </p>
        )}
      </div>

      {/* Posts Grid */}
      {searchStatus === 'idle' ? (
        /* Initial empty state — no search done yet */
        <div className="text-center py-24 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-white font-semibold text-sm">Ready to find viral content</p>
          <p className="text-slate-400 text-xs mt-1 mb-5 max-w-sm mx-auto">
            Select or add a niche above, then click <strong className="text-amber-400">Find Viral Content</strong> to scrape real live data from TikTok & Instagram.
          </p>
          <button
            onClick={() => handleSearch()}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            Find Viral Content
          </button>
        </div>
      ) : isSearching ? (
        /* Loading state */
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="w-14 h-14 border-2 border-slate-700 rounded-full" />
            <div className="absolute inset-0 w-14 h-14 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-white text-sm font-semibold">Scanning TikTok & Instagram...</p>
            <p className="text-slate-400 text-xs mt-1">Finding the most-viewed &ldquo;{selectedNiche}&rdquo; posts from the last 7 days</p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {['TikTok', 'Instagram'].map(pl => (
              <span key={pl} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 animate-pulse">
                <span className={pl === 'TikTok' ? 'text-white' : 'text-pink-400'}>●</span>
                {pl}
              </span>
            ))}
          </div>
        </div>
      ) : filteredPosts.length === 0 ? (
        /* No results */
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
          <p className="text-slate-300 font-semibold text-sm">No results found</p>
          <p className="text-slate-500 text-xs mt-1 mb-4">
            No {activePlatform === 'tiktok' ? 'TikTok videos' : 'Instagram Reels'} found for &ldquo;{lastSearchedNiche}&rdquo; from the last 7 days.
            Try a different niche or a broader term.
          </p>
          <button
            onClick={() => handleSearch()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            Search Again
          </button>
        </div>
      ) : (
        /* Results grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post, idx) => (
            <ViralPostCard key={post.id || idx} post={post} rank={idx + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
