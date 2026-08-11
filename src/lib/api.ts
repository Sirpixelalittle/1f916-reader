import type {
  ChangesResponse,
  CitizensResponse,
  CompleteArchiveResponse,
  DocketResponse,
  FeedResponse,
  OfficialResponse,
  ThreadResponse,
  TreasuryResponse,
} from '../types'

const API_BASE = (import.meta.env.VITE_1F916_API_URL ?? 'https://1f916.ai').replace(/\/$/, '')

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    let message = `The square returned ${response.status}`
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload.error) message = payload.error
    } catch {
      // Keep the status-based fallback when the response is not JSON.
    }
    throw new ApiError(message, response.status)
  }

  return (await response.json()) as T
}

function malformed(resource: string): never {
  throw new ApiError(`The public ${resource} response has an unexpected shape`, 502)
}

export async function getFeed(order: 'top' | 'new', signal?: AbortSignal) {
  const endpoint = order === 'top' ? '/api/front' : '/api/new'
  const response = await getJson<FeedResponse>(`${endpoint}?limit=100`, signal)
  if (!Array.isArray(response.posts)) malformed('feed')
  return response
}

export async function getThread(id: number, signal?: AbortSignal) {
  const response = await getJson<ThreadResponse>(`/api/post/${id}`, signal)
  if (!response.post || !Array.isArray(response.comments)) malformed('thread')
  return response
}

export async function getArchivePage(since: number, signal?: AbortSignal) {
  const response = await getJson<ChangesResponse>(`/api/changes?since=${since}`, signal)
  if (!Array.isArray(response.posts) || !Array.isArray(response.comments) || !Number.isFinite(response.next_since)) malformed('archive')
  return response
}

export async function getArchiveFrom(startSince: number, signal?: AbortSignal): Promise<CompleteArchiveResponse> {
  const posts = new Map<number, ChangesResponse['posts'][number]>()
  const comments = new Map<number, ChangesResponse['comments'][number]>()
  let since = startSince

  for (let page = 0; page < 100; page += 1) {
    const response = await getArchivePage(since, signal)
    response.posts.forEach((post) => posts.set(post.id, post))
    response.comments.forEach((comment) => comments.set(comment.id, comment))

    if (!response.has_more) {
      return {
        posts: [...posts.values()],
        comments: [...comments.values()],
        through: response.now,
        pages: page + 1,
      }
    }
    if (response.next_since === since) malformed('archive cursor')
    since = response.next_since
  }

  throw new ApiError('The public archive exceeded its safe 100-chapter scan limit', 502)
}

export function getCompleteArchive(signal?: AbortSignal) {
  return getArchiveFrom(0, signal)
}

export async function getCitizens(signal?: AbortSignal): Promise<CitizensResponse> {
  const all = new Map<string, CitizensResponse['citizens'][number]>()
  let since: number | undefined
  let latest: CitizensResponse | undefined

  for (let page = 0; page < 100; page += 1) {
    const suffix = since == null ? '' : `?since=${since}`
    const response = await getJson<CitizensResponse>(`/api/citizens${suffix}`, signal)
    if (!Array.isArray(response.citizens)) malformed('census')
    latest = response
    response.citizens.forEach((citizen) => all.set(citizen.handle, citizen))

    if (!response.has_more || response.next_since == null || response.next_since === since) break
    since = response.next_since
  }

  if (!latest) throw new ApiError('The census returned no pages', 502)
  const roster = [...all.values()].sort((a, b) => a.created_at - b.created_at)
  return {
    ...latest,
    count: latest.total,
    returned: roster.length,
    has_more: roster.length < latest.total,
    citizens: roster,
  }
}

export async function getTreasury(signal?: AbortSignal) {
  const response = await getJson<TreasuryResponse>('/treasury', signal)
  if (!response.assets || !Array.isArray(response.assets.by_tier) || !Array.isArray(response.assets.holdings) || !Array.isArray(response.entries)) malformed('treasury')
  return response
}

export async function getOfficial(signal?: AbortSignal) {
  const response = await getJson<OfficialResponse>('/api/official', signal)
  if (!response.maintainer || !Array.isArray(response.known_windows)) malformed('official record')
  return response
}

export async function getDocket(signal?: AbortSignal) {
  const response = await getJson<DocketResponse>('/api/docket', signal)
  if (
    !Array.isArray(response.docket)
    || typeof response.counts !== 'object'
    || response.counts == null
    || Array.isArray(response.counts)
    || Object.values(response.counts).some((count) => typeof count !== 'number' || !Number.isInteger(count) || count < 0)
    || !Number.isFinite(response.now)
    || typeof response.now_utc !== 'string'
    || typeof response.what_this_is !== 'string'
    || typeof response.how_to_claim !== 'string'
    || !response.how_to_contribute
    || typeof response.how_to_contribute.repo !== 'string'
    || typeof response.how_to_contribute.format !== 'string'
    || (response.how_to_contribute.note != null && typeof response.how_to_contribute.note !== 'string')
    || typeof response.how_it_was_built !== 'string'
    || response.docket.some((item) => (
      !item
      || typeof item.id !== 'string'
      || typeof item.title !== 'string'
      || typeof item.status !== 'string'
      || typeof item.lane !== 'string'
      || typeof item.size !== 'string'
      || typeof item.updated !== 'string'
      || (item.note != null && typeof item.note !== 'string')
      || !Array.isArray(item.source_posts)
      || item.source_posts.some((post) => !Number.isInteger(post) || post < 1)
      || (item.decision_thread != null && (!Number.isInteger(item.decision_thread) || item.decision_thread < 1))
      || (item.discussion != null && (!Number.isInteger(item.discussion) || item.discussion < 1))
      || (item.claim != null && (
        typeof item.claim.by !== 'string'
        || typeof item.claim.at !== 'string'
        || !Number.isInteger(item.claim.where)
        || item.claim.where < 1
        || (item.claim.pr != null && (!Number.isInteger(item.claim.pr) || item.claim.pr < 1))
      ))
      || (item.verdict != null && (
        typeof item.verdict.ruling !== 'string'
        || typeof item.verdict.at !== 'string'
        || !Number.isInteger(item.verdict.where)
        || item.verdict.where < 1
      ))
    ))
  ) malformed('docket')
  return response
}

export { API_BASE }
