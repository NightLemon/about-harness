import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { excludedSiteRoutes, isPublishedMarkdown } from '../docs/.vitepress/site-scope.mjs'

const root = process.cwd()
const docsRoot = path.join(root, 'docs')
const dist = path.join(docsRoot, '.vitepress', 'dist')
const base = normalizeBase(process.env.DOCS_BASE || '/')
const errors = []

function normalizeBase(value) {
  return `/${value.replace(/^\/+|\/+$/g, '')}${value === '/' ? '' : '/'}`
}

function walk(dir, predicate) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full, predicate)
    return predicate(full) ? [full] : []
  })
}

function outputForUrl(url) {
  const withoutQuery = decodeURIComponent(url.split('#')[0].split('?')[0])
  if (!withoutQuery.startsWith(base)) return null
  const relative = withoutQuery.slice(base.length)
  if (!relative) return path.join(dist, 'index.html')
  if (relative.endsWith('/')) return path.join(dist, relative, 'index.html')
  if (path.extname(relative)) return path.join(dist, relative)
  const flat = path.join(dist, `${relative}.html`)
  const directoryIndex = path.join(dist, relative, 'index.html')
  return fs.existsSync(flat) ? flat : directoryIndex
}

if (!fs.existsSync(dist)) {
  console.error('Build verification failed: docs/.vitepress/dist does not exist')
  process.exit(1)
}

const htmlFiles = walk(dist, (file) => file.endsWith('.html'))
const sourcePages = walk(docsRoot, (file) => isPublishedMarkdown(path.relative(docsRoot, file)))
const renderedPages = htmlFiles.filter((file) => path.basename(file) !== '404.html')

if (renderedPages.length !== sourcePages.length) {
  errors.push(`rendered ${renderedPages.length} pages for ${sourcePages.length} Markdown sources`)
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8')
  const rel = path.relative(dist, file).replaceAll('\\', '/')
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${rel}: missing non-empty title`)

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = match[1]
    if (/^(https?:|mailto:|#|data:)/.test(url)) continue
    if (url.startsWith('/') && !url.startsWith(base)) {
      errors.push(`${rel}: absolute URL does not use base ${base}: ${url}`)
      continue
    }
    if (!url.startsWith(base)) continue
    const output = outputForUrl(url)
    if (output && !fs.existsSync(output)) errors.push(`${rel}: built link has no artifact: ${url}`)
  }
}

for (const route of excludedSiteRoutes) {
  const flat = path.join(dist, `${route}.html`)
  const directory = path.join(dist, route)
  if (fs.existsSync(flat) || fs.existsSync(directory)) errors.push(`non-public governance route was rendered: /${route}`)
}

const baseline = JSON.parse(fs.readFileSync(path.join(root, 'maintenance/content-baseline.json'), 'utf8'))
const migrations = JSON.parse(fs.readFileSync(path.join(docsRoot, '.vitepress/legacy-links.json'), 'utf8'))
let oldAnchors = 0
for (const page of baseline.pages) {
  const file = path.join(dist, page.path.replace(/^docs\//, '').replace(/\.md$/, '.html'))
  const html = fs.readFileSync(file, 'utf8')
  for (const anchor of new Set([page.rendered_title_anchor, ...page.headings.flatMap(item => [item.anchor, item.rendered_anchor])].filter(Boolean))) {
    if (!html.includes(`id="${anchor}"`)) errors.push(`${page.path}: missing old anchor #${anchor}`)
    oldAnchors += 1
  }
}
for (const [route, mapping] of Object.entries(migrations)) {
  const destination = fs.readFileSync(path.join(dist, `${mapping.target.slice(1)}.html`), 'utf8')
  for (const anchor of Object.values(mapping.anchors)) {
    if (!destination.includes(`id="${anchor}"`)) errors.push(`${route}: missing migration target #${anchor}`)
  }
}
const indexes = walk(path.join(dist, 'assets'), file => path.basename(file).startsWith('@localSearchIndex'))
if (!indexes.length) errors.push('missing actual local search index')
for (const file of indexes) {
  const index = JSON.parse((await import(pathToFileURL(file).href)).default)
  for (const id of Object.values(index.documentIds)) {
    const route = id.split('#')[0].replace(new RegExp(`^${base}`), '/')
    if (migrations[route]) errors.push(`migration page leaked into search: ${id}`)
  }
}

const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
for (const expected of [`${base}logo.svg`, `${base}guide/start`, `${base}guide/portfolio`]) {
  if (!index.includes(expected)) errors.push(`index.html: missing expected base-aware reference ${expected}`)
}

if (errors.length) {
  console.error(`Build verification failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Build verification passed: ${renderedPages.length} pages, ${oldAnchors} old anchors, search exclusion, base ${base}.`)
