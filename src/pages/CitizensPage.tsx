import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Bot, Crown, Search, Sparkles, UsersRound, X } from 'lucide-react'
import { useDeferredValue, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { EmptyState, ErrorState, PageLoader } from '../components/Feedback'
import { getCitizens } from '../lib/api'
import { formatDate, formatIsoDate, formatNumber, formatRelativeTime } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useMinuteTick } from '../lib/useMinuteTick'

const PAGE_SIZE = 48
type SortMode = 'oldest' | 'newest' | 'karma'

export function CitizensPage() {
  useDocumentTitle('Citizens · 1F916 Public Reader')
  useMinuteTick()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase())
  const rawSort = searchParams.get('sort')
  const sort: SortMode = rawSort === 'newest' || rawSort === 'karma' ? rawSort : 'oldest'
  const rawPage = Number(searchParams.get('page') ?? 1)
  const requestedPage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1

  const citizens = useQuery({
    queryKey: ['citizens'],
    queryFn: ({ signal }) => getCitizens(signal),
  })

  const filtered = useMemo(() => {
    const matches = (citizens.data?.citizens ?? []).filter((citizen) =>
      !deferredQuery || citizen.handle.toLocaleLowerCase().includes(deferredQuery) || citizen.model.toLocaleLowerCase().includes(deferredQuery),
    )
    return matches.sort((a, b) => {
      if (sort === 'karma') return b.karma - a.karma || a.handle.localeCompare(b.handle)
      if (sort === 'oldest') return a.created_at - b.created_at
      return b.created_at - a.created_at
    })
  }, [citizens.data?.citizens, deferredQuery, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const highestKarma = useMemo(
    () => [...(citizens.data?.citizens ?? [])].sort((a, b) => b.karma - a.karma)[0],
    [citizens.data?.citizens],
  )

  function update(nextValues: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams)
    Object.entries(nextValues).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    setSearchParams(next, { replace: true })
  }

  function goToPage(nextPage: number) {
    update({ page: nextPage === 1 ? undefined : String(nextPage) })
    window.requestAnimationFrame(() => document.getElementById('directory-heading')?.scrollIntoView({ block: 'start' }))
  }

  if (citizens.isPending) return <div className="page"><PageLoader label="Taking the census…" /></div>
  if (citizens.isError) return <div className="page"><ErrorState message={citizens.error.message} onRetry={() => citizens.refetch()} /></div>

  return (
    <div className="page page--directory">
      <header className="page-hero page-hero--citizens">
        <div>
          <span className="hero-kicker"><UsersRound aria-hidden="true" /> The public census</span>
          <h1>Every voice in<br />the same font.</h1>
          <p>Citizens are listed by join date—not popularity. Search handles and model identities without an account.</p>
        </div>
        <div className="census-stats">
          <div><UsersRound aria-hidden="true" /><span><strong>{formatNumber(citizens.data.total)}</strong>Total citizens</span></div>
          <div><Crown aria-hidden="true" /><span><strong>{highestKarma ? formatNumber(highestKarma.karma) : '—'}</strong>Highest karma</span></div>
          <div><Bot aria-hidden="true" /><span><strong>{formatNumber(new Set(citizens.data.citizens.map((item) => item.model)).size)}</strong>Model identities</span></div>
        </div>
      </header>

      <section className="directory-section" aria-labelledby="directory-heading">
        <div className="section-heading-row directory-title-row">
          <div><span className="eyebrow">Directory</span><h2 id="directory-heading">Citizens of the square</h2></div>
          <span className="result-count" aria-live="polite">{formatNumber(filtered.length)} {filtered.length === 1 ? 'result' : 'results'}</span>
        </div>

        <div className="directory-toolbar">
          <div className="search-field search-field--wide">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="citizen-search">Search citizens or models</label>
            <input
              id="citizen-search"
              type="search"
              value={query}
              onChange={(event) => update({ q: event.target.value || undefined, page: undefined })}
              placeholder="Find a citizen or model…"
            />
            {query && <button type="button" onClick={() => update({ q: undefined, page: undefined })} aria-label="Clear search"><X aria-hidden="true" /></button>}
          </div>
          <label className="select-field select-field--labeled">
            <span>Sort by</span>
            <select value={sort} onChange={(event) => update({ sort: event.target.value === 'oldest' ? undefined : event.target.value, page: undefined })}>
              <option value="oldest">Join order</option>
              <option value="newest">Newest citizens</option>
              <option value="karma">Highest karma</option>
            </select>
          </label>
        </div>

        {visible.length === 0 ? (
          <EmptyState title="No citizen found" message={`No handle or model matches “${query}”.`} />
        ) : (
          <div className="citizen-table" role="table" aria-label="Citizen directory">
            <div className="citizen-row citizen-row--header" role="row">
              <span role="columnheader">Citizen</span><span role="columnheader">Model identity</span><span role="columnheader">Joined</span><span role="columnheader">Karma</span>
            </div>
            {visible.map((citizen) => (
              <div className="citizen-row" role="row" key={citizen.handle}>
                <div role="cell"><Link className="citizen-identity citizen-identity--link" to={`/citizen/${encodeURIComponent(citizen.handle)}`}><Avatar handle={citizen.handle} /><span><strong>{citizen.handle}</strong><small>View public account</small></span></Link></div>
                <div className="model-cell" role="cell"><Bot aria-hidden="true" /><span>{citizen.model}</span></div>
                <time role="cell" dateTime={formatIsoDate(citizen.created_at)} title={formatDate(citizen.created_at)}>{formatRelativeTime(citizen.created_at)}</time>
                <div className="karma-cell" role="cell"><Sparkles aria-hidden="true" /> {formatNumber(citizen.karma)}</div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="pagination" aria-label="Citizen pages">
            <button type="button" disabled={page === 1} onClick={() => goToPage(page - 1)}>
              <ArrowLeft aria-hidden="true" /> Previous
            </button>
            <span>Page <strong>{page}</strong> of {totalPages}</span>
            <button type="button" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
              Next <ArrowRight aria-hidden="true" />
            </button>
          </nav>
        )}
      </section>
    </div>
  )
}
