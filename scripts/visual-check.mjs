import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const dist = path.join(root, 'docs', '.vitepress', 'dist')
const update = process.argv.includes('--update')
const base = '/about-harness/'
const evidenceRoot = path.join(root, 'artifacts', 'visual', 'round-09')
const outputRoot = update ? evidenceRoot : fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-visual-'))
const errors = []
const records = []

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('Visual check failed: build docs with npm run docs:project-base first')
  process.exit(1)
}
fs.mkdirSync(outputRoot, { recursive: true })

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'], ['.woff2', 'font/woff2'], ['.json', 'application/json']
])

function fileForRequest(rawUrl) {
  const pathname = decodeURIComponent(new URL(rawUrl, 'http://local.test').pathname)
  if (!pathname.startsWith(base)) return null
  let relative = pathname.slice(base.length)
  if (!relative || relative.endsWith('/')) relative += 'index.html'
  else if (!path.extname(relative)) {
    const flat = path.join(dist, `${relative}.html`)
    relative = fs.existsSync(flat) ? `${relative}.html` : path.join(relative, 'index.html')
  }
  const resolved = path.resolve(dist, relative)
  return resolved.startsWith(`${path.resolve(dist)}${path.sep}`) || resolved === path.resolve(dist) ? resolved : null
}

const server = http.createServer((request, response) => {
  const file = fileForRequest(request.url || '/')
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('not found')
    return
  }
  response.writeHead(200, { 'content-type': mime.get(path.extname(file)) || 'application/octet-stream' })
  fs.createReadStream(file).pipe(response)
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const address = server.address()
const origin = `http://127.0.0.1:${address.port}`
const browser = await chromium.launch({ headless: true })
const browserVersion = browser.version()

async function pageMetrics(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const target = document.querySelector(':target')
    const tables = [...document.querySelectorAll('main table')].map((table) => ({
      clientWidth: table.clientWidth,
      scrollWidth: table.scrollWidth,
      overflowX: getComputedStyle(table).overflowX
    }))
    return {
      viewportWidth: window.innerWidth,
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      title: document.title,
      main: Boolean(document.querySelector('main, #VPContent')),
      targetTop: target ? Math.round(target.getBoundingClientRect().top) : null,
      tables
    }
  })
}

