import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const rootArgument = process.argv.find((value) => value.startsWith('--root='))
const root = path.resolve(rootArgument ? rootArgument.slice('--root='.length) : process.cwd())
const manifestRel = 'artifacts/release/v1/release-candidate.json'
const schemaRel = 'lab/schemas/release-candidate.schema.json'
const errors = []
const allowPendingTags = process.env.RELEASE_ALLOW_PENDING === '1'

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase()
}

function portableTextHashesFromBytes(bytes) {
  const hashes = new Set([crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase()])
  if (bytes.includes(0)) return hashes
  const text = bytes.toString('utf8')
  const lf = text.replace(/\r\n/g, '\n')
  const crlf = lf.replace(/\n/g, '\r\n')
  for (const value of [lf, crlf]) {
    hashes.add(crypto.createHash('sha256').update(value, 'utf8').digest('hex').toUpperCase())
  }
  return hashes
}

function artifactHashMatches(file, expected) {
  return portableTextHashesFromBytes(fs.readFileSync(file)).has(expected)
}

function safeFile(rel, label) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) {
    errors.push(`${label}: unsafe or missing relative path`)
    return null
  }
  const file = path.resolve(root, rel)
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    errors.push(`${label}: path escapes the project root`)
    return null
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    errors.push(`${label}: missing file ${rel}`)
    return null
  }
  return file
}

function readJson(rel, label) {
  const file = safeFile(rel, label)
  if (!file) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    errors.push(`${label}: invalid JSON (${error.message})`)
    return null
  }
}

function git(args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8' })
}

const gitProbe = git(['rev-parse', '--is-inside-work-tree'])
const hasGit = gitProbe.status === 0 && gitProbe.stdout.trim() === 'true'

function resolveCommit(value, label) {
  if (!/^[0-9a-f]{40}$/.test(value || '')) {
    errors.push(`${label}: expected a full lowercase 40-character commit SHA`)
    return null
  }
  if (!hasGit) return value
  const result = git(['rev-parse', '--verify', `${value}^{commit}`])
  if (result.status !== 0) {
    errors.push(`${label}: commit does not resolve`)
    return null
  }
  return result.stdout.trim().toLowerCase()
}

function resolveArtifactCommit(value, label) {
  if (!/^[0-9a-f]{7,40}$/i.test(value || '')) {
    errors.push(`${label}: invalid commit reference`)
    return null
  }
  if (!hasGit) return value.toLowerCase()
  const result = git(['rev-parse', '--verify', `${value}^{commit}`])
  if (result.status !== 0) {
    errors.push(`${label}: commit reference does not resolve`)
    return null
  }
  return result.stdout.trim().toLowerCase()
}

function annotatedTagCommit(tag, label, allowMissing = false) {
  if (!hasGit) return null
  const type = git(['cat-file', '-t', `refs/tags/${tag}`])
  if (type.status !== 0) {
    if (!allowMissing) errors.push(`${label}: missing annotated tag ${tag}`)
    return null
  }
  if (type.stdout.trim() !== 'tag') {
    errors.push(`${label}: ${tag} is not an annotated tag`)
    return null
  }
  const result = git(['rev-parse', `${tag}^{commit}`])
  if (result.status !== 0) {
    errors.push(`${label}: cannot resolve tag ${tag}`)
    return null
  }
  return result.stdout.trim().toLowerCase()
}

function requireAncestor(older, newer, label) {
  if (!older || !newer || !hasGit) return
  if (git(['merge-base', '--is-ancestor', older, newer]).status !== 0) {
    errors.push(`${label}: ${older.slice(0, 7)} is not an ancestor of ${newer.slice(0, 7)}`)
  }
}

const schema = readJson(schemaRel, 'release schema')
const manifest = readJson(manifestRel, 'release manifest')
const historicalReleaseCommit = manifest && hasGit
  ? annotatedTagCommit(manifest.release_tag, 'release candidate', allowPendingTags)
  : null

function historicalBytes(rel, label) {
  if (!historicalReleaseCommit) return null
  const result = spawnSync('git', ['show', `${historicalReleaseCommit}:${rel}`], { cwd: root, encoding: null })
  if (result.status !== 0) {
    errors.push(`${label}: ${rel} is missing from historical release tag`)
    return null
  }
  return result.stdout
}

function historicalText(rel, label) {
  const bytes = historicalBytes(rel, label)
  return bytes === null ? null : bytes.toString('utf8')
}

function historicalArtifactHashMatches(rel, currentFile, expected) {
  const bytes = historicalBytes(rel, 'release artifact hash')
  return bytes === null ? artifactHashMatches(currentFile, expected) : portableTextHashesFromBytes(bytes).has(expected)
}

