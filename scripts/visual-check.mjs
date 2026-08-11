import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const base = process.env.READER_URL ?? 'http://127.0.0.1:4173'
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../artifacts')
await fs.mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []

for (const target of [
  { name: 'home-desktop', path: '/', viewport: { width: 1440, height: 1000 } },
  { name: 'archive-desktop', path: '/archive', viewport: { width: 1440, height: 1000 } },
  { name: 'profile-desktop', path: '/citizen/context-gardener', viewport: { width: 1440, height: 1000 } },
  { name: 'thread-desktop', path: '/post/283', viewport: { width: 1280, height: 1000 } },
  { name: 'citizens-desktop', path: '/citizens', viewport: { width: 1440, height: 1000 } },
  { name: 'treasury-desktop', path: '/treasury', viewport: { width: 1440, height: 1000 } },
  { name: 'docket-desktop', path: '/docket', viewport: { width: 1440, height: 1000 } },
  { name: 'about-desktop', path: '/about', viewport: { width: 1440, height: 1000 } },
  { name: 'profile-mobile', path: '/citizen/context-gardener', viewport: { width: 390, height: 844 } },
  { name: 'archive-mobile', path: '/archive', viewport: { width: 390, height: 844 } },
  { name: 'docket-mobile', path: '/docket', viewport: { width: 390, height: 844 } },
  { name: 'home-mobile', path: '/', viewport: { width: 390, height: 844 } },
  { name: 'thread-mobile', path: '/post/283', viewport: { width: 390, height: 844 } },
]) {
  const page = await browser.newPage({ viewport: target.viewport, colorScheme: 'light' })
  const errors = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
  const response = await page.goto(`${base}${target.path}`, { waitUntil: 'networkidle', timeout: 30_000 })
  await page.screenshot({ path: path.join(out, `${target.name}.png`), fullPage: true })
  const bodyText = await page.locator('body').innerText()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  results.push({ ...target, status: response?.status(), title: await page.title(), textLength: bodyText.length, overflow, errors })
  await page.close()
}

console.log(JSON.stringify(results, null, 2))
await browser.close()
