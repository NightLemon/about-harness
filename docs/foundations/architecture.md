# Harness 系统架构：责任、边界与执行证据

## 学习目标与证据边界

Harness architecture（Harness 系统架构）解决的核心问题不是“用了多少组件”，而是谁能决定目标、谁能授权副作用、谁能改变运行状态，以及失败后用什么证据恢复和归因。

完成本页后，你应能：

1. 把 surface、controller、context、adapter、policy、tool、state、validator 与 observability 放在正确边界；
2. 区分数据面、控制面和证据面；
3. 沿一次 Action 找到每个状态写入者和失败关闭点；
4. 判断单进程教学实现扩展到队列或分布式系统时新增了哪些一致性问题。

预计 45–60 分钟。动手部分使用仓库固定的 Fake adapter、进程内工具和合成 Task，不联网、不读取凭据、不执行真实外部副作用。证据等级 E1：命令能证明当前最小实现的固定控制流，不证明目标架构全部实现，也不证明生产可用性或模型质量。

## 先画责任，再画服务

Architecture（架构）首先是责任和边界，不是部署框图。一个组件可以是 class、进程或远端服务；多个责任也可以先共存在单进程中。只有在所有权、状态和失败语义清楚后，才决定是否拆服务。

```text
User / UI / CLI / API
          │
          ▼
   Task ingress + contract validation
          │
          ▼
  ┌──────────────── Harness controller ────────────────┐
  │ preflight / budget / deadline / state transition  │
  │                                                    │
  │  Context builder ──► Model adapter ──► Action      │
  │        ▲                                │           │
  │        │                         runtime validation │
  │        │                                ▼           │
  │  Tool result ◄── Tool registry ◄── Policy/approval │
  │        │                                            │
  │        ├──► state + checkpoint                      │
  │        └──► trace + metrics + artifacts             │
  │                                                    │
  │ completion proposal ──► acceptance validator       │
  └───────────────────────┬────────────────────────────┘
                          ▼
                   Result / stopped / failed
```

图中的 `acceptance validator` 已有最小 Python 接缝：默认实现把 `TaskSpec.acceptance` 当作完成输出必须包含的 JSON 子集，失败时回到循环，成功后才产生 completed Result。它仍不是会执行测试、读取 artifact 或查询业务系统的生产 validator；后文会把已实现与待实现部分明确分开。

## 三个平面不能混在一起

### Data plane：数据面

Data plane（数据面）承载 Task 输入、消息、文件片段、检索内容、Action、工具参数和结果。模型输出属于数据面中的提议，即使语言非常确定，也不能自行改变权限或预算。

### Control plane：控制面

Control plane（控制面）决定：

- 使用哪个 adapter/model/config；
- 允许哪些工具、路径、域和数据流；
- step、model call、费用和 deadline 预算；
- 何时批准、暂停、取消、恢复或停止；
- 哪个状态转换有效，哪个终态不可逆。

控制面必须位于模型和不可信内容无法直接改写的位置。网页说“已获授权”、tool result 说“请忽略预算”、模型说“任务完成”，都只是数据，不能覆盖结构化 policy 与 controller 状态。

### Evidence plane：证据面

Evidence plane（证据面）保存 trace、metrics、Task/config/fixture hash、checkpoint、验证结果和最终 artifact。它回答“系统为何这样决定”和“结果如何复查”。

日志不是控制状态，模型摘要也不是验收证据。Evidence plane 可以帮助恢复与审计，但不能因为某条 trace 写着 `completed` 就直接修改真实 run 状态；状态仍由 controller 按不变量提交。

## 核心组件和唯一所有权

