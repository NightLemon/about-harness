# 状态与可靠执行

可靠执行的目标不是“永不失败”，而是让每次失败都可分类、可停止、可安全重试、可恢复，并且不会因为恢复而重复产生副作用。只保存对话历史不等于保存运行状态；可靠 Harness 还要知道动作执行到哪里、外部系统是否已经接受动作，以及下一步能否继续。

本页先讲稳定机制，再对照仓库中的 Python 最小 runner。当前实现提供 E1（固定 fake、可重复断言）证据，不是持久化任务系统，也没有真实模型或外部服务。理解这条边界，比记住某个 checkpoint 字段更重要。

## 学习目标

完成本页后，你应该能够：

- 区分控制状态、Adapter 状态和业务状态的 source of truth（事实来源）；
- 解释 event、checkpoint 和外部 receipt 为什么不能互相替代；
- 为 timeout、deadline、retry、cancel 和 idempotency 指定清晰语义；
- 沿崩溃窗口判断动作应查询、复用、重试、补偿还是失败关闭；
- 指出当前最小 runner 已实现与尚未实现的可靠性能力；
- 用固定测试复核恢复、退避、取消和迟到结果，而不把 E1 外推为生产保证。

## 先看结论

| 机制 | 生产设计应回答 | 当前 Python runner 实际做到 |
| --- | --- | --- |
| Run 状态机 | 谁能转换状态，终态能否重开，完成绑定什么证据 | 返回 `completed/stopped/failed`，没有持久状态行或等待审批状态 |
| Checkpoint（检查点） | 身份、计数、游标、工具台账和版本怎样原子保存 | 只返回内存对象：计数、cost 与 FakeAdapter `index` |
| Timeout/Deadline | 能否抢占阻塞调用，恢复是否沿用原截止时间 | 在调用边界用单调时钟检查；不能中止阻塞 Adapter/Tool，恢复会重启计时 |
| Retry（重试） | 哪些错误可重试，是否共享总预算和取消信号 | 仅重试 `RetryableError`，有限指数退避；不感知 run deadline/cancel |
| Idempotency（幂等） | key 的作用域、参数 hash、持久台账和冲突规则 | 内存 cache 绑定 key、tool name 与 canonical arguments 指纹；冲突失败，重启后仍丢失 |
| Cancellation（取消） | 怎样传播、抢占、处理迟到结果和副作用 | Adapter 返回前后检查 token；不会主动终止正在执行的 callable |
| Concurrency（并发） | lease、CAS、fencing 和同一业务对象的所有权 | 没有持久存储、租约、分布式锁或并发恢复协议 |

所以当前测试能证明“这些固定边界按代码工作”，不能证明“任意崩溃都能恢复”“工具恰好执行一次”或“timeout 会停止外部副作用”。

## 先分清三类状态

| 状态层 | 典型内容 | 主要写入者 | 权威来源 | 丢失后的风险 |
| --- | --- | --- | --- | --- |
| 控制状态 | run 状态、step、预算、停止原因、批准结果 | controller | 状态库与事件日志 | 无限循环、越过预算、错误宣告完成 |
| Adapter 状态 | response/call ID、消息游标、模型连续状态 | adapter | Provider/Adapter 回执与 checkpoint | 重放错误上下文、丢失工具调用连续性 |
| 业务状态 | 文件版本、订单号、消息 ID、外部回执 | tool 与目标系统 | 目标系统/业务台账 | 重复写入、重复付款、无法判断是否成功 |

Checkpoint 是恢复控制状态和 Adapter 状态的快照；它不能替代外部系统的业务记录。恢复时必须同时核对 checkpoint、工具执行台账和目标系统 receipt（回执），不能因为 checkpoint 里没有结果就推断动作从未发生。

还要区分 authoritative state（权威状态）与 derived state（派生状态）。`tool_calls=3` 可以从完整事件重建，订单是否创建则应由目标系统确认。派生指标丢失可以重算；权威回执丢失时不能用模型文本猜测。

## Run 身份先于恢复

