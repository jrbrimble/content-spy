'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllCompetitorsWithPosts, addCompetitor, updateCompetitor, deleteCompetitor } from '@/lib/data'
import { CompetitorWithPosts, ViewMode, CompetitorInput } from '@/lib/types'
import ViewToggle from '@/components/ViewToggle'
import CompetitorView from '@/components/CompetitorView'
import PlatformView from '@/components/PlatformView'
import CompetitorModal from '@/components/CompetitorModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

export default function DashboardPage() {
  const [competitors, setCompetitors] = useState<CompetitorWithPosts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('competitor')
  const [dataPeriod, setDataPeriod] = useState<{ from: string; to: string; scraped: string; ytFrom: string } | null>(null)
  const [scraping, setScraping] = useState(false)
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [scrapeStartTime, setScrapeStartTime] = useState<number | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompetitor, setEditingCompetitor] = useState<CompetitorWithPosts | null>(null)
  const [deletingCompetitor, setDeletingCompetitor] = useState<CompetitorWithPosts | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAllCompetitorsWithPosts()
      setCompetitors(data)

      // Find last_scraped_at from competitor records
      const scrapedDates = data.map(c => c.last_scraped_at).filter(Boolean) as string[]
      const scraped = scrapedDates.length > 0
        ? new Date(Math.max(...scrapedDates.map(d => new Date(d).getTime()))).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })
        : 'Unknown'

      // YouTube = 14 days window, others = 7 days
      const now = new Date()
      const ytFrom = new Date(now); ytFrom.setDate(ytFrom.getDate() - 14)
      const socialFrom = new Date(now); socialFrom.setDate(socialFrom.getDate() - 7)
      const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      const today = fmt(now)

      setDataPeriod({
        from: fmt(socialFrom),
        to: today,
        scraped,
        ytFrom: fmt(ytFrom),
      })
    } catch (err) {
      setError('Failed to load competitor data. Check your Supabase connection.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Poll for completion while scraping
  useEffect(() => {
    if (!scraping) return
    const interval = setInterval(async () => {
      if (!scraping) return
      try {
        const res = await fetch('/api/scrape')
        const json = await res.json()
        if (json.running === false && scraping) {
          // GitHub Actions can take up to 20 seconds to register a new run.
          // Don't trust a 'false' reading if we just started scraping recently.
          const isRecentlyStarted = scrapeStartTime && (Date.now() - scrapeStartTime < 30000)
          if (!isRecentlyStarted) {
            setScraping(false)
            setScrapeMessage(null)
            loadData()
            
            // Show a success message temporarily
            setScrapeMessage('✅ New data fetched successfully!')
            setTimeout(() => {
              setScrapeMessage(null)
            }, 3000)
            clearInterval(interval)
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [scraping, loadData])

  const handleStartSpy = async () => {
    setScrapeError(null)
    setScrapeMessage(null)
    try {
      const res = await fetch('/api/scrape', { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.success) {
        setScraping(true)
        setScrapeStartTime(Date.now())
        setScrapeMessage('🕵️ Spying in progress... This takes 3–5 minutes. You can keep browsing.')
      } else {
        setScrapeError(json.message || 'Failed to start scraper.')
      }
    } catch {
      setScrapeError('Could not reach the scraper API. Make sure the dev server is running.')
    }
  }

  const totalPosts = competitors.reduce(
    (s, c) => s + c.youtube_posts.length + c.twitter_posts.length + c.instagram_posts.length + c.facebook_posts.length,
    0
  )
  const totalTranscripts = competitors.reduce(
    (s, c) => s + c.instagram_posts.filter(p => p.is_reel && p.transcript).length, 0
  )
  const handleSaveCompetitor = async (input: CompetitorInput) => {
    if (editingCompetitor) {
      const res = await updateCompetitor(editingCompetitor.id, input)
      if (!res.success) throw new Error(res.error)
    } else {
      const res = await addCompetitor(input)
      if (!res.success) throw new Error(res.error)
    }
    await loadData()
  }

  const handleConfirmDelete = async () => {
    if (!deletingCompetitor) return
    const res = await deleteCompetitor(deletingCompetitor.id)
    if (!res.success) throw new Error(res.error)
    await loadData()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-violet-500 selection:text-white pb-20 relative">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Banner / Header */}
      <div className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/20">
                  🕵️
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">Content Spy</h1>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                Competitor intelligence across YouTube, Twitter/X, Instagram &amp; Facebook
              </p>

              {/* Data period badges */}
              {dataPeriod && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {/* YouTube window */}
                  <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1">
                    <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <span className="text-xs text-red-300 font-medium">YouTube <span className="text-red-400/70">(14 days):</span> <span className="text-red-200">{dataPeriod.ytFrom} → {dataPeriod.to}</span></span>
                  </div>
                  {/* Social window */}
                  <div className="flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/20 rounded-full px-3 py-1">
                    <svg className="w-3 h-3 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-xs text-pink-300 font-medium">FB / IG / X <span className="text-pink-400/70">(7 days):</span> <span className="text-pink-200">{dataPeriod.from} → {dataPeriod.to}</span></span>
                  </div>
                  {/* Last spied */}
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-slate-400">Last spied: <span className="text-slate-300">{dataPeriod.scraped}</span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Actions & View Toggle */}
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                {/* Add Competitor Button */}
                <button
                  onClick={() => {
                    setEditingCompetitor(null)
                    setIsModalOpen(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 transition-all duration-200 shadow-md active:scale-95"
                >
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Competitor
                </button>

                {/* Start Spying Button */}
                <button
                  onClick={handleStartSpy}
                  disabled={scraping}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg ${
                    scraping
                      ? 'bg-violet-700/50 text-violet-300 cursor-not-allowed border border-violet-600/30'
                      : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white hover:shadow-violet-500/30 hover:shadow-xl active:scale-95'
                  }`}
                >
                  {scraping ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Spying...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Start Spying
                    </>
                  )}
                </button>
              </div>
              <ViewToggle view={view} onToggle={setView} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Scrape status messages */}
        {scrapeMessage && (
          <div className="mb-4 flex items-center gap-2.5 bg-violet-500/10 border border-violet-500/30 rounded-xl px-4 py-3">
            {scraping && (
              <svg className="w-4 h-4 text-violet-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            <p className="text-violet-300 text-sm">{scrapeMessage}</p>
          </div>
        )}
        {scrapeError && (
          <div className="mb-4 flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-300 text-sm">{scrapeError}</p>
          </div>
        )}

        {/* Stats bar */}
        {!loading && competitors.length > 0 && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Competitors', value: competitors.length, color: 'text-violet-400' },
              { label: 'YouTube Videos', value: competitors.reduce((s, c) => s + c.youtube_posts.length, 0), color: 'text-red-400' },
              { label: 'Social Posts', value: totalPosts - competitors.reduce((s, c) => s + c.youtube_posts.length, 0), color: 'text-pink-400' },
              { label: 'Reel Transcripts', value: totalTranscripts, color: 'text-purple-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading competitor data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-300 font-semibold">{error}</p>
            <p className="text-red-400/60 text-sm mt-1">Make sure your .env.local has the correct Supabase URL and key.</p>
          </div>
        )}

        {!loading && !error && competitors.length === 0 && (
          <div className="text-center py-32">
            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium text-lg">No competitors yet</p>
            <p className="text-slate-500 text-sm mt-1 mb-6">Click "+ Add Competitor" above to start tracking competitor channels.</p>
            <button
              onClick={() => {
                setEditingCompetitor(null)
                setIsModalOpen(true)
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Competitor
            </button>
          </div>
        )}

        {!loading && !error && competitors.length > 0 && (
          <div className="transition-all duration-300">
            {view === 'competitor' ? (
              <CompetitorView
                competitors={competitors}
                onEdit={(c) => {
                  setEditingCompetitor(c)
                  setIsModalOpen(true)
                }}
                onDelete={(c) => setDeletingCompetitor(c)}
              />
            ) : (
              <PlatformView competitors={competitors} />
            )}
          </div>
        )}
      </div>

      {/* Competitor Add/Edit Modal */}
      <CompetitorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingCompetitor(null)
        }}
        onSave={handleSaveCompetitor}
        initialData={editingCompetitor}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingCompetitor}
        name={deletingCompetitor?.name || ''}
        onClose={() => setDeletingCompetitor(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
