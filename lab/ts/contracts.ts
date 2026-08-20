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
  if (value.schema_version !== SCHEMA_VERSION) throw new TypeError('unsupported schema_version')
  if (typeof value.task_id !== 'string' || value.task_id.length === 0) throw new TypeError('task_id is required')
  if (typeof value.goal !== 'string' || value.goal.trim().length === 0) throw new TypeError('goal is required')
  if (!Array.isArray(value.allowed_tools) || !value.allowed_tools.every((item) => typeof item === 'string')) {
    throw new TypeError('allowed_tools must be a string array')
  }
  if (!isRecord(value.budgets)) throw new TypeError('budgets must be an object')
  for (const key of ['max_steps', 'max_model_calls', 'timeout_ms'] as const) {
    const budget = value.budgets[key]
    if (!Number.isInteger(budget) || (budget as number) < 1) throw new TypeError(`${key} must be a positive integer`)
  }
  const maxCost = value.budgets.max_cost_usd ?? 0
  if (typeof maxCost !== 'number' || maxCost < 0) throw new TypeError('max_cost_usd must be non-negative')
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asJsonRecord(value: unknown): Record<string, JsonValue> {
  if (value === undefined) return {}
  if (!isRecord(value)) throw new TypeError('expected a JSON object')
  return value as Record<string, JsonValue>
}