恢复前必须知道“恢复的是哪一次运行”。一个可审计身份至少包括：

```text
run_id / task_id / task revision
config + instruction + tool schema identities
repository or fixture identity
subject / tenant / environment
parent run / retry attempt / resume generation
created_at / absolute deadline
```

同一个 `task_id` 不代表同一次执行；模型、工具 schema、权限或起始 commit 改变后也不能静默沿用旧 checkpoint。恢复程序应验证 checkpoint 绑定的身份与当前执行组合完全兼容，否则创建新 run 并保留父子 lineage（来源链）。

当前 `RunCheckpoint` 没有 `run_id`、`task_id`、schema/config hash、deadline 或 generation。调用方还可以在恢复时不传旧 `run_id`，此时 runner 会生成新 ID。因此它只能作为同一进程教学对象，不能直接作为跨服务恢复协议。

## 状态机与不变量

概念上的 run 可以经历：

```text
created ──契约通过──> running ──需要批准──> waiting-approval
                         │                         │
                         │<────批准且预算仍有效────┘
                         ├──验收证据成立──────────> completed
                         ├──不可恢复错误──────────> failed
                         └──取消/预算/超时────────> stopped
```

状态转换只能由 controller 写入。模型可以提出“完成”，工具可以返回“成功”，但它们不应直接把持久 run 改为 `completed`。每次转换至少检查：

1. 终态不可重新进入 `running`；需要继续时创建有父引用的新 run。
2. `completed` 绑定业务验收证据，不能只绑定模型文本。
3. step、model call、tool call、attempt 和 cost 只能单调增加。
4. `waiting-approval` 仍受总 deadline 和取消信号约束。
5. 每个转换带 expected version；旧 worker 不能覆盖新 worker 的状态。
6. 终态写入与最终事件/Result 要么原子提交，要么可通过 reconciliation（对账）修复。

当前实现没有持久的 `created/running/waiting-approval` 行；`PermissionPolicy` 同步调用 approve callback，缺少 approver 或被拒绝时直接返回 `stopped/permission_denied`。Python 与 TS 的 `Action.complete` 都先经过 JSON 子集 validator：拒绝结果进入 trace，修正通过后才产生 `completed`；Python 还保存 Adapter 游标/预算 checkpoint，TS 没有恢复接口。但默认 validator 只比较内存输出；空 acceptance 可通过，也没有文件、测试或目标系统证据，因此 `completed` 仍只能按已声明的有限 oracle 解释。

## Event、Checkpoint 与 Receipt

三种记录回答三个问题：

| 记录 | 回答 | 适合内容 | 不足 |
| --- | --- | --- | --- |
| Event（事件） | 发生过什么？ | action、policy、retry、tool result、状态转换 | 重放成本高，外部事实可能不完整 |
| Checkpoint | 从哪里继续？ | 累计计数、游标、版本、未完成 intent | 只反映提交时刻，不证明之后没有副作用 |
| Receipt | 外部系统接受了什么？ | 资源 ID、版本、幂等键、结果状态 | 不包含完整 Harness 控制上下文 |

生产 checkpoint 通常还需要：

```text
schema_version / run identity / checkpoint version
state + stop reason / absolute deadline
step + model/tool/attempt/token/cost counters
adapter cursor / pending calls
tool intents + receipts + idempotency references
trace high-water mark
approval/cancellation state
created_at / writer / fencing token
```

不要把完整敏感 trace 无条件塞进 checkpoint。状态存储也需要最小化、加密、访问控制、保留期和删除传播；恢复能力不是绕过隐私边界的理由。

## 当前 Checkpoint 契约

仓库的 `RunCheckpoint` 只有六个字段：

| 字段 | 含义 | 当前校验 |
| --- | --- | --- |
| `step` | 已完成工具步骤数 | 非负整数 |
| `model_calls` | 已消费的 Adapter Action 数 | 非负且不得小于 `step` |
| `tool_calls` | 实际执行的工具调用数 | 与 reused 合计必须等于 `step` |
| `reused_tool_calls` | 从 cache 复用的工具结果数 | 非负 |
| `cost_usd` | 累计 Action 声明成本 | 有限、非负 |
| `adapter_state` | Adapter 自定义 JSON 对象 | 必须为对象；FakeAdapter 另验 `index` |

