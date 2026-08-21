import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2]
if (!root) {
  console.error('Usage: node scripts/redact-results.mjs <public-results-dir>')
  process.exit(2)
}

const forbidden = [
  { name: 'OpenAI-style key', pattern: /sk-[A-Za-z0-9_-]{8,}/ },
  { name: 'credential assignment', pattern: /(?:api[_-]?key|password|secret|token)\s*[:=]\s*(?!\[REDACTED\])[^\s,;"}]+/i },
  { name: 'Windows user path', pattern: /[A-Za-z]:\\Users\\[^\\\s"}]+/ },
  { name: 'Unix home path', pattern: /\/(?:home|Users)\/[^/\s"}]+/ }
]
const allowedExtensions = new Set(['.json', '.jsonl'])
const forbiddenKeys = new Set([
  'rawtrace',
  'rawprompt',
  'credential',
  'authorization',
  'apikey',
  'password',
  'secret',
  'cookie',
  'privatekey'
])

function normalizeKey(key) {
  return key.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()
}

function walk(dir, findings) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isSymbolicLink()) {
      findings.push(`${full}: symbolic links are not allowed in public results`)
      return []
    }
    if (entry.isDirectory()) return walk(full, findings)
    if (entry.isFile()) return [full]
    findings.push(`${full}: unsupported non-regular public artifact`)
    return []
  })
}

function inspectKeys(value, location, findings) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectKeys(item, `${location}[${index}]`, findings))
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKeys.has(normalizeKey(key))) findings.push(`${location}: forbidden key ${key}`)
      inspectKeys(item, `${location}.${key}`, findings)
    }
  }
}

const findings = []
if (!fs.existsSync(root) || fs.lstatSync(root).isSymbolicLink() || !fs.lstatSync(root).isDirectory()) {
  console.error(`Public result redaction failed:\n${root}: expected a real public results directory (not a file or symbolic link)`)
  process.exit(1)
}

const files = walk(root, findings).sort((left, right) => left.localeCompare(right))
for (const file of files) {
  const extension = path.extname(file).toLowerCase()
  if (!allowedExtensions.has(extension)) {
    findings.push(`${file}: unsupported public artifact format ${extension || '<none>'}; only .json and .jsonl are allowed`)
    continue
  }

  const text = fs.readFileSync(file, 'utf8')
  if (extension === '.json') {
    try {
      inspectKeys(JSON.parse(text), file, findings)
    } catch (error) {
      findings.push(`${file}: invalid JSON: ${error.message}`)
    }
  } else {
    const lines = text.split(/\r?\n/)
    for (const [index, line] of lines.entries()) {
      if (!line.trim()) continue
      const location = `${file}:${index + 1}`
      try {
        inspectKeys(JSON.parse(line), location, findings)
      } catch (error) {
        findings.push(`${location}: invalid JSONL record: ${error.message}`)
      }
    }
  }

  for (const rule of forbidden) {
    if (rule.pattern.test(text)) findings.push(`${file}: ${rule.name}`)
  }
}

if (findings.length) {
  console.error(['Public result redaction failed:', ...findings].join('\n'))
  process.exit(1)
}
console.log(`Public result redaction passed: ${files.length} JSON/JSONL file(s).`)
