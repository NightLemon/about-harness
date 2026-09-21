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
  const contracts = JSON.parse(fs.readFileSync(path.join(root, 'scripts/tutorial-contracts.json'), 'utf8'))
  if (contracts.schema_version !== 1 || !Array.isArray(contracts.contracts) || !contracts.contracts.length) throw new Error('invalid tutorial command contracts')
  for (const contract of contracts.contracts) {
    if (!exists(contract.page) || typeof contract.command !== 'string' || !contract.command.trim() || !Array.isArray(contract.references) || !contract.references.length) {
      errors.push('tutorial command contracts: malformed contract')
      continue
    }
    const page = fs.readFileSync(path.join(root, contract.page), 'utf8')
    if (!page.includes(contract.command)) errors.push(`tutorial command contracts: ${contract.page} is missing exact command ${contract.command}`)
    for (const match of contract.command.matchAll(/\bnpm run ([\w:-]+)/g)) {
      if (!pkg.scripts?.[match[1]]) errors.push(`tutorial command contracts: unknown npm command ${match[1]}`)
    }
    for (const reference of contract.references) {
      if (!exists(reference)) errors.push(`tutorial command contracts: missing reference ${reference}`)
    }
  }
  if (pkg.engines?.node !== '>=22') errors.push('Node runtime baseline must remain >=22')
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
  if (lock.packages?.['']?.engines?.node !== pkg.engines?.node) errors.push('Node runtime baseline: package-lock disagrees with package.json')
  for (const name of ['ci', 'deploy', 'facts']) {
    const workflow = fs.readFileSync(path.join(root, `.github/workflows/${name}.yml`), 'utf8')
    const versions = [...workflow.matchAll(/^\s*node-version:\s*['"]?([^'"\s#]+)['"]?\s*(?:#.*)?$/gm)].map(match => match[1])
    if (!versions.length || versions.some(version => version !== '22')) errors.push(`Node runtime baseline: ${name} workflow must use Node 22`)
  }
  // Validate the repository's explicit shared Compose template; do not infer
  // isolation from prose or accept service-level overrides of these controls.
  const compose = fs.readFileSync(path.join(root, 'compose.yaml'), 'utf8').replace(/\s+#.*$/gm, '')
  const base = compose.match(/^x-lab-base: &lab-base\s*\r?\n([\s\S]*?)(?=^services:)/m)?.[1] || ''
  for (const [label, pattern] of [
    ['network_mode', /^  network_mode: none\s*$/m],
    ['read_only', /^  read_only: true\s*$/m],
    ['cap_drop', /^  cap_drop:\s*\r?\n    - ALL\s*$/m],
    ['no-new-privileges', /^  security_opt:\s*\r?\n    - no-new-privileges:true\s*$/m]
  ]) if (!pattern.test(base)) errors.push(`Compose shared isolation contract: ${label}`)
  for (const name of ['lab-smoke', 'labs-all']) {
    const service = compose.match(new RegExp(`^  ${name}:\\s*\\r?\\n([\\s\\S]*?)(?=^  [\\w-]+:|$(?![\\s\\S]))`, 'm'))?.[1] || ''
    if (!/^    <<: \*lab-base\s*$/m.test(service) || /^    (?:network_mode|read_only|cap_drop|security_opt|privileged|cap_add):/m.test(service)) errors.push(`Compose service isolation contract: ${name}`)
  }
} catch (error) { errors.push(error.message) }
if (errors.length) {
  console.error('Tutorial reference check failed:\n' + errors.map(error => '- ' + error).join('\n'))
  process.exit(1)
}
console.log('Tutorial reference check passed: pages, commands, inputs, environment and declared verification contracts resolve. Prose quality still requires review.')
