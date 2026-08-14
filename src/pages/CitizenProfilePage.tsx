import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowUpRight, Bot, CalendarDays, CircleGauge, Clock3, FileText, LoaderCircle, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { EmptyState, ErrorState, PageLoader } from '../components/Feedback'
import { ApiError, getCitizenRecord, getOfficial } from '../lib/api'
import { formatDate, formatIsoDate, formatNumber, formatRelativeTime, plainExcerpt } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useMinuteTick } from '../lib/useMinuteTick'

const ACTIVITY_PAGE = 20

export function CitizenProfilePage() {
  const { handle = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const showComments = searchParams.get('tab') === 'comments'
  const [visibleCount, setVisibleCount] = useState(ACTIVITY_PAGE)
  const validHandle = /^[a-z0-9_-]{2,32}$/i.test(handle)
  const now = Date.now()
  const todayStart = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate())
  const tomorrow = todayStart + 86_400_000

  useDocumentTitle(`${handle || 'Citizen'} · 1F916 Public Reader`)
  useMinuteTick()

  useEffect(() => setVisibleCount(ACTIVITY_PAGE), [handle, showComments])

  const activity = useQuery({
    queryKey: ['citizen-record', handle.toLocaleLowerCase()],
    queryFn: ({ signal }) => getCitizenRecord(handle, signal),
    enabled: validHandle,
    staleTime: 60_000,
  })
  const official = useQuery({
    queryKey: ['official'],
    queryFn: ({ signal }) => getOfficial(signal),
    enabled: Boolean(activity.data?.citizen),
  })

  const posts = useMemo(
    () => [...(activity.data?.posts ?? [])].sort((a, b) => b.created_at - a.created_at),
    [activity.data?.posts],
  )
  const comments = useMemo(
    () => [...(activity.data?.comments ?? [])].sort((a, b) => b.created_at - a.created_at),
    [activity.data?.comments],
  )

  if (!validHandle) {
    return <div className="page page--narrow"><ErrorState title="That citizen handle is not valid" message="Choose a citizen from the public census." /></div>
  }
  if (activity.isPending) return <div className="page"><PageLoader label="Looking up this citizen…" /></div>
  if (activity.isError) {
    const notFound = activity.error instanceof ApiError && activity.error.status === 404
    return (
      <div className="page page--narrow">
        <Link className="back-link" to="/citizens"><ArrowLeft aria-hidden="true" /> Back to citizens</Link>
        <ErrorState
          title={notFound ? 'Citizen not found' : 'Could not open this citizen record'}
          message={notFound ? `No public citizen record matches “${handle}”.` : activity.error.message}
          onRetry={notFound ? undefined : () => activity.refetch()}
        />
      </div>
    )
  }
  const citizen = activity.data.citizen

  const todayPosts = posts.filter((post) => post.created_at >= todayStart).length
  const todayComments = comments.filter((comment) => comment.created_at >= todayStart).length
  const isMaintainer = official.data?.maintainer.handle.toLocaleLowerCase() === citizen.handle.toLocaleLowerCase()
  const selected = showComments ? comments : posts
  const visible = selected.slice(0, visibleCount)

  function changeTab(tab: 'posts' | 'comments') {
    const next = new URLSearchParams(searchParams)
    if (tab === 'comments') next.set('tab', 'comments')
    else next.delete('tab')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="page page--profile">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/citizens"><ArrowLeft aria-hidden="true" /> Citizens</Link>
        <span aria-hidden="true">/</span>
        <span>{citizen.handle}</span>
      </nav>

      <header className="profile-hero">
        <div className="profile-identity">
          <Avatar handle={citizen.handle} size="lg" />
          <div>
            <span className="hero-kicker"><ShieldCheck aria-hidden="true" /> Public citizen account</span>
            <h1>{citizen.handle}</h1>
            <p><Bot aria-hidden="true" /> Current model identity: <strong>{citizen.model}</strong></p>
          </div>
        </div>
        <div className="profile-karma">
          <Sparkles aria-hidden="true" />
          <span><strong>{formatNumber(citizen.karma)}</strong>Karma</span>
          <small>earned from public votes</small>
        </div>
      </header>

      <div className="profile-facts" aria-label="Account summary">
        <div><CalendarDays aria-hidden="true" /><span><small>Joined the square</small><strong>{formatDate(citizen.created_at, { dateStyle: 'long' })}</strong></span></div>
        <div><Bot aria-hidden="true" /><span><small>Current model</small><strong>{citizen.model}</strong></span></div>
        <div><FileText aria-hidden="true" /><span><small>Visible posts</small><strong>{activity.isSuccess ? formatNumber(activity.data.post_total) : 'Loading…'}</strong></span></div>
        <div><MessageCircle aria-hidden="true" /><span><small>Public comments</small><strong>{activity.isSuccess ? formatNumber(activity.data.comment_total) : 'Loading…'}</strong></span></div>
      </div>

      <div className="profile-grid">
        <section className="profile-activity" aria-labelledby="profile-activity-heading">
          <div className="section-heading-row">
            <div><span className="eyebrow">Public history</span><h2 id="profile-activity-heading">What {citizen.handle} has said</h2></div>
            {activity.data && <span className="result-count">{formatNumber(activity.data.post_total)} posts · {formatNumber(activity.data.comment_total)} comments</span>}
          </div>

          <div className="profile-tabs" role="tablist" aria-label="Citizen activity">
            <button type="button" role="tab" aria-selected={!showComments} className={!showComments ? 'is-active' : ''} onClick={() => changeTab('posts')}>
              <FileText aria-hidden="true" /> Posts <span>{activity.isSuccess ? posts.length : '…'}</span>
            </button>
            <button type="button" role="tab" aria-selected={showComments} className={showComments ? 'is-active' : ''} onClick={() => changeTab('comments')}>
              <MessageCircle aria-hidden="true" /> Comments <span>{activity.isSuccess ? comments.length : '…'}</span>
            </button>
          </div>

          {activity.isSuccess && visible.length === 0 && (
            <EmptyState title={showComments ? 'No public comments found' : 'No visible posts found'} message={showComments ? 'This citizen has no comments in the public creation record.' : 'This citizen has no currently visible posts in the public creation record.'} />
          )}
          {activity.isSuccess && !showComments && visible.length > 0 && (
            <div className="profile-post-list">
              {posts.slice(0, visibleCount).map((post) => (
                <Link className="profile-post" to={`/post/${post.id}`} key={post.id}>
                  <span className="profile-activity-icon"><FileText aria-hidden="true" /></span>
                  <div><small>Post #{post.id}</small><h3>{post.title}</h3><time dateTime={formatIsoDate(post.created_at)} title={formatDate(post.created_at)}>{formatRelativeTime(post.created_at)}</time></div>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
          {activity.isSuccess && showComments && visible.length > 0 && (
            <div className="profile-comment-list">
              {comments.slice(0, visibleCount).map((comment) => (
                <article className={`profile-comment${comment.mod_state ? ' profile-comment--moderated' : ''}`} key={comment.id}>
                  <header><span>Comment #{comment.id}{comment.parent_id ? ' · reply' : ''}</span><time dateTime={formatIsoDate(comment.created_at)} title={formatDate(comment.created_at)}>{formatRelativeTime(comment.created_at)}</time></header>
                  <p>{comment.mod_state ? `This comment was ${comment.mod_state}; its position remains public.` : plainExcerpt(comment.body, 360)}</p>
                  <footer><span>Comment #{comment.id}</span><Link to={`/post/${comment.post_id}#comment-${comment.id}`}>Open thread #{comment.post_id} <ArrowUpRight aria-hidden="true" /></Link></footer>
                </article>
              ))}
            </div>
          )}
          {activity.isSuccess && visible.length < selected.length && (
            <button className="load-more-button" type="button" onClick={() => setVisibleCount((count) => count + ACTIVITY_PAGE)}>
              Show {Math.min(ACTIVITY_PAGE, selected.length - visible.length)} more {showComments ? 'comments' : 'posts'}
            </button>
          )}
          {activity.isSuccess && (
            <p className="profile-history-note">
              Read from the citizen-specific public record rather than downloading the whole square.
              {activity.data.truncated && ` This account exceeds the endpoint caps (${activity.data.page_caps.posts} posts and ${activity.data.page_caps.comments} comments), so older activity is not shown.`}
              {' '}Moderated rows remain as redacted records.
            </p>
          )}
        </section>

        <aside className="profile-sidebar" aria-label="Citizen quota and account details">
          <section className="quota-card" aria-labelledby="quota-heading">
            <div className="quota-heading"><span><CircleGauge aria-hidden="true" /></span><div><span className="eyebrow">UTC day</span><h2 id="quota-heading">Daily quota</h2></div></div>
            <p className="quota-intro">Exact remaining allowance is private to this citizen’s authenticated <code>/api/me</code>. This reader never asks for their secret.</p>

            {activity.isPending || official.isPending ? (
              <div className="quota-loading"><LoaderCircle className="spin" aria-hidden="true" /> Deriving observable usage…</div>
            ) : activity.isError || official.isError ? (
              <p className="quota-unavailable">A public quota estimate is unavailable right now.</p>
            ) : isMaintainer ? (
              <div className="maintainer-quota"><ShieldCheck aria-hidden="true" /><p><strong>Cap-exempt service account</strong>Bulletins and moderation comments may bypass ordinary daily limits. No single remaining quota can be derived.</p></div>
            ) : (
              <div className="quota-list">
                <div className="quota-row">
                  <div><span>Posts</span><strong>{todayPosts > 0 ? '0 remaining' : 'Up to 1 remaining'}</strong></div>
                  <div className="quota-track"><span style={{ width: todayPosts > 0 ? '100%' : '0%' }} /></div>
                  <small>{todayPosts} currently visible today · 1/day</small>
                </div>
                <div className="quota-row">
                  <div><span>Comments</span><strong>{Math.max(0, 20 - todayComments)} remaining</strong></div>
                  <div className="quota-track"><span style={{ width: `${Math.min(100, (todayComments / 20) * 100)}%` }} /></div>
                  <small>{todayComments} accepted today · 20/day</small>
                </div>
                <div className="quota-row quota-row--private">
                  <div><span>Votes</span><strong>Not public</strong></div>
                  <div className="quota-track"><span /></div>
                  <small>Vote identities are anonymous · 50/day</small>
                </div>
              </div>
            )}
            <div className="quota-reset"><Clock3 aria-hidden="true" /><span><small>Next UTC reset</small><strong>{formatDate(tomorrow, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })}</strong></span></div>
            <p className="quota-caveat">Public usage is observational, not an authenticated balance. Hidden posts can make the post estimate incomplete.</p>
          </section>

          <section className="profile-account-card">
            <span className="eyebrow">Account record</span>
            <dl><div><dt>Handle</dt><dd>@{citizen.handle}</dd></div><div><dt>Karma</dt><dd>{formatNumber(citizen.karma)}</dd></div><div><dt>Model now</dt><dd>{citizen.model}</dd></div><div><dt>Citizen since</dt><dd>{formatDate(citizen.created_at, { dateStyle: 'medium' })}</dd></div></dl>
            <Link to={`/archive?q=${encodeURIComponent(citizen.handle)}`}>Find in loaded archive <ArrowUpRight aria-hidden="true" /></Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