每次工具成功或 cache 命中后，runner 才创建新 checkpoint。完成 Action 不增加 `steps`，也不生成新 checkpoint；`steps` 始终只计算成功或复用的工具状态转移。最终 Result 的 `model_calls`、cost 可能已包含后续 completion proposal，因此这些值可以大于最近 checkpoint，对应的 tool step 则保持一致。

恢复时，runner 继承 step/model/tool/reused/cost，并调用 `adapter.restore(adapter_state)`。它会创建新的 TraceRecorder，所以新 Result 的 trace 不包含上一段事件；`started` 也重新读取时钟，所以 `timeout_ms` 从恢复调用开始重新计算。工具 cache 不在 checkpoint 内，新建 `ToolRegistry` 后旧幂等结果不会恢复。

这些限制意味着 checkpoint 适合演示 Adapter 游标继续，不足以覆盖“外部工具已成功但 checkpoint 未写入”的关键崩溃窗口。

## Deadline 与真正的超时

Timeout（超时）描述单次操作最多等待多久；deadline 描述整个 run 最晚何时结束。可靠 controller 应使用单调时钟计算剩余时长，同时持久化可跨进程解释的绝对截止信息，并把较小的剩余预算传给 model、tool、队列和子任务。

墙上时钟适合审计时间戳，不适合单进程耗时差，因为系统时间可能跳变。跨进程恢复又不能只保存某台机器的 monotonic 数值，所以通常同时保存 wall-clock deadline、原始预算和每段单调耗时，恢复时按保守规则重建剩余预算。

软边界与硬边界必须分开：

| 边界 | 行为 | 能保证 | 不能保证 |
| --- | --- | --- | --- |
| 调用前检查 | 超时后不再启动新调用 | 不新增工作 | 已启动调用会停止 |
| 调用返回后检查 | 丢弃迟到 Action/Result | 不把迟到结果当完成 | 外部副作用没发生 |
| Client timeout | 请求达到上限后返回/取消 | 客户端不再等待 | 服务端一定停止 |
| 可终止进程/容器 | 到期终止执行单元 | 本地计算被抢占 | 远端已接收动作被撤回 |

当前 runner 在每轮 Adapter 前检查 cancel/timeout/model-call budget，在 Adapter 返回后再次检查 cancel/timeout/cost。于是迟到的 `complete` Action 不会成为完成结果。它没有把剩余 deadline 传进 Adapter 或 Tool，也不能抢占阻塞 callable。

工具成功后不会立刻做 post-tool timeout 检查；它会记录结果和 checkpoint，到下一轮 preflight 才停止。若工具在 deadline 后产生外部副作用，当前 runner 不能撤回。恢复又会重启计时，因此当前 `timeout_ms` 是每次 `run()` 调用的边界，不是持久化的端到端 deadline。

## 什么可以重试

Retry 不是“失败后再来一次”，而是对已分类、可恢复且仍在总预算内的失败执行新 attempt（尝试）。

| 失败类型 | 默认处理 | 原因 |
| --- | --- | --- |
| 限流、短暂网络错误、可恢复资源冲突 | 有限退避，保留同一逻辑幂等键 | 下一次可能成功 |
| schema/参数错误 | 返回精确校验错误，生成修正后的新 Action | 原样重试仍会失败 |
| 认证或权限拒绝 | 停止并请求正确权限 | 重试不能改变授权 |
| 确定性测试或验收失败 | 改变假设/实现后重新验证 | 失败来自方案，不是传输 |
| 副作用结果未知 | 先按幂等键查询台账或目标系统 | 盲目重试可能重复执行 |
| 进程被取消或总 deadline 到期 | 停止，不再 sleep 或启动 attempt | 新尝试已无合法预算 |

