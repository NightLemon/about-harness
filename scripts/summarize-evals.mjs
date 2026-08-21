import { assertRuns, assertStudy, percentile, readJson, readJsonl, wilson95 } from './eval-lib.mjs'

const [studyFile, runFile] = process.argv.slice(2)
if (!studyFile || !runFile) {
  console.error('Usage: node scripts/summarize-evals.mjs <study.json> <runs.jsonl>')
  process.exit(2)
}

const study = readJson(studyFile)
const rows = readJsonl(runFile)
assertStudy(study)
const coverage = assertRuns(rows, study)

function summarizeRuns(runs) {
  if (runs.length === 0) return null
  const passed = runs.filter((row) => row.passed).length
  return {
    runs: runs.length,
    distinct_tasks: new Set(runs.map((row) => row.task_id)).size,
    passed,
    pass_rate: Number((passed / runs.length).toFixed(4)),
    pass_rate_wilson95: wilson95(passed, runs.length),
    safety_violations: runs.filter((row) => row.safety_violation).length,
    duration_ms_p50: percentile(runs.map((row) => row.duration_ms), 0.5),
    duration_ms_p90: percentile(runs.map((row) => row.duration_ms), 0.9),
    cost_usd_total: Number(runs.reduce((sum, row) => sum + row.cost_usd, 0).toFixed(6)),
    input_tokens_total: runs.reduce((sum, row) => sum + row.input_tokens, 0),
    output_tokens_total: runs.reduce((sum, row) => sum + row.output_tokens, 0),
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

const grouped = Map.groupBy(rows, (row) => row.config_id)
const configs = {}
for (const [config, runs] of grouped) {
  configs[config] = {
    ...summarizeRuns(runs),
    by_split: {
      development: summarizeRuns(runs.filter((row) => row.split === 'development')),
      holdout: summarizeRuns(runs.filter((row) => row.split === 'holdout'))
    }
  }
}

const pairwise = []
const baseline = study.configs[0]
for (const split of ['development', 'holdout']) {
  const splitRows = rows.filter((row) => row.split === split)
  const pairKeys = new Set(splitRows.map((row) => `${row.task_id}#${row.repeat}`))
  for (const candidate of study.configs.slice(1)) {
    let wins = 0
    let losses = 0
    let ties = 0
    for (const key of pairKeys) {
      const [taskId, repeatText] = key.split('#')
      const repeat = Number(repeatText)
      const a = splitRows.find((row) => row.task_id === taskId && row.repeat === repeat && row.config_id === baseline)
      const b = splitRows.find((row) => row.task_id === taskId && row.repeat === repeat && row.config_id === candidate)
      if (!a || !b) continue
      if (b.passed && !a.passed) wins += 1
      else if (!b.passed && a.passed) losses += 1
      else ties += 1
    }
    pairwise.push({ split, baseline, candidate, wins, losses, ties, complete_pairs: wins + losses + ties })
  }
}

const evidenceMatchesTarget = rows.every((row) => row.evidence === study.evidence_target)
const noSafetyViolations = rows.every((row) => row.safety_violation === false)
const matrixComplete = coverage.missingCells.length === 0

console.log(JSON.stringify({
  schema_version: '1.0',
  evidence: 'E1',
  warning: 'Synthetic/offline sample; do not use it as a model ranking.',
  matrix: {
    expected_cells: coverage.expectedCells.length,
    observed_cells: coverage.cells.size,
    missing_cells: coverage.missingCells.length,
    complete: matrixComplete
  },
  promotion_eligible: matrixComplete && evidenceMatchesTarget && noSafetyViolations,
  promotion_blockers: [
    ...(!matrixComplete ? ['incomplete_matrix'] : []),
    ...(!evidenceMatchesTarget ? ['evidence_below_target'] : []),
    ...(!noSafetyViolations ? ['safety_violation'] : [])
  ],
  configs,
  pairwise
}, null, 2))
