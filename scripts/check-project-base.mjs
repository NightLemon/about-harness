import { spawnSync } from 'node:child_process'

const env = { ...process.env, DOCS_BASE: '/about-harness/' }
const commands = [
  ['scripts/check-docs.mjs'],
  ['node_modules/vitepress/bin/vitepress.js', 'build', 'docs'],
  ['scripts/check-built-site.mjs']
]

for (const args of commands) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('Project-base verification passed for /about-harness/.')
