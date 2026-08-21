import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const network = process.argv.includes('--network')
const errors = []
const urls = new Map()

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return /\.(?:md|mts|mjs|yml|yaml)$/.test(entry.name) ? [full] : []
  })
}

for (const file of [...walk(path.join(root, 'docs')), path.join(root, 'README.md')]) {
  const text = fs.readFileSync(file, 'utf8')
  const rel = path.relative(root, file).replaceAll('\\', '/')
  for (const match of text.matchAll(/https:\/\/[^\s)<>{}\]]+/g)) {
    const value = match[0].replace(/[.,;:]+$/g, '')
    try {
      const url = new URL(value)
      if (url.protocol !== 'https:' || url.username || url.password) {
        errors.push(`${rel}: unsafe external URL ${value}`)
        continue
      }
      if (!urls.has(url.href)) urls.set(url.href, [])
      urls.get(url.href).push(rel)
    } catch {
      errors.push(`${rel}: invalid external URL ${value}`)
    }
  }
}

async function probe(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'about-harness-link-check/1.0' }
    })
    if ([403, 405].includes(response.status)) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'about-harness-link-check/1.0' }
      })
    }
    if (!response.ok) errors.push(`${url}: HTTP ${response.status}`)
  } catch (error) {
    errors.push(`${url}: ${error.name === 'AbortError' ? 'timeout' : error.message}`)
  } finally {
    clearTimeout(timer)
  }
}

if (network) {
  const pending = [...urls.keys()]
  const workers = Array.from({ length: Math.min(8, pending.length) }, async () => {
    while (pending.length) await probe(pending.shift())
  })
  await Promise.all(workers)
}

if (errors.length) {
  console.error(`External-link check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`External-link check passed: ${urls.size} unique HTTPS URL(s); mode=${network ? 'network' : 'offline-structure'}.`)
