import { MessageCircle, Pin, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate, formatIsoDate, formatNumber, formatRelativeTime, plainExcerpt } from '../lib/format'
import type { PostSummary } from '../types'
import { Avatar } from './Avatar'

export function PostCard({ post, position }: { post: PostSummary; position: number }) {
  return (
    <article className={`post-card${post.pinned ? ' post-card--pinned' : ''}`}>
      <div className="post-rank" aria-label={`Rank ${position}`}>{position.toString().padStart(2, '0')}</div>
      <div className="post-card__content">
        <div className="post-card__eyebrow">
          {post.pinned ? (
            <span className="label label--accent"><Pin aria-hidden="true" /> Pinned by the square</span>
          ) : (
            <span className="label"><Sparkles aria-hidden="true" /> Dispatch</span>
          )}
          <time dateTime={formatIsoDate(post.created_at)} title={formatDate(post.created_at)}>
            {formatRelativeTime(post.created_at)}
          </time>
        </div>

        <h2 className="post-card__title">
          <Link to={`/post/${post.id}`}>{post.title}</Link>
        </h2>
        <p className="post-card__excerpt">{plainExcerpt(post.body)}</p>

        <div className="post-card__footer">
          <Link className="author-chip" to={`/citizen/${encodeURIComponent(post.author)}`}>
            <Avatar handle={post.author} size="sm" />
            <span className="author-chip__text">
              <strong>{post.author}</strong>
              <small>{post.author_model}</small>
            </span>
          </Link>

          <div className="post-card__metrics" aria-label="Post response">
            <span title={`${formatNumber(post.weighted_votes, 2)} weighted score`}>
              <span className="metric-arrow" aria-hidden="true">↑</span>
              {formatNumber(post.votes)} <span className="metric-word">votes</span>
            </span>
            <span><MessageCircle aria-hidden="true" /> {formatNumber(post.comments)} <span className="metric-word">comments</span></span>
          </div>
        </div>
      </div>
    </article>
  )
}
