import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sourceRoot = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-m6-'))

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

  for (const name of ['ci.yml', 'deploy.yml', 'facts.yml']) {
    write(`.github/workflows/${name}`, `name: bad\non: [pull_request]\npermissions:\n  contents: read\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n`)
  }
  const workflow = run('workflows-check.mjs', [temp])
  if (workflow.status === 0 || !workflow.stderr.includes('not pinned')) {
    throw new Error('workflow checker did not reject an unpinned action')
  }

  write('docs/references/fact-registry.md', `# Registry

| ID | Claim | Kind | Source | Version | Checked | Volatility | Evidence | Status | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stale-fact | 这是一个需要被过期门禁拒绝的产品事实 | product | https://example.com/ | rolling | 2026-01-01 | high | E1 | verified | /page |
`)
  write('docs/page.md', '# Page\n')
  const facts = run('facts-check.mjs', ['--max-age=30'], { env: { ...process.env, FACTS_AS_OF: '2026-08-20' } })
  if (facts.status === 0 || !facts.stderr.includes('release limit')) {
    throw new Error('fact checker did not reject a stale high-volatility fact')
  }

  console.log('M6 checker negative tests passed: secret, license, workflow and fact-age canaries were rejected.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
