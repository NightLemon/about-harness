import { assertRuns, assertStudy, percentile, readJson, readJsonl, wilson95 } from './eval-lib.mjs'

const [studyFile, runFile] = process.argv.slice(2)
if (!studyFile || !runFile) {
  console.error('Usage: node scripts/summarize-evals.mjs <study.json> <runs.jsonl>')
  process.exit(2)
}

const study = readJson(studyFile)
const rows = readJsonl(runFile)
assertStudy(study)
assertRuns(rows, study)

const grouped = Map.groupBy(rows, (row) => row.config_id)
const configs = {}
for (const [config, runs] of grouped) {
  const passed = runs.filter((row) => row.passed).length
  configs[config] = {
    runs: runs.length,
    distinct_tasks: new Set(runs.map((row) => row.task_id)).size,
    passed,
    pass_rate: Number((passed / runs.length).toFixed(4)),
    pass_rate_wilson95: wilson95(passed, runs.length),
    safety_violations: runs.filter((row) => row.safety_violation).length,
    duration_ms_p50: percentile(runs.map((row) => row.duration_ms), 0.5),
    duration_ms_p90: percentile(runs.map((row) => row.duration_ms), 0.9),
    cost_usd_total: Number(runs.reduce((sum, row) => sum + row.cost_usd, 0).toFixed(6)),
    tool_errors_total: runs.reduce((sum, row) => sum + row.tool_errors, 0),
    human_turns_total: runs.reduce((sum, row) => sum + row.human_turns, 0),
    failure_types: Object.fromEntries(
      Object.entries(Object.groupBy(
        runs.filter((row) => !row.passed),
        (row) => row.failure_type || 'unclassified'
      )).map(([key, values]) => [key, values.length])
    )
  }
}

const pairKeys = new Set(rows.map((row) => `${row.task_id}#${row.repeat}`))
const pairwise = []
const baseline = study.configs[0]
for (const candidate of study.configs.slice(1)) {
  let wins = 0
  let losses = 0
  let ties = 0
  for (const key of pairKeys) {
    const [taskId, repeatText] = key.split('#')
    const repeat = Number(repeatText)
    const a = rows.find((row) => row.task_id === taskId && row.repeat === repeat && row.config_id === baseline)
    const b = rows.find((row) => row.task_id === taskId && row.repeat === repeat && row.config_id === candidate)
    if (!a || !b) continue
    if (b.passed && !a.passed) wins += 1
    else if (!b.passed && a.passed) losses += 1
    else ties += 1
  }
  pairwise.push({ baseline, candidate, wins, losses, ties, complete_pairs: wins + losses + ties })
}

console.log(JSON.stringify({
  schema_version: '1.0',
  evidence: 'E1',
  warning: 'Synthetic/offline sample; do not use it as a model ranking.',
  configs,
  pairwise
}, null, 2))