当前 `run_with_retry` 只捕获 `RetryableError`。默认最多 3 次，退避为 `base_backoff_ms * 2^(attempt-1)`，再由 `max_backoff_ms` 截断。其他异常立即上抛并由 runner 归为 `tool_error`。

`retry` trace 记录失败 attempt、实际 `delay_ms` 和错误文本；测试用注入 sleeper 断言等待值为 `0.01`、`0.02` 秒。重试 attempt 不增加 `tool_calls`；一次逻辑工具调用最终成功后才计为 1。

当前重试器不知道 run deadline、取消 token 或剩余费用，sleep 也不可取消。因此“重试共享总预算”是目标机制，不是当前 E1 runner 已完整实现的事实。

## 幂等与副作用

Idempotency 表示同一逻辑操作重复提交时，外部结果与执行一次相同。所谓“恰好一次”通常不是单个 Harness 进程能保证的；更可行的是至少一次投递，加上稳定幂等键、参数 hash、目标系统去重和对账。

幂等记录至少应绑定：

```text
subject / tenant
tool + operation version
business object
canonical argument hash
result or external receipt
status / expiry / writer version
```

若同一个 key 对应不同 tool 或参数，必须作为冲突拒绝，不能复用旧结果。

当前 `ToolRegistry` 仍用 `idempotency_key` 索引，但 cache entry 同时保存 `tool name + canonical arguments` 的 SHA-256 指纹与 result。再次看到同 key 时，只有指纹完全一致才返回 `reused=true`；tool 或参数变化会抛 `IdempotencyConflictError`，由 runner 返回 `failed/tool_error`，第二个 handler 不会执行。参数编码按 object key 排序、使用紧凑 UTF-8 JSON，并保守地区分 `true`、`1` 与 `1.0`；它不是完整 JCS，也没有把 subject、target 或 operation version 纳入身份。

当前正例证明：一个 flaky handler 前两次抛 `RetryableError`、第三次成功；随后 `call_id` 和 object key 顺序不同、但业务调用相同的第二个 ToolCall 命中内存 cache，handler 总尝试数保持 3。两个负例分别改变 arguments 和 tool name，证明冲突不会复用旧结果或执行第二个 handler。它们仍没有证明 cache 持久化、跨进程并发互斥、目标系统幂等或 unknown outcome 对账。

## 四个崩溃窗口

副作用的理想顺序是先保存 intent，再执行外部动作，保存 receipt，最后提交 checkpoint。但进程可能在任何两步之间崩溃：

| 最后可证明的事实 | 不能直接推断 | 恢复动作 |
| --- | --- | --- |
| 没有 intent | 动作一定没发生；可能有未记录旁路 | 检查事件/目标系统，确认后再创建 intent |
| 有 intent，无 receipt | 动作未执行 | 用幂等键查询目标系统；未知时失败关闭或人工对账 |
| 有成功 receipt，无 checkpoint | 需要再次执行 | 复用结果并补写 checkpoint |
| 有 checkpoint，业务对象版本已变化 | checkpoint 仍可直接继续 | 校验版本/所有权，必要时创建新 run |

最危险的窗口是“外部动作成功，但本地 receipt/checkpoint 尚未保存”。如果目标系统不支持幂等键或查询，Harness 无法仅靠本地状态消除重复风险。此时应把结果标为 `unknown` 并转人工，而不是把重试包装成可靠恢复。

Transactional outbox（事务发件箱）可以把业务状态变化与待发送 intent 放在同一事务，worker 再至少一次投递；inbox/去重表在接收侧拒绝重复。它们降低窗口风险，但仍要处理过期、冲突、乱序和人工对账。

## 取消、迟到结果与并发

取消是状态转换，不是只设置 UI 标志。理想情况下，父任务取消要传播到子任务、模型流、工具进程、退避 sleeper、队列和等待中的批准；每个边界都要定义能否抢占、何时检查信号、如何处理迟到结果。

