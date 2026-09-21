# 状态与可靠执行

可靠执行的目标不是“永不失败”，而是让每次失败都可分类、可停止、可安全重试、可恢复，并且不会因为恢复而重复产生副作用。只保存对话历史不等于保存运行状态；可靠 Harness 还要知道动作执行到哪里、外部系统是否已经接受动作，以及下一步能否继续。

本页先讲稳定机制，再对照仓库中的 Python 最小 runner。当前实现提供 E1（固定 fake、可重复断言）证据，不是持久化任务系统，也没有真实模型或外部服务。理解这条边界，比记住某个 检查点 字段更重要。

<span id="学习目标"></span>
<span id="先看结论"></span>
<span id="当前-checkpoint-契约"></span>
<span id="动手验证当前实现"></span>
<span id="前置条件、版本与输入"></span>
<span id="前置条件版本与输入"></span>
<span id="windows-powershell"></span>
<span id="macos-linux"></span>
<span id="失败、停止、清理与回滚"></span>
<span id="失败停止清理与回滚"></span>
<span id="证据边界与已知限制"></span>
<span id="完成检查表"></span>
<span id="检查题"></span>

## 先分清三类状态

| 状态层 | 典型内容 | 主要写入者 | 权威来源 | 丢失后的风险 |
| --- | --- | --- | --- | --- |
| 控制状态 | run 状态、step、预算、停止原因、批准结果 | controller | 状态库与事件日志 | 无限循环、越过预算、错误宣告完成 |
| Adapter 状态 | response/call ID、消息游标、模型连续状态 | adapter | Provider/Adapter 回执与 checkpoint | 重放错误上下文、丢失工具调用连续性 |
| 业务状态 | 文件版本、订单号、消息 ID、外部回执 | tool 与目标系统 | 目标系统/业务台账 | 重复写入、重复付款、无法判断是否成功 |

Checkpoint（检查点） 是恢复控制状态和 Adapter（适配器） 状态的快照；它不能替代外部系统的业务记录。恢复时必须同时核对 检查点、工具执行台账和目标系统 receipt（回执），不能因为 检查点 里没有结果就推断动作从未发生。

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

同一个 `task_id` 不代表同一次执行；模型、工具 schema、权限或起始 commit 改变后也不能静默沿用旧 检查点。恢复程序应验证 检查点 绑定的身份与当前执行组合完全兼容，否则创建新 run 并保留父子 lineage（来源链）。

当前 `RunCheckpoint` 没有 `run_id`、`task_id`、schema/config hash、截止时间 或 generation。调用方还可以在恢复时不传旧 `run_id`，此时 runner 会生成新 ID。因此它只能作为同一进程教学对象，不能直接作为跨服务恢复协议。

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

状态转换只能由 控制器 写入。模型可以提出“完成”，工具可以返回“成功”，但它们不应直接把持久 run 改为 `completed`。每次转换至少检查：

1. 终态不可重新进入 `running`；需要继续时创建有父引用的新 run。
2. `completed` 绑定业务验收证据，不能只绑定模型文本。
3. step、model call、tool call、attempt 和 cost 只能单调增加。
4. `waiting-approval` 仍受总 截止时间 和取消信号约束。
5. 每个转换带 expected version；旧 worker 不能覆盖新 worker 的状态。
6. 终态写入与最终事件/Result（结果） 要么原子提交，要么可通过 reconciliation（对账）修复。

当前实现没有持久的 `created/running/waiting-approval` 行；`PermissionPolicy` 同步调用 approve callback，缺少 approver 或被拒绝时直接返回 `stopped/permission_denied`。Python 与 TS 的 `Action.complete` 都先经过 JSON 子集 验证器：拒绝结果进入 轨迹，修正通过后才产生 `completed`；Python 还保存 适配器 游标/预算 检查点，TS 没有恢复接口。但默认 验证器 只比较内存输出；空 acceptance 可通过，也没有文件、测试或目标系统证据，因此 `completed` 仍只能按已声明的有限 oracle 解释。

<span id="eventcheckpoint-与-receipt"></span>

## Event、Checkpoint 与 Receipt

三种记录回答三个问题：

| 记录 | 回答 | 适合内容 | 不足 |
| --- | --- | --- | --- |
| Event（事件） | 发生过什么？ | action、policy、retry、tool result、状态转换 | 重放成本高，外部事实可能不完整 |
| Checkpoint | 从哪里继续？ | 累计计数、游标、版本、未完成 intent | 只反映提交时刻，不证明之后没有副作用 |
| Receipt | 外部系统接受了什么？ | 资源 ID、版本、幂等键、结果状态 | 不包含完整 Harness 控制上下文 |

生产 检查点 通常还需要：

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

