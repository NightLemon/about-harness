import { validateAction, validateTask } from './contracts.js'
import { CancellationToken, MinimalLoop } from './minimal-loop.js'

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
rejects('non-finite completion output', () => validateAction({
  kind: 'complete', output: { value: Number.POSITIVE_INFINITY }, cost_usd: 0
}))
rejects('empty action tool name', () => validateAction({
  kind: 'tool',
  cost_usd: 0,
  tool_call: { call_id: 'call-1', name: '', arguments: {}, idempotency_key: 'key-1' }
}))
rejects('non-finite tool arguments', () => validateAction({
  kind: 'tool',
  cost_usd: 0,
  tool_call: {
    call_id: 'call-1',
    name: 'echo',
    arguments: { value: Number.NEGATIVE_INFINITY },
    idempotency_key: 'key-1'
  }
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

let toolActions = 0
let handlerCalls = 0
const toolLoopAdapter = {
  name: 'tool-loop-adapter',
  nextAction(): unknown {
    toolActions += 1
    return {
      kind: 'tool',
      cost_usd: 0,
      tool_call: {
        call_id: `call-${toolActions}`,
        name: 'echo',
        arguments: { value: toolActions },
        idempotency_key: `key-${toolActions}`
      }
    }
  }
}
const toolLoop = new MinimalLoop(toolLoopAdapter, new Map([
  ['echo', () => {
    handlerCalls += 1
    return 'ok'
  }]
])).run(task, () => 0)
assert(toolLoop.stop_reason === 'max_steps', 'tool loop must stop at max_steps')
assert(toolActions === 2, 'max_steps must prevent an extra adapter call')
assert(handlerCalls === 2, 'max_steps must prevent an extra tool side effect')
assert(toolLoop.metrics.steps === 2, 'step metrics must equal completed tool steps')

const acceptanceTask = validateTask({
  ...taskValue,
  task_id: 'ts-acceptance-test',
  budgets: { ...taskValue.budgets, max_steps: 1, max_model_calls: 3 },
  acceptance: { passed: true, details: { count: 2 }, 'path/key': 'ready' }
})
const repairOutputs = [
  { passed: false, details: { count: 1 } },
  { passed: true, details: { count: 2 }, 'path/key': 'ready', extra: 'allowed' }
]
let repairIndex = 0
const repairAdapter = {
  name: 'repair-adapter',
  nextAction(): unknown {
    const output = repairOutputs[Math.min(repairIndex, repairOutputs.length - 1)]
    repairIndex += 1
    return { kind: 'complete', output, cost_usd: 0 }
  }
}
const repaired = new MinimalLoop(repairAdapter, new Map()).run(acceptanceTask, () => 0)
assert(repaired.status === 'completed', 'a repaired completion must finish')
assert(repaired.metrics.model_calls === 2, 'acceptance repair must consume two model calls')
assert(repaired.metrics.steps === 0, 'acceptance rejection must not consume a tool step')
const acceptanceEvents = repaired.trace.filter((event) => event.kind === 'acceptance_result')
assert(acceptanceEvents.length === 2, 'repair must record rejected and accepted decisions')
const firstAcceptance = acceptanceEvents[0]
const secondAcceptance = acceptanceEvents[1]
assert(firstAcceptance !== undefined && secondAcceptance !== undefined, 'acceptance decisions must be addressable')
assert(firstAcceptance.data.accepted === false, 'the first completion must be rejected')
assert(secondAcceptance.data.accepted === true, 'the repaired completion must be accepted')
assert(
  JSON.stringify(firstAcceptance.data.evidence) === JSON.stringify({
    validator: 'json-subset-v1',
    top_level_criteria: 3,
    failed_paths: ['/passed', '/details/count', '/path~1key']
  }),
  'acceptance evidence must preserve deterministic JSON Pointer paths'
)

const emptyAcceptanceAdapter = {
  name: 'empty-acceptance-adapter',
  nextAction(): unknown {
    return { kind: 'complete', output: 'no criteria declared', cost_usd: 0 }
  }
}
const emptyAcceptance = new MinimalLoop(emptyAcceptanceAdapter, new Map()).run(task, () => 0)
assert(emptyAcceptance.status === 'completed', 'empty acceptance must explicitly pass')
const emptyAcceptanceEvent = emptyAcceptance.trace.find((event) => event.kind === 'acceptance_result')
assert(emptyAcceptanceEvent !== undefined, 'empty acceptance must still leave an acceptance event')
assert(emptyAcceptanceEvent.data.accepted === true, 'empty acceptance must record an accepted decision')
assert(
  JSON.stringify(emptyAcceptanceEvent.data.evidence) === JSON.stringify({
    validator: 'json-subset-v1',
    top_level_criteria: 0,
    failed_paths: []
  }),
  'empty acceptance evidence must disclose that zero criteria were checked'
)

const rejectingTask = validateTask({
  ...taskValue,
  task_id: 'ts-rejection-budget-test',
  budgets: { ...taskValue.budgets, max_steps: 1, max_model_calls: 2 },
  acceptance: { passed: true }
})
const rejectingAdapter = {
  name: 'rejecting-adapter',
  nextAction(): unknown {
    return { kind: 'complete', output: { passed: false }, cost_usd: 0 }
  }
}
const rejected = new MinimalLoop(rejectingAdapter, new Map()).run(rejectingTask, () => 0)
assert(rejected.status === 'stopped', 'repeated acceptance rejection must stop')
assert(rejected.stop_reason === 'model_budget', 'repeated rejection must use the model-call budget')
assert(rejected.metrics.model_calls === 2, 'the rejection loop must stop before a third model call')
assert(
  rejected.trace.filter((event) => event.kind === 'acceptance_result').length === 2,
  'each rejected completion must leave acceptance evidence'
)

const strictJsonTask = validateTask({
  ...taskValue,
  task_id: 'ts-json-semantics-test',
  budgets: { ...taskValue.budgets, max_steps: 1, max_model_calls: 1 },
  acceptance: { flag: true, items: [1, 2] }
})
const wrongJsonAdapter = {
  name: 'wrong-json-adapter',
  nextAction(): unknown {
    return { kind: 'complete', output: { flag: 1, items: [1, 2, 3] }, cost_usd: 0 }
  }
}
const strictJson = new MinimalLoop(wrongJsonAdapter, new Map()).run(strictJsonTask, () => 0)
const strictJsonEvent = strictJson.trace.find((event) => event.kind === 'acceptance_result')
assert(strictJsonEvent !== undefined, 'JSON semantic mismatch must leave acceptance evidence')
assert(
  JSON.stringify(strictJsonEvent.data.evidence) === JSON.stringify({
    validator: 'json-subset-v1',
    top_level_criteria: 2,
    failed_paths: ['/flag', '/items']
  }),
  'booleans must differ from numbers and arrays must match in length'
)

const completionAdapter = {
  name: 'completion-adapter',
  nextAction(): unknown {
    return { kind: 'complete', output: { passed: true }, cost_usd: 0 }
  }
}
const brokenValidator = {
  name: 'broken-validator',
  validate(): unknown {
    throw new Error('synthetic validator failure')
  }
}
const broken = new MinimalLoop(
  completionAdapter,
  new Map(),
  new CancellationToken(),
  brokenValidator
).run(rejectingTask, () => 0)
assert(broken.status === 'failed', 'a validator exception must fail the run')
assert(broken.stop_reason === 'invalid_action', 'a validator exception must fail closed')
assert(broken.output === null, 'an unvalidated completion must not enter the result')
const brokenEvent = broken.trace.find((event) => event.kind === 'acceptance_result')
assert(brokenEvent !== undefined, 'a validator exception must leave an acceptance event')
assert(brokenEvent.data.accepted === false, 'a validator exception cannot be accepted')

const malformedValidator = {
  name: 'malformed-validator',
  validate(): unknown {
    return { accepted: true, feedback: 'synthetic malformed result', evidence: { cost: Number.NaN } }
  }
}
const malformed = new MinimalLoop(
  completionAdapter,
  new Map(),
  new CancellationToken(),
  malformedValidator
).run(rejectingTask, () => 0)
assert(malformed.status === 'failed', 'a malformed validator result must fail the run')
assert(malformed.output === null, 'a malformed validator result must not release completion output')

let deadlineClock = 0
const advancingValidator = {
  name: 'advancing-validator',
  validate(): unknown {
    deadlineClock = 1000
    return { accepted: true, feedback: 'synthetic acceptance passed', evidence: {} }
  }
}
const timedOut = new MinimalLoop(
  completionAdapter,
  new Map(),
  new CancellationToken(),
  advancingValidator
).run(rejectingTask, () => deadlineClock)
assert(timedOut.status === 'stopped', 'a late validator result must stop the run')
assert(timedOut.stop_reason === 'timeout', 'a late validator result must preserve the timeout terminal state')
assert(timedOut.output === null, 'a late validator result must not release completion output')

const acceptanceCancellation = new CancellationToken()
const cancellingValidator = {
  name: 'cancelling-validator',
  validate(): unknown {
    acceptanceCancellation.cancel()
    return { accepted: true, feedback: 'synthetic acceptance passed', evidence: {} }
  }
}
const cancelled = new MinimalLoop(
  completionAdapter,
  new Map(),
  acceptanceCancellation,
  cancellingValidator
).run(rejectingTask, () => 0)
assert(cancelled.status === 'stopped', 'a cancelled validator result must stop the run')
assert(cancelled.stop_reason === 'cancelled', 'validator completion cannot overwrite cancellation')
assert(cancelled.output === null, 'a cancelled validator result must not release completion output')

console.log(
  'TypeScript runtime test passed: Task/Action values fail closed and completion proposals require acceptance.'
)
