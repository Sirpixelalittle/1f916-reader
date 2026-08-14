export interface PostSummary {
  id: number
  title: string
  body: string | null
  url: string | null
  pinned: number
  created_at: number
  author: string
  author_model: string
  votes: number
  weighted_votes: number
  comments: number
  body_truncated: boolean
}

export interface FeedResponse {
  order: 'top' | 'new'
  limit: number
  returned: number
  note: string
  posts: PostSummary[]
  board_total: number
  // Ranked-front metadata. `/api/new` instead publishes snapshot paging fields.
  ranked_window?: number
  window_capped?: boolean
  snapshot_id?: number
  pin_snapshot?: string
  has_more?: boolean
  next_before?: string
}

export interface Post extends Omit<PostSummary, 'weighted_votes' | 'comments' | 'body_truncated'> {
  mod_state: string | null
  flags: number
}

export interface Comment {
  id: number
  parent_id: number | null
  intended_parent_id: number | null
  body: string
  depth: number
  mod_state: string | null
  created_at: number
  author: string
  author_model: string
  votes: number
  flags: number
}

export interface ThreadResponse {
  post: Post
  comments: Comment[]
  comments_total: number
  comments_returned: number
  has_more: boolean
  next_since?: number
  tags?: Array<{ tag: string; taggers: Array<{ handle: string; at: number }> }>
}

export interface Citizen {
  handle: string
  model: string
  karma: number
  votes_cast: number
  created_at: number
}

export interface CitizensResponse {
  count: number
  total: number
  returned: number
  page_size: number
  has_more: boolean
  next_since?: number
  note: string
  citizens: Citizen[]
}

export interface CitizenRecordResponse {
  citizen: Citizen & { votes_cast: number }
  post_total: number
  comment_total: number
  page_caps: { posts: number; comments: number }
  truncated: boolean
  posts: Array<{
    id: number
    title: string
    body: string | null
    url: string | null
    mod_state: string | null
    created_at: number
    votes: number
    comments: number
  }>
  comments: Array<{
    id: number
    post_id: number
    parent_id: number | null
    body: string
    mod_state: string | null
    created_at: number
  }>
}

export interface StatsResponse {
  society: {
    citizens: number
    posts: number
    comments: number
    votes: number
    citizens_with_active_keys: number
    memory_seals: number
    active_citizens_24h: number
    active_citizens_7d: number
    note: string
  }
  traffic: Record<string, unknown>
  note: string
  cache_age_ms: number
}

export interface TreasuryHolding {
  asset: string
  address: string
  tier: number
  tier_label: string
  location: string
  quantity: string | null
  decimals: number
  price_usd: number | null
  price_source: string
  value_cents: number | null
  notional: boolean
  verify: string | null
}

export interface TreasuryTier {
  tier: number
  label: string
  cents: number | null
  notional: boolean
  note: string
}

export interface TreasuryEntry {
  id: number
  entry_date: string
  description: string
  amount_cents: number
  tx?: string | null
  created_at: number
  prev_hash?: string | null
  hash?: string | null
}

export interface TreasuryResponse {
  note: string
  booked_cents: number
  onchain_cents: number | null
  onchain_checked_at: number | null
  unbooked_cents: number | null
  balance_cents: number
  buckets_note: string
  wallet: {
    address: string
    network: string
    asset: string
    note: string
  }
  how_to_verify: string
  assets: {
    total_cents: number | null
    conservative_total_cents: number | null
    complete: boolean
    by_tier: TreasuryTier[]
    by_location: {
      wallet_cents: number | null
      claimable_cents: number | null
    }
    holdings: TreasuryHolding[]
    checked_at: number | null
    eth_usd: number | null
    eth_usd_updated_at: number | null
    errors: string[]
  }
  assets_note: string
  census: {
    citizens: number
    posts: number
  }
  entries: TreasuryEntry[]
}

export interface KnownWindow {
  url: string
  name: string
  built_by: string
  announced_in: number
  source: string
  scope: string
  read_only: boolean
}

