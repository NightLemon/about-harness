import fs from 'node:fs'
import path from 'node:path'
const root = path.resolve(process.argv[2] || '.')
const errors = []
function exists(relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative)) return false
  const resolved = path.resolve(root, relative)
  return !path.relative(root, resolved).startsWith('..') && fs.existsSync(resolved)
}
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'examples/tutorials.json'), 'utf8'))
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  if (manifest.schema_version !== '1.0' || !Array.isArray(manifest.tutorials) || !manifest.tutorials.length) throw new Error('invalid tutorial registry')
  const pages = new Set()
  for (const item of manifest.tutorials) {
    if (pages.has(item.page) || !exists(item.page)) errors.push(`invalid or duplicate tutorial page: ${item.page}`)
    pages.add(item.page)
    if (!exists(item.environment)) errors.push(`${item.page}: missing environment reference`)
    if (!pkg.scripts?.[item.command]) errors.push(`${item.page}: unknown npm command ${item.command}`)
    if (!['offline', 'live-opt-in'].includes(item.kind)) errors.push(`${item.page}: invalid execution kind`)
    if (!Array.isArray(item.inputs) || !item.inputs.length || item.inputs.some(input => !exists(input))) errors.push(`${item.page}: missing input reference`)
    if (!Array.isArray(item.assertions) || !item.assertions.length || item.assertions.some(value => typeof value !== 'string' || !value.trim())) errors.push(`${item.page}: missing assertion contract`)
    for (const field of ['failure', 'cleanup', 'rollback', 'limits']) {
      if (typeof item[field] !== 'string' || !item[field].trim()) errors.push(`${item.page}: missing ${field} contract`)
    }
  }
  if (pkg.engines?.node !== '>=22') errors.push('Node runtime baseline must remain >=22')
} catch (error) { errors.push(error.message) }
if (errors.length) {
  console.error('Tutorial reference check failed:\n' + errors.map(error => '- ' + error).join('\n'))
  process.exit(1)
}
console.log('Tutorial reference check passed: pages, commands, inputs, environment and declared verification contracts resolve. Prose quality still requires review.')
