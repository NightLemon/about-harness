import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const names = ['langgraph', 'openai-agents-sdk', 'google-adk', 'autogen']
const requested = process.argv[2]
if (requested && !names.includes(requested)) throw new Error('Unknown framework')
const summaries = []
for (const name of requested ? [requested] : names) {
  const project = `examples/frameworks/${name}`
  for (const failure of [false, true]) {
    const args = ['run', '--project', project, '--frozen', '--offline', 'python', '-B', `${project}/demo.py`,
      ...(failure ? ['--inject-failure'] : [])]
    const run = spawnSync('uv', args, { encoding: 'utf8', timeout: 180000 })
    if (run.error) throw run.error
    if (failure) {
      if (run.status === 0 || !run.stderr.includes('framework result, tool execution or offline boundary failed')) {
        throw new Error(`${name}: negative verifier did not reject the incorrect artifact: ${run.stderr}`)
      }
    } else {
      if (run.status !== 0) throw new Error(`${name}: ${run.stderr}`)
      const summary = JSON.parse(run.stdout.trim().split(/\r?\n/).at(-1))
      if (!summary.passed || summary.evidence !== 'E1' || !summary.offline || summary.external_attempts !== 0) {
        throw new Error(`${name}: invalid execution evidence`)
      }
      summaries.push(summary)
    }
  }
}
const destination = path.resolve('lab/results/local/frameworks')
fs.mkdirSync(destination, { recursive: true })
fs.writeFileSync(path.join(destination, 'summary.json'), JSON.stringify({ evidence: 'E1', examples: summaries }, null, 2) + '\n')
console.log(JSON.stringify({ evidence: 'E1', offline: true, frameworks: summaries, negative_cases: summaries.length }, null, 2))
