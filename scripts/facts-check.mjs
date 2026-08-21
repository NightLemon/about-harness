import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const registryPath = path.join(root, 'docs', 'references', 'fact-registry.md')
const docsRoot = path.join(root, 'docs')
const text = fs.readFileSync(registryPath, 'utf8')
const errors = []
const warnings = []
const maxAgeArgument = process.argv.find((value) => value.startsWith('--max-age='))
const maxAge = maxAgeArgument ? Number(maxAgeArgument.split('=')[1]) : null
const asOfText = process.env.FACTS_AS_OF || new Date().toISOString().slice(0, 10)
const asOf = new Date(`${asOfText}T00:00:00Z`)

if (Number.isNaN(asOf.valueOf())) errors.push(`invalid FACTS_AS_OF date: ${asOfText}`)
if (maxAge !== null && (!Number.isInteger(maxAge) || maxAge < 0)) errors.push('max age must be a non-negative integer')

const header = '| ID | Claim | Kind | Source | Version | Checked | Volatility | Evidence | Status | Used by |'
if (!text.includes(header)) errors.push('fact registry header changed; update parser deliberately')

const rows = text
  .split(/\r?\n/)
  .filter((line) => /^\| [a-z0-9][a-z0-9-]+ \|/.test(line))
  .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()))

const ids = new Set()
const allowedKinds = new Set(['project', 'repository', 'product', 'standard'])
const allowedVolatility = new Set(['low', 'medium', 'high'])
const allowedEvidence = new Set(['E0', 'E1', 'E2', 'E3'])
const allowedStatus = new Set(['verified', 'pending', 'conflict', 'retired'])
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function routeFile(route) {
  if (!route.startsWith('/')) return null
  const rel = route.slice(1)
  const candidates = route === '/'
    ? [path.join(docsRoot, 'index.md')]
    : [path.join(docsRoot, `${rel}.md`), path.join(docsRoot, rel, 'index.md')]
  return candidates.find((candidate) => fs.existsSync(candidate)) || null
}

function routeExists(route) {
  return !route.startsWith('/') || Boolean(routeFile(route))
}

for (const cells of rows) {
  if (cells.length !== 10) {
    errors.push(`registry row has ${cells.length} cells instead of 10: ${cells[0] || '<unknown>'}`)
    continue
  }
  const [id, claim, kind, source, version, checked, volatility, evidence, status, usedBy] = cells
  if (ids.has(id)) errors.push(`${id}: duplicate ID`)
  ids.add(id)
  if (claim.length < 8) errors.push(`${id}: claim is too vague`)
  if (!allowedKinds.has(kind)) errors.push(`${id}: invalid kind ${kind}`)
  if (!(source.startsWith('https://') || source.startsWith('/'))) errors.push(`${id}: source must be HTTPS or a site route`)
  if (!version) errors.push(`${id}: missing version`)
  if (!datePattern.test(checked)) errors.push(`${id}: checked date must be YYYY-MM-DD`)
  if (!allowedVolatility.has(volatility)) errors.push(`${id}: invalid volatility ${volatility}`)
  if (!allowedEvidence.has(evidence)) errors.push(`${id}: invalid evidence ${evidence}`)
  if (!allowedStatus.has(status)) errors.push(`${id}: invalid status ${status}`)
  if (status === 'verified' && evidence === 'E0') errors.push(`${id}: verified fact cannot remain E0`)
  if (datePattern.test(checked) && !Number.isNaN(asOf.valueOf())) {
    const checkedAt = new Date(`${checked}T00:00:00Z`)
    const ageDays = Math.floor((asOf - checkedAt) / 86_400_000)
    if (ageDays < 0) errors.push(`${id}: checked date ${checked} is after as-of date ${asOfText}`)
    if (status === 'verified' && ageDays > 30) warnings.push(`${id}: ${ageDays} days old; queued for review`)
    if (status === 'verified' && ageDays > 90) warnings.push(`${id}: ${ageDays} days old; online page needs an expired notice`)
    if (maxAge !== null && status === 'verified' && volatility === 'high' && ageDays > maxAge) {
      errors.push(`${id}: high-volatility fact is ${ageDays} days old; release limit is ${maxAge}`)
    }
  }
  const usedByFile = routeFile(usedBy)
  if (!usedBy.startsWith('/')) errors.push(`${id}: Used by must be a site route: ${usedBy}`)
  else if (!usedByFile) errors.push(`${id}: Used by route does not exist: ${usedBy}`)
  else if (status !== 'retired' && !fs.readFileSync(usedByFile, 'utf8').includes(`[FACT:${id}]`)) {
    errors.push(`${id}: Used by route ${usedBy} is missing [FACT:${id}]`)
  }
  if (source.startsWith('/') && !routeExists(source)) errors.push(`${id}: source route does not exist: ${source}`)
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : entry.name.endsWith('.md') ? [full] : []
  })
}

for (const file of walk(docsRoot)) {
  const body = fs.readFileSync(file, 'utf8')
  for (const match of body.matchAll(/\[FACT:([a-z0-9-]+)\]/g)) {
    if (!ids.has(match[1])) errors.push(`${path.relative(root, file)}: unknown fact ID ${match[1]}`)
  }
}

if (rows.length < 2) errors.push('fact registry must contain at least two records')

if (errors.length) {
  console.error(`Fact check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

const statusCounts = Object.fromEntries([...allowedStatus].map((status) => [status, rows.filter((row) => row[8] === status).length]))
for (const warning of warnings) console.warn(`Warning: ${warning}`)
console.log(`Fact check passed: ${rows.length} claims; ${JSON.stringify(statusCounts)}; as-of ${asOfText}; stale notices ${warnings.length}.`)
