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
const migration = read('docs/labs/migration.md')
const readme = read('README.md')
const prerequisites = read('docs/guide/prerequisites.md')
const packageText = read('package.json')
const packageLockText = read('package-lock.json')
const workflows = ['ci', 'deploy', 'facts'].map((name) => [name, read(`.github/workflows/${name}.yml`)])
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

let packageJson = {}
let packageLock = {}
try {
  packageJson = JSON.parse(packageText)
} catch {
  errors.push('Node runtime baseline: package.json is invalid JSON')
}
try {
  packageLock = JSON.parse(packageLockText)
} catch {
  errors.push('Node runtime baseline: package-lock.json is invalid JSON')
}
if (packageJson.engines?.node !== '>=22') errors.push('Node runtime baseline: package.json engines.node must be >=22')
if (packageLock.packages?.['']?.engines?.node !== '>=22') errors.push('Node runtime baseline: package-lock root engines.node must be >=22')
for (const [label, body] of [['README', readme], ['prerequisites', prerequisites], ['lab setup', setup]]) {
  if (!body.includes('Node.js 22+')) errors.push(`Node runtime baseline: ${label} must state Node.js 22+`)
}
if (!setup.includes('Node.js 22 为最低发布基线') || /Node(?:\.js)? 24/.test(setup)) {
  errors.push('Node runtime baseline: lab setup must distinguish Node.js 22 CI baseline from the recorded local runtime')
}
for (const [name, body] of workflows) {
  if (!/node-version:\s*22(?:\s|$)/m.test(body)) errors.push(`Node runtime baseline: ${name} workflow must use Node 22`)
}

for (const marker of [
  'Codex 分别映射到 Pi 和 Claude Code',
  'source_semantics',
  'compensating_control',
  'preserves_boundary',
  'mapped_responsibilities=12',
  'domains_checked=5',
  'uncompensated_gaps',
  '浏览器',
  '研究',
  '数据',
  '文档'
]) {
  if (!migration.includes(marker)) errors.push(`migration tutorial missing responsibility contract: ${marker}`)
}

if (errors.length) {
  console.error(`Tutorial check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Tutorial check passed: six cases have executable failure, container, Windows/POSIX paths, and a Node.js 22+ baseline.')
