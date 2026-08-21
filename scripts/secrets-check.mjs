import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const explicitRoot = process.argv[2]
const root = path.resolve(explicitRoot || '.')
const errors = []
const patterns = [
  ['OpenAI-style secret', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/g],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['Slack token', /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['Windows user path', /[A-Za-z]:\\Users\\[^\\\s"'`]+/g],
  ['Unix user path', /\/(?:home|Users)\/[^/\s"'`]+/g]
]

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules', '.venv', 'dist', 'cache'].includes(entry.name)) return []
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

let files
if (explicitRoot) {
  files = walk(root)
} else {
  const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
  files = output.toString('utf8').split('\0').filter(Boolean).map((file) => path.join(root, file))
}

for (const file of files) {
  const rel = path.relative(root, file).replaceAll('\\', '/')
  if (/^\.env(?:\.|$)/.test(path.basename(file)) && !/\.example$/.test(file)) {
    errors.push(`${rel}: tracked environment file is forbidden`)
  }
  const stat = fs.statSync(file)
  if (stat.size > 2_000_000) continue
  const bytes = fs.readFileSync(file)
  if (bytes.includes(0)) continue
  const text = bytes.toString('utf8')
  for (const [name, pattern] of patterns) {
    pattern.lastIndex = 0
    const match = pattern.exec(text)
    if (match) errors.push(`${rel}:${text.slice(0, match.index).split(/\r?\n/).length}: ${name}`)
  }
}

if (errors.length) {
  console.error(`Secret/privacy check failed with ${errors.length} finding(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Secret/privacy check passed: ${files.length} tracked or candidate file(s) scanned.`)