当前 `CancellationToken` 是进程内 `threading.Event`。runner 在 Adapter 调用前后读取它。测试让 Adapter 在线程中阻塞，设置 cancel 后再释放 Adapter，最后得到 `stopped/cancelled`；这证明迟到 complete 不会被接受，不证明阻塞 Adapter 在 cancel 时被主动中止。工具执行和 retry sleep 也没有读取 token。

取消后收到外部成功 receipt 时，应记录真实副作用，再按业务策略接受、隔离或补偿；不能删除记录假装动作没发生。Compensation（补偿）是新的反向动作，也可能失败，且无法抹去已经发送的邮件、已读消息或外部观察。

多个 worker 可能同时恢复同一 run。持久实现通常需要：

- 乐观版本或 compare-and-swap（比较并交换）保护状态转换；
- lease（租约）限制一段时间内的 active owner；
- fencing token（栅栏令牌）让旧 owner 即使醒来，也无法写入新资源；
- 业务对象的条件更新或目标系统幂等；
- heartbeat、过期接管和双 worker 故障注入。

只在单进程内加锁不能保护进程崩溃、队列重复投递或另一台机器上的恢复。

## 恢复算法

恢复程序先回答“最后一个可证明的事实是什么”，再选择动作：

1. 读取 run 身份、最新持久 checkpoint 及其版本；
2. 验证 Task/config/tool schema 与 checkpoint 兼容；
3. 取得 lease/CAS 所有权，保存新的 fencing token；
4. 查询所有 pending intent 的目标系统 receipt；
5. 合并累计预算，重建剩余 deadline，不把计数归零；
6. 恢复 Adapter 游标和可恢复工具状态；
7. 对 unknown 副作用失败关闭，对 confirmed result 复用；
8. 从新 generation 继续，保留父 trace high-water mark；
9. 完成后运行独立业务 validator，再写终态。

| 已有证据 | 恢复决策 |
| --- | --- |
| 只有 intent，没有外部回执 | 查询目标系统；确认未执行后才重试 |
| 有成功回执，没有 checkpoint | 复用结果并补写 checkpoint，不重复调用 |
| 有 checkpoint，但 Adapter state 无法恢复 | 失败关闭，创建新 run 并引用旧 trace |
| 参数 hash 与幂等台账冲突 | 标记 contract failure，禁止覆盖旧结果 |
| run 已取消，但收到迟到成功结果 | 记录迟到结果；按业务补偿策略处理，不重开 run |
| lease 已被更高 fencing token 接管 | 旧 worker 立即停止写入 |

恢复不是把旧函数再调用一遍。它是一次带身份校验、对账、预算合并和所有权转移的新控制流程。

## 动手验证当前实现

### 前置条件、版本与输入

- Python 3.11+，本仓库 CI 使用 Python 3.12；依赖由 `uv.lock` 固定，uv 版本固定为 `0.11.16`。
- 已按仓库环境准备依赖，从项目根目录离线运行。
- 输入为 `FakeAdapter`、内存 `ToolRegistry`、可控 clock、threading event 和合成 `TaskSpec`；不读取凭据、不调用网络或真实模型。
- 开始前运行 `git status --short`，记录已有工作树改动。

### Windows PowerShell

```powershell
uv run --frozen --offline pytest -q `
  lab/tests/test_loop.py::test_retry_and_idempotency_prevent_duplicate_side_effects `
  lab/tests/test_loop.py::test_idempotency_key_conflict_rejects_changed_tool_or_arguments `
  lab/tests/test_loop.py::test_checkpoint_restores_adapter_position `
  lab/tests/test_loop.py::test_concurrent_cancellation_propagates_after_adapter_returns `
  lab/tests/test_loop.py::test_timeout_stops_before_completing_late_action `
  lab/tests/test_contracts_and_schema.py::test_checkpoint_rejects_inconsistent_or_negative_counters
```

### macOS / Linux

