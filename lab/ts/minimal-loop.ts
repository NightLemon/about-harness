import {
  SCHEMA_VERSION,
  type Action,
  type JsonValue,
  type RunResult,
  type TaskSpec,
  type ToolCall,
  type TraceEvent
} from './contracts.js'

export interface Adapter {
  readonly name: string
  nextAction(task: TaskSpec, trace: readonly TraceEvent[]): Action
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
    readonly cancellation = new CancellationToken()
  ) {
    this.#tools = tools
  }

  run(task: TaskSpec, now: () => number = performance.now.bind(performance)): RunResult {
    const started = now()
    const trace: TraceEvent[] = []
    let modelCalls = 0
    let toolCalls = 0
    let reusedToolCalls = 0
    let cost = 0

    const record = (kind: string, data: Record<string, JsonValue>): void => {
      trace.push({ sequence: trace.length, kind, timestamp_ms: Math.max(0, now() - started), data })
    }
    record('run_started', { adapter: this.adapter.name, offline: true })

    for (let step = 0; step < task.budgets.max_steps; step += 1) {
      if (this.cancellation.cancelled) return result('stopped', 'cancelled', null)
      if (now() - started >= task.budgets.timeout_ms) return result('stopped', 'timeout', null)
      if (modelCalls >= task.budgets.max_model_calls) return result('stopped', 'model_budget', null)

      const action = this.adapter.nextAction(task, trace)
      modelCalls += 1
      cost += action.cost_usd
      record('model_action', { kind: action.kind, model_calls: modelCalls, cost_usd: cost })
      if (cost > task.budgets.max_cost_usd) return result('stopped', 'model_budget', null)
      if (action.kind === 'complete') return result('completed', 'completed', action.output)

      const denied = this.#deniedReason(task, action.tool_call)
      if (denied !== null) {
        record('policy_denied', { tool: action.tool_call.name, reason: denied })
        return result('stopped', 'permission_denied', null)
      }
      const cached = this.#cache.get(action.tool_call.idempotency_key)
      if (cached !== undefined) {
        reusedToolCalls += 1
        record('tool_result', { tool: action.tool_call.name, value: cached, reused: true })
        continue
      }
      const handler = this.#tools.get(action.tool_call.name)
      if (handler === undefined) return result('failed', 'tool_error', null)
      try {
        const value = handler(action.tool_call.arguments)
        this.#cache.set(action.tool_call.idempotency_key, value)
        toolCalls += 1
        record('tool_result', { tool: action.tool_call.name, value, reused: false })
      } catch {
        return result('failed', 'tool_error', null)
      }
    }
    return result('stopped', 'max_steps', null)

    function result(
      status: RunResult['status'],
      stopReason: RunResult['stop_reason'],
      output: JsonValue
    ): RunResult {
      record('run_stopped', { status, reason: stopReason })
      return {
        schema_version: SCHEMA_VERSION,
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
        trace
      }
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
