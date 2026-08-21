import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.')
const errors = []

function read(rel) {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) {
    errors.push(`missing ${rel}`)
    return ''
  }
  return fs.readFileSync(file, 'utf8')
}

const setup = read('docs/labs/setup.md')
const runner = read('docs/labs/runner.md')
const dockerfile = read('Dockerfile')
const compose = read('compose.yaml')
const cli = read('scripts/run-labs.py')
const cases = ['coding', 'browser', 'research', 'data', 'document', 'migration']

for (const marker of [
  'docker compose run --rm labs-all',
  'Windows（PowerShell）',
  'macOS / Linux（POSIX shell）',
  'network_mode: none',
  'image digest'
]) {
  if (!setup.includes(marker)) errors.push(`setup missing container/cross-platform contract: ${marker}`)
}

for (const marker of ['--fixtures-root', 'hash mismatch', 'Windows PowerShell', 'macOS / Linux']) {
  if (!runner.includes(marker)) errors.push(`runner tutorial missing executable failure drill: ${marker}`)
}

for (const name of cases) {
  const page = read(`docs/labs/${name}.md`)
  if (!page.includes('/labs/setup')) errors.push(`${name}: missing shared environment fallback`)
  if (!page.includes(`scripts/run-labs.py ${name}`)) errors.push(`${name}: missing exact case command`)
  for (const marker of ['预期', '失败', '清理', '回滚', '已知限制']) {
    if (!page.includes(marker)) errors.push(`${name}: missing tutorial requirement ${marker}`)
  }
}

for (const marker of ['lab/fixtures/', 'scripts/run-labs.py']) {
  if (!dockerfile.includes(marker)) errors.push(`Dockerfile cannot run six fixtures: ${marker}`)
}
for (const marker of ['labs-all:', 'network_mode: none', 'read_only: true', 'cap_drop:', 'no-new-privileges:true']) {
  if (!compose.includes(marker)) errors.push(`Compose six-lab service missing hardening: ${marker}`)
}
if (!cli.includes('"--fixtures-root"')) errors.push('runner CLI does not expose isolated fixture root')

if (errors.length) {
  console.error(`Tutorial check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Tutorial check passed: six cases have executable failure, container, Windows, and POSIX paths.')