```bash
uv run --frozen --offline pytest -q \
  lab/tests/test_loop.py::test_retry_and_idempotency_prevent_duplicate_side_effects \
  lab/tests/test_loop.py::test_idempotency_key_conflict_rejects_changed_tool_or_arguments \
  lab/tests/test_loop.py::test_checkpoint_restores_adapter_position \
  lab/tests/test_loop.py::test_concurrent_cancellation_propagates_after_adapter_returns \
  lab/tests/test_loop.py::test_timeout_stops_before_completing_late_action \
  lab/tests/test_contracts_and_schema.py::test_checkpoint_rejects_inconsistent_or_negative_counters
```

预期退出码为 0，显示 `7 passed`。这些案例分别证明：

1. 两次 retry trace 与实际 sleeper 值一致，第二个同 key 调用复用内存 cache；
2. 同 key 改 arguments 或 tool name 的两个负例都失败，第二个 handler 不执行；
3. 第一次因 max steps 停止后，FakeAdapter `index` 从 checkpoint 恢复并继续完成；
4. cancel 在阻塞 Adapter 返回后被观察，迟到 complete 不成为完成；
5. 可控时钟越过 timeout 后，迟到 complete 被拒绝；
6. 负计数或 `tool_calls + reused_tool_calls != step` 的 checkpoint 被拒绝。

### 失败、停止、清理与回滚

| 失败 | 先看什么 | 不要怎样绕过 |
| --- | --- | --- |
| retry 次数/等待不符 | `RetryPolicy`、attempt 编号、注入 sleeper | 增大次数直到偶然通过 |
| 同 key 改调用仍复用 | tool name、canonical arguments 指纹、cache entry | 只比较 key 或执行第二个 handler |
| 恢复后 Action 重放或跳过 | checkpoint `adapter_state.index` 与 Action 序列 | 手工改 index 迎合测试 |
| cancel 后仍 completed | token 检查发生在调用哪一侧 | 把线程 sleep 调长隐藏竞态 |
| timeout 后仍 completed | clock 单位与 post-action 检查 | 使用真实等待制造 flaky 测试 |
| 坏 checkpoint 被接受 | counters 类型、有限 cost 与交叉不变量 | 删除负例 |

任一测试失败时停止可靠性成功声明，保存完整输出和当前 diff，先按 retry/checkpoint/cancel/timeout/contract 分类。需要全量回归时运行：

```powershell
uv run --frozen --offline pytest
```

测试只使用内存对象和线程事件，不创建业务资源；pytest 缓存已被 `.gitignore` 忽略。结束后 `git status --short` 应与开始前一致。若为学习修改了实现，使用 `git diff -- lab/src lab/tests` 精确审核，只回滚自己的实验 commit，不覆盖其他工作。

## 从教学实现升级到持久执行

建议按故障模型分阶段，不要一次引入队列、数据库和多 worker：

| 阶段 | 新增能力 | 必须新增的失败注入 |
| --- | --- | --- |
| A：持久身份 | run/task/config/checkpoint schema 与 migration | 旧 schema、错 Task、损坏 checkpoint |
| B：工具台账 | intent、参数 hash、receipt、幂等冲突 | 成功后写 checkpoint 前崩溃 |
| C：总预算 | 持久 deadline、attempt/token/cost 合并 | 恢复后预算不得重置 |
| D：可取消执行 | client timeout、进程/容器终止、迟到结果隔离 | cancel 与成功同时发生 |
| E：并发恢复 | lease、CAS、fencing、heartbeat | 双 worker 接管、旧 owner 迟到写入 |
| F：对账运维 | unknown 队列、人工处理、补偿和审计 | receipt 丢失、目标系统不可查 |

每阶段先固定单进程 baseline，再加入一个明确 crash point。测试既要验证最终状态，也要验证工具实际执行次数、外部对象版本、累计预算、事件顺序和清理结果。

## 故障定位表

