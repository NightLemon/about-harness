import { spawnSync } from 'node:child_process'
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

  console.log('M2 checker negative tests passed: invalid facts and tampered, empty, or forged review evidence were rejected.')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
