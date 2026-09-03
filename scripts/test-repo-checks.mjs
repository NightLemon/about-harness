import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sourceRoot = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-repo-check-'))

function write(rel, content) {
  const file = path.join(temp, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

function run(script, args = [], options = {}) {
  return spawnSync(process.execPath, [path.join(sourceRoot, 'scripts', script), ...args], {
    cwd: temp,
    encoding: 'utf8',
    ...options
  })
}

try {
  write('leak.txt', 'token=' + 'ghp_' + 'A'.repeat(36))
  const secret = run('secrets-check.mjs', [temp])
  if (secret.status === 0 || !secret.stderr.includes('GitHub token')) {
    throw new Error('secret checker did not reject a token canary')
  }

  write('LICENSE', 'MIT License\n')
  write('LICENSE-DOCS', 'Creative Commons Attribution 4.0\n')
  write('package-lock.json', JSON.stringify({ packages: { '': {}, 'node_modules/bad': { version: '1.0.0', license: 'GPL-3.0' } } }))
  write('uv.lock', 'version = 1\n\n[[package]]\nname = "sample"\nversion = "1.0.0"\n')
  write('scripts/python-license-policy.json', JSON.stringify({ 'sample@1.0.0': 'MIT' }))
  const license = run('licenses-check.mjs', [temp])
  if (license.status === 0 || !license.stderr.includes('unapproved')) {
    throw new Error('license checker did not reject a copyleft canary')
  }

  const pinnedSha = 'a'.repeat(40)
  const deployPagesSha = 'd6db90164ac5ed86f2b6aed7e0febac5b3c0c03e'
  const validCi = `name: CI
on:
  pull_request:
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@${pinnedSha}
      - run: npm run verify
`
  const validDeploy = `name: Deploy
on:
  push:
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run pages:check
  deploy:
    needs: build
    permissions:
      pages: write
      id-token: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@${deployPagesSha}
`
  const validFacts = `name: Facts
on:
  schedule:
    - cron: '17 3 1 */3 *'
permissions:
  contents: read
jobs:
  facts:
    runs-on: ubuntu-latest
    steps:
      - run: npm run links:check -- --network
`
  write('.github/workflows/ci.yml', validCi)
  write('.github/workflows/deploy.yml', validDeploy)
  write('.github/workflows/facts.yml', validFacts)
  write('Dockerfile', `FROM python:3.12-slim@sha256:${'b'.repeat(64)}\n`)

  const validWorkflow = run('workflows-check.mjs', [temp])
  if (validWorkflow.status !== 0) throw new Error(`workflow checker rejected the valid least-privilege fixture: ${validWorkflow.stderr}`)

  write('.github/workflows/ci.yml', validCi.replace('npm run verify', 'npm run pages:check'))
  const partialCi = run('workflows-check.mjs', [temp])
  if (partialCi.status === 0 || !partialCi.stderr.includes('must run the full repository verification')) {
    throw new Error('workflow checker did not reject partial CI verification')
  }

  write('.github/workflows/ci.yml', validCi)
  write('.github/workflows/deploy.yml', validDeploy.replace('npm run pages:check', 'npm run verify'))
  const coupledDeploy = run('workflows-check.mjs', [temp])
  if (coupledDeploy.status === 0 || !coupledDeploy.stderr.includes('must use the scoped Pages check')) {
    throw new Error('workflow checker did not reject a Pages job that duplicates full verification')
  }

  write('.github/workflows/deploy.yml', validDeploy)
  write('.github/workflows/ci.yml', validCi.replace(`actions/checkout@${pinnedSha}`, 'actions/checkout@v4'))
  const unpinnedWorkflow = run('workflows-check.mjs', [temp])
  if (unpinnedWorkflow.status === 0 || !unpinnedWorkflow.stderr.includes('not pinned')) {
    throw new Error('workflow checker did not reject an unpinned action')
  }

  write('.github/workflows/ci.yml', validCi.replace('    runs-on: ubuntu-latest', '    permissions:\n      contents: write\n    runs-on: ubuntu-latest'))
  const writePermission = run('workflows-check.mjs', [temp])
  if (writePermission.status === 0 || !writePermission.stderr.includes('job verify has forbidden write permission contents')) {
    throw new Error('workflow checker did not reject a job-level write permission')
  }

  write('.github/workflows/ci.yml', validCi)
  write('.github/workflows/deploy.yml', validDeploy.replace('permissions:\n  contents: read', 'permissions:\n  contents: read\n  pages: write\n  id-token: write'))
  const topLevelDeployWrite = run('workflows-check.mjs', [temp])
  if (topLevelDeployWrite.status === 0 || !topLevelDeployWrite.stderr.includes('workflow scope must not grant pages: write')) {
    throw new Error('workflow checker did not reject workflow-level Pages/OIDC write permissions')
  }

  write('.github/workflows/deploy.yml', validDeploy)
  write('.github/workflows/deploy.yml', validDeploy.replace(deployPagesSha, 'c'.repeat(40)))
  const unregisteredActionPin = run('workflows-check.mjs', [temp])
  if (unregisteredActionPin.status === 0 || !unregisteredActionPin.stderr.includes('does not match its registered action pin')) {
    throw new Error('workflow checker did not reject an unregistered deploy-pages commit')
  }

  write('.github/workflows/deploy.yml', validDeploy)
  write('Dockerfile', 'FROM python:3.12-slim\n')
  const mutableImage = run('workflows-check.mjs', [temp])
  if (mutableImage.status === 0 || !mutableImage.stderr.includes('mutable container image')) {
    throw new Error('workflow checker did not reject a mutable container image')
  }

  write('Dockerfile', `FROM python:3.12-slim@sha256:${'b'.repeat(64)}\n`)

  write('docs/references/fact-registry.md', `# Registry

| ID | Claim | Kind | Source | Version | Checked | Volatility | Source status | Experiment level | Experiment ref | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stale-fact | 这是一个需要被过期门禁拒绝的产品事实 | product | https://example.com/ | rolling | 2026-01-01 | high | verified | E0 | - | /page |
`)
  write('docs/page.md', '# Page\n')
  const facts = run('facts-check.mjs', ['--max-age=30'], { env: { ...process.env, FACTS_AS_OF: '2026-08-20' } })
  if (facts.status === 0 || !facts.stderr.includes('freshness limit')) {
    throw new Error('fact checker did not reject a stale high-volatility fact')
  }

  write('docs/references/fact-registry.md', `# Registry

| ID | Claim | Kind | Source | Version | Checked | Volatility | Source status | Experiment level | Experiment ref | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| missing-run | 这是一个错误声称具有离线实验的产品事实 | product | https://example.com/ | rolling | 2026-08-20 | low | verified | E1 | - | /page |
`)
  write('docs/page.md', '# Page\n[FACT:missing-run]\n')
  const missingRun = run('facts-check.mjs', [], { env: { ...process.env, FACTS_AS_OF: '2026-08-20' } })
  if (missingRun.status === 0 || !missingRun.stderr.includes('requires an Experiment ref')) {
    throw new Error('fact checker did not reject E1 without a result reference')
  }

  console.log('Repository checker negative tests passed: secret, license, scoped workflow, mutable-image, fact-age and experiment-reference canaries were rejected.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
