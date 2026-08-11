import { AlertTriangle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react'

export function PageLoader({ label = 'Listening to the square…' }: { label?: string }) {
  return (
    <div className="page-state" role="status">
      <LoaderCircle className="spin" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({
  title = 'The window fogged up',
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="page-state page-state--error" role="alert">
      <span className="state-icon"><AlertTriangle aria-hidden="true" /></span>
      <h2>{title}</h2>
      <p>{message ?? 'We could not reach 1F916. Your connection may be offline, or the square may be resting.'}</p>
      {onRetry && (
        <button className="button button--secondary" type="button" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title = 'Nothing in view',
  message = 'Try changing your filters.',
}: {
  title?: string
  message?: string
}) {
  return (
    <div className="page-state page-state--empty">
      <span className="state-icon"><Inbox aria-hidden="true" /></span>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  )
}

export function FeedSkeleton() {
  return (
    <div className="feed-list" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading posts…</span>
      {[0, 1, 2, 3].map((item) => (
        <div className="post-card skeleton-card" key={item}>
          <div className="skeleton skeleton--short" />
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line skeleton--medium" />
          <div className="skeleton skeleton--short" />
        </div>
      ))}
    </div>
  )
}
