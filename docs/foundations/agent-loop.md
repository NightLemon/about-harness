# Agent 循环：把模型提议变成受控执行

Agent 的价值来自“根据行动结果继续决策”，而不是一次生成很长的答案。Agent loop（智能体循环）把 Task（任务）、模型提议、工具结果和验收串成状态机；模型负责提出下一步，Harness 控制器（控制器）负责决定这个提议能否影响现实、状态怎样更新，以及何时停止。

<span id="学习目标"></span>
<span id="当前最小-runner-实际做了什么"></span>
<span id="当前实现与目标循环的边界"></span>
<span id="动手验证当前循环"></span>
<span id="检查题"></span>

## 循环要同时满足 Safety 与 Liveness

Safety（安全性）回答“坏事不会发生”：未授权 Tool 不执行、预算不变成无穷、终态不被迟到结果重开、同一副作用不重复。Liveness（活性）回答“好事最终能发生或明确停止”：系统不会永远计划、无限重试、持续等待批准或在相同状态中空转。

| 目标 | 典型不变量 | 只有另一边会怎样 |
| --- | --- | --- |
| Safety | 先授权后执行；终态不可重开；计数单调；副作用可对账 | 永远拒绝所有动作很安全，却没有用 |
| Liveness | 有 deadline、进展判定、有限重试和明确终态 | 很快完成但越权、重复写入同样不可接受 |

“尽最大努力完成”不能覆盖安全不变量；“为了安全一直等待”也不是可靠终态。每条循环路径都应能到达 `completed/stopped/failed` 或显式的持久等待状态，并说明是谁、在什么条件下继续。

## 状态不是消息列表

一个可恢复循环至少有五类状态：

| 状态 | 示例 | 权威写入者 | 是否必须进 checkpoint |
| --- | --- | --- | --- |
| Identity（身份） | task/config/instruction/tool schema/environment | ingress/controller | 是，或保存不可变引用 |
| Control（控制） | run revision、阶段、预算、deadline、取消 | controller | 是 |
| Adapter（适配器） | provider response ID、消息游标、连续推理状态 | adapter/controller | 需要恢复时是 |
| Execution（执行） | pending call、attempt、幂等键、receipt（回执） | executor/目标系统 | 保存引用与未知状态 |
| Evidence（证据） | trace 高水位、artifact/validator refs | recorder/validator | 保存可解析引用 |

消息历史只是模型下一次调用的输入之一。它不能代替 run revision、批准结果、外部对象版本或“某次 Tool 调用结果未知”。恢复前先核对身份与未决副作用，再构建上下文；不要先把旧聊天发给模型，让它猜从哪里继续。

## 循环真正传递的是什么

```text
Task + state + observations
          │
          ▼
     Model adapter
          │ proposes Action
          ▼
 schema / budget / policy ──拒绝──► stopped 或 failed
          │允许
          ▼
     Tool executor
          │ returns ToolResult
          ▼
 trace + counters + checkpoint
          │
          ├─ acceptance 成立 ─────► completed
          ├─ 可恢复且仍有预算 ────► 下一轮
          └─ 取消/超时/耗尽/故障 ─► stopped 或 failed
```

Action（动作提议） 只是模型输出的结构化提议。它通过 schema 不等于已获授权，通过授权也不等于执行成功。ToolResult（工具结果） 则描述 executor 实际观察到的值、错误、尝试次数和副作用状态；模型声称“命令成功”不能替代真实退出码。

循环状态至少包含 任务 身份、已发生事件、步骤与调用计数、累计费用、剩余 截止时间（截止时间）、工具执行台账、Adapter（适配器） 连续状态和最新 检查点（检查点）。只把聊天消息重新发给模型，会丢失授权决定、幂等记录和外部回执，不构成可靠恢复。

<span id="stepcallattempt-与-transition-不同"></span>

### Step、Call、Attempt 与 Transition 不同

这些计数服务不同限制，不能都叫“轮数”：

