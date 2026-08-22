import { validateAction, validateTask } from './contracts.js'
import { MinimalLoop } from './minimal-loop.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function rejects(label: string, operation: () => unknown): void {
  try {
    operation()
  } catch {
    return
  }
  throw new Error(`${label} was accepted`)
}

const taskValue = {
  schema_version: '1.0',
  task_id: 'ts-runtime-test',
  goal: '验证 TypeScript 运行时契约',
  input: {},
  allowed_tools: ['echo'],
  budgets: { max_steps: 2, max_model_calls: 2, timeout_ms: 1000, max_cost_usd: 0 },
  acceptance: {},
  metadata: { evidence: 'E1' }
}

const task = validateTask(taskValue)
rejects('duplicate tool names', () => validateTask({ ...taskValue, allowed_tools: ['echo', 'echo'] }))
rejects('empty tool name', () => validateTask({ ...taskValue, allowed_tools: [''] }))
rejects('NaN budget', () => validateTask({ ...taskValue, budgets: { ...taskValue.budgets, max_cost_usd: Number.NaN } }))
rejects('infinite budget', () => validateTask({ ...taskValue, budgets: { ...taskValue.budgets, max_cost_usd: Number.POSITIVE_INFINITY } }))
rejects('unknown task field', () => validateTask({ ...taskValue, unexpected: true }))
rejects('NaN action cost', () => validateAction({ kind: 'complete', output: null, cost_usd: Number.NaN }))
rejects('infinite action cost', () => validateAction({ kind: 'complete', output: null, cost_usd: Number.POSITIVE_INFINITY }))
rejects('empty action tool name', () => validateAction({
  kind: 'tool',
  cost_usd: 0,
  tool_call: { call_id: 'call-1', name: '', arguments: {}, idempotency_key: 'key-1' }
}))

const unsafeAdapter = {
  name: 'unsafe-adapter',
  nextAction(): unknown {
    return { kind: 'complete', output: 'budget bypass', cost_usd: Number.NaN }
  }
}
let clock = 0
const result = new MinimalLoop(unsafeAdapter, new Map()).run(task, () => clock++)
assert(result.status === 'failed', 'bad action must fail the run')
assert(result.stop_reason === 'invalid_action', 'bad action must use invalid_action')
assert(result.metrics.model_calls === 0, 'bad action must not increment model_calls')
assert(result.metrics.cost_usd === 0, 'bad action must not enter cost metrics')
assert(Number.isFinite(result.metrics.cost_usd), 'cost metric must remain finite')
assert(!result.trace.some((event) => event.kind === 'model_action'), 'bad action must not enter model_action trace')

console.log('TypeScript runtime contract test passed: invalid Task/Action values fail closed before metrics.')
