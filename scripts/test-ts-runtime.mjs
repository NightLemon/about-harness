import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-ts-runtime-'))
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')

try {
  const compile = spawnSync(process.execPath, [tsc, '-p', 'lab/ts/tsconfig.json', '--noEmit', 'false', '--outDir', temp], {
    cwd: root,
    encoding: 'utf8'
  })
  if (compile.status !== 0) {
    process.stderr.write(compile.stdout)
    process.stderr.write(compile.stderr)
    process.exit(compile.status ?? 1)
  }
  const test = spawnSync(process.execPath, [path.join(temp, 'runtime-test.js')], { cwd: root, encoding: 'utf8' })
  process.stdout.write(test.stdout)
  process.stderr.write(test.stderr)
  if (test.status !== 0) process.exit(test.status ?? 1)

  const fixturePath = path.join(root, 'lab', 'fixtures', 'contracts', 'acceptance-v1.json')
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
  assert.equal(fixture.schema_version, '1.0', 'shared acceptance fixture schema_version changed')
  assert.equal(fixture.validator, 'json-subset-v1', 'shared acceptance fixture validator changed')
  assert.equal(fixture.evidence, 'E1', 'shared acceptance fixture evidence boundary changed')
  assert.ok(Array.isArray(fixture.cases) && fixture.cases.length > 0, 'shared acceptance fixture has no cases')

  const { JsonSubsetAcceptanceValidator } = await import(
    pathToFileURL(path.join(temp, 'acceptance.js')).href
  )
  const { validateTask } = await import(pathToFileURL(path.join(temp, 'contracts.js')).href)
  const validator = new JsonSubsetAcceptanceValidator()
  const caseIds = new Set()
  for (const fixtureCase of fixture.cases) {
    assert.ok(isRecord(fixtureCase), 'shared acceptance case must be an object')
    assert.ok(
      typeof fixtureCase.case_id === 'string' && fixtureCase.case_id.length > 0,
      'shared acceptance case_id must be non-empty'
    )
    assert.ok(!caseIds.has(fixtureCase.case_id), `duplicate shared acceptance case: ${fixtureCase.case_id}`)
    caseIds.add(fixtureCase.case_id)
    assert.ok(isRecord(fixtureCase.criteria), `${fixtureCase.case_id}: criteria must be an object`)
    assert.ok(Object.hasOwn(fixtureCase, 'output'), `${fixtureCase.case_id}: output is missing`)
    assert.ok(isRecord(fixtureCase.expected), `${fixtureCase.case_id}: expected must be an object`)
    const task = validateTask({
      schema_version: '1.0',
      task_id: `shared-${fixtureCase.case_id}`,
      goal: 'validate a shared completion proposal',
      input: {},
      allowed_tools: [],
      budgets: { max_steps: 1, max_model_calls: 1, timeout_ms: 1000, max_cost_usd: 0 },
      acceptance: fixtureCase.criteria,
      metadata: { evidence: 'E1' }
    })
    const actual = validator.validate(task, fixtureCase.output)
    assert.deepStrictEqual(actual, fixtureCase.expected, `${fixtureCase.case_id}: TypeScript result drifted`)
  }
  console.log(`Shared acceptance fixture passed in TypeScript: ${fixture.cases.length} cases.`)
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
