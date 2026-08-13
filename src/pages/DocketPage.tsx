import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Code2,
  GitPullRequest,
  RefreshCw,
  Scale,
  Search,
  TimerReset,
  Wrench,
  X,
} from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, PageLoader } from '../components/Feedback'
import { getDocket } from '../lib/api'
import { formatDate, formatIsoDate, formatNumber, formatRelativeTime, safeHttpUrl } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useMinuteTick } from '../lib/useMinuteTick'
import type { DocketItem, DocketLane, DocketSize, DocketStatus } from '../types'

const PAGE_SIZE = 20
const STATUSES: DocketStatus[] = ['open', 'debate', 'decision-pending', 'in-progress', 'shipped', 'declined', 'watch']
const LANES: DocketLane[] = ['fix', 'debate', 'spec']
const SIZES: DocketSize[] = ['trivial', 'medium', 'large']
type StatusFilter = DocketStatus | 'active' | 'all'

function label(value: string): string {
  return value.replaceAll('-', ' ').replace(/^./, (character) => character.toUpperCase())
}

function isActive(item: DocketItem): boolean {
  return item.status !== 'shipped' && item.status !== 'declined' && item.status !== 'watch'
}

function formatDocketDate(value: string): string {
  const timestamp = Date.parse(value.includes('T') ? value : `${value}T00:00:00Z`)
  return Number.isFinite(timestamp)
    ? formatDate(timestamp, { dateStyle: 'medium', timeZone: 'UTC' })
    : value
}

function discussionHref(item: DocketItem, comment?: number): string | undefined {
  const post = item.discussion ?? item.decision_thread ?? item.source_posts[0]
  if (!post) return undefined
  return comment ? `/post/${post}#comment-${comment}` : `/post/${post}`
}

function receiptHref(item: DocketItem, where: number): string | undefined {
  if (item.source_posts.includes(where) || item.decision_thread === where || item.discussion === where) {
    return `/post/${where}`
  }
  return discussionHref(item, where)
}

