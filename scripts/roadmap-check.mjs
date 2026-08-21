import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.')
const roadmapPath = path.join(root, 'docs', 'guide', 'roadmap.md')
const errors = []

if (!fs.existsSync(roadmapPath)) {
  errors.push('missing docs/guide/roadmap.md')
} else {
  const text = fs.readFileSync(roadmapPath, 'utf8')
  const requiredRoutes = [
    '/foundations/what-is-harness', '/references/glossary', '/references/compatibility',
    '/foundations/architecture', '/foundations/agent-loop', '/foundations/context',
    '/foundations/instructions', '/foundations/memory', '/foundations/reasoning',
    '/foundations/tools', '/foundations/protocols', '/foundations/security',
    '/foundations/state-reliability', '/foundations/observability', '/foundations/multi-agent',
    '/foundations/human-control', '/implementation/minimal-harness-python',
    '/implementation/adapter-contract', '/implementation/extensions', '/models/adaptation',
    '/models/protocol-compatibility', '/models/reasoning-budget', '/optimization/experiment',
    '/harnesses/comparison', '/frameworks/comparison', '/domains/coding', '/domains/browser',
    '/domains/research', '/domains/data', '/domains/document', '/labs/setup',
    '/evaluation/method', '/evaluation/task-schema', '/evaluation/metrics',
    '/evaluation/judges', '/evaluation/regression', '/evaluation/reporting',
    '/security/threat-model', '/references/fact-registry',
    '/meta/dependency-security', '/meta/privacy', '/meta/publishing', '/meta/maintenance',
    '/guide/portfolio'
  ]

  for (const route of requiredRoutes) {
    if (!text.includes(`](${route})`)) errors.push(`knowledge map does not link required route: ${route}`)
  }
  const stalePatterns = [
    /M3\/M4\s*会补齐/,
    /将在\s*M3[^\n]*M4/,
    /M4\s*会建立/
  ]
  for (const pattern of stalePatterns) {
    if (pattern.test(text)) errors.push(`knowledge map contains stale milestone placeholder: ${pattern}`)
  }
}

if (errors.length) {
  console.error(`Roadmap check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Roadmap check passed: all approved knowledge-map routes are linked and no stale M3/M4 placeholders remain.')
