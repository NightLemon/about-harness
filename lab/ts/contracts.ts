export const SCHEMA_VERSION = '1.0' as const
export const RESULT_SCHEMA_VERSION = '1.1' as const

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export interface Budgets {
  max_steps: number
  max_model_calls: number
  timeout_ms: number
  max_cost_usd: number
}

export interface TaskSpec {
  schema_version: typeof SCHEMA_VERSION
  task_id: string
  goal: string
  input: Record<string, JsonValue>
  allowed_tools: string[]
  budgets: Budgets
  acceptance: Record<string, JsonValue>
  metadata: Record<string, JsonValue>
}

export interface ToolCall {
  call_id: string
  name: string
  arguments: Record<string, JsonValue>
  idempotency_key: string
}

export type Action =
  | { kind: 'tool'; tool_call: ToolCall; cost_usd: number }
  | { kind: 'complete'; output: JsonValue; cost_usd: number }

export type StopReason =
  | 'completed'
  | 'max_steps'
  | 'model_budget'
  | 'timeout'
  | 'cancelled'
  | 'permission_denied'
  | 'tool_error'
  | 'invalid_action'

export type RunStatus = 'completed' | 'stopped' | 'failed'

export type TraceKind =
  | 'run_started'
  | 'model_action'
  | 'acceptance_result'
  | 'tool_result'
  | 'policy_denied'
  | 'retry'
  | 'checkpoint'
  | 'run_stopped'

export interface TraceEvent {
  sequence: number
  kind: TraceKind
  timestamp_ms: number
  data: Record<string, JsonValue>
}

export interface RunMetrics {
  steps: number
  model_calls: number
  tool_calls: number
  reused_tool_calls: number
  duration_ms: number
  cost_usd: number
}

export interface RunCheckpoint {
  step: number
  model_calls: number
  tool_calls: number
  reused_tool_calls: number
  cost_usd: number
  adapter_state: Record<string, JsonValue>
}

export interface RunResult {
  schema_version: typeof RESULT_SCHEMA_VERSION
  run_id: string
  task_id: string
  status: RunStatus
  stop_reason: StopReason
  output: JsonValue
  metrics: RunMetrics
  trace: TraceEvent[]
  checkpoint: RunCheckpoint | null
  error: string | null
}

export function validateTask(value: unknown): TaskSpec {
  if (!isRecord(value)) throw new TypeError('task must be an object')
  requireExactKeys(
    value,
    ['schema_version', 'task_id', 'goal', 'input', 'allowed_tools', 'budgets', 'acceptance', 'metadata'],
    'task'
  )
  if (value.schema_version !== SCHEMA_VERSION) throw new TypeError('unsupported schema_version')
  if (typeof value.task_id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value.task_id)) {
    throw new TypeError('task_id must match the public task schema')
  }
  if (typeof value.goal !== 'string' || value.goal.trim().length === 0 || value.goal.length > 4000) {
    throw new TypeError('goal must contain 1-4000 characters')
  }
  if (!Array.isArray(value.allowed_tools) || !value.allowed_tools.every((item) => typeof item === 'string' && item.length > 0)) {
    throw new TypeError('allowed_tools must be a non-empty-name string array')
  }
  if (new Set(value.allowed_tools).size !== value.allowed_tools.length) {
    throw new TypeError('allowed_tools must contain unique names')
  }
  if (!isRecord(value.budgets)) throw new TypeError('budgets must be an object')
  requireExactKeys(value.budgets, ['max_steps', 'max_model_calls', 'timeout_ms', 'max_cost_usd'], 'budgets')
  for (const key of ['max_steps', 'max_model_calls', 'timeout_ms'] as const) {
    const budget = value.budgets[key]
    if (!Number.isInteger(budget) || (budget as number) < 1) throw new TypeError(`${key} must be a positive integer`)
  }
  if ((value.budgets.max_steps as number) > 10000 || (value.budgets.max_model_calls as number) > 10000) {
    throw new TypeError('step and model-call budgets cannot exceed 10000')
  }
  if ((value.budgets.timeout_ms as number) > 86400000) throw new TypeError('timeout_ms cannot exceed 86400000')
  const maxCost = value.budgets.max_cost_usd ?? 0
  if (typeof maxCost !== 'number' || !Number.isFinite(maxCost) || maxCost < 0) {
    throw new TypeError('max_cost_usd must be finite and non-negative')
  }
  return {
    schema_version: SCHEMA_VERSION,
    task_id: value.task_id,
    goal: value.goal,
    input: asJsonRecord(value.input),
    allowed_tools: [...value.allowed_tools],
    budgets: {
      max_steps: value.budgets.max_steps as number,
      max_model_calls: value.budgets.max_model_calls as number,
      timeout_ms: value.budgets.timeout_ms as number,
      max_cost_usd: maxCost
    },
    acceptance: asJsonRecord(value.acceptance),
    metadata: asJsonRecord(value.metadata)
  }
}

