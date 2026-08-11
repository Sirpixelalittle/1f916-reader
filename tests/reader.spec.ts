import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const publicPages = ['/', '/archive', '/citizens', '/treasury', '/docket', '/about']

test('the reader exposes public content without write controls', async ({ page }) => {
  const writes: string[] = []
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      writes.push(`${request.method()} ${request.url()}`)
    }
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Ideas worth spending/i })).toBeVisible()
  await expect(page.locator('.post-card').first()).toBeVisible()
  await expect(page.getByText('Read-only', { exact: true })).toBeVisible()
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
  await expect(page.getByText(/No credentials/i).first()).toBeVisible()
  expect(writes).toEqual([])
})

test('feed search and order controls are usable', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.post-card').first()).toBeVisible()
  await expect(page.locator('.post-card')).toHaveCount(30)
  await page.getByPlaceholder(/Filter loaded titles/i).fill('no-result-string-1f916-reader')
  await expect(page.getByRole('heading', { name: 'No dispatches found' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(page.locator('.post-card').first()).toBeVisible()
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await expect(page).toHaveURL(/view=new/)
})

test('core read-only sections load', async ({ page }) => {
  for (const path of publicPages) {
    await page.goto(path)
    await expect(page.locator('main h1').first()).toBeVisible()
    await expect(page.locator('.page-state--error')).toHaveCount(0)
  }
})

test('the docket renders the public work ledger with URL-backed filters and receipts', async ({ page }) => {
  const writes: string[] = []
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      writes.push(`${request.method()} ${request.url()}`)
    }
  })
  await page.route('https://1f916.ai/api/docket', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        now: Date.now(),
        now_utc: new Date().toISOString(),
        counts: { open: 1, 'decision-pending': 1, shipped: 1 },
        what_this_is: 'A fixture of facts, not promises.',
        how_to_claim: 'Claim in the discussion thread.',
        how_to_contribute: { repo: 'https://github.com/1f916-ai/1f916', format: 'Claim, branch, test, and open a PR.', note: 'Public review follows.' },
        how_it_was_built: 'Built from public threads.',
        docket: [
          {
            id: 'fixture-open', title: 'Repair the fixture', status: 'open', lane: 'fix', size: 'medium', updated: '2026-08-09', source_posts: [10], discussion: 10,
            note: 'The long-form context remains visible.', claim: { by: 'builder-agent', at: '2026-08-09', where: 10, pr: 12 },
          },
          {
            id: 'fixture-decision', title: 'Count the fixture', status: 'decision-pending', lane: 'debate', size: 'large', updated: '2026-08-10', source_posts: [30], decision_thread: 31,
            verdict: { ruling: 'The public thread records the mandate.', where: 30, at: '2026-08-10' },
          },
          {
            id: 'fixture-shipped', title: 'Ship the fixture', status: 'shipped', lane: 'fix', size: 'trivial', updated: '2026-08-08', source_posts: [],
          },
        ],
      }),
    })
  })

  await page.goto('/docket')
  await expect(page.getByRole('heading', { name: /The work is public/i })).toBeVisible()
  await expect(page.locator('.docket-card')).toHaveCount(2)
  await expect(page.getByRole('heading', { name: 'Repair the fixture' })).toBeVisible()
  await expect(page.getByRole('link', { name: '#10', exact: true })).toHaveAttribute('href', '/post/10')
  await expect(page.getByRole('link', { name: /Claim receipt/i })).toHaveAttribute('href', '/post/10')
  await expect(page.getByRole('link', { name: /PR #12/i })).toHaveAttribute('href', 'https://github.com/1f916-ai/1f916/pull/12')
  await expect(page.getByText('Claimed by builder-agent')).toBeVisible()
  await expect(page.getByRole('link', { name: /ruling receipt/i })).toHaveAttribute('href', '/post/30')

  await page.getByRole('combobox', { name: 'Docket status' }).selectOption('shipped')
  await expect(page).toHaveURL(/status=shipped/)
  await expect(page.getByRole('heading', { name: 'Ship the fixture' })).toBeVisible()
  await expect(page.getByText('No source thread listed')).toBeVisible()

  await page.getByRole('combobox', { name: 'Docket status' }).selectOption('all')
  await expect(page).toHaveURL(/status=all/)
  await page.getByPlaceholder(/Search asks/i).fill('fixture-open')
  await expect(page).toHaveURL(/q=fixture-open/)
  await expect(page.locator('.docket-card')).toHaveCount(1)
  expect(writes).toEqual([])
})

test('malformed docket data reaches a retryable page error', async ({ page }) => {
  await page.route('https://1f916.ai/api/docket', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        now: Date.now(), now_utc: new Date().toISOString(), counts: { open: 1 },
        what_this_is: 'fixture', how_to_claim: 'fixture', how_it_was_built: 'fixture',
        how_to_contribute: { repo: 'https://example.com', format: 'fixture' },
        docket: [{ id: 'malformed-row', title: 'Missing required fields', source_posts: [1] }],
      }),
    })
  })

  await page.goto('/docket')
  await expect(page.getByRole('heading', { name: 'Could not open the docket' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expect(page.locator('.fatal-error')).toHaveCount(0)
})

test('a thread renders markdown and its public conversation', async ({ page }) => {
  await page.goto('/')
  const firstTitle = page.locator('.post-card__title a').first()
  await expect(firstTitle).toBeVisible()
  await firstTitle.click()
  await expect(page.locator('.thread-post h1')).toBeVisible()
  await expect(page.locator('.thread-post__body')).not.toBeEmpty()
  await expect(page.getByRole('heading', { name: /comments/i })).toBeVisible()
})


test('untrusted markdown cannot trigger third-party image requests', async ({ page }) => {
  const thirdPartyRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('attacker.invalid')) thirdPartyRequests.push(request.url())
  })
  await page.route('https://1f916.ai/api/post/999', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        post: {
          id: 999,
          title: 'Markdown privacy fixture',
          body: '![tracking pixel](https://attacker.invalid/pixel.png)\n\n[Uppercase external](HTTPS://attacker.invalid/page)\n\n[Relative source link](/api/front)',
          url: null,
          pinned: 0,
          mod_state: null,
          created_at: Date.now(),
          author: 'fixture-agent',
          author_model: 'test-model',
          votes: 0,
          flags: 0,
        },
        comments: [],
      }),
    })
  })

  await page.goto('/post/999')
  await expect(page.getByText('not loaded for privacy')).toBeVisible()
  await expect(page.locator('.thread-post__body img')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Uppercase external/i })).toHaveAttribute('target', '_blank')
  await expect(page.getByRole('link', { name: /Relative source link/i })).toHaveAttribute('href', 'https://1f916.ai/api/front')
  expect(thirdPartyRequests).toEqual([])
})


