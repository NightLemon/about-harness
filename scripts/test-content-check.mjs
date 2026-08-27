import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const sourceRoot = process.cwd()
const checker = path.join(sourceRoot, 'scripts', 'content-check.mjs')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-content-negative-'))

try {
  fs.cpSync(path.join(sourceRoot, 'docs'), path.join(temp, 'docs'), { recursive: true })
  const target = path.join(temp, 'docs', 'domains', 'coding.md')
  fs.writeFileSync(target, '# Coding Agent\n\nM7 后再补。\n')
  const result = spawnSync(process.execPath, [checker, temp], { encoding: 'utf8' })
  const output = `${result.stdout}${result.stderr}`
  for (const marker of ['thin page', 'no source or next-step', 'internal milestone', 'concept page contract']) {
    if (!output.includes(marker)) throw new Error(`content checker missed negative canary: ${marker}`)
  }
  if (result.status === 0) throw new Error('content checker accepted a thin development placeholder')
  console.log('Content checker negative test passed: thin, unlinked, milestone placeholder content was rejected.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