export function validateAction(value: unknown): Action {
  if (!isRecord(value)) throw new TypeError('action must be an object')
  if (value.kind === 'complete') {
    requireExactKeys(value, ['kind', 'output', 'cost_usd'], 'complete action')
    requireFiniteCost(value.cost_usd)
    requireJsonValue(value.output, 'complete action output')
    return { kind: 'complete', output: value.output, cost_usd: value.cost_usd }
  }
  if (value.kind === 'tool') {
    requireExactKeys(value, ['kind', 'tool_call', 'cost_usd'], 'tool action')
    requireFiniteCost(value.cost_usd)
    if (!isRecord(value.tool_call)) throw new TypeError('tool_call must be an object')
    requireExactKeys(value.tool_call, ['call_id', 'name', 'arguments', 'idempotency_key'], 'tool_call')
    const callId = requireNonEmptyString(value.tool_call.call_id, 'tool_call.call_id')
    const name = requireNonEmptyString(value.tool_call.name, 'tool_call.name')
    const idempotencyKey = requireNonEmptyString(value.tool_call.idempotency_key, 'tool_call.idempotency_key')
    const arguments_ = asJsonRecord(value.tool_call.arguments)
    return {
      kind: 'tool',
      tool_call: {
        call_id: callId,
        name,
        arguments: arguments_,
        idempotency_key: idempotencyKey
      },
      cost_usd: value.cost_usd
    }
  }
  throw new TypeError('action.kind must be tool or complete')
}

export function validateRunResult(value: unknown): RunResult {
  if (!isRecord(value)) throw new TypeError('result must be an object')
  requireExactKeys(
    value,
    ['schema_version', 'run_id', 'task_id', 'status', 'stop_reason', 'output', 'metrics', 'trace', 'checkpoint', 'error'],
    'result'
  )
  if (value.schema_version !== RESULT_SCHEMA_VERSION) throw new TypeError('unsupported result schema_version')
  const runId = requireNonEmptyString(value.run_id, 'run_id')
  if (typeof value.task_id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value.task_id)) {
    throw new TypeError('result task_id must match the public task schema')
  }
  const status = requireRunStatus(value.status)
  const stopReason = requireStopReason(value.stop_reason)
  requireTerminalState(status, stopReason, value.output)
  requireJsonValue(value.output, 'result output')
  const metrics = validateRunMetrics(value.metrics)
  if (!Array.isArray(value.trace)) throw new TypeError('result trace must be an array')
  const trace = value.trace.map((event, index) => validateTraceEvent(event, index))
  if (trace.length === 0 || trace[0]?.kind !== 'run_started') {
    throw new TypeError('result trace must start with run_started')
  }
  const finalEvent = trace.at(-1)
  if (finalEvent?.kind !== 'run_stopped') throw new TypeError('result trace must end with run_stopped')
  if (finalEvent.data.status !== status || finalEvent.data.reason !== stopReason) {
    throw new TypeError('run_stopped status and reason must match result terminal state')
  }
  const checkpoint = value.checkpoint === null ? null : validateRunCheckpoint(value.checkpoint)
  if (value.error !== null && (typeof value.error !== 'string' || value.error.length === 0)) {
    throw new TypeError('result error must be null or a non-empty string')
  }
  if (status === 'completed' && value.error !== null) throw new TypeError('completed result error must be null')
  if (status === 'failed' && value.error === null) throw new TypeError('failed result requires an error')
  if (checkpoint !== null) {
    if (
      checkpoint.step > metrics.steps ||
      checkpoint.model_calls > metrics.model_calls ||
      checkpoint.tool_calls > metrics.tool_calls ||
      checkpoint.reused_tool_calls > metrics.reused_tool_calls ||
      checkpoint.cost_usd > metrics.cost_usd
    ) {
      throw new TypeError('checkpoint counters and cost cannot exceed result metrics')
    }
  }
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    run_id: runId,
    task_id: value.task_id,
    status,
    stop_reason: stopReason,
    output: value.output,
    metrics,
    trace,
    checkpoint,
    error: value.error
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asJsonRecord(value: unknown): Record<string, JsonValue> {
  if (value === undefined) return {}
  if (!isRecord(value)) throw new TypeError('expected a JSON object')
  requireJsonValue(value, 'JSON object')
  return value as Record<string, JsonValue>
}

function requireExactKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key))
  if (unknown.length > 0) throw new TypeError(`${label} contains unknown field: ${unknown[0]}`)
}

