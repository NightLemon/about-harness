import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.')
const examplesRoot = path.join(root, 'examples', 'harnesses')
const errors = []
const requiredHeadings = [
  '前置条件', '固定版本', '输入', '配置', '验证', '预期输出', '断言',
  '失败案例', '清理', '回滚', '已知限制', '证据边界'
]
const layouts = {
  codex: ['README.md', 'AGENTS.md', '.codex/config.toml'],
  pi: ['README.md', 'AGENTS.md', '.pi/settings.json'],
  'claude-code': ['README.md', 'CLAUDE.md', '.claude/settings.json']
}

function read(rel) {
  const file = path.join(examplesRoot, rel)
  if (!fs.existsSync(file)) {
    errors.push(`missing example file: ${rel}`)
    return ''
  }
  return fs.readFileSync(file, 'utf8')
}

function inspectKeys(value, rel, prefix = '') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectKeys(item, rel, `${prefix}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    const qualified = prefix ? `${prefix}.${key}` : key
    if (/^(?:api.?key|access.?token|auth.?token|password|credential|secret)$/i.test(key)) {
      errors.push(`${rel}: credential-shaped key is forbidden: ${qualified}`)
    }
    inspectKeys(child, rel, qualified)
  }
}

for (const [name, expected] of Object.entries(layouts)) {
  for (const rel of expected) read(path.join(name, rel))
  const readme = read(path.join(name, 'README.md'))
  for (const heading of requiredHeadings) {
    if (!new RegExp(`^## ${heading}(?:\\s|$)`, 'm').test(readme)) {
      errors.push(`${name}: README missing tutorial section ${heading}`)
    }
  }
  if (!readme.includes('npm run examples:check')) errors.push(`${name}: README missing common verification command`)
  if (!/E0/.test(readme) || !/静态/.test(readme)) errors.push(`${name}: README must state the E0 static evidence boundary`)
}

const codexConfig = read(path.join('codex', '.codex', 'config.toml'))
for (const marker of [
  'approval_policy = "on-request"',
  'sandbox_mode = "workspace-write"',
  'network_access = false'
]) if (!codexConfig.includes(marker)) errors.push(`codex config missing safe marker: ${marker}`)
if (/approval_policy\s*=\s*"never"|network_access\s*=\s*true/.test(codexConfig)) {
  errors.push('codex config broadens approval or network access')
}

for (const [name, rel] of [
  ['pi', path.join('pi', '.pi', 'settings.json')],
  ['claude-code', path.join('claude-code', '.claude', 'settings.json')]
]) {
  const text = read(rel)
  try {
    const parsed = JSON.parse(text)
    inspectKeys(parsed, rel)
    if (name === 'pi') {
      if (parsed.defaultProjectTrust !== undefined) errors.push('pi project settings must not set global-only defaultProjectTrust')
      if (parsed.retry?.provider?.maxRetries !== 0) errors.push('pi example must expose provider failures without hidden retries')
      if (parsed.compaction?.enabled !== true) errors.push('pi example must explicitly configure compaction')
    } else {
      const permissions = parsed.permissions || {}
      for (const group of ['allow', 'ask', 'deny']) {
        if (!Array.isArray(permissions[group])) errors.push(`claude-code permissions.${group} must be an array`)
      }
      if (permissions.allow?.some((rule) => rule === 'Bash' || rule === 'Bash(*)')) {
        errors.push('claude-code example must not allow unrestricted shell commands')
      }
      for (const rule of ['WebFetch', 'Bash(git push *)']) {
        if (!permissions.deny?.includes(rule)) errors.push(`claude-code deny list missing ${rule}`)
      }
    }
  } catch (error) {
    errors.push(`${rel}: invalid JSON: ${error.message}`)
  }
}

if (fs.existsSync(examplesRoot)) {
  const stack = [examplesRoot]
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
        continue
      }
      const rel = path.relative(root, full).replaceAll('\\', '/')
      const text = fs.readFileSync(full, 'utf8')
      for (const [label, pattern] of [
        ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
        ['provider token', /\b(?:sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16})\b/],
        ['personal path', /(?:[A-Za-z]:\\Users\\[^\\\s]+|\/Users\/[^/\s]+|\/home\/[^/\s]+)/],
        ['destructive command', /(?:rm\s+-rf|Remove-Item\b|git\s+reset\s+--hard)/i]
      ]) if (pattern.test(text)) errors.push(`${rel}: contains ${label}`)
    }
  }
}

if (errors.length) {
  console.error(`Harness examples check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Harness examples check passed: Codex, Pi and Claude Code have complete E0 tutorials and minimal static configurations.')
