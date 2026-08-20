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
const forbiddenKeys = new Set(['raw_trace', 'raw_prompt', 'credential', 'authorization'])

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

function inspectKeys(value, location, findings) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectKeys(item, `${location}[${index}]`, findings))
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKeys.has(key.toLowerCase())) findings.push(`${location}: forbidden key ${key}`)
      inspectKeys(item, `${location}.${key}`, findings)
    }
  }
}

const files = walk(root).filter((file) => file.endsWith('.json'))
const findings = []
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  let value
  try { value = JSON.parse(text) } catch (error) {
    findings.push(`${file}: invalid JSON: ${error.message}`)
    continue
  }
  inspectKeys(value, file, findings)
  for (const rule of forbidden) {
    if (rule.pattern.test(text)) findings.push(`${file}: ${rule.name}`)
  }
}

if (findings.length) {
  console.error(['Public result redaction failed:', ...findings].join('\n'))
  process.exit(1)
}
console.log(`Public result redaction passed: ${files.length} JSON file(s).`)
