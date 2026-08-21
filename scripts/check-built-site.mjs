import fs from 'node:fs'
import path from 'node:path'
import { isPublishedMarkdown, nonPublicRoutes } from '../docs/.vitepress/publication-scope.mjs'

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

for (const route of nonPublicRoutes) {
  const flat = path.join(dist, `${route}.html`)
  const directory = path.join(dist, route)
  if (fs.existsSync(flat) || fs.existsSync(directory)) errors.push(`non-public governance route was rendered: /${route}`)
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

console.log(`Build verification passed: ${renderedPages.length} pages, ${htmlFiles.length} HTML files, base ${base}.`)
