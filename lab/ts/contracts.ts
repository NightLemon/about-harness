export const SCHEMA_VERSION = '1.0' as const

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

export interface TraceEvent {
  sequence: number
  kind: string
  timestamp_ms: number
  data: Record<string, JsonValue>
}

export interface RunResult {
  schema_version: typeof SCHEMA_VERSION
  task_id: string
  status: 'completed' | 'stopped' | 'failed'
  stop_reason: StopReason
  output: JsonValue
  metrics: Record<string, number>
  trace: TraceEvent[]
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

function requireJsonValue(value: unknown, label: string): asserts value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return
    throw new TypeError(`${label} contains a non-finite number`)
  }
  if (Array.isArray(value)) {
    value.forEach((item) => requireJsonValue(item, label))
    return
  }
  if (isRecord(value)) {
    Object.values(value).forEach((item) => requireJsonValue(item, label))
    return
  }
  throw new TypeError(`${label} must be JSON-compatible`)
}
