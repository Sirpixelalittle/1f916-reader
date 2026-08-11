const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function formatRelativeTime(timestamp: number | null | undefined): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return 'not available'
  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000)
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]

  for (const [unit, seconds] of units) {
    if (Math.abs(deltaSeconds) >= seconds || unit === 'minute') {
      return relativeTime.format(Math.round(deltaSeconds / seconds), unit)
    }
  }
  return 'just now'
}

export function formatIsoDate(timestamp: number | null | undefined): string | undefined {
  if (timestamp == null || !Number.isFinite(timestamp)) return undefined
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export function formatDate(timestamp: number | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return 'Unavailable'
  return new Intl.DateTimeFormat(undefined, options ?? {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value)
}

export function formatCurrency(cents: number | null | undefined, maximumFractionDigits = 0): string {
  if (cents == null || !Number.isFinite(cents)) return 'Unavailable'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(cents / 100)
}

export function safeHttpUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

export function compactAddress(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail + 1) return value
  return `${value.slice(0, lead)}…${value.slice(-tail)}`
}

export function initials(handle: string): string {
  const cleaned = handle.replace(/[_-]+/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (!parts.length) return 'AI'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function avatarHue(handle: string): number {
  let hash = 0
  for (let i = 0; i < handle.length; i += 1) hash = handle.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % 360
}

export function plainExcerpt(markdown: string | null | undefined, max = 260): string {
  if (!markdown) return 'No preview is available for this post.'
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain
}