test('route changes announce themselves and move focus to main content', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.post-card').first()).toBeVisible()
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Citizens' }).click()
  await expect(page.getByRole('heading', { name: /Every voice/i })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Citizens page')
  await expect.poll(() => page.locator('main').evaluate((element) => element === document.activeElement)).toBe(true)
})

test('blocked browser storage does not blank the reader', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value: () => { throw new DOMException('blocked', 'SecurityError') } })
    Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: () => { throw new DOMException('blocked', 'SecurityError') } })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Ideas worth spending/i })).toBeVisible()
})

test('malformed public data reaches a usable root error boundary', async ({ page }) => {
  await page.route('https://1f916.ai/api/front?limit=100', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        order: 'top', limit: 100, returned: 1, ranked_window: 300, window_capped: false, note: 'fixture',
        posts: [{ id: 1, title: { unexpected: true }, body: 'fixture', url: null, pinned: 0, created_at: Date.now(), author: 'fixture', author_model: 'fixture', votes: 0, weighted_votes: 0, comments: 0 }],
      }),
    })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /could not be rendered/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Reload reader/i })).toBeVisible()
})

test('citizen-authored headings stay below page and section headings', async ({ page }) => {
  await page.route('https://1f916.ai/api/post/998', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        post: { id: 998, title: 'Heading fixture', body: '# Post body heading', url: null, pinned: 0, mod_state: null, created_at: Date.now(), author: 'fixture-agent', author_model: 'test-model', votes: 0, flags: 0 },
        comments: [{ id: 1, parent_id: null, body: '# Comment body heading', depth: 0, mod_state: null, created_at: Date.now(), author: 'reply-agent', author_model: 'test-model', votes: 0, flags: 0 }],
      }),
    })
  })
  await page.goto('/post/998')
  await expect(page.locator('main h1')).toHaveCount(1)
  await expect(page.locator('.thread-post__body h2')).toHaveText('Post body heading')
  await expect(page.locator('.comment h3')).toHaveText('Comment body heading')
})

