import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.')
const docsRoot = path.join(root, 'docs')
const errors = []

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['.vitepress', 'public'].includes(entry.name)) return []
      return walk(full)
    }
    return entry.name.endsWith('.md') ? [full] : []
  })
}

function cleanProse(text) {
  return text
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<!--?[\s\S]*?-->/g, '')
}

const files = walk(docsRoot)
for (const file of files) {
  const rel = path.relative(root, file).replaceAll('\\', '/')
  const text = fs.readFileSync(file, 'utf8')
  const prose = cleanProse(text)
  const isHome = /^---[\s\S]*?layout:\s*home[\s\S]*?---/.test(text)
  const characters = prose.replace(/\s/g, '').length

  if (!isHome && characters < 600) errors.push(`${rel}: thin page has ${characters} prose characters; expected at least 600`)
  if (!isHome && !/\[[^\]]+\]\((?:\/|https:\/\/)/.test(prose)) {
    errors.push(`${rel}: page has no source or next-step learning link`)
  }
  for (const [label, pattern] of [
    ['internal milestone', /\b[MA]\d+\b/i],
    ['internal goal state', /\bcurrent\s+goal\b/i],
    ['release snapshot', /\b(?:release candidate|RC\d+)\b/i],
    ['removed review/meta route', /(?:\/reviews\/|\/meta\/|docs\/reviews|docs\/meta)/i],
    ['removed artifact path', /(?:^|[\s(])artifacts\//im],
    ['execution plan', /EXECUTION_PLAN/]
  ]) if (pattern.test(prose)) errors.push(`${rel}: contains ${label}`)
  if (text.includes('\uFFFD')) errors.push(`${rel}: contains a Unicode replacement character`)
}

for (const dir of ['foundations', 'domains', 'optimization', 'security', 'implementation', 'evaluation', 'practice']) {
  for (const file of files.filter((item) => item.startsWith(path.join(docsRoot, dir) + path.sep))) {
    const rel = path.relative(root, file).replaceAll('\\', '/')
    const prose = cleanProse(fs.readFileSync(file, 'utf8'))
    const signals = [
      /用途|目标|适合|为什么|工作流|方法/,
      /心智|模型|机制|架构|流程|状态|责任/,
      /例|场景|案例|模板/,
      /失败|风险|反模式|限制|诊断/,
      /下一步|自检|检查题|检查与|继续|先读|再读/
    ].filter((pattern) => pattern.test(prose)).length
    if (signals < 4) errors.push(`${rel}: concept page contract has only ${signals}/5 signals`)
  }
}

const tutorials = [
  'docs/harnesses/codex.md', 'docs/harnesses/pi.md', 'docs/harnesses/claude-code.md',
  'docs/labs/coding.md', 'docs/labs/browser.md', 'docs/labs/research.md',
  'docs/labs/data.md', 'docs/labs/document.md', 'docs/labs/migration.md'
]
for (const rel of tutorials) {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) {
    errors.push(`missing tutorial: ${rel}`)
    continue
  }
  const prose = fs.readFileSync(file, 'utf8')
  for (const marker of ['前置', '版本', '输入', '运行', '预期', '断言', '失败', '清理', '回滚', '限制']) {
    if (!prose.includes(marker)) errors.push(`${rel}: tutorial contract missing ${marker}`)
  }
}

const products = [
  'docs/models/openai.md', 'docs/models/anthropic.md', 'docs/models/google.md',
  'docs/models/qwen.md', 'docs/models/deepseek.md', 'docs/models/llama.md',
  'docs/harnesses/codex.md', 'docs/harnesses/pi.md', 'docs/harnesses/claude-code.md',
  'docs/frameworks/langgraph.md', 'docs/frameworks/openai-agents-sdk.md',
  'docs/frameworks/google-adk.md', 'docs/frameworks/autogen.md'
]
for (const rel of products) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8')
  if (!/https:\/\//.test(text) || !/20\d{2}-\d{2}-\d{2}/.test(text)) errors.push(`${rel}: product page lacks source URL or checked date`)
  if (!/E[0-3]|证据边界|当前证据/.test(text)) errors.push(`${rel}: product page lacks an evidence boundary`)
}

for (const [rel, pattern, label] of [
  ['docs/foundations/what-is-harness.md', /harness.{0,30}(?:是|指)/i, 'harness'],
  ['docs/security/prompt-injection.md', /Prompt injection 是/i, 'Prompt injection'],
  ['docs/evaluation/judges.md', /Judge.{0,30}(?:是|指|用于)/i, 'Judge'],
  ['docs/implementation/adapter-contract.md', /Adapter.{0,30}(?:是|指|负责)/i, 'Adapter']
]) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8')
  if (!pattern.test(text)) errors.push(`${rel}: first use does not define ${label}`)
}

const configPath = path.join(docsRoot, '.vitepress', 'config.mts')
if (!fs.existsSync(configPath)) errors.push('missing VitePress config')
else {
  const config = fs.readFileSync(configPath, 'utf8')
  for (const prefix of ['guide','foundations','models','optimization','frameworks','domains','security','implementation','harnesses','labs','evaluation','practice','references']) {
    const count = [...config.matchAll(new RegExp(`link: '/${prefix}/`, 'g'))].length
    if (count > 15) errors.push(`sidebar/navigation prefix /${prefix}/ has ${count} links; maximum is 15`)
  }
}

for (const rel of ['artifacts', 'docs/reviews', 'docs/meta', 'EXECUTION_PLAN.md']) {
  if (fs.existsSync(path.join(root, rel))) errors.push(`removed development material still exists: ${rel}`)
}
for (const rel of [
  'scripts/reviews-check.mjs', 'scripts/release-check.mjs', 'scripts/publication-check.mjs',
  'lab/schemas/release-candidate.schema.json', 'lab/schemas/publication-result.schema.json'
]) if (fs.existsSync(path.join(root, rel))) errors.push(`obsolete development gate still exists: ${rel}`)

if (errors.length) {
  console.error(`Content check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
console.log(`Content check passed: ${files.length} learning pages satisfy length, links, page contracts, terminology, navigation and cleanup gates.`)
