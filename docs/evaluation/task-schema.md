# Task、Action、Run、Trace 与 Result Schema

结构化记录的价值不只是“方便解析”，而是把一次 agent 运行拆成可以独立验证、交叉引用和长期迁移的事实。Task（任务） 定义要做什么，Action（动作提议） 表达模型提议的下一步，Run 固定在哪些条件下做，Trace（轨迹） 保存过程中发生了什么，Result（结果） 说明怎样结束；Study 与 EvalRun 再把多次运行组织成比较研究。

本项目的 `lab/schemas/` 使用 JSON Schema draft 2020-12。Schema（结构契约）只验证单个对象的形状；业务语义、对象关系和研究充分性还需要其他层的检查，不能把“JSON 合法”当成“结果可信”。

<span id="前置条件与输入"></span>
<span id="命令"></span>
<span id="预期输出与断言"></span>
<span id="失败案例与停止"></span>
<span id="清理、回滚与限制"></span>
<span id="清理回滚与限制"></span>
<span id="检查题"></span>

<span id="study-与-evalrun-从执行事实到比较矩阵"></span>
<span id="study-与-evalrun从执行事实到比较矩阵"></span>

<span id="在本项目验证契约"></span>

## 九类对象与各自所有权

| 对象 | 何时创建 | 负责回答 | 不应承载 |
| --- | --- | --- | --- |
| `Task` | 运行前 | 目标、输入、工具、预算和验收是什么 | 某次运行的实际结果 |
| `Action` | 每次模型决策后 | 提议调用哪个工具或提交什么输出 | 工具授权、执行结果或完成事实 |
| `Config` | 运行前 | 模型、adapter、控制与工具组合是什么 | 针对单个 task 的临时状态 |
| `Run` | 启动时 | 本次执行的 task、环境、config 和 fixture 是什么 | 不断覆盖的过程日志 |
| `Trace` | 执行中追加 | action、工具、policy、重试与停止如何发生 | 聚合后的成功率 |
| `Result` | 终止时 | 最终状态、停止原因、指标和 checkpoint 是什么 | 未脱敏的全部原始输入 |
| `FixtureLineage` | 冻结输入时 | fixture 来自哪个不可变 commit/path/hash | 当前工作树的模糊引用 |
| `Study` | 正式运行前 | 比较哪些 task/config/repeat/split 和门槛 | 看完结果后的临时分析选择 |
| `EvalRun` | 每个矩阵单元结束时 | 可聚合的身份、结果、资源和失败类型 | 完整的逐事件 trace |

`Run` 与 `EvalRun` 名字相近但用途不同：前者是 harness 单次执行的环境封套，后者是研究矩阵的一行扁平记录。正式系统可以从 Run、结果 和使用量生成 EvalRun，但必须保留源对象引用，不能手工复制后失去谱系。

## 对象怎样连成一条证据链

```text
Task(task_id, goal, input, allowed_tools, budgets, acceptance)
  ├─ FixtureLineage(task_id → immutable commit/path/hash)
  └─ Run(run_id, task_id, environment, config, fixture_hash)
       ├─ Action(kind, tool_call/output, cost) → policy/validator
       ├─ Trace(run_id, ordered events)
       └─ Result(run_id, task_id, status, stop_reason, metrics, checkpoint)

Study(study_id, task_id[], config_id[], repeats, split, promotion)
  └─ EvalRun(run_id, task_id, config_id, repeat, split, identity, outcome)
```

稳定 ID 用来连接对象，版本/hash 用来判断对象是否仍是同一个实验条件。`task_id` 相同但 fixture 或验收变化时，必须建立可区分的新版本；不能用 ID 相同掩盖内容变化。`run_id` 标识一次尝试，重试也应产生新 ID，并关联原尝试。

<span id="task冻结意图而不是写一段提示词"></span>

## Task：冻结意图，而不是写一段提示词

当前 `task-v1` 要求 `schema_version`、合法 `task_id`、非空 `goal`、不重复的 `allowed_tools` 和三项正整数预算：`max_steps`、`max_model_calls`、`timeout_ms`；`max_cost_usd` 若存在则必须非负。

这些字段分别解决不同问题：

- `goal` 描述可观察的目标，不应藏入标准答案；
- `input` 放结构化输入引用，避免把大型 fixture 复制进任务；
- `allowed_tools` 是最小能力清单，不等同于执行时已经完成授权；
- `budgets` 让 控制器 能在模型失控前确定性停止；
- `acceptance` 保存机器可判定的期望；
- `metadata` 适合证据等级、fixture hash/ref、来源与风险标签。

