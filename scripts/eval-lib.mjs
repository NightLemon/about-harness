import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

export const RUN_REQUIRED = [
  'schema_version', 'run_id', 'task_id', 'config_id', 'config_version', 'repeat',
  'split', 'passed', 'safety_violation', 'duration_ms', 'cost_usd', 'tool_errors',
  'input_tokens', 'output_tokens', 'human_turns', 'failure_type', 'fixture_hash', 'evidence', 'model_id',
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
  const cells = new Set()
  const configIdentities = new Map()
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
    const cell = `${row.task_id}#${row.config_id}#${row.repeat}`
    if (cells.has(cell)) throw new Error(`${row.run_id}: duplicate matrix cell ${cell}`)
    cells.add(cell)

    const identity = JSON.stringify({
      config_version: row.config_version,
      model_id: row.model_id,
      harness_version: row.harness_version,
      instruction_hash: row.instruction_hash,
      evidence: row.evidence
    })
    const previousIdentity = configIdentities.get(row.config_id)
    if (previousIdentity && previousIdentity !== identity) {
      throw new Error(`${row.run_id}: config identity drift for ${row.config_id}`)
    }
    configIdentities.set(row.config_id, identity)
    if (typeof row.passed !== 'boolean' || typeof row.safety_violation !== 'boolean') {
      throw new Error(`${row.run_id}: passed and safety_violation must be booleans`)
    }
    for (const key of ['duration_ms', 'cost_usd', 'tool_errors', 'human_turns']) {
      numberAtLeast(row, key)
    }
    for (const key of ['input_tokens', 'output_tokens']) {
      numberAtLeast(row, key)
      if (!Number.isInteger(row[key])) throw new Error(`${row.run_id}: ${key} must be an integer`)
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
  const expectedCells = []
  for (const task of study.tasks) {
    for (const config of study.configs) {
      for (let repeat = 1; repeat <= study.repeats; repeat += 1) {
        expectedCells.push(`${task.task_id}#${config}#${repeat}`)
      }
    }
  }
  const missingCells = expectedCells.filter((cell) => !cells.has(cell))
  return { ids, cells, expectedCells, missingCells, configIdentities }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function gitObject(commit, fixturePath, filename) {
  const result = spawnSync('git', ['show', `${commit}:${fixturePath}/${filename}`], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`fixture ref cannot resolve ${commit.slice(0, 7)}:${fixturePath}/${filename}`)
  try {
    return JSON.parse(result.stdout)
  } catch (error) {
    throw new Error(`fixture ref contains invalid JSON at ${fixturePath}/${filename}: ${error.message}`)
  }
}

function fixtureHashAtRef(ref) {
  if (!/^[a-f0-9]{40}$/.test(ref.commit || '')) throw new Error(`${ref.ref_id}: commit must be a full lowercase Git SHA`)
  if (!/^lab\/fixtures\/[a-z0-9-]+$/.test(ref.path || '') || ref.path.split('/').includes('..')) {
    throw new Error(`${ref.ref_id}: invalid fixture path`)
  }
  const resolved = spawnSync('git', ['rev-parse', '--verify', `${ref.commit}^{commit}`], { encoding: 'utf8' })
  if (resolved.status !== 0 || resolved.stdout.trim() !== ref.commit) throw new Error(`${ref.ref_id}: fixture commit does not resolve exactly`)
  const manifest = gitObject(ref.commit, ref.path, 'manifest.json')
  const rows = []
  for (const filename of ['input.json', 'expected.json', 'negative.json']) {
    const value = gitObject(ref.commit, ref.path, filename)
    const actual = sha256(Buffer.from(canonicalJson(value), 'utf8'))
    if (manifest.files?.[filename] !== actual) throw new Error(`${ref.ref_id}: historical manifest hash mismatch for ${filename}`)
    rows.push(`${filename}\t${actual}`)
  }
  return sha256(Buffer.from(rows.join('\n'), 'utf8'))
}

export function assertFixtureLineage(tasks, registry, runs, studyTaskIds) {
  if (registry?.schema_version !== '1.0' || !Array.isArray(registry.refs)) {
    throw new Error('fixture reference registry must use schema_version 1.0 and contain refs')
  }
  const refs = new Map()
  for (const ref of registry.refs) {
    if (typeof ref?.ref_id !== 'string' || !ref.ref_id || refs.has(ref.ref_id)) {
      throw new Error(`invalid or duplicate fixture ref: ${ref?.ref_id}`)
    }
    if (typeof ref.task_id !== 'string' || !studyTaskIds.has(ref.task_id)) {
      throw new Error(`${ref.ref_id}: unknown study task_id ${ref.task_id}`)
    }
    if (!/^[a-f0-9]{64}$/.test(ref.fixture_hash || '')) throw new Error(`${ref.ref_id}: invalid fixture_hash`)
    const actual = fixtureHashAtRef(ref)
    if (actual !== ref.fixture_hash) throw new Error(`${ref.ref_id}: fixture hash does not match immutable ref`)
    refs.set(ref.ref_id, ref)
  }

  const taskMap = new Map()
  for (const task of tasks) {
    if (typeof task?.task_id !== 'string' || taskMap.has(task.task_id)) {
      throw new Error(`invalid or duplicate task fixture lineage: ${task?.task_id}`)
    }
    const refId = task.metadata?.fixture_ref
    const taskHash = task.metadata?.fixture_hash
    const ref = refs.get(refId)
    if (!ref) throw new Error(`${task.task_id}: unknown fixture_ref ${refId}`)
    if (ref.task_id !== task.task_id) throw new Error(`${task.task_id}: fixture_ref belongs to ${ref.task_id}`)
    if (taskHash !== ref.fixture_hash) throw new Error(`${task.task_id}: task fixture_hash does not match fixture_ref`)
    taskMap.set(task.task_id, task)
  }
  if (taskMap.size !== refs.size) throw new Error('task and fixture reference counts differ')

  for (const run of runs) {
    const task = taskMap.get(run.task_id)
    if (!task) throw new Error(`${run.run_id}: no task fixture lineage for ${run.task_id}`)
    if (run.fixture_hash !== task.metadata.fixture_hash) {
      throw new Error(`${run.run_id}: run fixture_hash does not match task fixture lineage`)
    }
  }
  return { refs, taskMap }
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
