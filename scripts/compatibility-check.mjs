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

for (const marker of ['Source fact', 'Local surface', 'Project seam', 'Live evidence']) {
  if (!compatibility.includes(marker)) errors.push(`compatibility matrix missing evidence axis: ${marker}`)
}

for (const marker of [
  'M5 offline seam E1',
  'upstream package 未安装',
  'OpenAI Agents SDK',
  'Google ADK',
  'AutoGen',
  'Browser Use',
  'PydanticAI',
  'LlamaIndex'
]) {
  if (!compatibility.includes(marker)) errors.push(`compatibility matrix missing current object status: ${marker}`)
}

if (/待 M5|M5 集成待完成/.test(compatibility)) {
  errors.push('compatibility matrix still contains a stale M5 placeholder')
}

for (const marker of ['Sandbox', 'Approval/permission', 'Network', 'evidence axis']) {
  if (!comparison.includes(marker)) errors.push(`harness comparison missing responsibility gap: ${marker}`)
}

for (const marker of ['Sandbox、Approval 与 Network', 'FACT:codex-sandbox-approval']) {
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

console.log('Compatibility check passed: source, local, seam, live, and control-layer evidence are separated.')