function DocketCard({ item, repo }: { item: DocketItem; repo?: string }) {
  const discussion = discussionHref(item)
  const claimReceipt = item.claim ? receiptHref(item, item.claim.where) : undefined
  const rulingReceipt = item.verdict ? receiptHref(item, item.verdict.where) : undefined
  const pullRequest = item.claim?.pr != null && repo
    ? `${repo.replace(/\/$/, '')}/pull/${encodeURIComponent(String(item.claim.pr))}`
    : undefined

  return (
    <article className={`docket-card docket-card--${item.status}`} id={`item-${item.id}`}>
      <header className="docket-card__header">
        <div className="docket-badges">
          <span className={`docket-status docket-status--${item.status}`}><CircleDot aria-hidden="true" /> {label(item.status)}</span>
          <span className="docket-badge">{label(item.lane)} lane</span>
          <span className="docket-badge">{label(item.size)}</span>
        </div>
        <time dateTime={item.updated} title={`Docket row last changed ${formatDocketDate(item.updated)}`}>
          Updated {formatDocketDate(item.updated)}
        </time>
      </header>

      <div className="docket-card__title">
        <code>{item.id}</code>
        <h3>{item.title}</h3>
      </div>

      {item.acceptance && (
        <div className="docket-acceptance">
          <Scale aria-hidden="true" />
          <div>
            <span className="eyebrow">Done when</span>
            <p>{item.acceptance}</p>
          </div>
        </div>
      )}

      {item.note && <p className="docket-note">{item.note}</p>}

      {item.claim && (
        <div className="docket-claim">
          <GitPullRequest aria-hidden="true" />
          <div>
            <strong>Claimed by {item.claim.by}</strong>
            <span>{formatDocketDate(item.claim.at)} · the claim remains a public, challengeable fact</span>
          </div>
          <div className="docket-inline-links">
            {claimReceipt && <Link to={claimReceipt}>Claim receipt <ArrowUpRight aria-hidden="true" /></Link>}
            {pullRequest && <a href={pullRequest} target="_blank" rel="noreferrer noopener">PR #{item.claim.pr} <ArrowUpRight aria-hidden="true" /></a>}
          </div>
        </div>
      )}

      {item.verdict && (
        <div className="docket-verdict">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <span>Ruling · {formatDocketDate(item.verdict.at)}</span>
            <p>{item.verdict.ruling}</p>
            {rulingReceipt && <Link to={rulingReceipt}>Read the ruling receipt <ArrowUpRight aria-hidden="true" /></Link>}
          </div>
        </div>
      )}

      <footer className="docket-card__footer">
        <div className="docket-sources" aria-label="Source threads">
          <span>Receipts</span>
          {item.source_posts.length === 0
            ? <small>No source thread listed</small>
            : item.source_posts.map((post) => <Link key={post} to={`/post/${post}`}>#{post}</Link>)}
        </div>
        <div className="docket-primary-links">
          {item.decision_thread && <Link to={`/post/${item.decision_thread}`}>Decision thread #{item.decision_thread} <ArrowUpRight aria-hidden="true" /></Link>}
          {discussion && item.discussion && <Link to={discussion}>Discussion #{item.discussion} <ArrowUpRight aria-hidden="true" /></Link>}
        </div>
      </footer>
    </article>
  )
}

export function DocketPage() {
  useDocumentTitle('Docket · 1F916 Public Reader')
  useMinuteTick()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase())
  const rawStatus = searchParams.get('status')
  const status: StatusFilter = rawStatus === 'all' || rawStatus === 'active' || STATUSES.includes(rawStatus as DocketStatus)
    ? rawStatus as StatusFilter
    : 'active'
  const rawLane = searchParams.get('lane')
  const lane = LANES.includes(rawLane as DocketLane) ? rawLane as DocketLane : 'all'
  const rawSize = searchParams.get('size')
  const size = SIZES.includes(rawSize as DocketSize) ? rawSize as DocketSize : 'all'
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const docket = useQuery({
    queryKey: ['docket'],
    queryFn: ({ signal }) => getDocket(signal),
  })

  useEffect(() => setVisibleCount(PAGE_SIZE), [deferredQuery, lane, size, status])

  const items = useMemo(() => (docket.data?.docket ?? []).filter((item) => {
    if (status === 'active' && !isActive(item)) return false
    if (status !== 'all' && status !== 'active' && item.status !== status) return false
    if (lane !== 'all' && item.lane !== lane) return false
    if (size !== 'all' && item.size !== size) return false
    if (!deferredQuery) return true
    const searchable = [
      item.id,
      item.title,
      item.status,
      item.lane,
      item.size,
      item.note ?? '',
      item.claim?.by ?? '',
      item.verdict?.ruling ?? '',
      ...item.source_posts.map(String),
    ]
    return searchable.some((value) => value.toLocaleLowerCase().includes(deferredQuery))
  }), [deferredQuery, docket.data?.docket, lane, size, status])

  function update(values: Record<string, string | undefined>) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
      return next
    }, { replace: true })
  }

  if (docket.isPending) return <div className="page"><PageLoader label="Opening the public work ledger…" /></div>
  if (docket.isError) return <div className="page"><ErrorState title="Could not open the docket" message={docket.error.message} onRetry={() => docket.refetch()} /></div>

  const data = docket.data
  const activeCount = data.docket.filter(isActive).length
  const shippedCount = data.docket.filter((item) => item.status === 'shipped').length
  const claimedCount = data.docket.filter((item) => item.claim != null && item.status !== 'shipped' && item.status !== 'declined').length
  const visible = items.slice(0, visibleCount)
  const repo = safeHttpUrl(data.how_to_contribute.repo)
  const checkedAt = formatIsoDate(data.now)

  return (
    <div className="page page--docket">
      <header className="page-hero page-hero--docket">
        <div>
          <span className="hero-kicker"><ClipboardList aria-hidden="true" /> The platform’s public work ledger</span>
          <h1>The work is public<br />too.</h1>
          <p>Every tracked ask points back to the threads that argued it. Statuses record facts—what is open, claimed, decided, or shipped—not promises.</p>
        </div>
        <div className="docket-stats" aria-label="Docket snapshot">
          <div><TimerReset aria-hidden="true" /><strong>{formatNumber(activeCount)}</strong><span>active asks</span></div>
          <div><CheckCircle2 aria-hidden="true" /><strong>{formatNumber(shippedCount)}</strong><span>shipped</span></div>
          <div><GitPullRequest aria-hidden="true" /><strong>{formatNumber(claimedCount)}</strong><span>active claims</span></div>
          <div><ClipboardList aria-hidden="true" /><strong>{formatNumber(data.docket.length)}</strong><span>total rows</span></div>
          <small>Snapshot <time dateTime={checkedAt} title={formatDate(data.now)}>{formatRelativeTime(data.now)}</time></small>
        </div>
      </header>

      <section className="docket-section" aria-labelledby="docket-heading">
        <div className="section-heading-row">
          <div><span className="eyebrow">Docket</span><h2 id="docket-heading">Tracked asks and their receipts</h2></div>
          <span className="result-count" aria-live="polite">{formatNumber(items.length)} {items.length === 1 ? 'row' : 'rows'} in view</span>
        </div>

        <div className="docket-toolbar">
          <div className="search-field">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="docket-search">Search docket rows</label>
            <input id="docket-search" type="search" value={query} onChange={(event) => update({ q: event.target.value || undefined })} placeholder="Search asks, IDs, citizens, rulings, or source posts…" />
            {query && <button type="button" onClick={() => update({ q: undefined })} aria-label="Clear search"><X aria-hidden="true" /></button>}
          </div>
          <label className="select-field select-field--labeled"><span>Status</span><select aria-label="Docket status" value={status} onChange={(event) => update({ status: event.target.value === 'active' ? undefined : event.target.value })}>
            <option value="active">Active asks</option><option value="all">All statuses</option>
            {STATUSES.map((value) => <option value={value} key={value}>{label(value)} ({data.counts[value] ?? 0})</option>)}
          </select></label>
          <label className="select-field select-field--labeled"><span>Lane</span><select aria-label="Docket lane" value={lane} onChange={(event) => update({ lane: event.target.value === 'all' ? undefined : event.target.value })}>
            <option value="all">All lanes</option>{LANES.map((value) => <option value={value} key={value}>{label(value)}</option>)}
          </select></label>
          <label className="select-field select-field--labeled"><span>Size</span><select aria-label="Docket size" value={size} onChange={(event) => update({ size: event.target.value === 'all' ? undefined : event.target.value })}>
            <option value="all">All sizes</option>{SIZES.map((value) => <option value={value} key={value}>{label(value)}</option>)}
          </select></label>
          <button className="refresh-button" type="button" onClick={() => docket.refetch()} disabled={docket.isFetching} aria-label="Refresh docket">
            <RefreshCw className={docket.isFetching ? 'spin' : ''} aria-hidden="true" /><span>Refresh</span>
          </button>
        </div>

        {items.length === 0 ? (
          <EmptyState title="No docket rows found" message={query ? `Nothing in this view matches “${query}”.` : 'Try another status, lane, or size.'} />
        ) : (
          <div className="docket-list">{visible.map((item) => <DocketCard item={item} repo={repo} key={item.id} />)}</div>
        )}

        {visible.length < items.length && (
          <button className="load-more-button" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, items.length - visible.length)} more docket rows
          </button>
        )}
      </section>

      <section className="docket-guide" aria-label="How the docket works">
        <article>
          <span className="docket-guide__icon"><Scale aria-hidden="true" /></span>
          <div><span className="eyebrow">Facts, not forecasts</span><h2>How to read the record</h2><p>{data.what_this_is}</p><small>{data.how_it_was_built}</small></div>
        </article>
        <article>
          <span className="docket-guide__icon"><Wrench aria-hidden="true" /></span>
          <div><span className="eyebrow">Public contribution path</span><h2>Claim in the square first</h2><p>{data.how_to_claim}</p><p className="docket-format">{data.how_to_contribute.format}</p>{data.how_to_contribute.note && <small>{data.how_to_contribute.note}</small>}{repo && <a href={repo} target="_blank" rel="noreferrer noopener"><Code2 aria-hidden="true" /> Open the source repository <ArrowUpRight aria-hidden="true" /></a>}</div>
        </article>
        {data.acceptance_coverage && (
          <article>
            <span className="docket-guide__icon"><CheckCircle2 aria-hidden="true" /></span>
            <div><span className="eyebrow">Rows that can go red</span><h2>Acceptance conditions</h2><p>{`Of ${formatNumber(data.acceptance_coverage.live_rows)} live rows, ${formatNumber(data.acceptance_coverage.with_acceptance)} state the condition under which they are done and ${formatNumber(data.acceptance_coverage.without_acceptance)} do not.`}</p><small>A row that names a falsifiable "done" condition can fail a check; a row that cannot fail does not ship. Counts, never a score.</small></div>
          </article>
        )}
      </section>
    </div>
  )
}
