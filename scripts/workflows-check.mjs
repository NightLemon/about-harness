import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.')
const workflowDir = path.join(root, '.github', 'workflows')
const errors = []
const required = ['ci.yml', 'deploy.yml', 'facts.yml']

for (const name of required) {
  if (!fs.existsSync(path.join(workflowDir, name))) errors.push(`missing workflow ${name}`)
}

if (!errors.length) {
  for (const name of required) {
    const text = fs.readFileSync(path.join(workflowDir, name), 'utf8')
    if (/pull_request_target\s*:/.test(text)) errors.push(`${name}: pull_request_target is forbidden`)
    if (/permissions:\s*write-all/.test(text)) errors.push(`${name}: write-all permission is forbidden`)
    for (const match of text.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)) {
      const reference = match[1]
      if (reference.startsWith('./')) continue
      const suffix = reference.split('@')[1] || ''
      if (!/^[0-9a-f]{40}$/.test(suffix)) errors.push(`${name}: action is not pinned to a full SHA: ${reference}`)
    }
  }

  const ci = fs.readFileSync(path.join(workflowDir, 'ci.yml'), 'utf8')
  if (!/pull_request\s*:/.test(ci) || !ci.includes('npm run verify')) {
    errors.push('ci.yml must run npm run verify for pull requests')
  }
  const deploy = fs.readFileSync(path.join(workflowDir, 'deploy.yml'), 'utf8')
  for (const requiredText of ['pages: write', 'id-token: write', 'npm run verify', 'actions/deploy-pages@']) {
    if (!deploy.includes(requiredText)) errors.push(`deploy.yml missing ${requiredText}`)
  }
  const facts = fs.readFileSync(path.join(workflowDir, 'facts.yml'), 'utf8')
  if (!/schedule\s*:/.test(facts) || !facts.includes('links:check -- --network')) {
    errors.push('facts.yml must schedule the network link/fact refresh')
  }
}

if (errors.length) {
  console.error(`Workflow check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Workflow check passed: required workflows use least privilege and full action SHAs.')
