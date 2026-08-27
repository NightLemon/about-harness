import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const sourceRoot = process.cwd()
const checker = path.join(sourceRoot, 'scripts', 'examples-check.mjs')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-examples-negative-'))

function run() {
  return spawnSync(process.execPath, [checker, temp], { encoding: 'utf8' })
}
try {
  fs.cpSync(path.join(sourceRoot, 'examples'), path.join(temp, 'examples'), { recursive: true })

  const codexReadme = path.join(temp, 'examples', 'harnesses', 'codex', 'README.md')
  fs.writeFileSync(codexReadme, fs.readFileSync(codexReadme, 'utf8').replace('## 回滚', '## 撤销说明'))
  let result = run()
  if (result.status === 0 || !result.stderr.includes('missing tutorial section 回滚')) {
    throw new Error('examples checker accepted a tutorial without rollback')
  }

  fs.rmSync(path.join(temp, 'examples'), { recursive: true, force: true })
  fs.cpSync(path.join(sourceRoot, 'examples'), path.join(temp, 'examples'), { recursive: true })
  const piSettings = path.join(temp, 'examples', 'harnesses', 'pi', '.pi', 'settings.json')
  const parsed = JSON.parse(fs.readFileSync(piSettings, 'utf8'))
  parsed.apiKey = 'synthetic-canary-not-a-real-key'
  fs.writeFileSync(piSettings, JSON.stringify(parsed))
  result = run()
  if (result.status === 0 || !result.stderr.includes('credential-shaped key')) {
    throw new Error('examples checker accepted a credential-shaped setting')
  }

  fs.rmSync(path.join(temp, 'examples'), { recursive: true, force: true })
  fs.cpSync(path.join(sourceRoot, 'examples'), path.join(temp, 'examples'), { recursive: true })
  const claudeSettings = path.join(temp, 'examples', 'harnesses', 'claude-code', '.claude', 'settings.json')
  const claude = JSON.parse(fs.readFileSync(claudeSettings, 'utf8'))
  claude.permissions.allow.push('Bash(*)')
  fs.writeFileSync(claudeSettings, JSON.stringify(claude))
  result = run()
  if (result.status === 0 || !result.stderr.includes('unrestricted shell')) {
    throw new Error('examples checker accepted unrestricted Claude Code shell permission')
  }

  console.log('Harness examples negative tests passed: missing rollback, credential keys, and unrestricted shell permissions were rejected.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