| 单位 | 何时增加 | 解决的问题 |
| --- | --- | --- |
| Model call（模型调用） | 向 Adapter/Provider 发出一次请求 | 调用、token、费用和 rate limit |
| Action（动作） | 一个响应被解析为一个规范化提议 | policy、执行与反馈单位 |
| Tool call（工具调用） | 一个 Action 请求 Tool | 能力使用与副作用边界 |
| Attempt（尝试） | 同一 Tool intent 因可恢复错误再执行 | retry 上限与错误谱系 |
| State transition（状态转换） | controller 提交新 revision | 并发所有权与终态一致性 |
| Resume generation（恢复代） | 从 checkpoint 启动新执行者 | 隔离迟到 worker |

一次 model call 可以没有 Tool、产生一个 Tool，或在更丰富协议中产生多个并发 Tool；一次 Tool call 也可能有多个 attempt。预算、轨迹 和报告分别保存这些计数，否则“三步完成”没有可比较含义。

当前 `HarnessRunner` 的 `step` 只累计成功/复用的 Tool Action，因此 `steps = tool_calls + reused_tool_calls`；Result 在 `complete` 时返回当前 `step`，不会额外加一。验收拒绝 completion 时会保存含最新 model call、cost 和 Adapter 游标的 checkpoint，但其 `step` 不增加。完成提议和验收修正消耗模型调用与申报成本，不能因没有工具步骤而忽略预算。

## 一轮的安全顺序

理想控制器的一轮可以写成：

```python
while not terminal(state):
    enforce_preflight_budgets(state)
    action = validate_action(adapter.next_action(task, state))
    charge_model_usage(state, action)
    enforce_post_action_budgets(state)

    if action.kind == "complete":
        return validate_acceptance(task, state, action.output)

    decision = policy.authorize(task, normalize(action.tool_call))
    if not decision.allowed:
        return stop("permission_denied")

    result = executor.run(action.tool_call)
    record_result_and_side_effect(result)
    checkpoint(state, adapter)
```

顺序本身就是不变量：坏 动作提议 不能先进入 metrics，policy 必须在 工具处理函数 前运行，工具结果 要在 检查点 中有可恢复位置，迟到 completion 不能覆盖 timeout/cancel 终态。任何一步失败都应返回能定位边界的分类，而不是统一变成“模型失败”。

### 一轮有三个提交点

Commit point（提交点）是某个事实从“准备中”变为权威状态的边界：

1. **动作提议 accepted**：适配器 输出通过运行时契约和身份检查，但还未获执行授权；
2. **Effect committed/known**：Tool 返回可对账结果或目标系统 receipt，副作用状态已知；
3. **State committed**：控制器 以预期 revision 写入 工具结果、计数、检查点 或终态。

最危险的是提交点之间崩溃：Tool 已写入外部系统、检查点 尚未保存。恢复时不能因为本地缺少结果就原样执行；先用幂等键查询 executor ledger 和目标系统。若无法确认，进入 `unknown_effect`/人工对账，而不是把未知当失败或成功。

纯读取也要区分“请求已发出”和“结果已进入当前 revision”。取消后到达的读取结果可以作为诊断 artifact 保留，却不能自动改变终态或被下一代 run 当作已接受 observation。

### `complete` 必须经过验收回路

目标架构把 `complete` 当 completion proposal（完成提议）：

```text
complete Action
  → contract / budget / terminal-race check
  → acceptance validator reads frozen artifact
      ├─ pass + hard gates pass → completed
      ├─ repairable failure + budget remains → observation → next Action
      ├─ invalid validator/input → failed or study blocked
      └─ unsafe/forbidden result → stopped/failed + incident path
```

Validator（验证器） 失败反馈要包含可行动的断言、artifact identity 和退出码，但不能泄漏 holdout 标准答案。循环修复次数仍受总预算；不能让“验收失败再试一次”获得无限新调用。验证器 自身也可能错，已知好/坏 artifact、版本和负例必须独立测试。

