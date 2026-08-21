import fs from 'node:fs'
import path from 'node:path'
import { isPublishedMarkdown } from '../docs/.vitepress/publication-scope.mjs'

const root = process.cwd()
const docsRoot = path.join(root, 'docs')
const toPosix = (value) => value.replaceAll('\\', '/')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['.vitepress', 'public'].includes(entry.name)) return []
      return walk(full)
    }
    return entry.name.endsWith('.md') ? [full] : []
  })
}

function routeForFile(file) {
  const rel = toPosix(path.relative(docsRoot, file)).replace(/\.md$/, '')
  if (rel === 'index') return '/'
  return `/${rel.replace(/\/index$/, '')}`
}

function slugifyHeading(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function splitHref(href) {
  const [beforeHash, rawAnchor = ''] = href.split('#', 2)
  return {
    target: decodeURIComponent(beforeHash.split('?')[0]),
    anchor: decodeURIComponent(rawAnchor)
  }
}

const files = walk(docsRoot)
const errors = []
const warnings = []
const pages = new Map()
let words = 0

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const rel = toPosix(path.relative(root, file))
  const prose = text.replace(/```[\s\S]*?```/g, '')
  const route = routeForFile(file)
  const headings = [...prose.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({
    level: match[1].length,
    text: match[2].trim(),
    slug: slugifyHeading(match[2])
  }))
  pages.set(route, { file, rel, text, prose, headings })
  words += prose.replace(/\s+/g, '').length

  const fences = (text.match(/^```/gm) || []).length
  if (fences % 2 !== 0) errors.push(`${rel}: code fence is not closed`)

  const h1 = headings.filter((heading) => heading.level === 1).length
  const isHome = /^---[\s\S]*?layout:\s*home[\s\S]*?---/.test(text)
  if (!isHome && h1 !== 1) errors.push(`${rel}: expected exactly one H1, found ${h1}`)

  const seen = new Set()
  for (const heading of headings.filter((item) => item.level > 1)) {
    if (seen.has(heading.slug)) errors.push(`${rel}: duplicate heading slug #${heading.slug}`)
    seen.add(heading.slug)
  }
}

const inbound = new Map([...pages.keys()].map((route) => [route, 0]))

function validateRoute(href, source) {
  const { target, anchor } = splitHref(href)
  const route = target === '' ? source.route : target.replace(/\/$/, '') || '/'
  const page = pages.get(route)

  if (!page) {
    const publicTarget = target.startsWith('/')
      ? path.join(docsRoot, 'public', target.slice(1))
      : null
    if (!publicTarget || !fs.existsSync(publicTarget)) errors.push(`${source.rel}: broken site link ${href}`)
    return
  }

  if (route !== source.route) inbound.set(route, (inbound.get(route) || 0) + 1)
  if (anchor) {
    const expected = slugifyHeading(anchor)
    if (!page.headings.some((heading) => heading.slug === expected)) {
      errors.push(`${source.rel}: missing anchor ${href}`)
    }
  }
}

for (const [route, page] of pages) {
  const links = [...page.prose.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1])
  for (const href of links) {
    if (/^(https?:|mailto:)/.test(href)) continue
    if (href.startsWith('/') || href.startsWith('#')) {
      validateRoute(href, { route, rel: page.rel })
      continue
    }

    const { target } = splitHref(href)
    if (!target) continue
    const targetFile = path.resolve(path.dirname(page.file), target)
    if (!fs.existsSync(targetFile)) errors.push(`${page.rel}: broken relative link ${href}`)
  }
}

for (const sourceFile of [
  path.join(docsRoot, '.vitepress', 'config.mts'),
  path.join(docsRoot, 'index.md')
]) {
  const text = fs.readFileSync(sourceFile, 'utf8')
  const rel = toPosix(path.relative(root, sourceFile))
  for (const match of text.matchAll(/\blink:\s*['\"]?([^'\"\s]+)['\"]?/g)) {
    const href = match[1]
    if (href.startsWith('/')) validateRoute(href, { route: '/', rel })
  }
}

for (const [route, count] of inbound) {
  if (route === '/') continue
  const page = pages.get(route)
  const relativeDoc = toPosix(path.relative(docsRoot, page.file))
  if (count === 0 && isPublishedMarkdown(relativeDoc)) errors.push(`${page.rel}: orphan page (no internal or navigation link)`)
}

const changelog = fs.readFileSync(path.join(docsRoot, 'meta', 'changelog.md'), 'utf8')
for (const match of changelog.matchAll(/^\|\s*(\d{2})\s*\|\s*完成\s*\|[^\n]*\]\(\/reviews\/round-(\d{2})\)\s*\|$/gm)) {
  if (match[1] !== match[2]) errors.push(`docs/meta/changelog.md: round ${match[1]} links to round ${match[2]}`)
  if (!pages.has(`/reviews/round-${match[1]}`)) errors.push(`docs/meta/changelog.md: completed round ${match[1]} has no review file`)
}

for (const required of ['package.json', 'package-lock.json', '.github/workflows/deploy.yml']) {
  if (!fs.existsSync(path.join(root, required))) errors.push(`missing required project file: ${required}`)
}

if (errors.length) {
  console.error(`Documentation check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

for (const warning of warnings) console.warn(`Warning: ${warning}`)
console.log(`Documentation check passed: ${files.length} Markdown files, ${pages.size} routes, about ${words} non-whitespace characters.`)