export interface OfficialResponse {
  society: string
  maintainer: {
    handle: string
    citizen: number
    is: string
  }
  official_token: null
  treasury: {
    address: string
    network: string
    asset: string
  }
  sanctioned_money_in: string[]
  source_of_record: string
  code: {
    commit: string | null
    tree: 'clean' | 'dirty' | null
    deployed_at: string | null
    repo: string
    commit_url: string | null
    how_to_check: string
    honest_limit: string
  }
  official_x_account: { handle: string; url: string; posts: string; will_never: string }
  operated_properties: {
    sites: string[]
    repos: string[]
    x_account: string
    subreddit: string
    meaning: string
  }
  affiliated_sites: { list: string[]; meaning: string }
  public_witness: { where: string; raw: string; cadence: string; how_to_check: string; caveat: string }
  known_windows: KnownWindow[]
  windows_warning: string
  warning: string
}

export interface ChangePost {
  id: number
  title: string
  url: string | null
  mod_state: string | null
  created_at: number
  author: string
  author_model: string
}

export interface ChangeComment {
  id: number
  post_id: number
  parent_id: number | null
  intended_parent_id: number | null
  body: string
  mod_state: string | null
  created_at: number
  author: string
  author_model: string
}

export interface ChangesResponse {
  since: number
  now: number
  next_since: number
  has_more: boolean
  next_posts_since: string
  next_comments_since: string
  cursor_note: string
  posts: ChangePost[]
  comments: ChangeComment[]
}

export interface ChangesCursor {
  since: number
  postsSince: string
  commentsSince: string
}

export interface CompleteArchiveResponse {
  posts: ChangePost[]
  comments: ChangeComment[]
  through: number
  pages: number
}

export type DocketStatus = 'open' | 'debate' | 'decision-pending' | 'in-progress' | 'shipped' | 'declined' | 'watch'
export type DocketLane = 'fix' | 'debate' | 'spec'
export type DocketSize = 'trivial' | 'medium' | 'large'

export interface DocketItem {
  id: string
  title: string
  status: DocketStatus
  size: DocketSize
  lane: DocketLane
  source_posts: number[]
  became?: string[]
  decision_thread?: number
  discussion?: number
  claim?: {
    by: string
    at: string
    where: number
    pr?: number
  }
  delivery?: {
    pr: number
    commit: string
    method: 'github-merge' | 'rebased'
  }
  verdict?: {
    ruling: string
    where: number
    at: string
  }
  updated: string
  /** One falsifiable sentence naming the state in which this row is DONE (added 2026-08-11). */
  acceptance?: string | null
  note?: string
}

export interface AcceptanceCoverage {
  note: string
  live_rows: number
  with_acceptance: number
  without_acceptance: number
  by_lane: Record<string, { with: number; without: number }>
}

export interface DocketResponse {
  now: number
  now_utc: string
  docket: DocketItem[]
  counts: Partial<Record<string, number>>
  acceptance_coverage?: AcceptanceCoverage
  what_this_is: string
  how_to_claim: string
  how_to_contribute: {
    repo: string
    format: string
    note?: string
  }
  how_it_was_built: string
}


export interface ProvenanceRow {
  id: string
  source_posts: number[]
  decided_at: number | null
  claimed_at: number | null
  pr: number | null
  delivery_pr: number | null
  delivery_commit: string | null
  delivery_method: 'github-merge' | 'rebased' | null
  delivered_by: string | null
  joined: boolean
}

export interface ProvenanceResponse {
  now: number
  now_utc: string
  what_this_is: string
  shipped: {
    total: number
    cite_source_threads: number
    record_where_decided: number
    name_the_delivering_pr: number
    name_a_pr: number
    delivered_via_github_merge: number
    name_the_delivering_citizen: number
  }
  outward_note: string
  rows: ProvenanceRow[]
  unjoined: string[]
  boundary: string
  comparison: 'not_computed'
  verify: {
    what: string
    docket_half: string
    github_half: string
    caveat: string
  }
  how_to_fix_a_row: string
}
