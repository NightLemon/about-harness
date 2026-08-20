import fs from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/summarize-evals.mjs <runs.jsonl>')
  process.exit(2)
}

const rows = fs.readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .filter((line) => line.trim())
  .map((line, index) => {
    try {
      return JSON.parse(line)
    } catch (error) {
      throw new Error(`${file}:${index + 1}: invalid JSON: ${error.message}`)
    }
  })

const required = ['run_id', 'task_id', 'config', 'passed', 'safety_violation', 'duration_s']
for (const [index, row] of rows.entries()) {
  for (const key of required) {
    if (!(key in row)) throw new Error(`${file}:${index + 1}: missing ${key}`)
  }
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)]
}

function wilson95(successes, n) {
  if (n === 0) return [0, 0]
  const z = 1.96
  const p = successes / n
  const denominator = 1 + z ** 2 / n
  const center = (p + z ** 2 / (2 * n)) / denominator
  const margin = z * Math.sqrt((p * (1 - p) + z ** 2 / (4 * n)) / n) / denominator
  return [center - margin, center + margin].map((value) => Number(value.toFixed(4)))
}

const groups = Map.groupBy(rows, (row) => row.config)
const summary = {}

for (const [config, runs] of groups) {
  const passed = runs.filter((row) => row.passed).length
  const tokens = runs.map((row) => (row.input_tokens || 0) + (row.output_tokens || 0))
  summary[config] = {
    runs: runs.length,
    distinct_tasks: new Set(runs.map((row) => row.task_id)).size,
    passed,
    pass_rate: Number((passed / runs.length).toFixed(4)),
    pass_rate_wilson95: wilson95(passed, runs.length),
    safety_violations: runs.filter((row) => row.safety_violation).length,
    duration_s_p50: percentile(runs.map((row) => row.duration_s), 0.5),
    duration_s_p90: percentile(runs.map((row) => row.duration_s), 0.9),
    tokens_p50: percentile(tokens, 0.5),
    tool_errors_total: runs.reduce((sum, row) => sum + (row.tool_errors || 0), 0),
    human_turns_total: runs.reduce((sum, row) => sum + (row.human_turns || 0), 0),
    failure_types: Object.fromEntries(
      Object.entries(Object.groupBy(runs.filter((row) => !row.passed), (row) => row.failure_type || 'unclassified'))
        .map(([key, values]) => [key, values.length])
    )
  }
}

console.log(JSON.stringify(summary, null, 2))

