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

const compatibility = read('docs/references/compatibility.md')
const comparison = read('docs/harnesses/comparison.md')
const codex = read('docs/harnesses/codex.md')
const registry = read('docs/references/fact-registry.md')

for (const marker of ['Source fact', 'Offline seam', 'Live evidence']) {
  if (!compatibility.includes(marker)) errors.push(`compatibility matrix missing evidence axis: ${marker}`)
}

for (const marker of [
  'E1 离线职责接缝',
  '未安装上游包',
  'OpenAI Agents SDK',
  'Google ADK',
  'AutoGen',
  'Browser Use',
  'PydanticAI',
  'LlamaIndex'
]) {
  if (!compatibility.includes(marker)) errors.push(`compatibility matrix missing current object status: ${marker}`)
}

if (/后续(?:阶段|里程碑).{0,20}(?:补齐|完成)/.test(compatibility)) {
  errors.push('compatibility matrix still contains a stale future-work placeholder')
}

for (const marker of ['技术隔离', '询问授权', '网络', '证据轴']) {
  if (!comparison.includes(marker)) errors.push(`harness comparison missing responsibility gap: ${marker}`)
}

for (const marker of ['sandbox 限制技术可达范围', 'FACT:codex-sandbox-approval']) {
  if (!codex.includes(marker)) errors.push(`Codex guide missing independent control: ${marker}`)
}

if (!registry.includes('| codex-sandbox-approval |')) {
  errors.push('fact registry missing codex-sandbox-approval')
}

if (errors.length) {
  console.error(`Compatibility check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Compatibility check passed: source, offline-seam, live, and control-layer evidence are separated.')
