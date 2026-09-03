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
  const { validateAction, validateRunResult, validateTask } = await import(
    pathToFileURL(path.join(temp, 'contracts.js')).href
  )
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

  const runtimeFixturePath = path.join(root, 'lab', 'fixtures', 'contracts', 'runtime-contract-v1.json')
  const runtimeFixture = JSON.parse(fs.readFileSync(runtimeFixturePath, 'utf8'))
  assert.equal(runtimeFixture.schema_version, '1.0', 'shared runtime fixture schema_version changed')
  assert.equal(runtimeFixture.evidence, 'E1', 'shared runtime fixture evidence boundary changed')
  checkContractCases(runtimeFixture.task_cases, 'task', validateTask)
  checkContractCases(runtimeFixture.action_cases, 'action', validateAction)
  console.log(
    `Shared runtime contract fixture passed in TypeScript: ${runtimeFixture.task_cases.length + runtimeFixture.action_cases.length} cases.`
  )

  const resultFixturePath = path.join(root, 'lab', 'fixtures', 'contracts', 'run-result-v1.json')
  const resultFixture = JSON.parse(fs.readFileSync(resultFixturePath, 'utf8'))
  assert.equal(resultFixture.schema_version, '1.0', 'shared result fixture schema_version changed')
  assert.equal(resultFixture.result_schema_version, '1.1', 'shared result wire version changed')
  assert.equal(resultFixture.evidence, 'E1', 'shared result fixture evidence boundary changed')
  checkResultCases(resultFixture.result_cases, validateRunResult)
  console.log(`Shared RunResult fixture passed in TypeScript: ${resultFixture.result_cases.length} cases.`)
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function checkContractCases(cases, label, validator) {
  assert.ok(Array.isArray(cases) && cases.length > 0, `shared runtime fixture has no ${label} cases`)
  const caseIds = new Set()
  for (const fixtureCase of cases) {
    assert.ok(isRecord(fixtureCase), `shared ${label} case must be an object`)
    assert.ok(
      typeof fixtureCase.case_id === 'string' && fixtureCase.case_id.length > 0,
      `shared ${label} case_id must be non-empty`
    )
    assert.ok(!caseIds.has(fixtureCase.case_id), `duplicate shared ${label} case: ${fixtureCase.case_id}`)
    caseIds.add(fixtureCase.case_id)
    assert.equal(typeof fixtureCase.valid, 'boolean', `${fixtureCase.case_id}: valid must be boolean`)
    assert.ok(isRecord(fixtureCase.value), `${fixtureCase.case_id}: value must be an object`)
    let accepted = true
    try {
      validator(fixtureCase.value)
    } catch {
      accepted = false
    }
    assert.equal(accepted, fixtureCase.valid, `${fixtureCase.case_id}: TypeScript acceptance drifted`)
  }
}

function checkResultCases(cases, validator) {
  assert.ok(Array.isArray(cases) && cases.length > 0, 'shared result fixture has no cases')
  const caseIds = new Set()
  for (const fixtureCase of cases) {
    assert.ok(isRecord(fixtureCase), 'shared result case must be an object')
    assert.ok(
      typeof fixtureCase.case_id === 'string' && fixtureCase.case_id.length > 0,
      'shared result case_id must be non-empty'
    )
    assert.ok(!caseIds.has(fixtureCase.case_id), `duplicate shared result case: ${fixtureCase.case_id}`)
    caseIds.add(fixtureCase.case_id)
    assert.equal(typeof fixtureCase.runtime_valid, 'boolean', `${fixtureCase.case_id}: runtime_valid must be boolean`)
    assert.ok(isRecord(fixtureCase.value), `${fixtureCase.case_id}: value must be an object`)
    let accepted = true
    try {
      validator(fixtureCase.value)
    } catch {
      accepted = false
    }
    assert.equal(accepted, fixtureCase.runtime_valid, `${fixtureCase.case_id}: TypeScript result acceptance drifted`)
  }
}
