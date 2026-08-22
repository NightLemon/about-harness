import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const [resultInput = 'artifacts/release/v1/publication-result.json', schemaInput = 'lab/schemas/publication-result.schema.json'] = process.argv.slice(2)
const errors = []

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8'))
  } catch (error) {
    errors.push(`${label}: invalid JSON (${error.message})`)
    return null
  }
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, file))).digest('hex').toUpperCase()
}

function git(args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8' })
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label}: must be an object`)
    return
  }
  const actual = Object.keys(value)
  for (const key of expected) if (!(key in value)) errors.push(`${label}: missing ${key}`)
  for (const key of actual) if (!expected.includes(key)) errors.push(`${label}: unknown field ${key}`)
}

function annotatedTagCommit(tag, label) {
  const type = git(['cat-file', '-t', `refs/tags/${tag}`])
  if (type.status !== 0 || type.stdout.trim() !== 'tag') {
    errors.push(`${label}: ${tag} must remain an annotated tag`)
    return null
  }
  const commit = git(['rev-parse', `${tag}^{commit}`])
  if (commit.status !== 0) {
    errors.push(`${label}: cannot resolve ${tag}`)
    return null
  }
  return commit.stdout.trim()
}

const schema = readJson(schemaInput, 'publication schema')
const result = readJson(resultInput, 'publication result')

if (schema) {
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') errors.push('publication schema: unexpected JSON Schema dialect')
  for (const field of ['publication_status', 'source_commit', 'release_candidate', 'site', 'workflows', 'authorization', 'evidence_level']) {
    if (!schema.required?.includes(field)) errors.push(`publication schema: missing required field ${field}`)
  }
  if (schema.properties?.publication_status?.const !== 'published') errors.push('publication schema: status must be published')
}

if (result) {
  exactKeys(result, ['schema_version', 'publication_id', 'publication_status', 'published_at', 'source_commit', 'release_candidate', 'site', 'workflows', 'authorization', 'evidence_level', 'evidence_boundary'], 'publication result')
  exactKeys(result.release_candidate, ['path', 'sha256', 'release_tag', 'milestone_tag', 'historical_status'], 'publication release_candidate')
  exactKeys(result.site, ['url', 'checked_at', 'http_status'], 'publication site')
  exactKeys(result.workflows, ['ci', 'deploy'], 'publication workflows')
  exactKeys(result.authorization, ['a3_used', 'a4_used_for_m9', 'round_11_remote_writes'], 'publication authorization')
  if (result.schema_version !== '1.0') errors.push('publication result: schema_version must be 1.0')
  if (!/^v1-pages-\d{4}-\d{2}-\d{2}$/.test(result.publication_id || '')) errors.push('publication result: invalid publication_id')
  if (result.publication_status !== 'published') errors.push('publication result: status must be published')
  if (Number.isNaN(Date.parse(result.published_at || ''))) errors.push('publication result: invalid published_at')
  if (!/^[a-f0-9]{40}$/.test(result.source_commit || '')) errors.push('publication result: invalid source_commit')
  if (result.site?.url !== 'https://nightlemon.github.io/about-harness/' || result.site?.http_status !== 200) {
    errors.push('publication result: Pages URL and recorded HTTP 200 are required')
  }
  if (Number.isNaN(Date.parse(result.site?.checked_at || ''))) errors.push('publication result: invalid site.checked_at')
  if (result.evidence_level !== 'E1') errors.push('publication result: evidence_level must remain E1')
  if (typeof result.evidence_boundary !== 'string' || result.evidence_boundary.length < 40) errors.push('publication result: evidence boundary is missing or too short')
  if (result.authorization?.a3_used !== false || result.authorization?.a4_used_for_m9 !== true || result.authorization?.round_11_remote_writes !== false) {
    errors.push('publication result: authorization boundary mismatch')
  }

  const source = result.source_commit
  const sourceProbe = git(['rev-parse', '--verify', `${source}^{commit}`])
  if (sourceProbe.status !== 0 || sourceProbe.stdout.trim() !== source) errors.push('publication result: source_commit does not resolve exactly')

  const candidate = result.release_candidate || {}
  if (candidate.path !== 'artifacts/release/v1/release-candidate.json') errors.push('publication result: unexpected release candidate path')
  else if (sha256(candidate.path) !== candidate.sha256) errors.push('publication result: release candidate SHA256 mismatch')
  const candidateJson = candidate.path ? readJson(candidate.path, 'historical release candidate') : null
  if (candidateJson) {
    if (candidateJson.publication_status !== 'pending-publication' || candidate.historical_status !== 'pending-publication') {
      errors.push('publication result: historical RC3 status must remain pending-publication')
    }
    if (git(['merge-base', '--is-ancestor', candidateJson.source_commit, source]).status !== 0) {
      errors.push('publication result: RC source is not an ancestor of the published source')
    }
  }
  const releaseCommit = annotatedTagCommit(candidate.release_tag, 'publication release tag')
  const milestoneCommit = annotatedTagCommit(candidate.milestone_tag, 'publication milestone tag')
  if (releaseCommit && releaseCommit !== source) errors.push('publication result: release tag does not point to source_commit')
  if (milestoneCommit && milestoneCommit !== source) errors.push('publication result: milestone tag does not point to source_commit')

  for (const [name, expectedId] of [['ci', '32459945445'], ['deploy', '32459945521']]) {
    const workflow = result.workflows?.[name]
    exactKeys(workflow, ['run_id', 'url', 'head_sha', 'conclusion', 'updated_at'], `publication ${name} workflow`)
    if (workflow?.run_id !== expectedId || workflow?.conclusion !== 'success') errors.push(`publication result: ${name} workflow mismatch`)
    if (workflow?.head_sha !== source) errors.push(`publication result: ${name} workflow head SHA mismatch`)
    if (workflow?.url !== `https://github.com/NightLemon/about-harness/actions/runs/${expectedId}`) errors.push(`publication result: ${name} workflow URL mismatch`)
    if (Number.isNaN(Date.parse(workflow?.updated_at || ''))) errors.push(`publication result: ${name} workflow timestamp invalid`)
  }
}

if (errors.length) {
  console.error(`Publication check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Publication check passed: v1 publication binds immutable RC3 history, e13bd93, successful CI/Deploy runs, and the recorded Pages HTTP 200.')