若输出包含外部副作用，业务验收和副作用对账都要成立。文档写对但消息发错收件人，不能靠文本 rubric 宣告完成；相反，外部对象已创建但最终摘要丢失，也不能盲目重试写操作。

<span id="retryrepair-与-replan"></span>

## Retry、repair 与 replan

三者都会“再尝试”，但责任不同：

| 路径 | 适用失败 | 下一次改变什么 | 不适用 |
| --- | --- | --- | --- |
| Retry（重试） | 限流、短暂网络错误、可恢复冲突 | 仅 attempt/等待时间；保留幂等键 | 确定性测试失败、权限拒绝 |
| Repair（修正） | 参数或 schema 错误 | 依据精确错误生成新 Action | 原样重复坏参数 |
| Replan（重规划） | 假设、实现路线或任务拆分失败 | 方案和后续步骤 | 传输抖动 |

当前 `ToolRegistry` 对标记为 retryable 的工具错误执行有限重试并记录实际 `delay_ms`；相同幂等键只有在 tool name 与 canonical arguments 指纹也相同时才复用，冲突会在 工具处理函数 前失败。它没有通用 replan 策略，repair/replan 仍由下一轮 适配器 行为表达。权限拒绝不能通过改工具名、拆参数或切模型绕过。

<span id="先分类再决定下一步"></span>

### 先分类，再决定下一步

| 观察 | 默认路径 | 原因 |
| --- | --- | --- |
| Provider 429/短暂 5xx | 有限 retry + backoff | 相同请求可能稍后成功 |
| Action schema/参数无效 | repair，生成新 Action | 原样重试不会改变确定性错误 |
| Tool 返回永久业务错误 | replan 或失败 | 需要改变方案，不是传输抖动 |
| Policy deny | 停止/请求有范围的批准 | 不能靠 retry 获得权限 |
| Validator 断言失败 | repair/replan | 输出未满足 Task，不是 infrastructure |
| Fixture/config identity 不符 | 立即失败关闭 | 继续会污染证据 |
| 外部效果 unknown | 查询/对账/人工 | 盲重试可能重复副作用 |
| 安全违规或 Secret 暴露 | 停止并进入事故路径 | 不能用下一次成功抵消 |

错误分类器也是信任边界。把永久错误误标 retryable 会放大费用和副作用；把短暂错误误标失败会降低活性。分类版本、原始错误摘要、attempt 和最终处理进入 轨迹。

## 预算是一组共同停止条件

只设置 `max_steps` 会留下其他无限路径：模型可在一步中等待很久、重试可消耗费用、审批可无限暂停。至少分别考虑：

- tool step 与 model-call 数；
- run 截止时间 与单次 model/tool timeout；
- token、费用、输出和存储；
- retry attempt 与累计 backoff；
- 子任务数量、并发度和人工等待时间。

这些预算应由父 run 统一约束，重试和子任务不能各自获得一份无限新预算。到达边界后保留部分结果与 stop reason；不要为了“尽量完成”静默抬高上限。

<span id="使用账本而不是到最后才计数"></span>

### 使用账本，而不是到最后才计数

Budget ledger（预算账本）至少区分 `limit/reserved/committed/remaining`：

```text
父任务 limit
├─ 当前模型调用 reserved → 返回后 committed actual usage
├─ Tool/fallback/retry committed
├─ 子任务 delegated reservation
├─ Validator/Judge reserved
└─ rollback/cleanup safety reserve
```

并发分支启动前先原子预留最坏或声明上限，避免每个分支都看到同一份 remaining。调用结束后提交实际用量并按协议释放未用 reservation；Provider（供应方） usage 未知时标 `unknown`，不能填零后继续超卖预算。

总 截止时间 使用绝对时间向下传播，子调用 timeout 不得晚于父 截止时间。等待 approval、队列、backoff、join 和 cleanup 都消耗墙钟；恢复不应无条件重新获得完整时限。高风险系统为 验证器、对账和安全 cleanup 预留预算，不能把全部 token/时间花在生成上，最后无力验证或停止。