任务 还应在关联协议中记录禁止动作、cleanup（清理）、人工 rubric 和任务版本。当前 JSON Schema 允许 `acceptance`、`metadata` 为任意对象，因此“字段存在”不证明验收足够；task 作者和 checker 仍需验证语义。

一个好任务能回答“怎样算完成”和“即使输出正确，哪些行为也算失败”。例如浏览器提取不仅断言返回记录，还要断言外部导航为 0、页面注入被拒绝。

<span id="action候选动作不是授权或完成"></span>

## Action：候选动作不是授权或完成

`action-v1` 使用 `oneOf` 表达两个互斥分支：`tool` 必须含完整 `tool_call` 与有限非负 `cost_usd`，`complete` 必须含 `output` 与成本；任何混合字段、缺失字段或额外字段都拒绝。Tool call 至少固定 `call_id`、非空名称、JSON object 参数与 `idempotency_key`。

Schema 只定义线协议。Python `Action.from_dict` / `ToolCall.from_dict` 和 TypeScript `validateAction` 才是在进程边界把不可信对象转成内部 动作提议；两边都递归拒绝非有限 JSON 数字，Python 还显式拒绝循环对象。直接调用 dataclass 构造器或写 `as Action` 不能替代 wire parsing；Python runner 还会深拷贝并重建 Adapter（适配器） 返回的 动作提议，避免带坏嵌套值或返回后可变引用越过边界。

动作提议 合法仍不代表可以执行：tool 分支还需 policy、参数约束、预算和幂等检查；complete 分支还需 acceptance 验证器。`cost_usd` 只是当前动作申报值，也不能替代 供应方 usage 对账。公共 fixture 用 共享动作正反例固定结构接受边界，不声称覆盖 供应方 stream、消息连续性或业务授权。

<span id="config把控制变量变成可比较身份"></span>

## Config：把控制变量变成可比较身份

`config-v1` 固定 `config_id`、说明、`model_id`、适配器、证据等级、live 开关、网络模式、步骤/调用预算与工具集合，并可记录 controls 和 `changed_variable`。Config 不应只叫 `candidate-final`；名称之外还要计算或保存精确内容 hash，并绑定 harness/instruction/environment 版本。

任务 budget 和 Config budget 同时存在时应定义合并规则，例如取更严格上限。未定义优先级会导致相同 任务 在不同实现里获得不同权限。当前示例 runner 由运行时契约解释这些字段；跨语言实现必须用同一组负例校验。

`live_enabled=false` 与 `network=none` 是两道不同边界：前者禁止真实 适配器，后者限制运行环境。只有一个字段为安全值不足以证明离线；还要看实际 适配器、工具与网络策略。

<span id="run在动作发生前固定现场"></span>

## Run：在动作发生前固定现场

`run-v1` 需要 `run_id`、`task_id`、ISO date-time 的 `started_at`、environment 和 config。当前 environment 至少记录 `offline`、Python 版本与 platform；正式研究还应扩展 Node、依赖锁、镜像 digest、region、代码 commit 和网络策略。

Run 应在第一次模型调用或工具副作用之前写入。启动后如果 config、fixture 或 instruction 变化，应该终止并产生新 Run，不能覆盖原封套。`fixture_hash` 虽在当前 schema 中是可选字段，但需要 fixture 的任务应由更高层契约强制它存在并与 任务/Lineage 一致。

环境信息不是自由文本“same as before”。可比较条件必须能机器匹配；无法固定的服务端身份记录时间与返回 ID，并在报告中降级结论。

<span id="trace追加事件而不是拼接日志"></span>

## Trace：追加事件，而不是拼接日志

当前 `trace-v1.1` 用 `run_id` 关联运行，事件包含 `sequence`、`kind`、`timestamp_ms` 和结构化 `data`。允许的事件类型是：

```text
run_started → model_action → acceptance_result/tool_result/policy_denied/retry/checkpoint → run_stopped
```

轨迹 应 append-only（只追加）：已写事件不可因后续成功而删除。`sequence` 从 0 连续递增，时间戳使用同一单调时钟，重试和复用保留原 action 关联。并发工具调用需要额外 correlation ID，不能仅靠时间先后推断因果。

新增 `acceptance_result` 扩大了事件枚举，因此当前 schema 使用 `schema_version=1.1`；旧 `trace-v1.0.json` 原样保留，只接受此前七类事件。不要用 1.0 包络承载新事件，也不要修改历史 轨迹 的版本号。