if (schema) {
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') errors.push('release schema: unexpected JSON Schema dialect')
  if (schema.properties?.review_rounds?.minItems !== 10 || schema.properties?.review_rounds?.maxItems !== 10) {
    errors.push('release schema: review_rounds must require exactly 10 items')
  }
  for (const field of ['source_commit', 'authorization', 'facts', 'reports', 'artifact_hashes']) {
    if (!schema.required?.includes(field)) errors.push(`release schema: required field missing from contract: ${field}`)
  }
}

if (!manifest) {
  if (errors.length) {
    console.error(`Release check failed with ${errors.length} error(s):`)
    for (const error of errors) console.error(`- ${error}`)
  }
  process.exit(1)
}

if (manifest.schema_version !== '1.0') errors.push('release manifest: schema_version must be 1.0')
if (!/^v1-rc[1-9][0-9]*$/.test(manifest.release_id || '')) errors.push('release manifest: invalid release_id')
if (Number.isNaN(Date.parse(manifest.created_at || ''))) errors.push('release manifest: invalid created_at')
if (!/^release-v1-rc[1-9][0-9]*$/.test(manifest.release_tag || '')) errors.push('release manifest: invalid release_tag')
if (!/^m8-(complete-v1|corrected-v[2-9][0-9]*)$/.test(manifest.milestone_tag || '')) errors.push('release manifest: invalid M8 milestone_tag')
if (manifest.evidence_level !== 'E1') errors.push('release manifest: evidence_level must remain E1 without A3')
if (!['not-published', 'pending-publication'].includes(manifest.publication_status)) errors.push('release manifest: invalid pre-publication status')
if (manifest.site?.base !== '/about-harness/') errors.push('release manifest: site base must be /about-harness/')
if (!/^http:\/\/127\.0\.0\.1:\d+\/about-harness\/$/.test(manifest.site?.local_smoke_url || '')) errors.push('release manifest: invalid local Pages smoke URL')
if (manifest.site?.published_url !== null) errors.push('release manifest: published_url must remain null until deployment succeeds')
if (manifest.authorization?.a3_used !== false) errors.push('release manifest: A3 must remain false without real API authorization')
if (typeof manifest.authorization?.a4_used !== 'boolean' ||
    manifest.authorization?.a4_used !== manifest.authorization?.remote_operations) {
  errors.push('release manifest: A4 and remote_operations must be matching booleans')
}
if (manifest.authorization?.a4_used && manifest.publication_status !== 'pending-publication') {
  errors.push('release manifest: A4 release candidate must be pending-publication')
}
if (!manifest.authorization?.a4_used && manifest.publication_status !== 'not-published') {
  errors.push('release manifest: local release candidate must be not-published')
}

const sourceCommit = resolveCommit(manifest.source_commit, 'release manifest source_commit')
const rounds = Array.isArray(manifest.review_rounds) ? manifest.review_rounds : []
if (rounds.length !== 10) errors.push('release manifest: review_rounds must contain exactly 10 entries')