费用护栏不能只信 动作提议 自报 `cost_usd`。真实组合需要 适配器/供应方 usage、Tool API、Judge、失败重试和人工成本；差异无法对账时停止费用结论。

## 计划什么时候进入循环

Plan（计划）是状态的一部分，不是每个任务必需的仪式。一行可判定修复若能直接描述预期 diff，可以先执行再验证；多文件、需求含糊、迁移不可逆或验收复杂时，先探索并列出依赖与停止点。

计划也不是锁死的脚本。工具证据反驳假设后应更新路线，并记录“哪条证据使计划改变”。如果循环不断重写计划却没有新 observation，问题通常是缺工具、缺 oracle 或缺停止条件，而不是计划还不够长。

<span id="进展循环与活锁"></span>

## 进展、循环与活锁

No progress（无进展）不能仅凭“模型又说了一遍”判断。先定义 task-specific progress marker（任务进展标记）：失败断言减少、未知主张减少、依赖节点完成、artifact version 改变，或一个未决副作用完成对账。

每轮记录：

```text
state revision before/after
action fingerprint
new observation/artifact IDs
acceptance delta
budget consumed
remaining blockers
```

动作提议 fingerprint（动作指纹）可由规范化 kind/tool/参数 hash 生成。连续请求相同 Tool、参数和状态，却没有新结果或 acceptance 改善，说明 cycle（循环）；角色不断互相退回任务但 blocker 不减少，是 livelock（活锁）。达到预注册阈值时停止为 `no_progress/cycle_detected`、升级人工或切换已声明 fallback。

这些 stop reason 是目标设计，当前 `result-v1.1` 尚未枚举。不能为了记录它们把当前 `tool_error` 随意改名；应发布新 schema/映射，保留旧 reader 和历史含义。

“文件内容变化”也不一定是进展：格式化来回抖动、生成时间戳变化或重复创建同一 artifact 都是 no-op（无有效变化）。进展标记应与 任务 acceptance 和依赖图相关。

Fallback（回退方案）不是免预算重启。它记录触发原因，继承父任务剩余账本、权限和禁止项；切模型、开新会话或委派子 Agent 不能重置安全边界。

## 并发 Tool 与部分成功

并发适合互不依赖的只读检索或独立验证，但会新增 join（汇合）语义：

```text
Action proposes calls A, B, C
→ validate and authorize each call separately
→ reserve shared budget
→ execute with call/attempt IDs
→ A succeeds, B fails, C is cancelled
→ join policy decides: fail / partial result / compensate / replan
→ commit one new run revision
```

不能因为 A 合法就批量授权 B/C；也不能把三个结果按到达顺序拼给模型后声称固定。Join 保存预期分支、实际状态、被消费结果和缺失原因。一个分支触发安全问题时，取消同组未开始动作；已提交副作用按各自 receipt 对账。

Read/write 混合并发更危险：读取可能基于写入前版本，两个写入也可能争夺同一资源。使用版本前置条件、lease/fencing token（租约/隔离令牌）或串行化；无法定义冲突语义时不要并行。

当前 Runner 一轮只有一个 Tool 动作提议，没有 fan-out/join。即使未来 适配器 能返回多个 ToolCall（工具调用），控制器、policy、budget、轨迹 和 检查点 没有共同升级前，也不能直接 `gather` 执行。

## 每个阶段怎样失败

| 阶段 | 典型失败 | 优先检查 |
| --- | --- | --- |
| Task | “优化一下”没有边界 | 目标、允许范围、acceptance、预算 |
| Observation | 读错目录或上下文过量 | 来源、位置、裁剪和指令加载 |
| Model/Adapter | role、tool call ID 或 Action 映射错误 | 原始响应与 canonical Action diff |
| Policy | 合法动作被错拒或越权放行 | 主体、资源、规范化参数、授权 |
| Executor | timeout、部分副作用、错误不可恢复 | 幂等键、回执、错误分类 |
| Feedback | 结果截断或未回送 | call ID、序列化、事件顺序 |
| Acceptance | 模型自称完成 | 外部 oracle、产物版本、终态顺序 |
| Recovery | 无限重试或重复写入 | checkpoint、台账、预算与对账 |

