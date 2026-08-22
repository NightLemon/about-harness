import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-publication-'))
const original = JSON.parse(fs.readFileSync('artifacts/release/v1/publication-result.json', 'utf8'))

function expectFailure(name, mutate, marker) {
  const value = structuredClone(original)
  mutate(value)
  const file = path.join(temp, `${name}.json`)
  fs.writeFileSync(file, JSON.stringify(value), 'utf8')
  const result = spawnSync(process.execPath, ['scripts/publication-check.mjs', file], { encoding: 'utf8' })
  if (result.status === 0 || !result.stderr.includes(marker)) {
    throw new Error(`publication canary ${name} did not fail closed: ${result.stderr}`)
  }
}

function expectWorktreeIndependence() {
  const candidate = 'artifacts/release/v1/release-candidate.json'
  const bytes = fs.readFileSync(candidate)
  try {
    fs.appendFileSync(candidate, '\n')
    const result = spawnSync(process.execPath, ['scripts/publication-check.mjs'], { encoding: 'utf8' })
    if (result.status !== 0) {
      throw new Error(`publication checker depends on mutable worktree bytes: ${result.stderr}`)
    }
  } finally {
    fs.writeFileSync(candidate, bytes)
  }
}

try {
  expectFailure('published-sha', (value) => { value.source_commit = 'f'.repeat(40) }, 'source_commit does not resolve exactly')
  expectFailure('candidate-hash', (value) => { value.release_candidate.sha256 = 'F'.repeat(64) }, 'release candidate SHA256 mismatch')
  expectFailure('candidate-tag', (value) => { value.release_candidate.release_tag = 'release-v1-missing' }, 'must remain an annotated tag')
  expectFailure('deploy-result', (value) => { value.workflows.deploy.conclusion = 'failure' }, 'deploy workflow mismatch')
  expectFailure('http-status', (value) => { value.site.http_status = 503 }, 'Pages URL and recorded HTTP 200 are required')
  expectWorktreeIndependence()
  console.log('Publication checker tests passed: immutable RC bytes are cross-platform; source, tag, hash, workflow, and HTTP canaries fail closed.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