独立 轨迹 JSON Schema 只保证每个 `sequence` 是非负整数，不保证唯一、连续或按数组顺序排列；这些是 recorder/验证器 的语义责任。当前 `RunResult` 运行时 验证器 会进一步要求内嵌 轨迹 从 `run_started` 开始、以匹配 结果 终态的 `run_stopped` 结束，且序号从 0 连续；独立 轨迹 reader 仍需执行同类关系校验。

事件 `data` 不是倾倒 prompt、源码和工具原始响应的借口。采集前就做字段 allowlist、敏感值替换和大小限制；公开时再做第二次脱敏。只保存 `"redacted": true` 而没有脱敏规则和抽查证据，也不能证明安全。

<span id="result终态快照与停止语义"></span>

## Result：终态快照与停止语义

当前 `result-v1.1` 固定十个字段：`schema_version`、`run_id`、`task_id`、`status`、`stop_reason`、`output`、metrics、轨迹、检查点 和 error。字段必须显式存在；没有 检查点/error 时写 `null`，避免消费者猜测“未生成”“被截断”还是“不适用”。旧 `result-v1.0.json` 原样保留；它只做较宽松的字段检查，不能承载本节新增的关系保证。当前状态有 `completed/stopped/failed`，停止原因包括：

| stop_reason | 含义 | 常见 status |
| --- | --- | --- |
| `completed` | 当前运行时声明的验收条件通过 | `completed` |
| `max_steps` / `model_budget` / `timeout` | 到达资源边界 | `stopped` |
| `cancelled` | 用户或上游取消 | `stopped` |
| `permission_denied` | policy 拒绝动作 | `stopped` |
| `tool_error` | 工具执行失败且无法恢复 | `failed` |
| `invalid_action` | 模型 action 不满足契约 | `failed` |

状态与停止原因不是两列独立枚举：`completed` 只配 `completed`；`stopped` 只配预算、timeout、cancelled 或 permission denial；`failed` 只配 tool/contract error。未完成结果的 output 必须为 `null`，失败结果必须给非空 error，完成结果的 error 必须为 `null`。当前运行时对 invalid action 采用 fail-closed（失败关闭）：在指标累计前返回 `failed/invalid_action`，防止 `NaN` cost 或坏工具名进入预算计算。

当前默认验收器把 `Task.acceptance` 解释为完成输出必须包含的 JSON 子集，并产生 `acceptance_result`；失败可在预算内返回下一轮，成功后才允许 completed。这个事件证明比对被执行，不证明 acceptance 足够或字段来自真实测试/外部系统。空 acceptance 会记录零条件后通过；自定义 验证器 异常暂使用 `failed/invalid_action`，新增独立停止原因需要发布新 schema 版本。

Metrics（指标）中的 steps、model/tool calls、复用计数、duration 和 cost 必须是有限非负数。这里把 `steps` 明确定义为已完成的工具状态转移，因此 `steps = tool_calls + reused_tool_calls`；completion proposal 与 acceptance repair 会消耗 model call，却不增加 tool step。这个定义同时用于预算、Python 和 TypeScript，避免成功结果出现 off-by-one。

Checkpoint（检查点）是最近一次可恢复状态，不是终态副本。它的计数和 cost 可以早于最终 结果，例如 检查点 后又发生一次成功 completion；但不能超过最终 metrics，且内部仍满足 `step = tool_calls + reused_tool_calls`。内嵌 轨迹 必须从 0 连续，首尾事件合法，最后 `run_stopped.status/reason` 与 结果 一致。

`run-result-v1.json` 的 14 个共享案例区分 `schema_valid` 与 `runtime_valid`。字段缺失、错类型和大部分终态矛盾由 JSON Schema 拒绝；`steps` 求和、连续序号、终止事件对账和 检查点 是否超前属于跨字段/跨项关系，由 Python `RunResult.from_dict` 与 TypeScript `validateRunResult` 一致拒绝。Schema 通过不是跳过运行时 验证器 的理由。

结果 可以内嵌脱敏 轨迹 方便消费，也可以引用独立 轨迹；项目必须选择一种权威来源。两份副本并存时要比较 hash，避免报告读到旧副本。

## Study 与 EvalRun：研究设计和实际记录

