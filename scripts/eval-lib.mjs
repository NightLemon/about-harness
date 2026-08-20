import fs from 'node:fs'

export const RUN_REQUIRED = [
  'schema_version', 'run_id', 'task_id', 'config_id', 'config_version', 'repeat',
  'split', 'passed', 'safety_violation', 'duration_ms', 'cost_usd', 'tool_errors',
  'human_turns', 'failure_type', 'fixture_hash', 'evidence', 'model_id',
  'harness_version', 'instruction_hash'
]

const FAILURE_TYPES = new Set([
  null, 'contract', 'context', 'planning', 'tool', 'execution', 'verification',
  'safety', 'budget', 'infrastructure'
])

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function readJsonl(file) {
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line)
      } catch (error) {
        throw new Error(`${file}:${index + 1}: invalid JSON: ${error.message}`)
      }
    })
}

export function assertStudy(study) {
  if (study.schema_version !== '1.0') throw new Error('study.schema_version must be 1.0')
  if (!Array.isArray(study.configs) || new Set(study.configs).size < 2) {
    throw new Error('study requires at least two unique configs')
  }
  if (!Number.isInteger(study.repeats) || study.repeats < 3) {
    throw new Error('study.repeats must be at least 3')
  }
  if (!Array.isArray(study.tasks) || study.tasks.length < 20) {
    throw new Error('study requires at least 20 tasks')
  }
  const taskIds = new Set()
  const workloads = new Set()
  let holdout = 0
  for (const task of study.tasks) {
    if (typeof task.task_id !== 'string' || taskIds.has(task.task_id)) {
      throw new Error(`invalid or duplicate task_id: ${task.task_id}`)
    }
    if (!['development', 'holdout'].includes(task.split)) {
      throw new Error(`invalid split for ${task.task_id}`)
    }
    taskIds.add(task.task_id)
    workloads.add(task.workload)
    if (task.split === 'holdout') holdout += 1
  }
  if (workloads.size < 4) throw new Error('study requires at least four workloads')
  if (holdout < 5 || holdout / study.tasks.length < 0.2) {
    throw new Error('holdout must be at least five tasks and 20%')
  }
  if (study.promotion?.safety_violations !== 0) {
    throw new Error('promotion.safety_violations must be zero')
  }
  return { taskIds, workloads, holdout }
}

function numberAtLeast(row, key, minimum = 0) {
  if (typeof row[key] !== 'number' || !Number.isFinite(row[key]) || row[key] < minimum) {
    throw new Error(`${row.run_id}: ${key} must be a number >= ${minimum}`)
  }
}

export function assertRuns(rows, study) {
  if (rows.length === 0) throw new Error('run file is empty')
  const taskMap = new Map(study.tasks.map((task) => [task.task_id, task]))
  const ids = new Set()
  for (const row of rows) {
    for (const key of RUN_REQUIRED) {
      if (!(key in row)) throw new Error(`${row.run_id || '<unknown>'}: missing ${key}`)
    }
    if (row.schema_version !== '1.0') throw new Error(`${row.run_id}: unsupported schema`)
    if (ids.has(row.run_id)) throw new Error(`duplicate run_id: ${row.run_id}`)
    ids.add(row.run_id)
    const task = taskMap.get(row.task_id)
    if (!task) throw new Error(`${row.run_id}: unknown task_id ${row.task_id}`)
    if (!study.configs.includes(row.config_id)) {
      throw new Error(`${row.run_id}: unknown config_id ${row.config_id}`)
    }
    if (row.split !== task.split) throw new Error(`${row.run_id}: split does not match study`)
    if (!Number.isInteger(row.repeat) || row.repeat < 1 || row.repeat > study.repeats) {
      throw new Error(`${row.run_id}: repeat is outside study range`)
    }
    if (typeof row.passed !== 'boolean' || typeof row.safety_violation !== 'boolean') {
      throw new Error(`${row.run_id}: passed and safety_violation must be booleans`)
    }
    for (const key of ['duration_ms', 'cost_usd', 'tool_errors', 'human_turns']) {
      numberAtLeast(row, key)
    }
    if (!FAILURE_TYPES.has(row.failure_type)) {
      throw new Error(`${row.run_id}: invalid failure_type`)
    }
    if (row.passed && row.failure_type !== null) {
      throw new Error(`${row.run_id}: passed run cannot have failure_type`)
    }
    for (const key of ['fixture_hash', 'instruction_hash']) {
      if (!/^[a-f0-9]{64}$/.test(row[key])) throw new Error(`${row.run_id}: invalid ${key}`)
    }
    if (!['E0', 'E1', 'E2', 'E3'].includes(row.evidence)) {
      throw new Error(`${row.run_id}: invalid evidence level`)
    }
  }
  return ids
}

export function percentile(values, p) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)]
}

export function wilson95(successes, n) {
  if (n === 0) return [0, 0]
  const z = 1.96
  const p = successes / n
  const denominator = 1 + z ** 2 / n
  const center = (p + z ** 2 / (2 * n)) / denominator
  const margin = z * Math.sqrt((p * (1 - p) + z ** 2 / (4 * n)) / n) / denominator
  return [center - margin, center + margin].map((value) => Number(value.toFixed(4)))
}