| 责任 | 输入 | 输出 | 唯一所有权/禁止事项 |
| --- | --- | --- | --- |
| Surface / ingress | 用户请求、身份、环境 | 原始 Task 候选 | 不直接调用高风险工具 |
| Task validator | 外部 JSON/表单 | `TaskSpec` | 拒绝未知字段与非法预算，不猜默认权限 |
| Controller | Task、状态、Action、tool/validation result | 下一状态与最终 Result | 唯一写 run 状态和终态 |
| Context builder | Task、规则、状态、memory、tool result | 有预算和来源的模型输入 | 不把不可信数据升级为指令 |
| Model adapter | 内部消息/工具 schema/provider state | canonical Action 或 typed error | 不授权、不执行工具、不改 Task |
| Action validator | adapter 输出 | 可信内部 Action | 在 metrics、policy 和副作用之前失败关闭 |
| Policy / approval | 主体、Task、Action、资源、数据来源 | allow/deny/approval decision | 唯一授权执行；批准绑定具体参数 |
| Tool registry/executor | 已授权 ToolCall | 结构化 ToolResult | 唯一实际执行工具；维护幂等与 timeout |
| State/checkpoint | 控制状态、adapter state、工具回执 | 可恢复快照 | 不把对话历史当完整业务状态 |
| Acceptance validator | 产物、Task acceptance、权威环境 | pass/fail evidence | 不能由生成同一产物的模型单独自证 |
| Trace/metrics/artifacts | 各边界事件与版本 | 可归因证据 | 脱敏；不代替真实状态或权限 |

“唯一所有权”不要求只有一个进程，而是同一事实必须有一个权威写入协议。例如多个 worker 可以执行 controller 代码，但同一个 run revision 只能通过 compare-and-swap（比较并交换）成功提交一次。

## Task ingress：先冻结任务身份

Task contract 至少固定：

```text
task_id / goal / input / acceptance
allowed_tools / subject / scope
step/model-call/cost/deadline budgets
data classification / environment
schema/config/instruction/tool versions
```

外部输入先按公共 schema 和语义不变量验证，再进入内部 `TaskSpec`。不能使用模型补齐缺失的 allowed tools、生产环境或费用上限。任务在运行中改变目标或权限，应产生新 revision 或新 Task，并保存父子关系，不能静默覆盖原验收。

当前 `TaskSpec` 包含 goal、input、allowed tools、budgets、acceptance 与 metadata，但 subject、资源 scope、分类和版本 identity 仍需更完整的生产契约。这是教学子集，不是通用任务 API。

## Controller：状态机的唯一作者

Controller（控制器）不负责“想出最聪明的下一步”，而是维护执行不变量：

```text
created → validated → running
                       ├─► waiting_approval ──► running
                       ├─► completed
                       ├─► stopped
                       ├─► failed
                       └─► cancelled
```

它在每一步检查取消、总 deadline、model-call、step 和费用预算；验证 adapter Action；调用 policy；接收 tool/validator 结果；提交 checkpoint 与终态。

至少保持：

- 终态不能被迟到模型或工具结果重新打开；
- completed 必须与 acceptance evidence 相容；
- 计数器和费用单调增加，恢复后不能归零；
- waiting approval 仍受 deadline 和取消约束；
- 任何副作用发生前已有 Task、policy 和幂等身份。

当前 `HarnessRunner` 实现 preflight、Action 类型检查、预算、policy、工具执行、JSON 子集验收、checkpoint 与结构化 stop reason；它没有 waiting-approval 状态、隔离执行的业务 validator 或分布式 revision。

## Context builder：选择，不是堆积

Context builder（上下文构造器）把系统/项目规则、当前 Task、工作状态、代码片段、tool result 和 memory 组合成模型输入。它同时处理：

- 指令层级与来源；
- tenant/project/branch/权限过滤；
- 相关性、时效、可信度和冲突；
- token 预算、截断、摘要与 artifact reference；
- 不可信网页、文档和工具输出的数据标签。

Context 是一次调用的快照，不是权威数据库。压缩不能丢失 goal、禁止项、未决 Action 和验收条件；检索到的 memory 不因进入上下文就拥有指令权限。当前 lab 只有独立 `ContextBudget` 教学选择器，尚未接入 `HarnessRunner` 的每一步请求。

