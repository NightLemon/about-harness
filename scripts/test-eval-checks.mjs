import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-m5-'))
try {
  const study = path.resolve('evals/study.example.json')
  const tasks = path.resolve('evals/tasks.example.jsonl')
  const fixtureRefs = path.resolve('evals/fixture-refs.example.json')
  const goodRuns = fs.readFileSync('evals/runs.example.jsonl', 'utf8').trim()
  const first = goodRuns.split(/\r?\n/)[0]
  const duplicate = path.join(temp, 'duplicate.jsonl')
  fs.writeFileSync(duplicate, `${first}\n${first}\n`, 'utf8')
  const evalResult = spawnSync(process.execPath, ['scripts/eval-validate.mjs', tasks, fixtureRefs, study, duplicate], {
    encoding: 'utf8'
  })
  if (evalResult.status === 0 || !evalResult.stderr.includes('duplicate run_id')) {
    throw new Error('eval validator did not reject a duplicate run ID')
  }

  const rows = goodRuns.split(/\r?\n/).map((line) => JSON.parse(line))
  const logicalDuplicate = { ...rows[0], run_id: 'different-id-same-cell' }
  const duplicateCell = path.join(temp, 'duplicate-cell.jsonl')
  fs.writeFileSync(duplicateCell, `${goodRuns}\n${JSON.stringify(logicalDuplicate)}\n`, 'utf8')
  const duplicateCellResult = spawnSync(process.execPath, ['scripts/eval-validate.mjs', tasks, fixtureRefs, study, duplicateCell], { encoding: 'utf8' })
  if (duplicateCellResult.status === 0 || !duplicateCellResult.stderr.includes('duplicate matrix cell')) {
    throw new Error('eval validator did not reject a duplicate logical matrix cell')
  }

  const driftRows = rows.map((row, index) => index === 3 ? { ...row, instruction_hash: 'f'.repeat(64) } : row)
  const drift = path.join(temp, 'config-drift.jsonl')
  fs.writeFileSync(drift, `${driftRows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8')
  const driftResult = spawnSync(process.execPath, ['scripts/eval-validate.mjs', tasks, fixtureRefs, study, drift], { encoding: 'utf8' })
  if (driftResult.status === 0 || !driftResult.stderr.includes('config identity drift')) {
    throw new Error('eval validator did not reject config identity drift')
  }

  const refs = JSON.parse(fs.readFileSync(fixtureRefs, 'utf8'))
  const migrationRef = refs.refs.find((item) => item.ref_id === 'migration-m5')
  migrationRef.fixture_hash = 'f'.repeat(64)
  const tamperedRef = path.join(temp, 'tampered-fixture-ref.json')
  fs.writeFileSync(tamperedRef, JSON.stringify(refs), 'utf8')
  const tamperedRefResult = spawnSync(process.execPath, [
    'scripts/eval-validate.mjs', tasks, tamperedRef, study, path.resolve('evals/runs.example.jsonl')
  ], { encoding: 'utf8' })
  if (tamperedRefResult.status === 0 || !tamperedRefResult.stderr.includes('fixture hash does not match immutable ref')) {
    throw new Error('eval validator did not reject a tampered immutable fixture hash')
  }

  const wrongPathRefs = JSON.parse(fs.readFileSync(fixtureRefs, 'utf8'))
  wrongPathRefs.refs.find((item) => item.ref_id === 'migration-m5').path = 'lab/fixtures/document'
  const wrongPathRef = path.join(temp, 'wrong-path-fixture-ref.json')
  fs.writeFileSync(wrongPathRef, JSON.stringify(wrongPathRefs), 'utf8')
  const wrongPathResult = spawnSync(process.execPath, [
    'scripts/eval-validate.mjs', tasks, wrongPathRef, study, path.resolve('evals/runs.example.jsonl')
  ], { encoding: 'utf8' })
  if (wrongPathResult.status === 0 || !wrongPathResult.stderr.includes('fixture hash does not match immutable ref')) {
    throw new Error('eval validator did not reject a fixture reference that points to another path')
  }

  const taskRows = fs.readFileSync(tasks, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line))
  const migrationTask = taskRows.find((item) => item.task_id === 'migration-01')
  migrationTask.metadata.fixture_hash = 'e'.repeat(64)
  const tamperedTasks = path.join(temp, 'tampered-tasks.jsonl')
  fs.writeFileSync(tamperedTasks, `${taskRows.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8')
  const tamperedTaskResult = spawnSync(process.execPath, [
    'scripts/eval-validate.mjs', tamperedTasks, fixtureRefs, study, path.resolve('evals/runs.example.jsonl')
  ], { encoding: 'utf8' })
  if (tamperedTaskResult.status === 0 || !tamperedTaskResult.stderr.includes('task fixture_hash does not match fixture_ref')) {
    throw new Error('eval validator did not reject a task/ref fixture hash mismatch')
  }

  const tamperedRunRows = rows.map((row) => row.task_id === 'migration-01' ? { ...row, fixture_hash: 'd'.repeat(64) } : row)
  const tamperedRuns = path.join(temp, 'tampered-runs.jsonl')
  fs.writeFileSync(tamperedRuns, `${tamperedRunRows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8')
  const tamperedRunResult = spawnSync(process.execPath, [
    'scripts/eval-validate.mjs', tasks, fixtureRefs, study, tamperedRuns
  ], { encoding: 'utf8' })
  if (tamperedRunResult.status === 0 || !tamperedRunResult.stderr.includes('run fixture_hash does not match task fixture lineage')) {
    throw new Error('eval validator did not reject a run/task fixture hash mismatch')
  }

  const summaryResult = spawnSync(process.execPath, ['scripts/summarize-evals.mjs', study, path.resolve('evals/runs.example.jsonl')], { encoding: 'utf8' })
  if (summaryResult.status !== 0) throw new Error(`eval summary failed: ${summaryResult.stderr}`)
  const summary = JSON.parse(summaryResult.stdout)
  if (summary.matrix.complete || summary.promotion_eligible) throw new Error('incomplete E1 sample became promotion eligible')
  if (!summary.configs['offline-default'].by_split.development || summary.configs['offline-default'].by_split.holdout !== null) {
    throw new Error('eval summary does not preserve development/holdout boundaries')
  }
  if (summary.configs['offline-default'].input_tokens_total !== 0 || summary.configs['offline-default'].output_tokens_total !== 0) {
    throw new Error('eval summary does not report token totals')
  }

  const publicDir = path.join(temp, 'public')
  fs.mkdirSync(publicDir)
  fs.writeFileSync(path.join(publicDir, 'bad.json'), JSON.stringify({ token: 'sk-canary-secret' }))
  const redactResult = spawnSync(process.execPath, ['scripts/redact-results.mjs', publicDir], {
    encoding: 'utf8'
  })
  if (redactResult.status === 0 || !redactResult.stderr.includes('redaction failed')) {
    throw new Error('redaction checker did not reject the canary secret')
  }

  const jsonlDir = path.join(temp, 'public-jsonl')
  fs.mkdirSync(jsonlDir)
  fs.writeFileSync(path.join(jsonlDir, 'safe.jsonl'), `${JSON.stringify({ run_id: 'safe-run', status: 'passed' })}\n`)
  const safeJsonlResult = spawnSync(process.execPath, ['scripts/redact-results.mjs', jsonlDir], { encoding: 'utf8' })
  if (safeJsonlResult.status !== 0 || !safeJsonlResult.stdout.includes('1 JSON/JSONL file')) {
    throw new Error(`redaction checker did not accept safe JSONL: ${safeJsonlResult.stderr}`)
  }

  fs.writeFileSync(path.join(jsonlDir, 'leak.jsonl'), `${JSON.stringify({ rawPrompt: 'private source material' })}\n`)
  const jsonlLeakResult = spawnSync(process.execPath, ['scripts/redact-results.mjs', jsonlDir], { encoding: 'utf8' })
  if (jsonlLeakResult.status === 0 || !jsonlLeakResult.stderr.includes('forbidden key rawPrompt')) {
    throw new Error('redaction checker did not reject a normalized raw-prompt key in JSONL')
  }

  const unsupportedDir = path.join(temp, 'public-unsupported')
  fs.mkdirSync(unsupportedDir)
  fs.writeFileSync(path.join(unsupportedDir, 'trace.log'), 'raw model transcript without a recognized token pattern\n')
  const unsupportedResult = spawnSync(process.execPath, ['scripts/redact-results.mjs', unsupportedDir], { encoding: 'utf8' })
  if (unsupportedResult.status === 0 || !unsupportedResult.stderr.includes('unsupported public artifact format .log')) {
    throw new Error('redaction checker did not fail closed on an unsupported public artifact')
  }

  console.log('Evaluation checker negative tests passed: fixture lineage, matrix integrity, promotion, JSON/JSONL redaction, and unsupported-format canaries were checked.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