## 最小实现的恢复边界

仓库的 `RunCheckpoint` 只有六个字段：

| 字段 | 含义 | 当前校验 |
| --- | --- | --- |
| `step` | 已完成工具步骤数 | 非负整数 |
| `model_calls` | 已消费的 Adapter Action 数 | 非负且不得小于 `step` |
| `tool_calls` | 实际执行的工具调用数 | 与 reused 合计必须等于 `step` |
| `reused_tool_calls` | 从 cache 复用的工具结果数 | 非负 |
| `cost_usd` | 累计 Action 声明成本 | 有限、非负 |
| `adapter_state` | Adapter 自定义 JSON 对象 | 必须为对象；FakeAdapter 另验 `index` |

每次工具成功或 cache 命中后，runner 创建新 checkpoint；completion 验收拒绝后也会保存 checkpoint，以保留已消费调用、成本与 Adapter 游标。完成 Action 不增加 `steps`，验收通过时沿用最近 checkpoint；`steps` 始终只计算成功或复用的工具状态转移。最终 Result 的 `model_calls`、cost 可能已包含后续 completion proposal，因此这些值可以大于最近 checkpoint，对应的 tool step 则保持一致。

恢复时，runner 继承 step/model/tool/reused/cost，并调用 `adapter.restore(adapter_state)`。它会创建新的 TraceRecorder，所以新 Result 的 trace 不包含上一段事件；`started` 也重新读取时钟，所以 `timeout_ms` 从恢复调用开始重新计算。工具 cache 不在 checkpoint 内，新建 `ToolRegistry` 后旧幂等结果不会恢复。

这些限制意味着 checkpoint 适合演示 Adapter 游标继续，不足以覆盖“外部工具已成功但 checkpoint 未写入”的关键崩溃窗口。

## Deadline 与真正的超时

Timeout（超时）描述单次操作最多等待多久；截止时间 描述整个 run 最晚何时结束。可靠 控制器 应使用单调时钟计算剩余时长，同时持久化可跨进程解释的绝对截止信息，并把较小的剩余预算传给 model、tool、队列和子任务。

墙上时钟适合审计时间戳，不适合单进程耗时差，因为系统时间可能跳变。跨进程恢复又不能只保存某台机器的 monotonic 数值，所以通常同时保存 wall-clock 截止时间、原始预算和每段单调耗时，恢复时按保守规则重建剩余预算。

软边界与硬边界必须分开：

| 边界 | 行为 | 能保证 | 不能保证 |
| --- | --- | --- | --- |
| 调用前检查 | 超时后不再启动新调用 | 不新增工作 | 已启动调用会停止 |
| 调用返回后检查 | 丢弃迟到 Action/Result | 不把迟到结果当完成 | 外部副作用没发生 |
| Client timeout | 请求达到上限后返回/取消 | 客户端不再等待 | 服务端一定停止 |
| 可终止进程/容器 | 到期终止执行单元 | 本地计算被抢占 | 远端已接收动作被撤回 |

当前 runner 在每轮 适配器 前检查 cancel/timeout/model-call budget，在 适配器 返回后再次检查 cancel/timeout/cost。于是迟到的 `complete` Action（动作提议） 不会成为完成结果。它没有把剩余 截止时间 传进 适配器 或 Tool，也不能抢占阻塞 callable。

工具成功后不会立刻做 post-tool timeout 检查；它会记录结果和 检查点，到下一轮 preflight 才停止。若工具在 截止时间 后产生外部副作用，当前 runner 不能撤回。恢复又会重启计时，因此当前 `timeout_ms` 是每次 `run()` 调用的边界，不是持久化的端到端 截止时间。

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

`retry` 轨迹 记录失败 attempt、实际 `delay_ms` 和错误文本；测试用注入 sleeper 断言等待值为 `0.01`、`0.02` 秒。重试 attempt 不增加 `tool_calls`；一次逻辑工具调用最终成功后才计为 1。

当前重试器不知道 run 截止时间、取消 token 或剩余费用，sleep 也不可取消。因此“重试共享总预算”是目标机制，不是当前 E1 runner 已完整实现的事实。

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

当前 `ToolRegistry` 仍用 `idempotency_key` 索引，但 cache entry 同时保存 `tool name + canonical arguments` 的 SHA-256 指纹与 result。再次看到同 key 时，只有指纹完全一致才返回 `reused=true`；tool 或参数变化会抛 `IdempotencyConflictError`，由 runner 返回 `failed/tool_error`，第二个 工具处理函数 不会执行。参数编码按 object key 排序、使用紧凑 UTF-8 JSON，并保守地区分 `true`、`1` 与 `1.0`；它不是完整 JCS，也没有把 subject、target 或 operation version 纳入身份。

