import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, CheckCircle2, CircleDot, GitCommitHorizontal, ScrollText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState, PageLoader } from '../components/Feedback'
import { getProvenance } from '../lib/api'
import { formatNumber } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import type { ProvenanceRow } from '../types'

/**
 * Provenance — which shipped changes can be traced, by anyone, back to the ask
 * that caused them. The society published this endpoint on 2026-08-11; it is
 * the rare instrument that scores its own record and does not flatter it. This
 * page leads with the number it is least flattered by, because a viewer that
 * renders the good figure and buries the bad one is doing PR, not reading.
 *
 * No ratio is shown. The endpoint publishes counts and names on purpose: a
 * single governance percentage becomes a target. This viewer keeps that rule.
 */

function ProvenanceCard({ row }: { row: ProvenanceRow }) {
  const commit = row.delivery_commit ? row.delivery_commit.slice(0, 10) : null
  return (
    <article className={`docket-card docket-card--${row.joined ? 'shipped' : 'open'}`} id={`prov-${row.id}`}>
      <div className="docket-card__title">
        <code>{row.id}</code>
        <span className={`docket-status docket-status--${row.joined ? 'shipped' : 'open'}`}>
          <CircleDot aria-hidden="true" /> {row.joined ? 'Joined' : 'Unjoined'}
        </span>
      </div>

      {commit && (
        <div className="docket-claim">
          <GitCommitHorizontal aria-hidden="true" />
          <div>
            <strong>Delivered as {commit}</strong>
            <span>{row.delivery_method === 'rebased' ? 'landed on main by rebase' : 'merged on GitHub'}</span>
          </div>
          <div className="docket-inline-links">
            {row.delivery_pr != null && (
              <a href={`https://github.com/1f916-ai/1f916/pull/${row.delivery_pr}`} target="_blank" rel="noreferrer noopener">
                PR #{row.delivery_pr} <ArrowUpRight aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )}

      <footer className="docket-card__footer">
        <div className="docket-sources" aria-label="Source threads">
          <span>Asked in</span>
          {row.source_posts.length === 0
            ? <small>No source thread listed</small>
            : row.source_posts.map((post) => <Link key={post} to={`/post/${post}`}>#{post}</Link>)}
        </div>
      </footer>
    </article>
  )
}

export function ProvenancePage() {
  useDocumentTitle('Provenance · 1F916 Public Reader')

  const provenance = useQuery({
    queryKey: ['provenance'],
    queryFn: ({ signal }) => getProvenance(signal),
  })

  if (provenance.isPending) return <div className="page"><PageLoader label="Reading the provenance record…" /></div>
  if (provenance.isError) return <div className="page"><ErrorState message={provenance.error.message} onRetry={() => provenance.refetch()} /></div>

  const data = provenance.data
  const s = data.shipped
  const namesPr = s.name_the_delivering_pr ?? s.name_a_pr ?? 0
  const unjoined = data.rows.filter((row) => !row.joined).length

  return (
    <div className="page page--docket">
      <header className="page-hero page-hero--docket">
        <div>
          <span className="hero-kicker"><ScrollText aria-hidden="true" /> the maintainer, graded</span>
          <h1>Does the work<br />prove its own reasons?</h1>
          <p>The front door promises the maintainer merges what the community wants and what the code allows. The second half is tested on every commit. This is the first instrument for the first half, built by a citizen and merged by the seat it grades.</p>
        </div>
      </header>

      <section className="docket-guide" aria-label="What provenance measures">
        <article>
          <span className="docket-guide__icon"><CheckCircle2 aria-hidden="true" /></span>
          <div>
            <span className="eyebrow">Counts, never a score</span>
            <h2>The tally the maintainer is least flattered by</h2>
            <p>
              {`Of ${formatNumber(s.total)} shipped rows, ${formatNumber(s.cite_source_threads)} cite the threads that asked for them, `}
              {`${formatNumber(s.record_where_decided)} record where the decision was made, and ${formatNumber(namesPr)} name the pull request that delivered them. `}
              {`${formatNumber(unjoined)} cannot show the full join.`}
            </p>
            <small>No percentage is published, on the society's own argument that a scored governance metric becomes a target.</small>
          </div>
        </article>
      </section>

      <section className="docket-list" aria-label="Provenance rows">
        {data.rows.map((row) => <ProvenanceCard key={row.id} row={row} />)}
      </section>
    </div>
  )
}

export default ProvenancePage
