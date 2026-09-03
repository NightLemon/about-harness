# Agent 循环：把模型提议变成受控执行

Agent 的价值来自“根据行动结果继续决策”，而不是一次生成很长的答案。Agent loop（智能体循环）把 Task、模型提议、工具结果和验收串成状态机；模型负责提出下一步，Harness controller（控制器）负责决定这个提议能否影响现实、状态怎样更新，以及何时停止。

## 学习目标

读完本页，你应能：

- 区分 Action（动作提议）、ToolResult（工具结果）与 run 状态；
- 解释为什么 schema 校验、授权、执行、记录和完成验收必须分层；
- 区分 retry、repair 与 replan，而不是把所有失败都原样重试；
- 为步骤、调用、时间、费用和人工等待设计共享预算；
- 用当前最小 runner 的测试验证停止原因，同时说清它尚未实现什么。

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

Action 只是模型输出的结构化提议。它通过 schema 不等于已获授权，通过授权也不等于执行成功。ToolResult 则描述 executor 实际观察到的值、错误、尝试次数和副作用状态；模型声称“命令成功”不能替代真实退出码。

循环状态至少包含 Task 身份、已发生事件、步骤与调用计数、累计费用、剩余 deadline（截止时间）、工具执行台账、Adapter 连续状态和最新 checkpoint（检查点）。只把聊天消息重新发给模型，会丢失授权决定、幂等记录和外部回执，不构成可靠恢复。

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

顺序本身就是不变量：坏 Action 不能先进入 metrics，policy 必须在 handler 前运行，ToolResult 要在 checkpoint 中有可恢复位置，迟到 completion 不能覆盖 timeout/cancel 终态。任何一步失败都应返回能定位边界的分类，而不是统一变成“模型失败”。

## 当前最小 Runner 实际做了什么

仓库中的 `HarnessRunner` 使用两类 Action：`tool` 与 `complete`。它在模型调用前检查取消、总 timeout 和 model-call budget；Action 返回后累计有限、非负 cost，再检查取消、timeout 与 cost budget；工具调用只有经过 `PermissionPolicy` 才交给 `ToolRegistry`。

工具成功后，runner 记录 `tool_result`，更新实际/复用调用计数，保存 Adapter snapshot，并生成 checkpoint。终态返回 `RunResult`，其中包含 `status`、`stop_reason`、metrics、trace、checkpoint 和 error。当前停止原因包括：

| `stop_reason` | 触发边界 | 终态含义 |
| --- | --- | --- |
| `completed` | Adapter 提出合法 `complete` | 当前实现接受输出并结束 |
| `max_steps` | 工具循环达到步数上限 | 正常受控停止，不是完成 |
| `model_budget` | 调用数或累计 cost 超限 | 预算停止 |
| `timeout` | preflight 或 Action 返回后超过总时限 | 丢弃迟到完成 |
| `cancelled` | cancellation token 已设置 | 停止继续执行 |
| `permission_denied` | policy 拒绝工具 | handler 未执行 |
| `tool_error` | 工具重试后仍失败 | 执行边界失败 |
| `invalid_action` | Adapter 抛错或返回非 `Action` | 契约边界失败 |

最重要的 acceptance gap（验收缺口）是：当前 runner 没有独立 validator，合法 `complete` 会直接得到 `completed`，并未读取 `TaskSpec.acceptance` 复查测试、产物或业务条件。因此它能证明控制流 E1 契约，却不能把 `completed` 当作业务任务真实完成。生产设计应让 validator 根据外部证据决定完成，或把未通过验收的 completion 送回循环修正。

## Retry、repair 与 replan

三者都会“再尝试”，但责任不同：

| 路径 | 适用失败 | 下一次改变什么 | 不适用 |
| --- | --- | --- | --- |
| Retry（重试） | 限流、短暂网络错误、可恢复冲突 | 仅 attempt/等待时间；保留幂等键 | 确定性测试失败、权限拒绝 |
| Repair（修正） | 参数或 schema 错误 | 依据精确错误生成新 Action | 原样重复坏参数 |
| Replan（重规划） | 假设、实现路线或任务拆分失败 | 方案和后续步骤 | 传输抖动 |

