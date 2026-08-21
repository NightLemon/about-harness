import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sourceRoot = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-tutorial-'))

function write(rel, content) {
  const file = path.join(temp, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

try {
  fs.mkdirSync(path.join(temp, 'docs', 'labs'), { recursive: true })
  fs.mkdirSync(path.join(temp, 'scripts'), { recursive: true })
  for (const name of ['setup', 'runner', 'coding', 'browser', 'research', 'data', 'document', 'migration']) {
    fs.writeFileSync(path.join(temp, 'docs', 'labs', `${name}.md`), `# ${name}\n\nuv run scripts/run-labs.py ${name}\n`)
  }
  fs.writeFileSync(path.join(temp, 'Dockerfile'), 'FROM python:3.12-slim\n')
  fs.writeFileSync(path.join(temp, 'compose.yaml'), 'services: {}\n')
  fs.writeFileSync(path.join(temp, 'scripts', 'run-labs.py'), 'print("hard-coded fixtures")\n')
  write('README.md', '# Wrong runtime\n\nNode.js 24 only\n')
  write('docs/guide/prerequisites.md', '# Wrong runtime\n\nNode.js 24\n')
  write('package.json', JSON.stringify({ engines: { node: '>=24' } }))
  write('package-lock.json', JSON.stringify({ packages: { '': { engines: { node: '>=24' } } } }))
  for (const name of ['ci', 'deploy', 'facts']) write(`.github/workflows/${name}.yml`, 'node-version: 24\n')

  const result = spawnSync(
    process.execPath,
    [path.join(sourceRoot, 'scripts', 'tutorial-check.mjs'), temp],
    { encoding: 'utf8' }
  )
  for (const expected of ['container/cross-platform', 'failure drill', 'shared environment', 'Dockerfile', 'Compose', 'isolated fixture', 'Node runtime baseline', 'migration tutorial missing responsibility contract']) {
    if (!result.stderr.includes(expected)) throw new Error(`tutorial checker missed canary: ${expected}`)
  }
  if (result.status === 0) throw new Error('tutorial checker accepted non-reproducible tutorials')
  console.log('Tutorial checker negative test passed: missing platform, fixture, container, and Node runtime contracts were rejected.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
