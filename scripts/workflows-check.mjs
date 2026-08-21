import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.')
const workflowDir = path.join(root, '.github', 'workflows')
const errors = []
const required = ['ci.yml', 'deploy.yml', 'facts.yml']

function parsePermissionBlocks(text, workflowName) {
  const lines = text.split(/\r?\n/)
  const jobAtLine = []
  let jobsIndent = null
  let currentJob = null

  for (const [index, raw] of lines.entries()) {
    const line = raw.replace(/\s+#.*$/, '')
    if (!line.trim()) continue
    const indent = line.match(/^\s*/)[0].length
    if (/^jobs:\s*$/.test(line)) {
      jobsIndent = indent
      currentJob = null
      continue
    }
    if (jobsIndent !== null && indent <= jobsIndent) {
      jobsIndent = null
      currentJob = null
    }
    if (jobsIndent !== null && indent === jobsIndent + 2) {
      const job = line.trim().match(/^([A-Za-z0-9_-]+):\s*$/)
      if (job) currentJob = job[1]
    }
    if (jobsIndent !== null && indent > jobsIndent) jobAtLine[index] = currentJob
  }

  const blocks = []
  for (const [index, raw] of lines.entries()) {
    const withoutComment = raw.replace(/\s+#.*$/, '')
    const match = withoutComment.match(/^(\s*)permissions:\s*(.*?)\s*$/)
    if (!match) continue
    const indent = match[1].length
    const job = indent === 0 ? null : jobAtLine[index]
    const scope = indent === 0 ? 'workflow' : job ? `job ${job}` : 'unknown'
    const entries = new Map()
    const inline = match[2]
    if (inline) {
      blocks.push({ scope, job, inline, entries })
      continue
    }
    for (let child = index + 1; child < lines.length; child += 1) {
      const childLine = lines[child].replace(/\s+#.*$/, '')
      if (!childLine.trim()) continue
      const childIndent = childLine.match(/^\s*/)[0].length
      if (childIndent <= indent) break
      const entry = childLine.trim().match(/^([A-Za-z0-9-]+):\s*([A-Za-z-]+)\s*$/)
      if (entry) entries.set(entry[1], entry[2])
    }
    blocks.push({ scope, job, inline: null, entries })
  }

  for (const block of blocks) {
    if (block.scope === 'unknown') errors.push(`${workflowName}: permissions block has an unsupported scope`)
    if (block.inline) errors.push(`${workflowName}: ${block.scope} permissions must use an explicit mapping, not ${block.inline}`)
  }
  return blocks
}

function checkPermissionScopes(text, workflowName) {
  const blocks = parsePermissionBlocks(text, workflowName)
  const workflowBlocks = blocks.filter((block) => block.scope === 'workflow')
  if (workflowBlocks.length !== 1) {
    errors.push(`${workflowName}: expected exactly one workflow-level permissions block`)
  } else {
    const entries = workflowBlocks[0].entries
    if (entries.get('contents') !== 'read') errors.push(`${workflowName}: workflow permissions must set contents: read`)
    for (const [permission, access] of entries) {
      if (permission !== 'contents' && access !== 'none') {
        errors.push(`${workflowName}: workflow scope must not grant ${permission}: ${access}`)
      }
      if (access === 'write') errors.push(`${workflowName}: workflow scope must not grant write permission ${permission}`)
    }
  }

  for (const block of blocks.filter((item) => item.job)) {
    for (const [permission, access] of block.entries) {
      const allowedDeployWrite = workflowName === 'deploy.yml' && block.job === 'deploy' &&
        ['pages', 'id-token'].includes(permission) && access === 'write'
      if (access === 'write' && !allowedDeployWrite) {
        errors.push(`${workflowName}: job ${block.job} has forbidden write permission ${permission}`)
      }
      if (['pages', 'id-token'].includes(permission) && access !== 'none' && !allowedDeployWrite) {
        errors.push(`${workflowName}: ${permission} is only allowed as write on the deploy job`)
      }
    }
  }

  if (workflowName === 'deploy.yml') {
    const deployBlocks = blocks.filter((block) => block.job === 'deploy')
    if (deployBlocks.length !== 1 || deployBlocks[0].entries.get('pages') !== 'write' ||
        deployBlocks[0].entries.get('id-token') !== 'write') {
      errors.push('deploy.yml: deploy job must exclusively receive pages: write and id-token: write')
    } else {
      for (const [permission, access] of deployBlocks[0].entries) {
        if (!['pages', 'id-token'].includes(permission) && access !== 'none') {
          errors.push(`deploy.yml: deploy job has unnecessary permission ${permission}: ${access}`)
        }
      }
    }
  }
}

function checkContainerPins() {
  const dockerfile = path.join(root, 'Dockerfile')
  if (!fs.existsSync(dockerfile)) {
    errors.push('missing Dockerfile')
    return
  }
  const text = fs.readFileSync(dockerfile, 'utf8')
  const images = [...text.matchAll(/^\s*FROM(?:\s+--platform=\S+)?\s+([^\s]+)(?:\s+AS\s+\S+)?\s*$/gim)].map((match) => match[1])
  if (!images.length) errors.push('Dockerfile: no FROM image found')
  for (const image of images) {
    if (image.toLowerCase() !== 'scratch' && !/@sha256:[0-9a-f]{64}$/i.test(image)) {
      errors.push(`Dockerfile: mutable container image is forbidden: ${image}`)
    }
  }
}

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
    checkPermissionScopes(text, name)
  }

  checkContainerPins()

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

console.log('Workflow check passed: required workflows use scoped least privilege and full action/image pins.')