## Adapter：隔离 provider 协议

Adapter 负责 role/content、tool call/result、stream、usage、错误与 provider state 的双向映射。它应该保留 call ID、消息顺序、无法重建的 typed/opaque state，并对无法无损表示的模式明确拒绝。

Adapter 不得拥有 Task 权限、批准工具或自行无限重试。一个 provider 的字段变化只能影响该反腐层，不应迫使 policy 和 controller 依赖 provider response class。详细契约见[Adapter 契约](/implementation/adapter-contract)。

当前 Fake/Replay adapter 只提供内存 Action 序列和 cursor；Live adapter 硬禁用。不存在真实 transport、stream assembler、usage 或 provider error 分类。

## Policy 与工具：授权和执行必须分开

Policy engine（策略执行器）回答“当前主体能否以这些具体参数执行这个动作”；Tool executor（工具执行器）回答“如何执行并返回什么结果”。

授权最少绑定：

```text
subject / task / tool / normalized resource
parameter hash / data sources / purpose
environment / cost / expiry / approval identity
```

工具可被发现、schema 合法、模型多次请求，都不等于已授权。Policy 必须在 handler、shell、浏览器导航或外部请求之前运行；拒绝后不能换名称、拆动作或编码参数规避同一边界。

Executor 维护 per-call timeout、有限 retry、幂等键、结果大小和副作用状态。写请求 timeout 不证明远端没执行，应先按幂等键查询或对账。当前 `ToolRegistry` 只有进程内 handler、retry 与 cache；cache 只按 `idempotency_key`，没有参数 hash 或外部持久台账。

## Validator：完成提议不是完成事实

Validation（验收验证）将产物与 Task acceptance 对照。确定性任务优先使用测试退出码、schema、文件 hash、查询结果或目标系统回执；主观任务才增加 rubric、独立 Judge 或人工检查。

模型生成产物后再说“已经完成”不是独立证据。Validator 也不能只检查格式：JSON 可解析不代表业务条件满足，页面能构建不代表交互正确，tool 返回 success 不代表外部状态符合预期。

当前最小 runner 已把 complete 作为 completion proposal，调用可替换的 `AcceptanceValidator`。默认 `JsonSubsetAcceptanceValidator` 递归比对 object 子集；失败路径进入 `acceptance_result`，Adapter 游标与模型预算写入 checkpoint，下一轮可以修正；反复失败最终受 model-call budget 停止。Validator 返回后还会复查 timeout/cancel，迟到的通过结果不能覆盖终态。

这仍只是结构 oracle：它不读取最终文件、运行测试、查询业务回执或判断验收条件是否充分。`acceptance={}` 会明确记录零条件后通过；自定义 validator 异常在当前 result-v1 暂映射为 `failed/invalid_action`。生产扩展应绑定 validator 版本、冻结 artifact、业务证据和独立错误枚举。

## State：至少区分三类

| 状态 | 例子 | 权威写入者 | 恢复风险 |
| --- | --- | --- | --- |
| 控制状态 | run status、step、预算、approval | controller | 无限循环、错误终态 |
| Adapter 状态 | response/session ID、cursor、typed item | adapter | 丢失协议连续性 |
| 业务状态 | 文件版本、订单号、远端回执 | tool/目标系统 | 重复或遗漏副作用 |

Checkpoint 通常只覆盖前两类，不能替代目标系统事实。安全写入顺序是：保存 intent 与参数 hash，执行工具并获得回执，保存结果，再原子提交 adapter position 与计数器。进程可能在任意两步之间崩溃；“外部成功、本地尚未 checkpoint”是最危险窗口。

当前 runner 在成功 tool result 后保存进程内 checkpoint，Fake snapshot 保存 action index。它没有 intent log、持久业务台账、原子数据库事务或跨进程锁，因此不能声称 exactly-once（恰好一次）。

