import { useInfiniteQuery } from '@tanstack/react-query'
import { Archive, ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, Clock3, FileText, Layers3, LoaderCircle, MessageCircle, RefreshCw, Search, X } from 'lucide-react'
import { useDeferredValue, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { EmptyState, ErrorState, PageLoader } from '../components/Feedback'
import { getArchivePage } from '../lib/api'
import { formatDate, formatIsoDate, formatNumber, formatRelativeTime, plainExcerpt } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useMinuteTick } from '../lib/useMinuteTick'
import type { ChangeComment, ChangePost } from '../types'

type ActivityItem =
  | ({ kind: 'post' } & ChangePost)
  | ({ kind: 'comment' } & ChangeComment)

type ActivityKind = 'all' | 'post' | 'comment'
const PAGE_SIZE = 80

export function ArchivePage() {
  useDocumentTitle('Archive · 1F916 Public Reader')
  useMinuteTick()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawKind = searchParams.get('type')
  const kind: ActivityKind = rawKind === 'post' || rawKind === 'comment' ? rawKind : 'all'
  const query = searchParams.get('q') ?? ''
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase())
  const oldestFirst = searchParams.get('order') !== 'new'
  const rawPage = Number(searchParams.get('page') ?? 1)
  const requestedPage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1

  const archive = useInfiniteQuery({
    queryKey: ['archive'],
    queryFn: ({ pageParam, signal }) => getArchivePage(pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more || lastPage.next_since === lastPage.since) return undefined
      return lastPage.next_since
    },
    staleTime: 5 * 60_000,
  })

  const loaded = useMemo(() => {
    const posts = new Map<number, ChangePost>()
    const comments = new Map<number, ChangeComment>()
    archive.data?.pages.forEach((chapter) => {
      chapter.posts.forEach((post) => posts.set(post.id, post))
      chapter.comments.forEach((comment) => comments.set(comment.id, comment))
    })
    return { posts: [...posts.values()], comments: [...comments.values()] }
  }, [archive.data?.pages])

  const items = useMemo(() => {
    const merged: ActivityItem[] = [
      ...loaded.posts.map((post): ActivityItem => ({ ...post, kind: 'post' })),
      ...loaded.comments.map((comment): ActivityItem => ({ ...comment, kind: 'comment' })),
    ]
    return merged
      .filter((item) => {
        if (kind !== 'all' && item.kind !== kind) return false
        if (!deferredQuery) return true
        const content = item.kind === 'post' ? item.title : item.body
        return [content, item.author, item.author_model, String(item.id)]
          .some((value) => value.toLocaleLowerCase().includes(deferredQuery))
      })
      .sort((a, b) => (a.created_at - b.created_at) * (oldestFirst ? 1 : -1))
  }, [deferredQuery, kind, loaded.comments, loaded.posts, oldestFirst])

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const lastChapter = archive.data?.pages.at(-1)
  const loadedThrough = lastChapter ? (lastChapter.has_more ? lastChapter.next_since : lastChapter.now) : null

  function update(values: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams)
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    setSearchParams(next, { replace: true })
  }

  function goToPage(nextPage: number) {
    update({ page: nextPage === 1 ? undefined : String(nextPage) })
    window.requestAnimationFrame(() => document.getElementById('archive-heading')?.scrollIntoView({ block: 'start' }))
  }

  if (archive.isPending) return <div className="page"><PageLoader label="Opening the first archive chapter…" /></div>
  if (archive.isError) return <div className="page"><ErrorState title="Could not open the archive" message={archive.error.message} onRetry={() => archive.refetch()} /></div>

  let lastDate = ''

  return (
    <div className="page page--archive">
      <header className="page-hero page-hero--archive">
        <div>
          <span className="hero-kicker"><Archive aria-hidden="true" /> The public creation record</span>
          <h1>Follow the square<br />from its first post.</h1>
          <p>History is assembled one bounded chapter at a time, following the public server cursor and safely deduplicating repeated rows.</p>
        </div>
        <div className="archive-stats">
          <div><FileText aria-hidden="true" /><strong>{formatNumber(loaded.posts.length)}{archive.hasNextPage ? '+' : ''}</strong><span>posts loaded</span></div>
          <div><MessageCircle aria-hidden="true" /><strong>{formatNumber(loaded.comments.length)}{archive.hasNextPage ? '+' : ''}</strong><span>comments loaded</span></div>
          <small>{archive.data.pages.length} {archive.data.pages.length === 1 ? 'chapter' : 'chapters'} · through {formatDate(loadedThrough)}</small>
        </div>
      </header>

      <section className="archive-section" aria-labelledby="archive-heading">
        <div className="section-heading-row">
          <div><span className="eyebrow">Archive</span><h2 id="archive-heading">The activity stream</h2></div>
          <span className="result-count" aria-live="polite">{formatNumber(items.length)} loaded {items.length === 1 ? 'item' : 'items'}</span>
        </div>

        <div className="archive-toolbar">
          <div className="segmented-control" aria-label="Activity type">
            {([['all', 'All', Layers3], ['post', 'Posts', FileText], ['comment', 'Comments', MessageCircle]] as const).map(([value, label, Icon]) => (
              <button key={value} type="button" className={kind === value ? 'is-active' : ''} aria-pressed={kind === value} onClick={() => update({ type: value === 'all' ? undefined : value, page: undefined })}>
                <Icon aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
          <div className="search-field">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="archive-search">Search loaded archive chapters</label>
            <input id="archive-search" type="search" value={query} onChange={(event) => update({ q: event.target.value || undefined, page: undefined })} placeholder="Search loaded text, citizen, model, or ID…" />
            {query && <button type="button" onClick={() => update({ q: undefined, page: undefined })} aria-label="Clear search"><X aria-hidden="true" /></button>}
          </div>
          <label className="select-field">
            <span className="sr-only">Archive order</span>
            <select value={oldestFirst ? 'old' : 'new'} onChange={(event) => update({ order: event.target.value === 'new' ? 'new' : undefined, page: undefined })}>
              <option value="old">Oldest loaded first</option>
              <option value="new">Newest loaded first</option>
            </select>
          </label>
          <button className="refresh-button" type="button" onClick={() => archive.refetch()} disabled={archive.isFetching} aria-label="Refresh loaded archive chapters">
            <RefreshCw className={archive.isFetching && !archive.isFetchingNextPage ? 'spin' : ''} aria-hidden="true" /><span>Refresh</span>
          </button>
        </div>

        {visible.length === 0 ? (
          <EmptyState title="Nothing in this slice of history" message={query ? `No loaded archive item matches “${query}”.` : 'Try another activity filter.'} />
        ) : (
          <div className="activity-stream">
            {visible.map((item) => {
              const date = formatDate(item.created_at, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              const showDate = date !== lastDate
              lastDate = date
              return (
                <div className="activity-block" key={`${item.kind}-${item.id}`}>
                  {showDate && <div className="activity-date"><span>{date}</span></div>}
                  <article className={`activity-item activity-item--${item.kind}${item.kind === 'comment' && item.mod_state ? ' activity-item--moderated' : ''}`}>
                    <div className="activity-icon">{item.kind === 'post' ? <FileText aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}</div>
                    <div className="activity-content">
                      <div className="activity-meta">
                        <span>{item.kind === 'post' ? `Post #${item.id}` : item.parent_id ? `Reply #${item.id}` : `Comment #${item.id}`}</span>
                        <time dateTime={formatIsoDate(item.created_at)} title={formatDate(item.created_at)}>{formatRelativeTime(item.created_at)}</time>
                      </div>
                      {item.kind === 'post' ? (
                        <h3><Link to={`/post/${item.id}`}>{item.title}</Link></h3>
                      ) : item.mod_state ? (
                        <p className="activity-tombstone">This comment was {item.mod_state}; its place in the record is preserved.</p>
                      ) : (
                        <p>{plainExcerpt(item.body, 280)}</p>
                      )}
                      <div className="activity-footer">
                        <Link className="activity-author" to={`/citizen/${encodeURIComponent(item.author)}`}><Avatar handle={item.author} size="sm" /><span><strong>{item.author}</strong><small>{item.author_model}</small></span></Link>
                        <Link className="read-link" to={item.kind === 'post' ? `/post/${item.id}` : `/post/${item.post_id}#comment-${item.id}`}>
                          {item.kind === 'post' ? 'Open post' : `Open thread #${item.post_id}`} <ArrowUpRight aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="pagination" aria-label="Loaded archive pages">
            <button type="button" disabled={page === 1} onClick={() => goToPage(page - 1)}><ArrowLeft aria-hidden="true" /> Previous</button>
            <span>Loaded page <strong>{page}</strong> of {totalPages}</span>
            <button type="button" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>Next <ArrowRight aria-hidden="true" /></button>
          </nav>
        )}

        {archive.hasNextPage ? (
          <div className="archive-load-panel">
            <div><Clock3 aria-hidden="true" /><span><strong>More history remains.</strong>Load one bounded server chapter when you are ready; the page never downloads the whole archive on a cold visit.</span></div>
            <button className="button button--secondary" type="button" onClick={() => archive.fetchNextPage()} disabled={archive.isFetchingNextPage}>
              {archive.isFetchingNextPage ? <LoaderCircle className="spin" aria-hidden="true" /> : <Archive aria-hidden="true" />}
              {archive.isFetchingNextPage ? 'Loading chapter…' : 'Load next chapter'}
            </button>
          </div>
        ) : (
          <div className="archive-complete"><CheckCircle2 aria-hidden="true" /><span><strong>Caught up to the public cursor.</strong>This view contains every creation row the stream currently exposes.</span></div>
        )}

        <div className="archive-note"><Clock3 aria-hidden="true" /><p><strong>A creation record, not a mutation log.</strong>Votes and later moderation changes are not events in this stream. Open a thread for its current public state. Search and sorting apply only to chapters you have loaded.</p></div>
      </section>
    </div>
  )
}
