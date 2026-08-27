import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sourceRoot = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-learning-'))

try {
  const guide = path.join(temp, 'docs', 'guide')
  fs.mkdirSync(guide, { recursive: true })
  fs.writeFileSync(path.join(guide, 'start.md'), '# Start\n\n[旧实验](/practice/evaluation)\n\n后续里程碑会迁移。\n')
  fs.writeFileSync(path.join(guide, 'prerequisites.md'), '# Prerequisites\n\n后续阶段将提供容器。\n')
  fs.writeFileSync(path.join(guide, 'portfolio.md'), '# Portfolio\n\n总分 80。\n')
  const result = spawnSync(process.execPath, [path.join(sourceRoot, 'scripts', 'learning-path-check.mjs'), temp], {
    encoding: 'utf8'
  })
  for (const expected of ['legacy /practice/', 'future-milestone', 'environment marker', 'scoring anchor']) {
    if (!result.stderr.includes(expected)) throw new Error(`learning-path checker missed canary: ${expected}`)
  }
  if (result.status === 0) throw new Error('learning-path checker accepted an obsolete learning route')
  console.log('Learning-path checker negative test passed: legacy routes, stale milestones, environment gaps, and rubric gaps were rejected.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
