import {
  RESULT_SCHEMA_VERSION,
  type Action,
  type JsonValue,
  type RunResult,
  type TaskSpec,
  type ToolCall,
  type TraceKind,
  type TraceEvent,
  validateAction
} from './contracts.js'
import {
  JsonSubsetAcceptanceValidator,
  type AcceptanceValidator,
  validateAcceptanceResult,
  validateValidatorName
} from './acceptance.js'

export interface Adapter {
  readonly name: string
  nextAction(task: TaskSpec, trace: readonly TraceEvent[]): unknown
}

export type ToolHandler = (arguments_: Record<string, JsonValue>) => JsonValue

export class CancellationToken {
  #cancelled = false

  cancel(): void {
    this.#cancelled = true
  }

  get cancelled(): boolean {
    return this.#cancelled
  }
}

export class MinimalLoop {
  readonly #tools: ReadonlyMap<string, ToolHandler>
  readonly #cache = new Map<string, JsonValue>()

  constructor(
    readonly adapter: Adapter,
    tools: ReadonlyMap<string, ToolHandler>,
    readonly cancellation = new CancellationToken(),
    readonly acceptanceValidator: AcceptanceValidator = new JsonSubsetAcceptanceValidator(),
    readonly runIdFactory: () => string = () => globalThis.crypto.randomUUID()
  ) {
    this.#tools = tools
  }

  run(task: TaskSpec, now: () => number = performance.now.bind(performance)): RunResult {
    const runId = this.runIdFactory()
    if (typeof runId !== 'string' || runId.length === 0) throw new TypeError('runIdFactory must return a non-empty string')
    const started = now()
    const trace: TraceEvent[] = []
    let modelCalls = 0
    let toolCalls = 0
    let reusedToolCalls = 0
    let cost = 0

    const record = (kind: TraceKind, data: Record<string, JsonValue>): void => {
      trace.push({ sequence: trace.length, kind, timestamp_ms: Math.max(0, now() - started), data })
    }
    const postActionStop = (): 'cancelled' | 'timeout' | 'model_budget' | null => {
      if (this.cancellation.cancelled) return 'cancelled'
      if (now() - started >= task.budgets.timeout_ms) return 'timeout'
      if (cost > task.budgets.max_cost_usd) return 'model_budget'
      return null
    }
    record('run_started', { adapter: this.adapter.name, offline: true })

    let step = 0
    while (step < task.budgets.max_steps) {
      if (this.cancellation.cancelled) return result('stopped', 'cancelled', null)
      if (now() - started >= task.budgets.timeout_ms) return result('stopped', 'timeout', null)
      if (modelCalls >= task.budgets.max_model_calls) return result('stopped', 'model_budget', null)

      let action: Action
      try {
        action = validateAction(this.adapter.nextAction(task, trace))
      } catch {
        return result('failed', 'invalid_action', null, 'adapter returned an invalid action')
      }
      modelCalls += 1
      cost += action.cost_usd
      record('model_action', { kind: action.kind, model_calls: modelCalls, cost_usd: cost })
      const actionStop = postActionStop()
      if (actionStop !== null) return result('stopped', actionStop, null)
      if (action.kind === 'complete') {
        let validatorName = 'invalid-validator'
        try {
          validatorName = validateValidatorName(this.acceptanceValidator.name)
          const acceptance = validateAcceptanceResult(this.acceptanceValidator.validate(task, action.output))
          record('acceptance_result', {
            validator: validatorName,
            accepted: acceptance.accepted,
            feedback: acceptance.feedback,
            evidence: acceptance.evidence
          })
          const acceptanceStop = postActionStop()
          if (acceptanceStop !== null) return result('stopped', acceptanceStop, null)
          if (!acceptance.accepted) continue
        } catch (error) {
          record('acceptance_result', {
            validator: validatorName,
            accepted: false,
            feedback: 'acceptance validator failed',
            evidence: { error_type: errorType(error) }
          })
          return result('failed', 'invalid_action', null, 'acceptance validator failed')
        }
        return result('completed', 'completed', action.output)
      }

      const denied = this.#deniedReason(task, action.tool_call)
      if (denied !== null) {
        record('policy_denied', { tool: action.tool_call.name, reason: denied })
        return result('stopped', 'permission_denied', null, denied)
      }
      const cached = this.#cache.get(action.tool_call.idempotency_key)
      if (cached !== undefined) {
        reusedToolCalls += 1
        step += 1
        record('tool_result', { tool: action.tool_call.name, value: cached, reused: true })
        continue
      }
      const handler = this.#tools.get(action.tool_call.name)
      if (handler === undefined) return result('failed', 'tool_error', null, 'tool handler is unavailable')
      try {
        const value = handler(action.tool_call.arguments)
        this.#cache.set(action.tool_call.idempotency_key, value)
        toolCalls += 1
        step += 1
        record('tool_result', { tool: action.tool_call.name, value, reused: false })
      } catch {
        return result('failed', 'tool_error', null, 'tool handler failed')
      }
    }
    return result('stopped', 'max_steps', null)

    function result(
      status: RunResult['status'],
      stopReason: RunResult['stop_reason'],
      output: JsonValue,
      error: string | null = null
    ): RunResult {
      record('run_stopped', { status, reason: stopReason })
      return {
        schema_version: RESULT_SCHEMA_VERSION,
        run_id: runId,
        task_id: task.task_id,
        status,
        stop_reason: stopReason,
        output,
        metrics: {
          steps: toolCalls + reusedToolCalls,
          model_calls: modelCalls,
          tool_calls: toolCalls,
          reused_tool_calls: reusedToolCalls,
          duration_ms: Math.max(0, now() - started),
          cost_usd: cost
        },
        trace,
        checkpoint: null,
        error
      }
    }

    function errorType(error: unknown): string {
      return error instanceof Error && error.name.length > 0 ? error.name : typeof error
    }
  }

  #deniedReason(task: TaskSpec, call: ToolCall): string | null {
    if (!task.allowed_tools.includes(call.name)) return `tool is not allowlisted: ${call.name}`
    const keys = Object.keys(call.arguments).map((key) => key.toLowerCase())
    if (keys.some((key) => ['api_key', 'password', 'secret', 'token'].includes(key))) {
      return 'sensitive tool arguments are forbidden'
    }
    return null
  }
}