当前 `ToolRegistry` 对标记为 retryable 的工具错误执行有限重试并记录实际 `delay_ms`；相同幂等键的成功结果可以复用。它没有通用 replan 策略，repair/replan 仍由下一轮 Adapter 行为表达。权限拒绝不能通过改工具名、拆参数或切模型绕过。

## 预算是一组共同停止条件

只设置 `max_steps` 会留下其他无限路径：模型可在一步中等待很久、重试可消耗费用、审批可无限暂停。至少分别考虑：

- tool step 与 model-call 数；
- run deadline 与单次 model/tool timeout；
- token、费用、输出和存储；
- retry attempt 与累计 backoff；
- 子任务数量、并发度和人工等待时间。

这些预算应由父 run 统一约束，重试和子任务不能各自获得一份无限新预算。到达边界后保留部分结果与 stop reason；不要为了“尽量完成”静默抬高上限。

## 计划什么时候进入循环

Plan（计划）是状态的一部分，不是每个任务必需的仪式。一行可判定修复若能直接描述预期 diff，可以先执行再验证；多文件、需求含糊、迁移不可逆或验收复杂时，先探索并列出依赖与停止点。

计划也不是锁死的脚本。工具证据反驳假设后应更新路线，并记录“哪条证据使计划改变”。如果循环不断重写计划却没有新 observation，问题通常是缺工具、缺 oracle 或缺停止条件，而不是计划还不够长。

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

等待批准也属于运行状态，应受 deadline 和取消控制。批准到达时要重新检查 run 是否仍活跃、目标版本是否变化；迟到批准不能复活终态。把低风险动作全部变成弹窗会造成审批疲劳，反而降低高风险确认的质量。

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

## 动手验证当前循环

前置条件是 Python 3.11+、`uv 0.11.16`、仓库锁文件可用。测试使用 FakeAdapter、内存工具和可控时钟，不读取凭据、不访问网络，也不产生真实外部副作用。

```powershell
uv run --frozen --offline pytest -q lab/tests/test_loop.py
```

预期退出码为 0，并显示 `9 passed`。九条路径分别覆盖正常完成、model budget、无限工具循环、权限拒绝、重试/幂等、坏 Adapter 返回、checkpoint 恢复、并发取消与迟到 Action timeout。重点断言包括：未授权 handler 调用次数为零；两次 retry 的等待值进入 trace；恢复保留 Adapter position；迟到 `complete` 不会覆盖 `timeout`。

若测试失败，先按 `contract / budget / policy / tool / checkpoint / cancel / timeout` 分类并保留输出，不通过增大预算、删除负例或放宽权限让结果变绿。本命令只读测试输入；pytest 临时数据自动清理。若为了学习修改代码，回滚时只恢复自己的 diff，不覆盖工作树中其他改动。

## 已知限制

- 当前 runner 是同步、单进程 E1 实现，没有消息队列、持久数据库、分布式锁或跨进程恢复。
- Timeout 是边界检查，不能强制抢占任意永久阻塞的 Python callable；取消也在 Adapter 返回后才被观察。
- PermissionPolicy 只有同步 allow/deny 接缝，没有持久 `waiting-approval` 状态、审批 ID 和过期恢复。
- 幂等 cache 只在进程内，不能证明外部系统 exactly-once（恰好一次）。
- 没有独立 acceptance validator、业务对账、补偿事务或真实 model/provider Adapter。

这些限制意味着九条测试证明的是固定控制路径，不是生产可靠性或模型质量。

## 检查题

1. Action 通过 schema 后，为什么还不能直接执行？
2. 参数错误、限流和测试失败分别应走 repair、retry 还是 replan？
3. 当前 `completed` 为什么不等于业务 acceptance 已成立？
4. 取消在 Adapter 返回后才被观察，会留下什么风险？
5. 为什么 checkpoint 不能替代外部系统的业务回执？

下一步：把循环中的状态交给[状态与可靠执行](/foundations/state-reliability)，在[系统架构](/foundations/architecture)查看组件责任，再到[测试策略](/implementation/testing)设计失败路径。
