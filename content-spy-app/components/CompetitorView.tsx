'use client'

import { CompetitorWithPosts } from '@/lib/types'
import CompetitorCard from './CompetitorCard'

interface Props {
  competitors: CompetitorWithPosts[]
  onEdit?: (competitor: CompetitorWithPosts) => void
  onDelete?: (competitor: CompetitorWithPosts) => void
}

export default function CompetitorView({ competitors, onEdit, onDelete }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {competitors.map(c => (
        <CompetitorCard key={c.id} competitor={c} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