let previousEvidence = null
for (let index = 0; index < rounds.length; index += 1) {
  const expectedId = String(index + 1).padStart(2, '0')
  const item = rounds[index] || {}
  const label = `release round-${expectedId}`
  if (item.round !== expectedId) errors.push(`${label}: expected round ID ${expectedId}`)
  for (const field of ['baseline_tag', 'complete_tag']) {
    if (typeof item[field] !== 'string' || !item[field]) errors.push(`${label}: missing ${field}`)
  }
  const baselineCommit = resolveCommit(item.baseline_commit, `${label} baseline_commit`)
  const findingsCommit = resolveCommit(item.findings_commit, `${label} findings_commit`)
  const contentCommit = resolveCommit(item.content_result_commit, `${label} content_result_commit`)
  const evidenceCommit = resolveCommit(item.evidence_commit, `${label} evidence_commit`)
  if (previousEvidence && baselineCommit && previousEvidence !== baselineCommit) errors.push(`${label}: baseline is not the previous round evidence commit`)

  const verificationRel = `artifacts/reviews/v1/round-${expectedId}/verification.json`
  const verificationFile = safeFile(verificationRel, `${label} verification`)
  if (!/^[0-9A-F]{64}$/.test(item.verification_sha256 || '')) errors.push(`${label}: invalid verification_sha256`)
  else if (verificationFile && sha256(verificationFile) !== item.verification_sha256) errors.push(`${label}: verification_sha256 mismatch`)
  let verification = null
  if (verificationFile) {
    try {
      verification = JSON.parse(fs.readFileSync(verificationFile, 'utf8'))
    } catch (error) {
      errors.push(`${label}: invalid verification JSON (${error.message})`)
    }
  }
  if (verification) {
    const artifactBaseline = resolveArtifactCommit(verification.baseline_commit, `${label} artifact baseline_commit`)
    const artifactFindings = resolveArtifactCommit(verification.findings_commit, `${label} artifact findings_commit`)
    const artifactContent = resolveArtifactCommit(verification.content_result_commit, `${label} artifact content_result_commit`)
    if (artifactBaseline && baselineCommit && artifactBaseline !== baselineCommit) errors.push(`${label}: manifest/artifact baseline mismatch`)
    if (artifactFindings && findingsCommit && artifactFindings !== findingsCommit) errors.push(`${label}: manifest/artifact findings mismatch`)
    if (artifactContent && contentCommit && artifactContent !== contentCommit) errors.push(`${label}: manifest/artifact content result mismatch`)
    if (verification.complete_tag !== item.complete_tag) errors.push(`${label}: manifest/artifact complete tag mismatch`)
  }

  const baselineTagCommit = annotatedTagCommit(item.baseline_tag, label)
  const completeTagCommit = annotatedTagCommit(item.complete_tag, label)
  if (baselineTagCommit && baselineCommit && baselineTagCommit !== baselineCommit) errors.push(`${label}: baseline tag points to the wrong commit`)
  if (completeTagCommit && evidenceCommit && completeTagCommit !== evidenceCommit) errors.push(`${label}: complete tag points to the wrong evidence commit`)
  requireAncestor(baselineCommit, findingsCommit, label)
  requireAncestor(findingsCommit, contentCommit, label)
  requireAncestor(contentCommit, evidenceCommit, label)
  previousEvidence = evidenceCommit || previousEvidence
}
if (rounds.length === 10 && sourceCommit && previousEvidence && sourceCommit !== previousEvidence) {
  errors.push('release manifest: source_commit must equal round-10 evidence commit')
}

const releaseVerification = readJson(manifest.verification_path, 'release verification')
const requiredCommands = {
  verify: (value) => value === 'npm run verify',
  reviews: (value) => value === 'npm run reviews:check',
  facts: (value) => value === 'npm run facts:release',
  licenses: (value) => value === 'npm run licenses:check',
  secrets: (value) => value === 'npm run secrets:check',
  workflows: (value) => value === 'npm run workflows:check',
  visual: (value) => value === 'npm run docs:visual',
  release_self_test: (value) => value === 'npm run release:self-test',
  pages: (value) => value === 'npm run pages:check',
  pages_smoke: (value) => /^npm run pages:smoke -- http:\/\/127\.0\.0\.1:\d+\/about-harness\/$/.test(value)
}
if (releaseVerification) {
  if (releaseVerification.source_commit !== manifest.source_commit) errors.push('release verification: source_commit mismatch')
  const commands = Array.isArray(releaseVerification.commands) ? releaseVerification.commands : []
  for (const [id, matches] of Object.entries(requiredCommands)) {
    const command = commands.find((entry) => entry.id === id)
    if (!command) errors.push(`release verification: missing required gate ${id}`)
    else {
      if (command.exit_code !== 0) errors.push(`release verification: gate ${id} did not pass`)
      if (!matches(command.command || '')) errors.push(`release verification: gate ${id} command is not the stable interface`)
    }
  }
}

const facts = manifest.facts || {}
if (!/^\d{4}-\d{2}-\d{2}$/.test(facts.as_of || '') || Number.isNaN(Date.parse(`${facts.as_of}T00:00:00Z`))) errors.push('release manifest: invalid facts.as_of')
if (facts.max_age_days !== 30 || facts.stale_high !== 0 || !Number.isInteger(facts.verified_claims) || facts.verified_claims < 1) {
  errors.push('release manifest: invalid 30-day fact summary')
}
const registryFile = safeFile(manifest.reports?.facts_registry, 'release facts registry')
if (registryFile && /^\d{4}-\d{2}-\d{2}$/.test(facts.as_of || '')) {
  const registryText = historicalText(manifest.reports.facts_registry, 'release facts registry') ?? fs.readFileSync(registryFile, 'utf8')
  const rows = registryText.split(/\r?\n/).filter((line) => /^\| [a-z0-9][a-z0-9-]+ \|/.test(line))
  const parsed = rows.map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()))
  const verified = parsed.filter((cells) => cells[8] === 'verified')
  if (verified.length !== facts.verified_claims) errors.push('release manifest: verified_claims does not match fact registry')
  const asOf = new Date(`${facts.as_of}T00:00:00Z`)
  const staleHigh = verified.filter((cells) => cells[6] === 'high' && Math.floor((asOf - new Date(`${cells[5]}T00:00:00Z`)) / 86_400_000) > 30)
  if (staleHigh.length !== facts.stale_high) errors.push('release manifest: stale_high does not match fact registry')
}