test('archive loads bounded chapters on demand', async ({ page }) => {
  let completedChapters = 0
  page.on('response', (response) => {
    if (response.url().includes('/api/changes?since=') && response.ok()) completedChapters += 1
  })
  await page.goto('/archive')
  await expect(page.locator('.activity-item').first()).toBeVisible()
  expect(completedChapters).toBe(1)
  await page.getByRole('button', { name: 'Load next chapter' }).click()
  await expect.poll(() => completedChapters).toBe(2)
})

test('compact desktop navigation and loading state remain accessible', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 })
  await page.route('https://1f916.ai/api/front?limit=100', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    await route.continue()
  })
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Archive' })).toBeVisible()
  await expect(page.locator('.feed-list[role="status"]')).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')
  expect(blocking.map((item) => item.id)).toEqual([])
})


test('clicking a citizen name opens their account, activity, karma, and public quota view', async ({ page }) => {
  const now = Date.now()
  await page.route('https://1f916.ai/api/citizens', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 1, total: 1, returned: 1, page_size: 1000, has_more: false, note: 'fixture', citizens: [{ handle: 'profile-agent', model: 'test-model', karma: 7, created_at: now - 86_400_000 }] }),
    })
  })
  await page.route(/https:\/\/1f916\.ai\/api\/changes\?since=.*/, async (route) => {
    const since = Number(new URL(route.request().url()).searchParams.get('since'))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        since,
        now,
        next_since: now,
        has_more: false,
        cursor_note: 'fixture',
        posts: [{ id: 77, title: 'A test post', url: null, created_at: now, author: 'profile-agent', author_model: 'test-model' }],
        comments: [{ id: 88, post_id: 77, parent_id: null, body: 'A thoughtful test comment.', mod_state: null, created_at: now, author: 'profile-agent', author_model: 'test-model' }],
      }),
    })
  })
  await page.route('https://1f916.ai/api/official', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ society: '1F916', maintainer: { handle: 'maintainer-agent', citizen: 1, is: 'an AI' }, official_token: null, treasury: { address: '0x0', network: 'base', asset: 'USDC' }, sanctioned_money_in: [], source_of_record: 'https://example.com', known_windows: [], windows_warning: '', warning: '' }),
    })
  })

  await page.goto('/citizens')
  await page.getByRole('link', { name: /profile-agent/i }).click()
  await expect(page).toHaveURL('/citizen/profile-agent')
  await expect(page.getByRole('heading', { level: 1, name: 'profile-agent' })).toBeVisible()
  await expect(page.getByText('7', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('0 remaining', { exact: true })).toBeVisible()
  await expect(page.getByText('19 remaining', { exact: true })).toBeVisible()
  await expect(page.getByText('Not public', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'A test post' })).toBeVisible()
  await page.getByRole('tab', { name: /Comments/i }).click()
  await expect(page.getByText('A thoughtful test comment.')).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')
  expect(blocking.map((item) => item.id)).toEqual([])
})

test('desktop pages have no serious accessibility violations', async ({ page }) => {
  for (const path of publicPages) {
    await page.goto(path)
    await expect(page.locator('main h1').first()).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    const blocking = results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')
    expect(blocking, `${path}: ${blocking.map((item) => `${item.id} (${item.nodes.length})`).join(', ')}`).toEqual([])
  }
})

test('mobile layouts avoid horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of publicPages) {
    await page.goto(path)
    await expect(page.locator('main h1').first()).toBeVisible()
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(dimensions.scrollWidth, `${path} overflowed at 390px`).toBeLessThanOrEqual(dimensions.clientWidth)
  }
})
