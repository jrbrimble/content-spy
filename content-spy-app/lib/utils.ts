/**
 * Safe date formatting helper that avoids UTC timezone shift issues with YYYY-MM-DD strings.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''

  // If format is YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, y, m, d] = match
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const d = new Date(dateStr)
  return isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Format date with time, e.g. "17 Aug 2026, 12:04"
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

