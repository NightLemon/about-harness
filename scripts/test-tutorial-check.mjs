import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const root = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-tutorial-'))
try {
  fs.mkdirSync(path.join(temp, 'examples'))
  fs.writeFileSync(path.join(temp, 'page.md'), '# Any title\n\nNo mandated Chinese phrasing.\n')
  fs.writeFileSync(path.join(temp, 'input.json'), '{}')
  fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ engines: { node: '>=22' }, scripts: { demo: 'node demo.mjs' } }))
  const good = { page: 'page.md', environment: 'page.md', command: 'demo', kind: 'offline', inputs: ['input.json'],
    assertions: ['result matches input'], failure: 'bad input rejected', cleanup: 'temporary resources', rollback: 'restore candidate', limits: 'fixture only' }
  function run(item) {
    fs.writeFileSync(path.join(temp, 'examples/tutorials.json'), JSON.stringify({ schema_version: '1.0', tutorials: [item] }))
    return spawnSync(process.execPath, [path.join(root, 'scripts/tutorial-check.mjs'), temp], { encoding: 'utf8' })
  }
  assert.equal(run(good).status, 0)
  for (const [override, expected] of [
    [{ inputs: ['absent.json'] }, /missing input/], [{ command: 'absent' }, /unknown npm/],
    [{ environment: '../outside' }, /environment/], [{ assertions: [] }, /assertion/],
    [{ rollback: '' }, /rollback/], [{ kind: 'implicit-live' }, /execution kind/]
  ]) {
    const result = run({ ...good, ...override })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, expected)
  }
  console.log('Tutorial self-test passed: broken references and missing contracts fail; arbitrary prose and titles are allowed.')
} finally {
  const resolved = fs.realpathSync(temp)
  if (!resolved.startsWith(fs.realpathSync(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('about-harness-tutorial-')) throw new Error('Invalid cleanup path')
  fs.rmSync(resolved, { recursive: true, force: true })
}