当前正例证明：一个 flaky 工具处理函数 前两次抛 `RetryableError`、第三次成功；随后 `call_id` 和 object key 顺序不同、但业务调用相同的第二个 ToolCall（工具调用） 命中内存 cache，工具处理函数 总尝试数保持 3。两个负例分别改变 arguments 和 tool name，证明冲突不会复用旧结果或执行第二个 工具处理函数。它们仍没有证明 cache 持久化、跨进程并发互斥、目标系统幂等或 unknown outcome 对账。

## 四个崩溃窗口

副作用的理想顺序是先保存 intent，再执行外部动作，保存 receipt，最后提交 检查点。但进程可能在任何两步之间崩溃：

| 最后可证明的事实 | 不能直接推断 | 恢复动作 |
| --- | --- | --- |
| 没有 intent | 动作一定没发生；可能有未记录旁路 | 检查事件/目标系统，确认后再创建 intent |
| 有 intent，无 receipt | 动作未执行 | 用幂等键查询目标系统；未知时失败关闭或人工对账 |
| 有成功 receipt，无 checkpoint | 需要再次执行 | 复用结果并补写 checkpoint |
| 有 checkpoint，业务对象版本已变化 | checkpoint 仍可直接继续 | 校验版本/所有权，必要时创建新 run |

最危险的窗口是“外部动作成功，但本地 receipt/检查点 尚未保存”。如果目标系统不支持幂等键或查询，Harness 无法仅靠本地状态消除重复风险。此时应把结果标为 `unknown` 并转人工，而不是把重试包装成可靠恢复。

仓库的[可靠性恢复工作坊](/practice/reliability-recovery)专门复现这个窗口：合成服务先提交写入再丢失响应，安全路径查询原 key 的 receipt，危险路径换新 key 后确定性地产生第二个副作用。它补充 E1 教学接缝，不表示 `HarnessRunner` 已获得持久恢复能力。

Transactional outbox（事务发件箱）可以把业务状态变化与待发送 intent 放在同一事务，worker 再至少一次投递；inbox/去重表在接收侧拒绝重复。它们降低窗口风险，但仍要处理过期、冲突、乱序和人工对账。

<span id="取消迟到结果与并发"></span>

## 取消、迟到结果与并发

取消是状态转换，不是只设置 UI 标志。理想情况下，父任务取消要传播到子任务、模型流、工具进程、退避 sleeper、队列和等待中的批准；每个边界都要定义能否抢占、何时检查信号、如何处理迟到结果。

当前 `CancellationToken` 是进程内 `threading.Event`。runner 在 适配器 调用前后读取它。测试让 适配器 在线程中阻塞，设置 cancel 后再释放 适配器，最后得到 `stopped/cancelled`；这证明迟到 complete 不会被接受，不证明阻塞 适配器 在 cancel 时被主动中止。工具执行和 retry sleep 也没有读取 token。

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

1. 读取 run 身份、最新持久 检查点 及其版本；
2. 验证 Task（任务）/config/tool schema 与 检查点 兼容；
3. 取得 lease/CAS 所有权，保存新的 fencing token；
4. 查询所有 pending intent 的目标系统 receipt；
5. 合并累计预算，重建剩余 截止时间，不把计数归零；
6. 恢复 适配器 游标和可恢复工具状态；
7. 对 unknown 副作用失败关闭，对 confirmed result 复用；
8. 从新 generation 继续，保留父 轨迹 high-water mark；
9. 完成后运行独立业务 验证器，再写终态。

| 已有证据 | 恢复决策 |
| --- | --- |
| 只有 intent，没有外部回执 | 查询目标系统；确认未执行后才重试 |
| 有成功回执，没有 checkpoint | 复用结果并补写 checkpoint，不重复调用 |
| 有 checkpoint，但 Adapter state 无法恢复 | 失败关闭，创建新 run 并引用旧 trace |
| 参数 hash 与幂等台账冲突 | 标记 contract failure，禁止覆盖旧结果 |
| run 已取消，但收到迟到成功结果 | 记录迟到结果；按业务补偿策略处理，不重开 run |
| lease 已被更高 fencing token 接管 | 旧 worker 立即停止写入 |

恢复不是把旧函数再调用一遍。它是一次带身份校验、对账、预算合并和所有权转移的新控制流程。

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

每阶段先固定单进程 基线，再加入一个明确 crash point。测试既要验证最终状态，也要验证工具实际执行次数、外部对象版本、累计预算、事件顺序和清理结果。

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


## 实践入口

[从完整离线案例观察这些责任](/practice/end-to-end)。实现范围、命令、预期断言和清理步骤在实验页维护。
