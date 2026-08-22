import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-ts-runtime-'))
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')

try {
  const compile = spawnSync(process.execPath, [tsc, '-p', 'lab/ts/tsconfig.json', '--noEmit', 'false', '--outDir', temp], {
    cwd: root,
    encoding: 'utf8'
  })
  if (compile.status !== 0) {
    process.stderr.write(compile.stdout)
    process.stderr.write(compile.stderr)
    process.exit(compile.status ?? 1)
  }
  const test = spawnSync(process.execPath, [path.join(temp, 'runtime-test.js')], { cwd: root, encoding: 'utf8' })
  process.stdout.write(test.stdout)
  process.stderr.write(test.stderr)
  if (test.status !== 0) process.exit(test.status ?? 1)
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
