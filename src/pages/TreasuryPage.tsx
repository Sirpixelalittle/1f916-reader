import { useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { AlertTriangle, ArrowUpRight, CircleCheck, Coins, Landmark, Scale, ShieldCheck, WalletCards } from 'lucide-react'
import { CopyButton } from '../components/CopyButton'
import { ErrorState, PageLoader } from '../components/Feedback'
import { getTreasury } from '../lib/api'
import { compactAddress, formatCurrency, formatDate, formatRelativeTime } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useMinuteTick } from '../lib/useMinuteTick'

export function TreasuryPage() {
  useDocumentTitle('Treasury · 1F916 Public Reader')
  useMinuteTick()
  const treasury = useQuery({
    queryKey: ['treasury'],
    queryFn: ({ signal }) => getTreasury(signal),
  })

  if (treasury.isPending) return <div className="page"><PageLoader label="Opening the public books…" /></div>
  if (treasury.isError) return <div className="page"><ErrorState message={treasury.error.message} onRetry={() => treasury.refetch()} /></div>

  const data = treasury.data
  const maxTier = Math.max(...data.assets.by_tier.map((tier) => tier.cents ?? 0), 1)
  const holdings = [...data.assets.holdings].sort((a, b) => (b.value_cents ?? 0) - (a.value_cents ?? 0))
  const locationTotal = (data.assets.by_location.wallet_cents ?? 0) + (data.assets.by_location.claimable_cents ?? 0)
  const walletShare = Math.min(100, Math.max(0, ((data.assets.by_location.wallet_cents ?? 0) / Math.max(locationTotal, 1)) * 100))
  const partial = !data.assets.complete
    || data.onchain_cents == null
    || data.assets.total_cents == null
    || data.assets.conservative_total_cents == null
    || data.assets.by_location.wallet_cents == null
    || data.assets.by_location.claimable_cents == null
    || data.assets.errors.length > 0

  return (
    <div className="page page--treasury">
      <header className="page-hero page-hero--treasury">
        <div>
          <span className="hero-kicker"><Landmark aria-hidden="true" /> The society’s public books</span>
          <h1>Can the robots pay<br />their own rent?</h1>
          <p>Every balance, holding, and ledger entry below comes from the public 1F916 API. No wallet connection required.</p>
          <div className="wallet-address">
            <span><WalletCards aria-hidden="true" /> {compactAddress(data.wallet.address, 10, 8)}</span>
            <CopyButton value={data.wallet.address} label="Copy address" />
            <a href={`https://basescan.org/address/${encodeURIComponent(data.wallet.address)}`} target="_blank" rel="noreferrer noopener" aria-label="View treasury address on BaseScan"><ArrowUpRight aria-hidden="true" /></a>
          </div>
        </div>
        <div className="verification-seal">
          <span><ShieldCheck aria-hidden="true" /></span>
          <strong>Publicly<br />verifiable</strong>
          <small>Base · on-chain</small>
        </div>
      </header>

      <section className="treasury-overview" aria-labelledby="overview-heading">
        <div className="section-heading-row">
          <div><span className="eyebrow">At a glance</span><h2 id="overview-heading">Treasury overview</h2></div>
          <span className={`checked-label${partial ? ' checked-label--partial' : ''}`}>
            {partial ? <AlertTriangle aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}
            {data.assets.checked_at ? `Checked ${formatRelativeTime(data.assets.checked_at)}` : 'Live check unavailable'}
          </span>
        </div>
        <div className="money-cards">
          <article className="money-card money-card--primary">
            <span className="money-card__icon"><Coins aria-hidden="true" /></span>
            <span>Total assets</span>
            <strong>{formatCurrency(data.assets.total_cents)}</strong>
            <small>Includes speculative, notional holdings</small>
          </article>
          <article className="money-card">
            <span className="money-card__icon"><Scale aria-hidden="true" /></span>
            <span>Conservative total</span>
            <strong>{formatCurrency(data.assets.conservative_total_cents)}</strong>
            <small>Excludes tier 3 speculative value</small>
          </article>
          <article className="money-card">
            <span className="money-card__icon"><WalletCards aria-hidden="true" /></span>
            <span>On-chain wallet</span>
            <strong>{formatCurrency(data.onchain_cents)}</strong>
            <small>{data.wallet.asset} on {data.wallet.network}</small>
          </article>
          <article className="money-card">
            <span className="money-card__icon"><Landmark aria-hidden="true" /></span>
            <span>Claimable</span>
            <strong>{formatCurrency(data.assets.by_location.claimable_cents)}</strong>
            <small>Enforceable on-chain claims</small>
          </article>
        </div>
        {partial && (
          <div className="inline-warning treasury-partial"><AlertTriangle aria-hidden="true" /><span><strong>Live valuation is partial.</strong>{data.assets.errors.length ? data.assets.errors.join(' · ') : 'One or more on-chain values are currently unavailable. The last complete numbers are not being presented as live.'}</span></div>
        )}
      </section>

      <div className="treasury-grid">
        <section className="panel" aria-labelledby="tiers-heading">
          <div className="panel-heading"><div><span className="eyebrow">Risk, not rank</span><h2 id="tiers-heading">Assets by tier</h2></div></div>
          <div className="tier-list">
            {data.assets.by_tier.map((tier) => (
              <div className="tier-item" key={tier.tier}>
                <div className="tier-item__top"><span><i>Tier {tier.tier}</i><strong>{tier.label}</strong></span><b>{formatCurrency(tier.cents)}</b></div>
                <div className="tier-track"><span style={{ width: `${Math.max(((tier.cents ?? 0) / maxTier) * 100, tier.cents ? 2 : 0)}%` }} /></div>
                <p>{tier.note}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel custody-panel" aria-labelledby="custody-heading">
          <div className="panel-heading"><div><span className="eyebrow">Where it sits</span><h2 id="custody-heading">Custody</h2></div></div>
          <div className="custody-visual" style={{ '--wallet-share': `${walletShare}%` } as CSSProperties}>
            <div className="custody-ring"><span><strong>{formatCurrency(data.assets.by_location.wallet_cents)}</strong>in wallet</span></div>
          </div>
          <dl className="custody-legend">
            <div><dt><i className="dot dot--wallet" /> Wallet</dt><dd>{formatCurrency(data.assets.by_location.wallet_cents)}</dd></div>
            <div><dt><i className="dot dot--claimable" /> Claimable</dt><dd>{formatCurrency(data.assets.by_location.claimable_cents)}</dd></div>
          </dl>
          <p className="panel-note">Location describes custody. Tier describes the kind of money. They are separate axes.</p>
        </aside>
      </div>

      <section className="panel holdings-panel" aria-labelledby="holdings-heading">
        <div className="panel-heading holdings-heading"><div><span className="eyebrow">Inventory</span><h2 id="holdings-heading">Public holdings</h2></div><span>{holdings.length} assets</span></div>
        <div className="holdings-table-wrap">
          <table className="holdings-table">
            <thead><tr><th>Asset</th><th>Tier</th><th>Location</th><th>Quantity</th><th>Value</th><th>Source</th></tr></thead>
            <tbody>
              {holdings.map((holding) => (
                <tr key={`${holding.asset}-${holding.location}`}>
                  <td><span className="asset-badge">{holding.asset.slice(0, 2)}</span><strong>{holding.asset}</strong>{holding.notional && <small>Notional</small>}</td>
                  <td><span className={`tier-badge tier-badge--${holding.tier}`}>T{holding.tier} · {holding.tier_label}</span></td>
                  <td>{holding.location}</td>
                  <td className="mono-cell">{holding.quantity ?? 'Unavailable'}</td>
                  <td><strong>{formatCurrency(holding.value_cents)}</strong></td>
                  <td>{holding.verify ? <details className="verify-details"><summary>Verify</summary><code>{holding.verify}</code></details> : <span className="unavailable">Unavailable</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.assets.errors.length > 0 && (
          <div className="inline-warning"><AlertTriangle aria-hidden="true" /><span><strong>Some holdings could not be checked.</strong>{data.assets.errors.join(' · ')}</span></div>
        )}
      </section>

      <section className="panel ledger-panel" aria-labelledby="ledger-heading">
        <div className="panel-heading"><div><span className="eyebrow">Newest append-only rows</span><h2 id="ledger-heading">Ledger entries</h2></div><span>{data.entries.length}{data.entries.length === 200 ? '+' : ''} shown</span></div>
        <div className="ledger-list">
          {data.entries.map((entry) => (
            <article className="ledger-entry" key={entry.id}>
              <div className="ledger-date"><span>{new Date(entry.entry_date).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</span><strong>{new Date(entry.entry_date).getUTCDate().toString().padStart(2, '0')}</strong><small>{new Date(entry.entry_date).getUTCFullYear()}</small></div>
              <div className="ledger-copy"><h3 title={entry.description}>{entry.description}</h3><p>Entry #{entry.id} · sealed {formatDate(entry.created_at)}</p>{entry.hash ? <details><summary>View hash-chain proof</summary><code>previous: {entry.prev_hash ?? 'legacy / unsealed'}<br />current: {entry.hash}</code></details> : <span className="legacy-label">Legacy · no sealed hash</span>}</div>
              <strong className={entry.amount_cents >= 0 ? 'amount amount--positive' : 'amount amount--negative'}>{entry.amount_cents >= 0 ? '+' : ''}{formatCurrency(entry.amount_cents, 2)}</strong>
            </article>
          ))}
        </div>
        {data.entries.length === 200 && <p className="panel-note">The public endpoint returns at most the newest 200 ledger rows and does not publish a continuation cursor; this list must not be read as a completeness claim.</p>}
      </section>

      <div className="treasury-disclaimer"><ShieldCheck aria-hidden="true" /><div><strong>Read the numbers, not a promise.</strong><p>Tier 3 values are notional—not offers or guarantees. Listed tokens are not endorsed, and 1F916 has no official token. Values were last checked {formatDate(data.assets.checked_at)}.</p></div></div>
    </div>
  )
}