function requireFiniteCost(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError('action cost_usd must be finite and non-negative')
  }
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} is required`)
  return value
}

function requireJsonValue(value: unknown, label: string, seen = new Set<object>()): asserts value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return
    throw new TypeError(`${label} contains a non-finite number`)
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError(`${label} contains a cycle`)
    seen.add(value)
    value.forEach((item) => requireJsonValue(item, label, seen))
    seen.delete(value)
    return
  }
  if (isRecord(value)) {
    if (seen.has(value)) throw new TypeError(`${label} contains a cycle`)
    seen.add(value)
    Object.values(value).forEach((item) => requireJsonValue(item, label, seen))
    seen.delete(value)
    return
  }
  throw new TypeError(`${label} must be JSON-compatible`)
}

function validateRunMetrics(value: unknown): RunMetrics {
  if (!isRecord(value)) throw new TypeError('result metrics must be an object')
  requireExactKeys(value, ['steps', 'model_calls', 'tool_calls', 'reused_tool_calls', 'duration_ms', 'cost_usd'], 'metrics')
  const steps = requireNonNegativeInteger(value.steps, 'metrics.steps')
  const modelCalls = requireNonNegativeInteger(value.model_calls, 'metrics.model_calls')
  const toolCalls = requireNonNegativeInteger(value.tool_calls, 'metrics.tool_calls')
  const reusedToolCalls = requireNonNegativeInteger(value.reused_tool_calls, 'metrics.reused_tool_calls')
  const durationMs = requireFiniteNonNegativeNumber(value.duration_ms, 'metrics.duration_ms')
  const costUsd = requireFiniteNonNegativeNumber(value.cost_usd, 'metrics.cost_usd')
  if (steps !== toolCalls + reusedToolCalls) {
    throw new TypeError('metrics.steps must equal tool_calls + reused_tool_calls')
  }
  if (modelCalls < steps) throw new TypeError('metrics.model_calls cannot be lower than steps')
  return {
    steps,
    model_calls: modelCalls,
    tool_calls: toolCalls,
    reused_tool_calls: reusedToolCalls,
    duration_ms: durationMs,
    cost_usd: costUsd
  }
}

function validateTraceEvent(value: unknown, expectedSequence: number): TraceEvent {
  if (!isRecord(value)) throw new TypeError('trace event must be an object')
  requireExactKeys(value, ['sequence', 'kind', 'timestamp_ms', 'data'], 'trace event')
  const sequence = requireNonNegativeInteger(value.sequence, 'trace.sequence')
  if (sequence !== expectedSequence) throw new TypeError('trace sequence must be contiguous from zero')
  const kind = requireTraceKind(value.kind)
  const timestampMs = requireFiniteNonNegativeNumber(value.timestamp_ms, 'trace.timestamp_ms')
  const data = asJsonRecord(value.data)
  return { sequence, kind, timestamp_ms: timestampMs, data }
}

function validateRunCheckpoint(value: unknown): RunCheckpoint {
  if (!isRecord(value)) throw new TypeError('checkpoint must be an object or null')
  requireExactKeys(value, ['step', 'model_calls', 'tool_calls', 'reused_tool_calls', 'cost_usd', 'adapter_state'], 'checkpoint')
  const step = requireNonNegativeInteger(value.step, 'checkpoint.step')
  const modelCalls = requireNonNegativeInteger(value.model_calls, 'checkpoint.model_calls')
  const toolCalls = requireNonNegativeInteger(value.tool_calls, 'checkpoint.tool_calls')
  const reusedToolCalls = requireNonNegativeInteger(value.reused_tool_calls, 'checkpoint.reused_tool_calls')
  if (step !== toolCalls + reusedToolCalls) {
    throw new TypeError('checkpoint.step must equal tool_calls + reused_tool_calls')
  }
  if (modelCalls < step) throw new TypeError('checkpoint.model_calls cannot be lower than step')
  return {
    step,
    model_calls: modelCalls,
    tool_calls: toolCalls,
    reused_tool_calls: reusedToolCalls,
    cost_usd: requireFiniteNonNegativeNumber(value.cost_usd, 'checkpoint.cost_usd'),
    adapter_state: asJsonRecord(value.adapter_state)
  }
}

function requireRunStatus(value: unknown): RunStatus {
  if (value === 'completed' || value === 'stopped' || value === 'failed') return value
  throw new TypeError('result status is invalid')
}

function requireStopReason(value: unknown): StopReason {
  if (
    value === 'completed' || value === 'max_steps' || value === 'model_budget' ||
    value === 'timeout' || value === 'cancelled' || value === 'permission_denied' ||
    value === 'tool_error' || value === 'invalid_action'
  ) return value
  throw new TypeError('result stop_reason is invalid')
}

function requireTraceKind(value: unknown): TraceKind {
  if (
    value === 'run_started' || value === 'model_action' || value === 'acceptance_result' ||
    value === 'tool_result' || value === 'policy_denied' || value === 'retry' ||
    value === 'checkpoint' || value === 'run_stopped'
  ) return value
  throw new TypeError('trace kind is invalid')
}

function requireTerminalState(status: RunStatus, reason: StopReason, output: unknown): void {
  const allowed: Record<RunStatus, readonly StopReason[]> = {
    completed: ['completed'],
    stopped: ['max_steps', 'model_budget', 'timeout', 'cancelled', 'permission_denied'],
    failed: ['tool_error', 'invalid_action']
  }
  if (!allowed[status].includes(reason)) throw new TypeError(`stop_reason ${reason} is invalid for status ${status}`)
  if (status !== 'completed' && output !== null) throw new TypeError('non-completed result output must be null')
}

function requireNonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new TypeError(`${label} must be a non-negative integer`)
  return value as number
}

function requireFiniteNonNegativeNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} must be finite and non-negative`)
  }
  return value
}