| 症状 | 首查层 | 常见根因 | 不要先归因给 |
| --- | --- | --- | --- |
| 恢复后重复写入 | intent/receipt/idempotency | cache 未持久、key 作用域错、崩溃窗口 | 模型重复请求 |
| Run 永久 `running` | lease/state transition | worker 崩溃、无 heartbeat/过期接管 | 任务太难 |
| timeout 后资源仍变化 | Tool/目标系统 | 软超时、请求已送达、迟到结果 | clock 精度 |
| cancel 后仍等待很久 | Adapter/Tool/sleeper | 下游不可取消、token 未传播 | UI 没刷新 |
| checkpoint 能解析但恢复错误 | identity/schema | 配置漂移、旧 Adapter state、错 Task | JSON 序列化 |
| 同 key 返回错误旧结果 | idempotency ledger | 指纹未绑定 tool/参数，或外部 store 身份漂移 | cache 太快 |
| cost/step 恢复后变小 | checkpoint 合并 | 计数重置、并发覆盖、旧版本写入 | 指标展示 |
| 两个 worker 都声称完成 | ownership/fencing | CAS 缺失、lease 过期后旧 owner 仍可写 | 测试偶发 |

先定位第一处可证明的不一致，再向上下游追踪。最终状态相同不代表执行正确：重复发送两次后补偿一次，和只发送一次有完全不同的风险与证据。

## 证据边界与已知限制

当前项目提供 E1 的 fake/replay 证据：运行时契约拒绝坏 checkpoint；runner 在 Adapter 边界检查预算、timeout 和 cancel；retry 有固定退避；内存 cache 只复用同 key、同 tool、同 canonical arguments 的结果并拒绝两类冲突；FakeAdapter 能恢复游标。

当前实现没有：

- checkpoint 持久存储、schema migration、Task/config/run 身份绑定；
- 原始 trace 拼接、绝对 deadline 或跨恢复累计 duration；
- 持久 intent/receipt/idempotency ledger、subject/target/version 身份与跨 worker 原子 reservation；
- 工具级 timeout、可取消 retry sleep 或任意 callable 强制终止；
- 等待审批状态、分布式 lease/CAS/fencing 或多 worker 恢复；
- 外部目标系统对账、unknown 状态、补偿工作流和 artifact/测试/业务系统 validator；当前 validator 异常仍映射为 `invalid_action`。

因此不能从这些测试声称生产环境具备“恰好一次”、硬 timeout、崩溃安全恢复或分布式一致性。命令退出 0 也不证明任何真实模型质量。

## 完成检查表

- [ ] Run、Task、config、tool schema 和 checkpoint identity 能一一对应；
- [ ] Event、checkpoint、receipt 的事实边界清楚；
- [ ] 状态转换由 controller 控制，终态和验收证据绑定；
- [ ] step/call/attempt/token/cost/deadline 恢复后不重置；
- [ ] 可重试错误枚举明确，退避受取消和总预算约束；
- [ ] 幂等 key 绑定作用域与参数 hash，冲突失败关闭；
- [ ] 外部成功但本地未提交的窗口有查询/对账路径；
- [ ] cancel/timeout 的软硬边界和迟到结果策略已测试；
- [ ] 双 worker 恢复使用 CAS/lease/fencing，旧 owner 无法写入；
- [ ] cleanup、补偿和人工 unknown 队列已经实际演练；
- [ ] 当前结论严格限制在真正运行过的 E1/E2/E3 范围。

## 检查题

1. 为什么 checkpoint 中没有 receipt，不能证明工具从未成功？
2. 当前 runner 恢复后哪些预算继续累计，哪个时间预算重新开始？
3. 当前 tool + arguments 指纹阻止了哪两类错误复用，为什么仍不能替代目标系统幂等？
4. 当前取消测试证明了什么，又没有证明什么？
5. Client timeout 为什么不能证明服务端副作用停止？
6. CAS、lease 和 fencing token 分别解决哪类并发问题？
7. 默认 JSON 子集 validator 通过后，为什么高影响任务仍需要 artifact 与业务系统证据？

下一步：在[Python 最小 Harness](/implementation/minimal-harness-python)逐行观察控制循环，在[测试策略](/implementation/testing)设计 crash injection（崩溃注入），再到[可观测性](/foundations/observability)定义恢复所需事件。
