import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sourceRoot = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-compatibility-'))

try {
  for (const rel of ['docs/references', 'docs/harnesses']) {
    fs.mkdirSync(path.join(temp, rel), { recursive: true })
  }
  fs.writeFileSync(path.join(temp, 'docs/references/compatibility.md'), '# Matrix\n\n后续阶段会补齐所有集成。\n')
  fs.writeFileSync(path.join(temp, 'docs/harnesses/comparison.md'), '# Compare\n\nPermissions are equivalent.\n')
  fs.writeFileSync(path.join(temp, 'docs/harnesses/codex.md'), '# Codex\n\nApproval makes commands safe.\n')
  fs.writeFileSync(path.join(temp, 'docs/references/fact-registry.md'), '# Facts\n')

  const result = spawnSync(
    process.execPath,
    [path.join(sourceRoot, 'scripts', 'compatibility-check.mjs'), temp],
    { encoding: 'utf8' }
  )
  for (const expected of ['evidence axis', 'current object status', 'future-work', 'responsibility gap', 'independent control', 'fact registry']) {
    if (!result.stderr.includes(expected)) throw new Error(`compatibility checker missed canary: ${expected}`)
  }
  if (result.status === 0) throw new Error('compatibility checker accepted conflated evidence')
  console.log('Compatibility checker negative test passed: future-work placeholders and conflated controls were rejected.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
