import { spawnSync } from 'node:child_process'

for (const name of ['langgraph', 'openai-agents-sdk', 'google-adk', 'autogen']) {
  const run = spawnSync('uv', ['sync', '--project', `examples/frameworks/${name}`, '--frozen', '--python', '3.12'], { stdio: 'inherit' })
  if (run.error) throw run.error
  if (run.status !== 0) process.exit(run.status ?? 1)
}
console.log('Four isolated, locked framework environments prepared. No model was called.')