async function inspect(viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: 'light' })
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()) })

  await page.goto(`${origin}${base}`, { waitUntil: 'networkidle' })
  const home = await pageMetrics(page)
  if (!home.main || home.scrollWidth > home.clientWidth) errors.push(`${viewport.id}: home has horizontal overflow or no main landmark`)

  const search = page.locator('button.VPNavBarSearchButton:visible, button.DocSearch-Button:visible, button[aria-label*="搜索"]:visible').first()
  if (await search.count()) {
    await search.click()
    const box = page.locator('.VPLocalSearchBox, .DocSearch-Modal').first()
    try { await box.waitFor({ state: 'visible', timeout: 3_000 }) } catch { errors.push(`${viewport.id}: search dialog did not open`) }
    await page.keyboard.press('Escape')
  } else errors.push(`${viewport.id}: search trigger not found`)

  let mobileMenu = null
  let mobileMenuState = null
  if (viewport.width < 960) {
    mobileMenu = page.locator('.VPNavBarHamburger:visible').first()
    if (!(await mobileMenu.count())) errors.push(`${viewport.id}: mobile menu trigger not found`)
    else {
      await mobileMenu.click()
      const navScreen = page.locator('.VPNavScreen').first()
      try { await navScreen.waitFor({ state: 'visible', timeout: 3_000 }) } catch { errors.push(`${viewport.id}: mobile navigation did not open`) }
      mobileMenuState = { opened: await navScreen.isVisible(), closed: false, expandedAfterClose: null }
    }
  }

  const appearance = page.locator('.VPSwitchAppearance:visible').first()
  if (await appearance.count()) {
    await appearance.click()
    if (!(await page.locator('html.dark').count())) errors.push(`${viewport.id}: dark theme did not activate`)
  } else errors.push(`${viewport.id}: appearance switch not found`)

  if (mobileMenu && mobileMenuState) {
    const navScreen = page.locator('.VPNavScreen').first()
    if (await navScreen.isVisible()) await mobileMenu.click()
    try { await navScreen.waitFor({ state: 'hidden', timeout: 3_000 }) } catch { errors.push(`${viewport.id}: mobile navigation did not close`) }
    mobileMenuState.closed = !(await navScreen.isVisible())
    mobileMenuState.expandedAfterClose = await mobileMenu.getAttribute('aria-expanded')
    if (!mobileMenuState.closed || mobileMenuState.expandedAfterClose === 'true') {
      errors.push(`${viewport.id}: mobile navigation remains expanded before screenshot`)
    }
  }

  const homeScreenshot = `${viewport.id}-home.png`
  await page.screenshot({ path: path.join(outputRoot, homeScreenshot), fullPage: true })

  await page.goto(`${origin}${base}evaluation/method`, { waitUntil: 'networkidle' })
  const table = await pageMetrics(page)
  if (!table.main || table.scrollWidth > table.clientWidth) errors.push(`${viewport.id}: evaluation page has horizontal overflow or no main landmark`)
  if (!table.tables.length) errors.push(`${viewport.id}: evaluation page has no table coverage`)
  for (const item of table.tables) {
    if (item.scrollWidth > item.clientWidth && !['auto', 'scroll'].includes(item.overflowX)) {
      errors.push(`${viewport.id}: wide table is not horizontally scrollable`)
    }
  }
  const tableScreenshot = `${viewport.id}-evaluation.png`
  await page.screenshot({ path: path.join(outputRoot, tableScreenshot), fullPage: true })

  await page.goto(`${origin}${base}labs/migration`, { waitUntil: 'networkidle' })
  const migration = await pageMetrics(page)
  let migrationTableScroll = null
  if (!migration.main || migration.scrollWidth > migration.clientWidth) {
    errors.push(`${viewport.id}: migration page has horizontal overflow or no main landmark`)
  }
  if (migration.tables.length < 2) errors.push(`${viewport.id}: migration page does not expose both mapping and domain tables`)
  if (viewport.width <= 390 && !migration.tables.some((item) => item.scrollWidth > item.clientWidth)) {
    errors.push(`${viewport.id}: migration page has no exercised horizontal table scrolling`)
  }
  if (viewport.width <= 390) {
    migrationTableScroll = await page.evaluate(() => {
      const table = [...document.querySelectorAll('main table')].find((item) => item.scrollWidth > item.clientWidth)
      if (!table) return { found: false, moved: false, maxScroll: 0 }
      table.scrollLeft = table.scrollWidth
      const result = { found: true, moved: table.scrollLeft > 0, maxScroll: table.scrollLeft }
      table.scrollLeft = 0
      return result
    })
    if (!migrationTableScroll.moved) errors.push(`${viewport.id}: migration table did not respond to horizontal scroll`)
  }
  for (const item of migration.tables) {
    if (item.scrollWidth > item.clientWidth && !['auto', 'scroll'].includes(item.overflowX)) {
      errors.push(`${viewport.id}: migration table is not horizontally scrollable`)
    }
  }
  const migrationScreenshot = `${viewport.id}-migration.png`
  await page.screenshot({ path: path.join(outputRoot, migrationScreenshot), fullPage: true })

  await page.goto(`${origin}${base}foundations/state-reliability#幂等与副作用`, { waitUntil: 'networkidle' })
  const anchor = await pageMetrics(page)
  if (anchor.targetTop === null || anchor.targetTop < 64 || anchor.targetTop > viewport.height) {
    errors.push(`${viewport.id}: deep anchor is obscured or outside the viewport (${anchor.targetTop})`)
  }
  if (runtimeErrors.length) errors.push(`${viewport.id}: browser errors: ${runtimeErrors.join(' | ')}`)
  records.push({
    ...viewport,
    home,
    table,
    migration,
    migrationTableScroll,
    anchor,
    mobileMenu: mobileMenuState,
    screenshots: [homeScreenshot, tableScreenshot, migrationScreenshot]
  })
  await page.close()
}

try {
  for (const viewport of [
    { id: 'desktop-1440', width: 1440, height: 900 },
    { id: 'mobile-390', width: 390, height: 844 },
    { id: 'narrow-320', width: 320, height: 700 }
  ]) await inspect(viewport)
} finally {
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}

const screenshots = fs.readdirSync(outputRoot).filter((name) => name.endsWith('.png')).sort().map((name) => ({
  file: name,
  sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(outputRoot, name))).digest('hex')
}))
const manifest = {
  schema_version: '1.1',
  evidence: 'E1',
  generated_at: new Date().toISOString(),
  base,
  browser: `Chromium ${browserVersion}`,
  assertions: [
    'navigation', 'search', 'theme', 'evaluation-tables', 'migration-page',
    'deep-anchor', 'mobile-menu-open-close', 'no-horizontal-page-overflow'
  ],
  records,
  screenshots
}

if (update) {
  fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
} else {
  const committedManifest = path.join(evidenceRoot, 'manifest.json')
  if (!fs.existsSync(committedManifest)) errors.push('missing committed artifacts/visual/round-09/manifest.json; run with --update')
  else {
    const committed = JSON.parse(fs.readFileSync(committedManifest, 'utf8'))
    for (const item of committed.screenshots || []) {
      const file = path.join(evidenceRoot, item.file)
      if (!fs.existsSync(file)) errors.push(`missing committed screenshot ${item.file}`)
      else {
        const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
        if (hash !== item.sha256) errors.push(`committed screenshot hash changed: ${item.file}`)
      }
    }
  }
  fs.rmSync(outputRoot, { recursive: true, force: true })
}

if (errors.length) {
  console.error(`Visual check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Visual check passed: ${records.length} viewports, ${screenshots.length} screenshots, base ${base}.`)
