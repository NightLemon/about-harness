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

  const publicDir = path.join(temp, 'public')
  fs.mkdirSync(publicDir)
  fs.writeFileSync(path.join(publicDir, 'bad.json'), JSON.stringify({ token: 'sk-canary-secret' }))
  const redactResult = spawnSync(process.execPath, ['scripts/redact-results.mjs', publicDir], {
    encoding: 'utf8'
  })
  if (redactResult.status === 0 || !redactResult.stderr.includes('redaction failed')) {
    throw new Error('redaction checker did not reject the canary secret')
  }
  console.log('M5 checker negative tests passed: duplicate runs and secret canaries were rejected.')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