## Observability：按边界留下最小证据

Trace（轨迹）记录单次因果链，Metric（指标）聚合趋势，Artifact（产物）保存可复查输入/输出。至少关联：

```text
task_id → run_id → step/model_call
                    ├─ call_id + idempotency_key
                    ├─ approval_id
                    └─ checkpoint/result/artifact ID
```

证据应足以区分 Task、context、model/provider、adapter、policy、tool 与 validator 错误，同时避免保存 Secret、个人路径和完整私密内容。当前 lab 有八类结构化 trace event，包括 `acceptance_result`，以及有限脱敏规则；它仍没有 policy-allowed、approval、artifact 或 span 事件。详见[可观测性](/foundations/observability)。

## 一次迭代的正确顺序

目标架构中的一次 turn 至少经过：

1. Controller 读取冻结 Task 与当前 state；
2. 检查取消、deadline、model-call、step 和费用预算；
3. Context builder 选择带来源且在预算内的输入；
4. Adapter 调用目标协议，组装完整响应；
5. Runtime validator 在计费、trace 和执行前拒绝非法 Action；
6. Controller 记账，并处理迟到、取消和预算越界；
7. 若为 ToolCall，policy 按规范化参数授权；
8. Executor 以幂等键执行，返回结构化副作用状态；
9. 保存 tool result 与业务回执，再提交 checkpoint；
10. 若为 completion proposal，validator 对照 acceptance；
11. Controller 继续或提交唯一终态；
12. Evidence plane 保存脱敏 trace、metrics 与 artifact identity。

顺序本身就是安全属性。先执行后授权、先计入坏值后校验、先 checkpoint 再获得外部回执、先 completed 再验收，都会留下可利用的窗口。

## 单进程、队列与分布式拓扑

| 拓扑 | 优点 | 新增风险 | 必需控制 |
| --- | --- | --- | --- |
| 单进程 loop | 简单、易调试、状态局部 | 阻塞调用、进程退出丢失 | 调用 timeout、清晰边界、持久 artifact |
| Controller + worker queue | 可并发、可隔离工具 | 重复投递、乱序、worker 丢失 | lease、幂等、revision、dead-letter |
| 分布式 model/tool services | 独立伸缩和权限域 | 网络分区、跨服务身份、部分失败 | trace/span、mTLS/身份、outbox、对账 |
| 多 Agent graph | 专业化、并行探索 | 预算失控、目标漂移、共享状态冲突 | 父子 authority、预算聚合、取消传播 |

从单进程拆服务不会自动提高可靠性。它把函数调用变成消息投递，也把“返回异常”扩展为超时、重复、乱序、未知结果和网络分区。没有稳定 ID、幂等与状态 revision 时，先保持模块化单体更容易证明正确。

## 取消、deadline 与并发

Cancellation（取消）是控制状态，不是 UI 图标。父 run 取消要传播到模型请求、工具、retry sleeper、approval wait、队列和子 Agent；每个边界记录 requested、observed 和 side effects settled。

Deadline（截止时间）限制整个 run；per-call timeout 限制单个调用。只在同步函数返回后检查 deadline 属于软边界，不能抢占永久阻塞 handler。硬边界需要下游 timeout、AbortSignal/可取消任务或可终止进程。

当前 `CancellationToken` 使用线程 Event，但 Fake adapter 和工具是同步调用；测试证明取消在阻塞 adapter 返回后被观察，不证明在途调用已被强制终止。并发扩展还要让预算聚合、checkpoint revision 和工具资源所有权保持一致。

## 人在架构中的位置

Human-in-the-loop（人在回路）不等于“每一步都弹窗”。审批应位于具体、可预览且有真实后果的边界：生产写入、公开发布、付费、删除、外发和权限变化。

Approval 必须绑定规范化资源、参数 hash、执行身份、数据摘要、费用和短有效期。批准 Task A 的一个文件不能变成同会话所有写入的通行证；拒绝后 agent 也不能换工具绕过。

