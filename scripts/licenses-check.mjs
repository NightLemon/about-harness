import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.')
const errors = []
const allowed = new Set([
  'MIT', 'Apache-2.0', 'BSD', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'CC0-1.0',
  'PSF-2.0', 'Apache-2.0 OR BSD-2-Clause'
])

for (const file of ['LICENSE', 'LICENSE-DOCS', 'package-lock.json', 'uv.lock']) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`missing required license input: ${file}`)
}

if (!errors.length) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
  for (const [packagePath, metadata] of Object.entries(lock.packages || {})) {
    if (!packagePath || !metadata.version) continue
    const name = packagePath.split('node_modules/').at(-1)
    if (!allowed.has(metadata.license)) {
      errors.push(`npm ${name}@${metadata.version}: unapproved or missing license ${metadata.license || '<missing>'}`)
    }
  }

  const policyPath = path.join(root, 'scripts', 'python-license-policy.json')
  if (!fs.existsSync(policyPath)) {
    errors.push('missing scripts/python-license-policy.json')
  } else {
    const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'))
    const uvText = fs.readFileSync(path.join(root, 'uv.lock'), 'utf8')
    const packages = [...uvText.matchAll(/\[\[package\]\]\s+name = "([^"]+)"\s+version = "([^"]+)"/g)]
      .map((match) => `${match[1].toLowerCase().replaceAll('_', '-')}@${match[2]}`)
    for (const id of packages) {
      if (!policy[id]) errors.push(`Python ${id}: missing reviewed license entry`)
      else if (!allowed.has(policy[id])) errors.push(`Python ${id}: unapproved license ${policy[id]}`)
    }
    for (const id of Object.keys(policy)) {
      if (!packages.includes(id)) errors.push(`Python policy contains stale package ${id}`)
    }
  }

  const docsLicense = fs.readFileSync(path.join(root, 'LICENSE-DOCS'), 'utf8')
  if (!docsLicense.includes('Creative Commons Attribution 4.0')) {
    errors.push('LICENSE-DOCS must state CC BY 4.0')
  }
}

if (errors.length) {
  console.error(`License check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('License check passed: repository licenses and locked Node/Python dependency policy are compatible.')
