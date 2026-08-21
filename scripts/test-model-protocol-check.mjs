import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sourceRoot = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-model-protocol-'))

try {
  const models = path.join(temp, 'docs', 'models')
  const references = path.join(temp, 'docs', 'references')
  fs.mkdirSync(models, { recursive: true })
  fs.mkdirSync(references, { recursive: true })
  fs.writeFileSync(path.join(models, 'openai.md'), '# OpenAI\n\nUse tools and high effort.\n')
  fs.writeFileSync(path.join(models, 'protocol-compatibility.md'), '# Protocol\n\nMessages work.\n')
  fs.writeFileSync(path.join(models, 'reasoning-budget.md'), '# Reasoning\n\nUse low or high.\n')
  fs.writeFileSync(path.join(references, 'fact-registry.md'), '# Facts\n')

  const result = spawnSync(
    process.execPath,
    [path.join(sourceRoot, 'scripts', 'model-protocol-check.mjs'), temp],
    { encoding: 'utf8' }
  )
  for (const expected of ['protocol marker', 'state probe', 'model-dependent control', 'fact registry']) {
    if (!result.stderr.includes(expected)) throw new Error(`model-protocol checker missed canary: ${expected}`)
  }
  if (result.status === 0) throw new Error('model-protocol checker accepted an underspecified guide')
  console.log('Model-protocol checker negative test passed: missing identity, state, effort, and fact evidence were rejected.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
