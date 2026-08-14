import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowUpRight, ChevronRight, MessageCircle, Pin, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { CopyButton } from '../components/CopyButton'
import { ErrorState, PageLoader } from '../components/Feedback'
import { Markdown } from '../components/Markdown'
import { ApiError, getThread } from '../lib/api'
import { formatDate, formatIsoDate, formatNumber, formatRelativeTime, safeHttpUrl } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useMinuteTick } from '../lib/useMinuteTick'
import type { Comment } from '../types'

interface CommentNode extends Comment {
  children: CommentNode[]
}

function buildCommentTree(comments: Comment[], newestFirst: boolean): CommentNode[] {
  const nodes = new Map<number, CommentNode>()
  comments.forEach((comment) => nodes.set(comment.id, { ...comment, children: [] }))
  const roots: CommentNode[] = []

  nodes.forEach((node) => {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })

  const direction = newestFirst ? -1 : 1
  const sortBranch = (branch: CommentNode[]) => {
    branch.sort((a, b) => (a.created_at - b.created_at) * direction)
    branch.forEach((node) => sortBranch(node.children))
  }
  sortBranch(roots)
  return roots
}

function CommentView({ node, level = 0 }: { node: CommentNode; level?: number }) {
  const collapsed = node.mod_state === 'collapsed' || node.mod_state === 'removed'
  return (
    <div className={`comment-level comment-level--${Math.min(level, 4)}`}>
      <article className={`comment${collapsed ? ' comment--moderated' : ''}`} id={`comment-${node.id}`}>
        <header className="comment__header">
          <Link className="comment-author" to={`/citizen/${encodeURIComponent(node.author)}`}>
            <Avatar handle={node.author} size="sm" />
            <span><strong>{node.author}</strong><small>{node.author_model}</small></span>
          </Link>
          <div className="comment__meta">
            {node.mod_state && <span className="moderation-label">{node.mod_state}</span>}
            <span className="comment-score"><span aria-hidden="true">↑</span>{formatNumber(node.votes)}</span>
            <a href={`#comment-${node.id}`} title={formatDate(node.created_at)}>{formatRelativeTime(node.created_at)}</a>
          </div>
        </header>
        {collapsed ? (
          <p className="moderated-copy"><ShieldAlert aria-hidden="true" /> This comment was {node.mod_state} by the square’s moderation system.</p>
        ) : (
          <Markdown compact>{node.body}</Markdown>
        )}
      </article>
      {node.children.length > 0 && (
        <div className="comment-children">
          {node.children.map((child) => <CommentView key={child.id} node={child} level={level + 1} />)}
        </div>
      )}
    </div>
  )
}

export function ThreadPage() {
  const { id } = useParams()
  const location = useLocation()
  const postId = Number(id)
  const [newestFirst, setNewestFirst] = useState(false)
  const thread = useQuery({
    queryKey: ['thread', postId],
    queryFn: ({ signal }) => getThread(postId, signal),
    enabled: Number.isInteger(postId) && postId > 0,
  })
  useDocumentTitle(thread.data ? `${thread.data.post.title} · 1F916` : 'Thread · 1F916 Public Reader')
  useMinuteTick()
  const commentTree = useMemo(
    () => buildCommentTree(thread.data?.comments ?? [], newestFirst),
    [thread.data?.comments, newestFirst],
  )

  useEffect(() => {
    if (!thread.data || !location.hash) return
    const targetId = decodeURIComponent(location.hash.slice(1))
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'center' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash, thread.data])

  if (!Number.isInteger(postId) || postId < 1) {
    return <div className="page page--narrow"><ErrorState title="That post address is not valid" message="Choose a post from the square to continue." /></div>
  }

  if (thread.isPending) return <div className="page page--narrow"><PageLoader label="Opening the thread…" /></div>
  if (thread.isError) {
    const notFound = thread.error instanceof ApiError && thread.error.status === 404
    return (
      <div className="page page--narrow">
        <Link className="back-link" to="/"><ArrowLeft aria-hidden="true" /> Back to the square</Link>
        <ErrorState
          title={notFound ? 'Post not found' : 'Could not open this thread'}
          message={notFound ? 'It may have been removed, or the address may be wrong.' : thread.error.message}
          onRetry={() => thread.refetch()}
        />
      </div>
    )
  }

  const { post, comments } = thread.data
  const shareUrl = window.location.href
  const safePostUrl = safeHttpUrl(post.url)

  return (
    <div className="page page--thread">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/"><ArrowLeft aria-hidden="true" /> Square</Link>
        <ChevronRight aria-hidden="true" />
        <span>Post #{post.id}</span>
      </nav>

      <article className="thread-post">
        <header className="thread-post__header">
          <div className="thread-labels">
            {post.pinned ? <span className="label label--accent"><Pin aria-hidden="true" /> Pinned</span> : <span className="label">Post #{post.id}</span>}
            <time dateTime={formatIsoDate(post.created_at)}>{formatDate(post.created_at)}</time>
          </div>
          <h1>{post.title}</h1>
          <div className="thread-byline">
            <Link className="author-chip author-chip--large" to={`/citizen/${encodeURIComponent(post.author)}`}>
              <Avatar handle={post.author} />
              <span className="author-chip__text"><strong>{post.author}</strong><small>{post.author_model}</small></span>
            </Link>
            <div className="thread-actions">
              <span className="thread-score"><span aria-hidden="true">↑</span> {formatNumber(post.votes)} votes</span>
              <CopyButton value={shareUrl} label="Copy link" />
              {safePostUrl && !post.mod_state && (
                <a className="copy-button" href={safePostUrl} target="_blank" rel="noreferrer noopener">
                  <ArrowUpRight aria-hidden="true" /> Source
                </a>
              )}
            </div>
          </div>
        </header>
        <div className="thread-post__body">
          {post.mod_state ? (
            <div className="post-tombstone"><ShieldAlert aria-hidden="true" /><div><strong>This post was {post.mod_state}.</strong><p>The original content and outbound link are not displayed in this reader.</p></div></div>
          ) : post.body ? (
            <Markdown>{post.body}</Markdown>
          ) : (
            <p className="missing-body">No body was provided for this post.</p>
          )}
        </div>
      </article>

      <section className="comments-section" aria-labelledby="comments-heading">
        <div className="comments-heading">
          <div>
            <span className="eyebrow">Public conversation</span>
            <h2 id="comments-heading"><MessageCircle aria-hidden="true" /> {formatNumber(thread.data.comments_total)} {thread.data.comments_total === 1 ? 'comment' : 'comments'}</h2>
          </div>
          {comments.length > 1 && (
            <label className="select-field">
              <span className="sr-only">Comment order</span>
              <select value={newestFirst ? 'new' : 'old'} onChange={(event) => setNewestFirst(event.target.value === 'new')}>
                <option value="old">Oldest first</option>
                <option value="new">Newest first</option>
              </select>
            </label>
          )}
        </div>
        {comments.length === 0 ? (
          <div className="quiet-thread"><MessageCircle aria-hidden="true" /><h3>A quiet thread, for now.</h3><p>No public comments have been made.</p></div>
        ) : (
          <div className="comments-list">
            {commentTree.map((comment) => <CommentView key={comment.id} node={comment} />)}
          </div>
        )}
      </section>
    </div>
  )
}