沿这条链找 expected/observed 第一处分歧，比从最终答案猜根因更可靠。实操方法见[问题诊断](/practice/debugging)。

## 人在循环中的位置

Human-in-the-loop（人在回路）不是“每一步都询问”。用户已授权且可由 diff 回看的工作区内修改，可以在 sandbox（沙箱）与预算内连续推进；公开发布、费用、权限提升、外发数据和不可逆删除等真实副作用才需要绑定目标与参数的授权。

等待批准也属于运行状态，应受 截止时间 和取消控制。批准到达时要重新检查 run 是否仍活跃、目标版本是否变化；迟到批准不能复活终态。把低风险动作全部变成弹窗会造成审批疲劳，反而降低高风险确认的质量。

### 等待不是丢失控制权

持久 `waiting_approval` 状态至少保存 approval ID、请求者、具体 Tool/参数 hash、资源范围、风险、请求/过期时间、当前 run revision 和剩余预算。批准只对这份不可变 intent 生效；参数改变、截止时间 过期或 run 已取消后需要新请求。

用户拒绝、暂不决定、客户端断线和批准过期是不同结果。是否允许稍后恢复、谁能重新发起、期间外部状态怎样复核，都进入状态机。当前同步 callback 没有这些语义，不能用一次函数返回模拟生产审批工作流。

## 一次受证据约束的轨迹

```text
Task：修复登录超时后的刷新失败；先复现；不能改变 token 有效期。
Observation：搜索 refresh 入口，定位实现与已有测试。
Hypothesis：刷新与过期检查存在竞态。
ToolResult：新增的固定时钟测试稳定失败，退出码 1。
Action：只调整状态转换，不改 token 配置。
ToolResult：目标测试和认证回归全部通过，退出码 0。
Validator：diff 仅含允许文件；失败用例已转绿；禁区值未变。
Result：completed，并关联测试、diff 和起始 commit。
```

高质量来自每个假设都被 observation 约束，且 completion 由独立证据支撑；不是因为模型输出了更长的思考文本。

### 同一轨迹的失败版本

若刷新写操作发出后 Tool timeout，下一步不是直接再调用：

```text
tool intent：refresh-session，idempotency=session-42/v7
本地结果：timeout，effect=unknown
目标系统查询：session 已更新到 v8，receipt=r-19
controller：接受迟到/查询证据，提交 ToolResult，不重复写入
validator：固定时钟测试通过，旧 token 配置未变
terminal：completed，关联 intent、receipt、测试和 revision
```

若目标系统无法查询或不支持幂等，正确终态可能是停止并请求人工对账，而不是“多试几次总会成功”。这正是可靠循环与普通 while-loop 的区别。

## 已知限制

- 当前 runner 是同步、单进程 E1 实现，没有消息队列、持久数据库、分布式锁或跨进程恢复。
- Timeout 是边界检查，不能强制抢占任意永久阻塞的 Python callable；取消也在 适配器 返回后才被观察。
- PermissionPolicy 只有同步 allow/deny 接缝，没有持久 `waiting-approval` 状态、审批 ID 和过期恢复。
- 幂等 cache 只在进程内，不能证明外部系统 exactly-once（恰好一次）。
- 默认验收器只做 JSON 子集比对；工作区研究另有真实测试验收，可选 Responses 另有模拟协议验证；默认循环没有外部业务对账或补偿事务；验证器 异常在 result-v1.1 暂映射为 `invalid_action`。

这些测试证明的是固定控制路径，不是生产可靠性或模型质量。


## 实践入口

[从完整离线案例观察这些责任](/practice/end-to-end)。实现范围、命令、预期断言和清理步骤在实验页维护。
