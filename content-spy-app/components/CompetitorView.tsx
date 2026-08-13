'use client'

import { CompetitorWithPosts } from '@/lib/types'
import CompetitorCard from './CompetitorCard'

interface Props {
  competitors: CompetitorWithPosts[]
}

export default function CompetitorView({ competitors }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {competitors.map(c => (
        <CompetitorCard key={c.id} competitor={c} />
      ))}
    </div>
  )
}