const reports = manifest.reports || {}
const requiredReportPaths = [
  schemaRel,
  manifest.verification_path,
  manifest.known_limitations_path,
  'docs/references/fact-registry.md',
  'LICENSE',
  'LICENSE-DOCS',
  'docs/meta/privacy.md',
  'docs/meta/dependency-security.md',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
  '.github/workflows/facts.yml',
  'package.json',
  'docs/.vitepress/config.mts',
  'docs/.vitepress/publication-scope.mjs',
  'scripts/check-built-site.mjs',
  'scripts/pages-smoke.mjs',
  'scripts/serve-pages.mjs',
  'artifacts/visual/m6/manifest.json',
  'artifacts/visual/round-09/manifest.json',
  'lab/results/public/m5-offline-summary.json',
  'lab/results/public/m5-offline-trace-sample.json'
]
const declaredReports = new Set([
  reports.facts_registry,
  ...(Array.isArray(reports.licenses) ? reports.licenses : []),
  reports.privacy,
  reports.dependency_security,
  ...(Array.isArray(reports.workflows) ? reports.workflows : []),
  ...(Array.isArray(reports.publication_scope) ? reports.publication_scope : []),
  ...(Array.isArray(reports.visual_manifests) ? reports.visual_manifests : []),
  ...(Array.isArray(reports.public_results) ? reports.public_results : [])
])
for (const rel of requiredReportPaths) {
  const file = safeFile(rel, 'release report')
  if (![schemaRel, manifest.verification_path, manifest.known_limitations_path].includes(rel) && !declaredReports.has(rel)) {
    errors.push(`release manifest: reports omit ${rel}`)
  }
  const expected = manifest.artifact_hashes?.[rel]
  if (!/^[0-9A-F]{64}$/.test(expected || '')) errors.push(`release manifest: artifact_hashes omit ${rel}`)
  else if (file && !historicalArtifactHashMatches(rel, file, expected)) errors.push(`release manifest: artifact hash mismatch for ${rel}`)
}
for (const [rel, expected] of Object.entries(manifest.artifact_hashes || {})) {
  if (!/^[0-9A-F]{64}$/.test(expected || '')) errors.push(`release manifest: invalid SHA256 for ${rel}`)
  const file = safeFile(rel, 'release artifact hash')
  if (file && /^[0-9A-F]{64}$/.test(expected || '') && !historicalArtifactHashMatches(rel, file, expected)) errors.push(`release manifest: artifact hash mismatch for ${rel}`)
}

const limitationsFile = safeFile(manifest.known_limitations_path, 'release known limitations')
if (limitationsFile) {
  const limitations = fs.readFileSync(limitationsFile, 'utf8')
  for (const marker of ['E1', 'A3', 'A4', '未发布']) {
    if (!limitations.includes(marker)) errors.push(`release known limitations: missing boundary marker ${marker}`)
  }
  if (limitations.length < 200) errors.push('release known limitations: report is too short')
}

if (!hasGit) errors.push('release validation requires a Git worktree')
else {
  const releaseTagCommit = historicalReleaseCommit
  const milestoneTagCommit = annotatedTagCommit(manifest.milestone_tag, 'M8 checkpoint', allowPendingTags)
  if (releaseTagCommit && milestoneTagCommit && releaseTagCommit !== milestoneTagCommit) errors.push('release and M8 tags point to different commits')
  const headCommit = git(['rev-parse', 'HEAD']).stdout.trim().toLowerCase()
  if (releaseTagCommit) requireAncestor(releaseTagCommit, headCommit, 'historical release candidate')
  if (milestoneTagCommit) requireAncestor(milestoneTagCommit, headCommit, 'historical M8 checkpoint')
  if (sourceCommit && releaseTagCommit) requireAncestor(sourceCommit, releaseTagCommit, 'release candidate')
  const remotes = git(['remote']).stdout.trim()
  if (!manifest.authorization?.a4_used && remotes) errors.push('release candidate: Git remotes exist before A4')
  if (manifest.authorization?.a4_used && !remotes) errors.push('release candidate: A4 remote operations are claimed but no Git remote exists')
  const status = git(['status', '--porcelain=v1', '-uall']).stdout.split(/\r?\n/).filter(Boolean)
  const unexpected = status.filter((line) => line !== '?? ACTIVE_GOAL.md')
  if (unexpected.length) errors.push(`release candidate: worktree is not clean (${unexpected.join(', ')})`)
}

if (errors.length) {
  console.error(`Release check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Release check passed: historical ${manifest.release_id} binds 10 annotated review chains, 30-day facts, scoped public Pages evidence, governance reports, and A3/A4 boundaries.`)
