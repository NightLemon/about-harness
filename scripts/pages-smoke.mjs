import { publicSmokeRoutes } from '../docs/.vitepress/publication-scope.mjs'

const baseInput = process.argv[2]
if (!baseInput) {
  console.error('Usage: node scripts/pages-smoke.mjs <published-or-local-base-url>')
  process.exit(2)
}

let base
try {
  base = new URL(baseInput)
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('unsafe URL')
  if (!base.pathname.endsWith('/')) base.pathname += '/'
} catch (error) {
  console.error(`Pages smoke failed: invalid base URL (${error.message})`)
  process.exit(2)
}

const routes = publicSmokeRoutes
const errors = []
const visitedAssets = new Set()

async function read(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return { response, text: await response.text() }
  } finally {
    clearTimeout(timer)
  }
}

for (const route of routes) {
  const url = new URL(route, base)
  try {
    const { response, text } = await read(url)
    if (response.url && new URL(response.url).origin !== base.origin) errors.push(`${url}: redirected off-origin`)
    if (!/<title>[^<]+<\/title>/.test(text)) errors.push(`${url}: missing title`)
    if (!/(?:<main\b|id="VPContent")/.test(text)) errors.push(`${url}: missing content landmark`)
    for (const match of text.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const asset = new URL(match[1], url)
      if (asset.origin !== base.origin || !asset.pathname.startsWith(base.pathname)) continue
      if (/\.(?:js|css|svg|png|woff2?)$/.test(asset.pathname)) visitedAssets.add(asset.href)
    }
  } catch (error) {
    errors.push(`${url}: ${error.name === 'AbortError' ? 'timeout' : error.message}`)
  }
}

for (const asset of visitedAssets) {
  try { await read(new URL(asset)) } catch (error) { errors.push(`${asset}: ${error.message}`) }
}

if (errors.length) {
  console.error(`Pages smoke failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Pages smoke passed: ${routes.length} routes and ${visitedAssets.size} same-origin assets at ${base}.`)
