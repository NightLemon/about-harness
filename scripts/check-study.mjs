import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { assertArtifactLineage, assertExecutionTasks, assertRuns, assertStudy, readJson, readJsonl } from './eval-lib.mjs'

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-study-check-'))
try {
  const output = path.join(temporary, 'study')
  const command = ['run', '--frozen', '--offline', 'python', 'scripts/study-demo.py', '--output', output]
  const run = spawnSync('uv', command, { encoding: 'utf8', timeout: 180000 })
  if (run.status !== 0) throw new Error(`study demo failed: ${run.stderr}`)
  const study = readJson(path.join(output, 'study.json'))
  const rows = readJsonl(path.join(output, 'runs.jsonl'))
  const summary = readJson(path.join(output, 'summary.json'))
  assert.equal(assertStudy(study).workloads.size, 1)
  const comparison = { ...structuredClone(study), study_kind: 'comparison', evidence_target: 'E3' }
  assert.equal(assertStudy(comparison).workloads.size, 1)
  assert.throws(() => assertStudy({ ...comparison, sampling_rationale: '' }), /sampling_rationale/)
  assert.throws(() => assertStudy({ ...comparison, study_kind: 'guess' }), /study_kind/)
  assert.throws(() => assertStudy({ ...comparison, tasks: comparison.tasks.map(task => ({ ...task, split: 'development' })) }), /holdout/)
  assert.equal(assertRuns(rows, study).missingCells.length, 0)
  assertArtifactLineage(rows, output)
  const tasks = readJsonl(path.join(output, 'tasks.jsonl'))
  const registry = readJson(path.join(output, 'fixture-refs.json'))
  assertExecutionTasks(tasks, registry, rows, study, output)
  assert.throws(() => assertExecutionTasks(tasks.slice(1), registry, rows, study, output), /task list differs/)
  const alteredTasks = structuredClone(tasks)
  alteredTasks[0].goal = 'silently changed task'
  assert.throws(() => assertExecutionTasks(alteredTasks, registry, rows, study, output), /differs from execution/)
  assert.equal(rows.length, 12)
  assert.equal(rows.filter(row => row.passed).length, 6)
  assert.equal(summary.matrix.complete, true)
  assert.equal(summary.promotion_eligible, false)
  assert.ok(summary.promotion_blockers.includes('learning_only'))
  for (const row of rows) {
    const result = readJson(path.join(output, row.artifacts.result.path))
    const envelope = readJson(path.join(output, row.artifacts.run.path))
    assert.equal(envelope.cleanup.temporary_repository_removed, true)
    assert.ok(Object.keys(envelope.environment.runtime_source_hashes).length > 5)
    const acceptance = result.trace.filter(event => event.kind === 'acceptance_result')
    assert.ok(acceptance.length > 0)
    assert.equal(acceptance.at(-1).data.accepted, row.passed)
  }
  assert.throws(() => assertRuns([...rows, rows[0]], study), /duplicate run_id/)
  assert.ok(assertRuns(rows.slice(1), study).missingCells.length > 0)
  const drift = structuredClone(rows)
  drift[2].instruction_hash = 'f'.repeat(64)
  assert.throws(() => assertRuns(drift, study), /identity drift/)
  const file = path.join(output, rows[0].artifacts.result.path)
  const original = fs.readFileSync(file)
  fs.writeFileSync(file, '{}')
  assert.throws(() => assertArtifactLineage(rows, output), /hash mismatch/)
  fs.writeFileSync(file, original)
  const workspace = path.join(output, rows[0].run_id, 'workspace.json')
  const savedWorkspace = fs.readFileSync(workspace)
  fs.writeFileSync(workspace, '{}')
  assert.throws(() => assertArtifactLineage(rows, output), /execution artifact hash mismatch/)
  fs.writeFileSync(workspace, savedWorkspace)
  const upgrade = structuredClone(rows)
  upgrade[0].evidence = 'E2'
  assert.throws(() => assertArtifactLineage(upgrade, output), /cannot be upgraded/)
  const rerun = spawnSync('uv', command, { encoding: 'utf8', timeout: 10000 })
  assert.notEqual(rerun.status, 0)
  assert.match(rerun.stderr, /existing evidence is never overwritten/)
  const badConfig = path.join(temporary, 'bad-config.json')
  fs.writeFileSync(badConfig, JSON.stringify({ schema_version: '1.0', configs: [
    { config_id: 'a', variant: 'arbitrary-code', max_model_calls: 5 },
    { config_id: 'b', variant: 'candidate', max_model_calls: 5 }
  ] }))
  const bad = spawnSync('uv', [...command.slice(0, -1), path.join(temporary, 'bad-study'), '--config', badConfig], { encoding: 'utf8', timeout: 10000 })
  assert.notEqual(bad.status, 0)
  assert.match(bad.stderr, /reviewed patch variants/)
  const published = path.resolve('lab/results/public/study-demo')
  const savedStudy = readJson(path.join(published, 'study.json'))
  const savedRows = readJsonl(path.join(published, 'runs.jsonl'))
  assertStudy(savedStudy)
  assert.equal(assertRuns(savedRows, savedStudy).missingCells.length, 0)
  assertArtifactLineage(savedRows, published)
  assertExecutionTasks(readJsonl(path.join(published, 'tasks.jsonl')), readJson(path.join(published, 'fixture-refs.json')), savedRows, savedStudy, published)
  console.log('Study check passed: 12 actual runs, independent workspace tests, complete lineage, historical-safe output and negative cases.')
} finally {
  const parent = fs.realpathSync(os.tmpdir())
  const target = fs.realpathSync(temporary)
  if (!target.startsWith(parent + path.sep) || !path.basename(target).startsWith('about-harness-study-check-')) throw new Error('Unsafe temporary cleanup path')
  fs.rmSync(target, { recursive: true, force: true })
}