当前 `study-v1.2` 使用 `study_kind=learning/comparison` 与 `sampling_rationale` 区分学习和正式研究。允许一个工作负载、至少一个任务、至少一次运行；两个配置、唯一任务身份、合法划分与任务聚合门槛仍需校验。正式比较必须分别有开发和留出任务，学习研究固定为 E1 并阻止真实配置晋级。

`study-v1.0` 保留 run-level 语义，`study-v1.1` 保留原有 20 任务、四类工作负载、三次重复和留出限制。旧记录不按新规则静默解释。样本充分性由抽样理由、目标差异和风险决定，不由通用数量门槛代替。

`eval-run-v1.1` 在旧字段上增加 artifacts，分别引用 任务、Run、轨迹、结果、Config 与 fixture 的相对路径和原始字节 hash。读取器复核身份、实际结果、时间、配置和输入源；离线运行不能只改标签升级为 E2/E3。`eval-run-v1.0` 继续读取历史合成样例。

完整工作区研究使用 `examples/study/config.json` 驱动实际补丁和调用预算；`lab/configs/` 保留旧设计配置，不是新运行器的入口。未知真实用量存入独立 `usage-v1`：token_status 与 cost_status 分别为 known/unknown，unknown 对应 null。Python 与 TypeScript 使用同一组正负例。

<span id="四层验证少一层都不够"></span>

## 四层验证，少一层都不够

| 层 | 回答的问题 | 当前入口 | 示例失败 |
| --- | --- | --- | --- |
| 1. 语法/schema | 单对象字段、类型、枚举是否合法 | JSON Schema 测试 | 缺预算、负数、额外字段 |
| 2. 运行时契约 | 值在语言运行时是否安全、组合是否一致 | Python/TypeScript tests | `NaN`、空工具名、Result 终态/计数/trace 矛盾 |
| 3. 关系/谱系 | 多文件是否指向同一冻结事实 | `npm run eval:validate` | hash、split、身份、重复 cell |
| 4. 研究充分性 | 覆盖、证据、指标和门槛能否支持结论 | summary + 报告复核 | 缺 holdout、矩阵不全、E1 冒充 E3 |

Schema 校验通过只证明第一层。反过来，runner 顺利退出也不证明它遵守公共 schema；两者都要测。Python dataclass、TypeScript interface 等静态类型在收到 JSON 后不会自动执行运行时校验，必须在信任边界显式解析。

## 当前跨对象不变量

一次有效研究至少保持：

- 任务 的 fixture ref 能解析到固定 Git commit/path；
- 历史 manifest 中三个文件 hash 与重新计算值一致，bundle hash 再与 ref 一致；
- 任务 metadata、FixtureLineage 和每条 EvalRun 的 fixture hash 相同；
- Study 中存在该 task/config，EvalRun split 与 Study 一致；
- `run_id` 唯一，`(task, config, repeat)` cell 唯一且 repeat 在范围内；
- 同一 `config_id` 下 config version、model、harness、instruction hash 和 evidence 身份不漂移；
- 观察 cell 加缺失 cell 等于预期矩阵，而不是用总行数代替覆盖率。

仍需正式系统补充的关系包括：独立 Run/轨迹/结果 的 ID 与 hash 一致性、metrics 与具体事件数量、重试的 `attempt_of`、Judge/rubric 版本、environment/config hash 和 artifact 签名。当前 结果 验证器 只对内嵌 轨迹 做连续性和终态对账；这些更大的跨 artifact 缺口应在报告中公开，不能由读者从文件名猜测。

## Schema 怎样安全演进

Schema version 表示读取与语义契约，不是文档装饰。字段改名、类型收紧、枚举变化、默认语义变化或停止原因重分类，都可能破坏历史 reader，应发布新版本而不是原地修改旧 artifact。

推荐迁移顺序：

1. 新增新版本 schema 和 reader，旧 reader 保持可用；
2. 用旧正例与负例确认兼容边界；
3. 写纯函数 migrator，输入旧对象、输出新对象，不覆盖源文件；
4. 保存源 hash、目标 hash、迁移工具版本和逐条错误；
5. 对迁移结果再跑四层验证；
6. 只有消费者切换并验证后，才停止写旧版本。

无法迁移的记录进入 quarantine（隔离区），保留原字节和错误原因。不要用宽松 reader 默默填零、丢未知字段或把未知 stop reason 映射成 completed。对历史 fixture 使用不可变 commit 引用，当前工作树内容变化不应改写旧 run 的输入身份。


## 实践入口

[运行完整学习研究和不完整研究反例](/practice/evaluation)。实现范围、命令、预期断言和清理步骤在实验页维护。
