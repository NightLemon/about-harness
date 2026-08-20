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

  console.log('M2 checker negative tests passed: invalid facts and tampered review evidence were rejected.')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