当前 `PermissionPolicy` 支持指定工具的同步 approval callback，只有 allow/deny 结果，没有持久 waiting-approval 状态、审批 ID、过期或跨进程恢复。因此它是 E1 控制接缝，不是完整审批系统。

## 工作例：写一个文件

目标是“在当前仓库生成报告并通过 schema”。正确责任链是：

1. Task 固定允许目录、文件名、schema、预算和完成条件；
2. Context builder 只选择模板、相关源和项目规则；
3. Adapter 把模型输出映射为 `write_file` 提议；
4. Action validator 检查路径/内容字段存在且大小受限；
5. Policy 解析规范化路径，确认仍在允许根目录，并决定是否审批；
6. Tool 以 expected version 和幂等键写临时文件，再原子替换；
7. Validator 重新读取最终字节，执行 schema 和内容断言；
8. Controller 只有在验证通过后提交 completed；
9. Trace 保存路径的仓库相对引用、hash、退出码和变更摘要，不保存私密原文。

如果文件没出现，沿 Action → policy decision → tool result 定位；若出现两次，检查幂等键、外部回执和 checkpoint 窗口；若文件存在但内容错，检查 acceptance/validator，而不是笼统归因“模型不够强”。

当前 lab 没有 `write_file` 默认工具，这个工作例是架构推演，不是已运行 E1。仓库内置 `echo` 与 `sum` 只用于无副作用控制流验证。

## 常见反模式

| 反模式 | 为什么危险 | 修正边界 |
| --- | --- | --- |
| 模型直接持有 shell/network/credential | 数据可自行扩大副作用 | 最小工具 + policy + 数据流控制 |
| Adapter 同时审批和执行工具 | provider 差异改变权限 | adapter 只映射，policy/registry 分离 |
| Tool 内部无限 retry | 绕过 run budget/deadline | controller 聚合预算，有限 retry |
| Assistant 文本出现“完成”即成功 | 没有 acceptance evidence | completion proposal + validator |
| 用日志恢复状态 | 日志可能缺失、重复或脱敏 | 版本化 checkpoint + 业务对账 |
| 全局 memory 先检索后过滤 | 跨项目/租户内容已暴露 | scope/permission 先于相关性 |
| 拆成微服务但没有关联 ID | 部分失败无法归因 | task/run/call/revision/span |
| 一个 catch-all `agent_error` | 无法决定 retry/stop | 按责任层分类并保留原因 |

## 在当前 Lab 观察架构

### 前置条件与输入

在仓库根目录执行；要求 Python 3.11+、uv 0.11.x、Node.js 22+，依赖已按锁文件安装。输入是固定 `offline-smoke` Task、Fake adapter 的 echo→complete 序列、进程内工具、未授权 echo 负例和 checkpoint。没有网络、真实凭据或外部写入。

### 运行 happy path

```bash
npm run lab:smoke
```

预期退出码为 0，并输出一行 JSON。关键断言是：

- `status=completed`、`stop_reason=completed`；
- `metrics.model_calls=2`、`tool_calls=1`、`cost_usd=0.0`；
- trace 顺序包含 `run_started → model_action → tool_result → checkpoint → model_action → acceptance_result → run_stopped`；
- `run_started.data.offline=true`，adapter 为 `fake`；
- output 为 `{"accepted": true}`。

这条 smoke 的 Task 声明 `acceptance={"accepted": true}`，默认 validator 重新比对完成输出并记录 `top_level_criteria=1`。它证明 JSON 条件进入了控制回路，不证明文件、测试、外部系统或人工验收已经执行。

### 验证五个责任边界

