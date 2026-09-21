import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const root = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-tutorial-'))
try {
  fs.mkdirSync(path.join(temp, 'examples'))
  fs.mkdirSync(path.join(temp, 'scripts'))
  const pageText = '# Any title\n\nNo mandated Chinese phrasing.\n\n```sh\nnpm run demo\n```\n'
  fs.writeFileSync(path.join(temp, 'page.md'), pageText)
  const commandContract = { page: 'page.md', command: 'npm run demo', references: ['input.json'] }
  const writeContracts = (contract = commandContract) => fs.writeFileSync(path.join(temp, 'scripts/tutorial-contracts.json'), JSON.stringify({ schema_version: 1, contracts: [contract] }))
  writeContracts()
  fs.writeFileSync(path.join(temp, 'input.json'), '{}')
  fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ engines: { node: '>=22' }, scripts: { demo: 'node demo.mjs' } }))
  const lockText = JSON.stringify({ packages: { '': { engines: { node: '>=22' } } } })
  fs.writeFileSync(path.join(temp, 'package-lock.json'), lockText)
  fs.mkdirSync(path.join(temp, '.github/workflows'), { recursive: true })
  for (const name of ['ci', 'deploy', 'facts']) fs.writeFileSync(path.join(temp, `.github/workflows/${name}.yml`), 'with:\n  node-version: 22\n')
  const composeText = 'x-lab-base: &lab-base\n  network_mode: none\n  read_only: true\n  cap_drop:\n    - ALL\n  security_opt:\n    - no-new-privileges:true\n\nservices:\n  lab-smoke:\n    <<: *lab-base\n  labs-all:\n    <<: *lab-base\n'
  fs.writeFileSync(path.join(temp, 'compose.yaml'), composeText)
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
  fs.writeFileSync(path.join(temp, 'page.md'), pageText.replace('npm run demo', 'npm run broken'))
  let result = run(good)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /missing exact command/)
  fs.writeFileSync(path.join(temp, 'page.md'), pageText)
  for (const override of [{ references: ['../outside'] }, { command: 'npm run missing' }, { references: [] }]) {
    writeContracts({ ...commandContract, ...override })
    result = run(good)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /tutorial command contracts/)
  }
  writeContracts()
  assert.equal(run(good).status, 0)
  for (const [file, bad, original, expected] of [
    ['package-lock.json', lockText.replace('>=22', '>=24'), lockText, /Node runtime baseline/],
    ['.github/workflows/ci.yml', 'with:\n  node-version: 24\n', 'with:\n  node-version: 22\n', /Node runtime baseline/],
    ...['network_mode: none', 'read_only: true', '- ALL', '- no-new-privileges:true'].map(control => ['compose.yaml', composeText.replace(control, '# removed'), composeText, /Compose shared isolation/]),
    ['compose.yaml', composeText.replace('  labs-all:\n', '  labs-all:\n    network_mode: host\n'), composeText, /Compose service isolation/]
  ]) {
    fs.writeFileSync(path.join(temp, file), bad)
    result = run(good)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, expected)
    fs.writeFileSync(path.join(temp, file), original)
  }
  assert.equal(run(good).status, 0)
  console.log('Tutorial self-test passed: broken references, altered commands and missing contracts fail; arbitrary prose and titles are allowed.')
} finally {
  const resolved = fs.realpathSync(temp)
  if (!resolved.startsWith(fs.realpathSync(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('about-harness-tutorial-')) throw new Error('Invalid cleanup path')
  fs.rmSync(resolved, { recursive: true, force: true })
}
