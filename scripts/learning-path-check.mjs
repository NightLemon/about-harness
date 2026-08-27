import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.')
const errors = []

function read(rel) {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) {
    errors.push(`missing ${rel}`)
    return ''
  }
  return fs.readFileSync(file, 'utf8')
}

const start = read('docs/guide/start.md')
const prerequisites = read('docs/guide/prerequisites.md')
const portfolio = read('docs/guide/portfolio.md')

for (const route of [
  '/models/adaptation', '/models/protocol-compatibility', '/harnesses/comparison',
  '/optimization/prompting', '/optimization/experiment', '/optimization/debugging',
  '/evaluation/method', '/evaluation/metrics', '/labs/setup', '/labs/runner', '/labs/migration'
]) {
  if (!start.includes(`](${route})`)) errors.push(`learning path does not link formal route: ${route}`)
}

if (/\]\(\/practice\//.test(start)) errors.push('learning path still promotes a legacy /practice/ route')
if (/后续(?:阶段|里程碑).{0,20}(?:会|将)(?:迁移|提供|补齐)/.test(`${start}\n${prerequisites}`)) {
  errors.push('learning entrypoints contain a stale future-milestone placeholder')
}

for (const marker of ['Node.js 22', 'Python 3.11+', 'uv 0.11.16', 'Docker Compose', 'npm run verify']) {
  if (!prerequisites.includes(marker)) errors.push(`prerequisites missing environment marker: ${marker}`)
}

for (const marker of ['0 分', '50 分', '75 分', '100 分', '加权总分', '原始分低于 60']) {
  if (!portfolio.includes(marker)) errors.push(`portfolio rubric missing scoring anchor: ${marker}`)
}

if (errors.length) {
  console.error(`Learning-path check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Learning-path check passed: formal routes, current environments, and scoring anchors are complete.')
