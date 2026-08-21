import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sourceRoot = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-roadmap-'))

try {
  const guide = path.join(temp, 'docs', 'guide')
  fs.mkdirSync(guide, { recursive: true })
  fs.writeFileSync(path.join(guide, 'roadmap.md'), '# Map\n\nM3/M4 会补齐其他页面。\n')
  const result = spawnSync(process.execPath, [path.join(sourceRoot, 'scripts', 'roadmap-check.mjs'), temp], {
    encoding: 'utf8'
  })
  if (result.status === 0 || !result.stderr.includes('stale milestone placeholder')) {
    throw new Error('roadmap checker did not reject stale milestone scaffolding')
  }
  if (!result.stderr.includes('does not link required route')) {
    throw new Error('roadmap checker did not reject missing knowledge-map routes')
  }
  console.log('Roadmap checker negative test passed: stale milestones and missing routes were rejected.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