```bash
uv run --frozen --offline pytest -q lab/tests/test_loop.py::test_normal_completion_and_structured_trace lab/tests/test_loop.py::test_acceptance_rejection_returns_feedback_and_allows_repair lab/tests/test_loop.py::test_permission_denial_stops_before_tool_execution lab/tests/test_loop.py::test_wrong_adapter_return_is_classified_as_invalid_action lab/tests/test_loop.py::test_checkpoint_restores_adapter_position
```

预期 5 项测试通过，分别证明声明的 JSON 验收通过、首次验收失败可带路径修正、policy 在 handler 前拒绝、坏 adapter 返回被分类，以及 checkpoint 恢复 action cursor。它们没有覆盖真实 context builder、provider、持久状态或任务专用业务 validator。

## 失败案例：观察 policy 在副作用前停止

以下命令构造一个请求 `echo` 的 Action，但 Task 的 allowed tools 为空：

```bash
uv run --frozen --offline python -c "import sys; sys.path.insert(0, 'lab/src'); from about_harness.adapters.fake import FakeAdapter; from about_harness.contracts import Action,Budgets,TaskSpec,ToolCall; from about_harness.loop import HarnessRunner; from about_harness.tools import ToolRegistry; a=Action.tool(ToolCall('c1','echo',{'value':'x'},'once')); r=HarnessRunner(FakeAdapter((a,)),ToolRegistry.with_safe_defaults()).run(TaskSpec('architecture-denial','prove policy boundary',(),Budgets())); print(r.status.value,r.stop_reason.value,r.metrics['tool_calls'])"
```

预期退出码为 0，输出：

```text
stopped permission_denied 0
```

这里“命令成功”表示架构负例按预期被拒绝，不表示 ToolCall 成功。若输出 completed、failed/tool_error 或 `tool_calls` 非 0，立即停止：policy 可能没有在 handler 前生效。不要把 `echo` 加进 allowlist 来让负例变绿；先检查 Task、policy decision 和事件顺序。

## 架构审核方法

对任一有副作用的 Action，从外到内回答：

1. Task 和请求者身份在哪里冻结？
2. 不可信输入能否改变工具、资源或预算？
3. Adapter 丢字段时由谁发现？
4. 参数何时规范化，policy 在哪一行先于 handler？
5. 幂等键绑定了 tool、资源与参数 hash 吗？
6. timeout 后如何知道外部动作是否发生？
7. checkpoint 与业务回执的提交窗口在哪里？
8. acceptance 由谁独立验证？
9. 取消如何传播，迟到结果如何处理？
10. 最小 trace 能否复现，同时不泄漏数据？

任何一题只能回答“模型会注意”或“日志里应该有”，都说明强制边界尚未落到架构中。

## 清理、回滚与当前限制

正常命令只使用进程内对象，最多留下可忽略的 `.pytest_cache/`；无需清理外部服务。若为了学习修改实现，先对目标路径运行限定 `git diff`，只用编辑器 undo 或精确反向修改恢复自己的行；不要 `reset --hard` 或覆盖整个工作树。

当前 E1 架构是模块化单体：同步 Fake/Replay adapter、进程内 policy/tool/cache、JSON 子集验收、线程取消、内存 checkpoint、有限 trace 与 JSON Schema。它没有真实 context integration、artifact/测试/业务系统 validator、provider transport/stream/usage、持久数据库、队列、分布式 revision、外部幂等台账、硬 timeout、异步审批或多 Agent 调度。

下一步在[状态与可靠执行](/foundations/state-reliability)深入 checkpoint 与副作用窗口，在[Prompt Injection 防护](/security/prompt-injection)检查数据如何越过权限边界，再到[Python 最小 Harness](/implementation/minimal-harness-python)逐文件观察当前实现。

## 检查题

1. 为什么模型输出属于数据面，而不是控制面？
2. `completed` 为什么只能由 controller 写入？
3. 默认 JSON 子集验收通过，为什么仍不能声称所有业务验收已经完成？
4. 单进程拆成队列后，哪三类新失败必须处理？
5. Checkpoint 为什么不能证明外部副作用只执行了一次？
