import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sourceRoot = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-release-negative-'))

function write(rel, content) {
  const file = path.join(temp, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

function sha(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(temp, rel))).digest('hex').toUpperCase()
}

function git(args) {
  const result = spawnSync('git', args, { cwd: temp, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
  return result.stdout.trim()
}

function runCheck() {
  return spawnSync(process.execPath, [path.join(sourceRoot, 'scripts', 'release-check.mjs'), `--root=${temp}`], {
    cwd: temp,
    encoding: 'utf8'
  })
}

try {
  fs.mkdirSync(path.join(temp, 'lab', 'schemas'), { recursive: true })
  fs.copyFileSync(
    path.join(sourceRoot, 'lab', 'schemas', 'release-candidate.schema.json'),
    path.join(temp, 'lab', 'schemas', 'release-candidate.schema.json')
  )

  const reports = {
    facts_registry: 'docs/references/fact-registry.md',
    licenses: ['LICENSE', 'LICENSE-DOCS'],
    privacy: 'docs/meta/privacy.md',
    dependency_security: 'docs/meta/dependency-security.md',
    workflows: ['.github/workflows/ci.yml', '.github/workflows/deploy.yml', '.github/workflows/facts.yml'],
    publication_scope: [
      'package.json', 'docs/.vitepress/config.mts', 'docs/.vitepress/publication-scope.mjs',
      'scripts/check-built-site.mjs', 'scripts/pages-smoke.mjs', 'scripts/serve-pages.mjs'
    ],
    visual_manifests: ['artifacts/visual/m6/manifest.json', 'artifacts/visual/round-09/manifest.json'],
    public_results: ['lab/results/public/m5-offline-summary.json', 'lab/results/public/m5-offline-trace-sample.json']
  }
  write(reports.facts_registry, `# Facts

| ID | Claim | Kind | Source | Version | Checked | Volatility | Evidence | Status | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| self-test | 用于 release checker 负例的有效事实记录 | project | / | v1 | 2026-08-21 | high | E1 | verified | / |
`)
  for (const rel of [
    ...reports.licenses,
    reports.privacy,
    reports.dependency_security,
    ...reports.workflows,
    ...reports.publication_scope,
    ...reports.visual_manifests,
    ...reports.public_results
  ]) write(rel, `self-test report ${rel}\n`)
  write('artifacts/release/v1/known-limitations.md', `# Known limitations

This E1-only canary has more than two hundred characters so the checker must inspect the boundary markers instead of accepting an empty file. A3 remains false because no real API or fee is authorized. A4 remains false because the candidate is 未发布 and no remote operation is allowed. This text is deliberately repetitive to satisfy the minimum audit size without claiming live evidence.
`)

  git(['init'])
  git(['config', 'user.name', 'Release Self Test'])
  git(['config', 'user.email', 'release-self-test@example.invalid'])
  git(['add', '.'])
  git(['commit', '-m', 'test: create release baseline'])
  const base = git(['rev-parse', 'HEAD'])

  const rounds = []
  for (let round = 1; round <= 10; round += 1) {
    const id = String(round).padStart(2, '0')
    const baselineTag = `review-v1-round-${id}-baseline`
    const completeTag = `review-v1-round-${id}-complete`
    const verificationRel = `artifacts/reviews/v1/round-${id}/verification.json`
    write(verificationRel, JSON.stringify({
      round: id,
      baseline_commit: base,
      findings_commit: base,
      content_result_commit: base,
      complete_tag: completeTag
    }, null, 2))
    rounds.push({
      round: id,
      baseline_tag: baselineTag,
      complete_tag: completeTag,
      baseline_commit: base,
      findings_commit: base,
      content_result_commit: base,
      evidence_commit: base,
      verification_sha256: sha(verificationRel)
    })
  }

  const verificationPath = 'artifacts/release/v1/verification.json'
  const commands = [
    ['verify', 'npm run verify'],
    ['reviews', 'npm run reviews:check'],
    ['facts', 'npm run facts:release'],
    ['licenses', 'npm run licenses:check'],
    ['secrets', 'npm run secrets:check'],
    ['workflows', 'npm run workflows:check'],
    ['visual', 'npm run docs:visual'],
    ['release_self_test', 'npm run release:self-test'],
    ['pages', 'npm run pages:check'],
    ['pages_smoke', 'npm run pages:smoke -- http://127.0.0.1:4173/about-harness/']
  ].map(([id, command]) => ({ id, command, exit_code: 0 }))
  write(verificationPath, JSON.stringify({ schema_version: '1.0', source_commit: base, commands }, null, 2))

  const requiredArtifacts = [
    'lab/schemas/release-candidate.schema.json',
    verificationPath,
    'artifacts/release/v1/known-limitations.md',
    reports.facts_registry,
    ...reports.licenses,
    reports.privacy,
    reports.dependency_security,
    ...reports.workflows,
    ...reports.publication_scope,
    ...reports.visual_manifests,
    ...reports.public_results
  ]
  const artifactHashes = Object.fromEntries(requiredArtifacts.map((rel) => [rel, sha(rel)]))
  const manifest = {
    schema_version: '1.0',
    release_id: 'v1-rc1',
    created_at: '2026-08-21T16:00:00+08:00',
    source_commit: base,
    release_tag: 'release-v1-rc1',
    milestone_tag: 'm8-complete-v1',
    evidence_level: 'E1',
    publication_status: 'not-published',
    site: { base: '/about-harness/', local_smoke_url: 'http://127.0.0.1:4173/about-harness/', published_url: null },
    authorization: { a3_used: false, a4_used: false, remote_operations: false },
    review_rounds: rounds,
    facts: { as_of: '2026-08-21', max_age_days: 30, verified_claims: 1, stale_high: 0 },
    reports,
    known_limitations_path: 'artifacts/release/v1/known-limitations.md',
    verification_path: verificationPath,
    artifact_hashes: artifactHashes
  }
  write('artifacts/release/v1/release-candidate.json', JSON.stringify(manifest, null, 2))
  git(['add', '.'])
  git(['commit', '-m', 'test: create forged release candidate'])
  for (const item of rounds) {
    git(['tag', item.baseline_tag, base])
    git(['tag', item.complete_tag, base])
  }
  git(['tag', manifest.release_tag])
  git(['tag', manifest.milestone_tag])

  const portableHashCanary = path.join(temp, reports.privacy)
  fs.writeFileSync(portableHashCanary, fs.readFileSync(portableHashCanary, 'utf8').replace(/\r?\n/g, '\r\n'))

  const lightweight = runCheck()
  const lightweightOutput = `${lightweight.stdout}${lightweight.stderr}`
  if (lightweight.status === 0 || !lightweightOutput.includes('is not an annotated tag')) {
    throw new Error('release-check accepted lightweight review/release tags')
  }
  if (lightweightOutput.includes(`artifact hash mismatch for ${reports.privacy}`)) {
    throw new Error('release-check rejected a text artifact only because its checkout line endings changed')
  }

  manifest.review_rounds = []
  manifest.authorization.a4_used = true
  write('artifacts/release/v1/release-candidate.json', JSON.stringify(manifest, null, 2))
  const verification = JSON.parse(fs.readFileSync(path.join(temp, verificationPath), 'utf8'))
  verification.commands = verification.commands.filter((entry) => entry.id !== 'verify')
  write(verificationPath, JSON.stringify(verification, null, 2))
  const malformed = runCheck()
  const malformedOutput = `${malformed.stdout}${malformed.stderr}`
  for (const marker of ['exactly 10 entries', 'A4 and remote_operations must be matching booleans', 'missing required gate verify']) {
    if (!malformedOutput.includes(marker)) throw new Error(`release-check missed malformed RC canary: ${marker}`)
  }
  if (malformed.status === 0) throw new Error('release-check accepted a malformed release candidate')

  console.log('Release checker negative tests passed: lightweight tags, incomplete rounds, inconsistent authorization, and missing gates were rejected.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
