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

const openai = read('docs/models/openai.md')
const protocol = read('docs/models/protocol-compatibility.md')
const reasoning = read('docs/models/reasoning-budget.md')
const registry = read('docs/references/fact-registry.md')

for (const marker of [
  'API model 与 Codex surface',
  'call_id',
  'previous_response_id',
  'reasoning items',
  'openai-function-calling',
  'openai-reasoning-items',
  'openai-reasoning-effort'
]) {
  if (!openai.includes(marker)) errors.push(`OpenAI model guide missing protocol marker: ${marker}`)
}

for (const marker of ['状态载体', 'opaque', 'previous_response_id', '完整 output items']) {
  if (!protocol.includes(marker)) errors.push(`compatibility guide missing state probe: ${marker}`)
}

for (const marker of ['model ID', '协议错误', '有效值', '静默忽略']) {
  if (!reasoning.includes(marker)) errors.push(`reasoning guide missing model-dependent control: ${marker}`)
}

for (const id of ['openai-function-calling', 'openai-reasoning-items', 'openai-reasoning-effort']) {
  if (!registry.includes(`| ${id} |`)) errors.push(`fact registry missing ${id}`)
}

if (errors.length) {
  console.error(`Model-protocol check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Model-protocol check passed: surface identity, tool flow, reasoning state, effort controls, and facts are explicit.')
