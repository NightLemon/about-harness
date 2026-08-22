import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sourceRoot = process.cwd()
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-m2-negative-'))

function write(rel, content) {
  const file = path.join(tempRoot, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

function run(script) {
  return spawnSync(process.execPath, [path.join(sourceRoot, 'scripts', script)], {
    cwd: tempRoot,
    encoding: 'utf8'
  })
}

function runAt(cwd, script, env = {}) {
  return spawnSync(process.execPath, [path.join(sourceRoot, 'scripts', script)], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env }
  })
}

function writeAt(root, rel, content) {
  const file = path.join(root, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

function hashAt(root, rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex').toUpperCase()
}

try {
  write('docs/references/fact-registry.md', `# Invalid registry

| ID | Claim | Kind | Source | Version | Checked | Volatility | Evidence | Status | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| duplicate | 太短 | product | http://unsafe.example | rolling | yesterday | extreme | E9 | done | /missing |
| duplicate | 重复且错误的事实记录 | product | https://example.invalid | rolling | 2026-08-20 | high | E0 | verified | /missing |
`)
  write('docs/index.md', '# Invalid\n\n[FACT:unknown]\n')
  const facts = run('facts-check.mjs')
  if (facts.status === 0 || !`${facts.stdout}${facts.stderr}`.includes('duplicate ID')) {
    throw new Error('facts-check did not reject the duplicate/invalid negative fixture')
  }

  write('docs/references/fact-registry.md', `# Orphan registry

| ID | Claim | Kind | Source | Version | Checked | Volatility | Evidence | Status | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| orphan | 这是一条结构有效但正文没有逐项锚点的产品事实 | product | https://example.invalid/docs | v1 | 2026-08-20 | low | E1 | verified | / |
| retired-example | 退役记录可以保留而不要求正文继续引用 | project | https://example.invalid/retired | v1 | 2026-08-20 | low | E1 | retired | / |
`)
  write('docs/index.md', '# Existing route without fact anchor\n')
  const orphanFacts = run('facts-check.mjs')
  const orphanOutput = `${orphanFacts.stdout}${orphanFacts.stderr}`
  if (orphanFacts.status === 0 || !orphanOutput.includes('missing [FACT:orphan]')) {
    throw new Error('facts-check accepted a non-retired fact with no Used by page anchor')
  }
  if (orphanOutput.includes('missing [FACT:retired-example]')) {
    throw new Error('facts-check incorrectly required an anchor for a retired fact')
  }

  write('docs/references/fact-registry.md', `# Pending-claim registry

| ID | Claim | Kind | Source | Version | Checked | Volatility | Evidence | Status | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tracked | 这是一条已有正文锚点的有效产品事实记录 | product | https://example.invalid/docs | v1 | 2026-08-20 | low | E1 | verified | /models/tracked |
`)
  write('docs/models/tracked.md', '# Tracked\n\n[FACT:tracked]\n')
  write('docs/models/deepseek.md', '# Untracked pending claim\n\n价格和 model alias 保持 pending。\n')
  const pendingFacts = run('facts-check.mjs')
  if (pendingFacts.status === 0 || !`${pendingFacts.stdout}${pendingFacts.stderr}`.includes('unregistered pending claim')) {
    throw new Error('facts-check accepted a product pending claim without [FACT:ID]')
  }

  write('README.md', '# Invalid\n\n首个完整版本已完成 10 轮。\n')
  write('docs/meta/changelog.md', '# Invalid\n')
  fs.mkdirSync(path.join(tempRoot, 'docs', 'reviews', 'legacy'), { recursive: true })
  fs.mkdirSync(path.join(tempRoot, 'docs', 'reviews', 'v1'), { recursive: true })
  for (let round = 1; round <= 10; round += 1) {
    const id = String(round).padStart(2, '0')
    write(`docs/reviews/legacy/round-${id}.md`, `tampered-${id}\n`)
    write(`docs/reviews/round-${id}.md`, `# Stub ${id}\n`)
  }
  const reviews = run('reviews-check.mjs')
  const reviewOutput = `${reviews.stdout}${reviews.stderr}`
  if (reviews.status === 0 || !reviewOutput.includes('legacy hash changed') || !reviewOutput.includes('README still claims')) {
    throw new Error('reviews-check did not reject the tampered/false-completion negative fixture')
  }

  write('README.md', '# Review evidence canary\n')
  write('docs/meta/changelog.md', '# Changelog\n\nlegacy rounds 不计入 v1\n')
  write('docs/reviews/v1/round-01.md', '# Forged round\n')
  for (const name of ['baseline.json', 'findings.md', 'diff.patch', 'verification.json', 'unresolved.md']) {
    write(`artifacts/reviews/v1/round-01/${name}`, '')
  }
  const emptyReview = run('reviews-check.mjs')
  if (emptyReview.status === 0 || !`${emptyReview.stdout}${emptyReview.stderr}`.includes('empty artifact')) {
    throw new Error('reviews-check accepted empty v1 evidence files')
  }

  const zeroCommit = '0'.repeat(40)
  write('artifacts/reviews/v1/round-01/baseline.json', JSON.stringify({
    round: '01', baseline_commit: zeroCommit, baseline_tag: 'forged-baseline'
  }))
  write('artifacts/reviews/v1/round-01/findings.md', '# No reproducible finding\n')
  write('artifacts/reviews/v1/round-01/diff.patch', 'not a Git patch\n')
  write('artifacts/reviews/v1/round-01/verification.json', JSON.stringify({
    round: '01',
    baseline_commit: zeroCommit,
    findings_commit: zeroCommit,
    content_result_commit: zeroCommit,
    complete_tag: 'forged-complete',
    commands: [{ command: 'false positive', exit_code: 0 }],
    result: { open_blockers: 0 },
    artifact_hashes: {}
  }))
  write('artifacts/reviews/v1/round-01/unresolved.md', '# No severity accounting\n')
  const forgedReview = run('reviews-check.mjs')
  const forgedOutput = `${forgedReview.stdout}${forgedReview.stderr}`
  for (const marker of ['findings contain no round-specific', 'not a non-empty Git patch', 'artifact_hashes does not cover']) {
    if (!forgedOutput.includes(marker)) throw new Error(`reviews-check missed forged v1 evidence canary: ${marker}`)
  }
  if (forgedReview.status === 0) throw new Error('reviews-check accepted forged non-empty v1 evidence')

  const round11Root = path.join(tempRoot, 'round11-structured')
  fs.cpSync(path.join(sourceRoot, 'docs', 'reviews', 'legacy'), path.join(round11Root, 'docs', 'reviews', 'legacy'), { recursive: true })
  writeAt(round11Root, 'README.md', '# Structured Round 11 fixture\n')
  writeAt(round11Root, 'docs/meta/changelog.md', '# Changelog\n\nlegacy rounds 不计入 v1\n')
  for (let round = 1; round <= 10; round += 1) {
    const id = String(round).padStart(2, '0')
    writeAt(round11Root, `docs/reviews/round-${id}.md`, `# Old route ${id}\n`)
  }
  for (let round = 1; round <= 11; round += 1) {
    const id = String(round).padStart(2, '0')
    const label = `round-${id}`
    const artifactRoot = `artifacts/reviews/v1/${label}`
    const commit = (round % 16).toString(16).repeat(40)
    writeAt(round11Root, `docs/reviews/v1/${label}.md`, `# Structured ${label}\n`)
    writeAt(round11Root, `${artifactRoot}/baseline.json`, JSON.stringify({
      round: id,
      baseline_commit: commit,
      baseline_tag: `review-v1-${label}-baseline`,
      ...(round > 10 ? { input_evidence_commit: 'a'.repeat(40) } : {})
    }))
    writeAt(round11Root, `${artifactRoot}/findings.md`, `# Finding\n\nR${id}-P2-01: substantive canary\n`)
    writeAt(round11Root, `${artifactRoot}/diff.patch`, `diff --git a/example-${id}.md b/example-${id}.md\n--- a/example-${id}.md\n+++ b/example-${id}.md\n@@ -1 +1 @@\n-old\n+new\n`)
    writeAt(round11Root, `${artifactRoot}/unresolved.md`, '# Counts\n\n- 开放 P0：0\n- 开放 P1：0\n- 开放 P2：0\n- 开放 P3：0\n')
    const hashes = {}
    for (const rel of ['baseline.json', 'findings.md', 'diff.patch', 'unresolved.md']) {
      hashes[rel] = hashAt(round11Root, `${artifactRoot}/${rel}`)
    }
    hashes[`docs/reviews/v1/${label}.md`] = hashAt(round11Root, `docs/reviews/v1/${label}.md`)
    writeAt(round11Root, `${artifactRoot}/verification.json`, JSON.stringify({
      round: id,
      baseline_commit: commit,
      findings_commit: commit,
      content_result_commit: commit,
      complete_tag: `review-v1-${label}-complete`,
      commands: [{ command: 'structured canary', exit_code: 0 }],
      result: { open_blockers: 0 },
      artifact_hashes: hashes
    }))
  }
  const elevenRounds = runAt(round11Root, 'reviews-check.mjs')
  if (elevenRounds.status !== 0 || !elevenRounds.stdout.includes('11 contiguous v1 round')) {
    throw new Error(`reviews-check did not accept structured Round 11+ evidence: ${elevenRounds.stderr}`)
  }
  const round10Doc = fs.readFileSync(path.join(round11Root, 'docs', 'reviews', 'v1', 'round-10.md'), 'utf8')
  fs.rmSync(path.join(round11Root, 'docs', 'reviews', 'v1', 'round-10.md'))
  const gapResult = runAt(round11Root, 'reviews-check.mjs')
  if (gapResult.status === 0 || !gapResult.stderr.includes('must be contiguous from round-01')) {
    throw new Error('reviews-check accepted a gap before Round 11')
  }
  writeAt(round11Root, 'docs/reviews/v1/round-10.md', round10Doc)

  const ancestorRoot = path.join(tempRoot, 'round11-ancestor')
  fs.cpSync(path.join(sourceRoot, 'docs', 'reviews'), path.join(ancestorRoot, 'docs', 'reviews'), { recursive: true })
  fs.cpSync(path.join(sourceRoot, 'artifacts', 'reviews'), path.join(ancestorRoot, 'artifacts', 'reviews'), { recursive: true })
  fs.mkdirSync(path.join(ancestorRoot, 'artifacts', 'visual', 'round-09'), { recursive: true })
  fs.cpSync(path.join(sourceRoot, 'artifacts', 'visual', 'round-09', 'manifest.json'), path.join(ancestorRoot, 'artifacts', 'visual', 'round-09', 'manifest.json'))
  fs.cpSync(path.join(sourceRoot, 'README.md'), path.join(ancestorRoot, 'README.md'))
  fs.mkdirSync(path.join(ancestorRoot, 'docs', 'meta'), { recursive: true })
  fs.cpSync(path.join(sourceRoot, 'docs', 'meta', 'changelog.md'), path.join(ancestorRoot, 'docs', 'meta', 'changelog.md'))
  fs.cpSync(path.join(sourceRoot, '.git'), path.join(ancestorRoot, '.git'), { recursive: true })
  for (const name of ['diff.patch', 'verification.json', 'unresolved.md']) {
    fs.cpSync(
      path.join(ancestorRoot, 'artifacts', 'reviews', 'v1', 'round-10', name),
      path.join(ancestorRoot, 'artifacts', 'reviews', 'v1', 'round-11', name)
    )
  }
  const badBaselineFile = path.join(ancestorRoot, 'artifacts', 'reviews', 'v1', 'round-11', 'baseline.json')
  const badBaseline = JSON.parse(fs.readFileSync(badBaselineFile, 'utf8'))
  badBaseline.baseline_commit = '2847afc147704e453476f083c52e058e2f5e3639'
  fs.writeFileSync(badBaselineFile, JSON.stringify(badBaseline), 'utf8')
  const badAncestor = runAt(ancestorRoot, 'reviews-check.mjs', { REVIEWS_ALLOW_PENDING: '11' })
  if (badAncestor.status === 0 || !badAncestor.stderr.includes('round-11 post-release baseline') || !badAncestor.stderr.includes('is not an ancestor')) {
    throw new Error(`reviews-check did not reject a forged post-release baseline ancestor: ${badAncestor.stderr}`)
  }

  console.log('M2 checker negative tests passed: facts, Round 11 continuity, post-release ancestry, and forged review evidence were checked.')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
