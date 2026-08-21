import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'about-harness-m5-'))
try {
  const study = path.resolve('evals/study.example.json')
  const goodRuns = fs.readFileSync('evals/runs.example.jsonl', 'utf8').trim()
  const first = goodRuns.split(/\r?\n/)[0]
  const duplicate = path.join(temp, 'duplicate.jsonl')
  fs.writeFileSync(duplicate, `${first}\n${first}\n`, 'utf8')
  const evalResult = spawnSync(process.execPath, ['scripts/eval-validate.mjs', study, duplicate], {
    encoding: 'utf8'
  })
  if (evalResult.status === 0 || !evalResult.stderr.includes('duplicate run_id')) {
    throw new Error('eval validator did not reject a duplicate run ID')
  }

  const rows = goodRuns.split(/\r?\n/).map((line) => JSON.parse(line))
  const logicalDuplicate = { ...rows[0], run_id: 'different-id-same-cell' }
  const duplicateCell = path.join(temp, 'duplicate-cell.jsonl')
  fs.writeFileSync(duplicateCell, `${goodRuns}\n${JSON.stringify(logicalDuplicate)}\n`, 'utf8')
  const duplicateCellResult = spawnSync(process.execPath, ['scripts/eval-validate.mjs', study, duplicateCell], { encoding: 'utf8' })
  if (duplicateCellResult.status === 0 || !duplicateCellResult.stderr.includes('duplicate matrix cell')) {
    throw new Error('eval validator did not reject a duplicate logical matrix cell')
  }

  const driftRows = rows.map((row, index) => index === 3 ? { ...row, instruction_hash: 'f'.repeat(64) } : row)
  const drift = path.join(temp, 'config-drift.jsonl')
  fs.writeFileSync(drift, `${driftRows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8')
  const driftResult = spawnSync(process.execPath, ['scripts/eval-validate.mjs', study, drift], { encoding: 'utf8' })
  if (driftResult.status === 0 || !driftResult.stderr.includes('config identity drift')) {
    throw new Error('eval validator did not reject config identity drift')
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
  console.log('M5 checker negative tests passed: duplicate cells, config drift, split leakage, promotion, and secret canaries were checked.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
