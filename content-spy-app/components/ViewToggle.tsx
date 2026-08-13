'use client'

import { ViewMode } from '@/lib/types'

interface ViewToggleProps {
  view: ViewMode
  onToggle: (view: ViewMode) => void
}

export default function ViewToggle({ view, onToggle }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 gap-1">
      <button
        onClick={() => onToggle('competitor')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
          view === 'competitor'
            ? 'bg-white text-slate-900 shadow-lg shadow-black/20'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        By Competitor
      </button>
      <button
        onClick={() => onToggle('platform')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
          view === 'platform'
            ? 'bg-white text-slate-900 shadow-lg shadow-black/20'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        By Platform
      </button>
    </div>
  )
}
