# Task、Action、Run、Trace 与 Result Schema

结构化记录的价值不只是“方便解析”，而是把一次 agent 运行拆成可以独立验证、交叉引用和长期迁移的事实。Task 定义要做什么，Action 表达模型提议的下一步，Run 固定在哪些条件下做，Trace 保存过程中发生了什么，Result 说明怎样结束；Study 与 EvalRun 再把多次运行组织成比较研究。

本项目的 `lab/schemas/` 使用 JSON Schema draft 2020-12。Schema（结构契约）只验证单个对象的形状；业务语义、对象关系和研究充分性还需要其他层的检查，不能把“JSON 合法”当成“结果可信”。

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

`Run` 与 `EvalRun` 名字相近但用途不同：前者是 harness 单次执行的环境封套，后者是研究矩阵的一行扁平记录。正式系统可以从 Run、Result 和使用量生成 EvalRun，但必须保留源对象引用，不能手工复制后失去谱系。

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

## Task：冻结意图，而不是写一段提示词

当前 `task-v1` 要求 `schema_version`、合法 `task_id`、非空 `goal`、不重复的 `allowed_tools` 和三项正整数预算：`max_steps`、`max_model_calls`、`timeout_ms`；`max_cost_usd` 若存在则必须非负。

这些字段分别解决不同问题：

- `goal` 描述可观察的目标，不应藏入标准答案；
- `input` 放结构化输入引用，避免把大型 fixture 复制进任务；
- `allowed_tools` 是最小能力清单，不等同于执行时已经完成授权；
- `budgets` 让 controller 能在模型失控前确定性停止；
- `acceptance` 保存机器可判定的期望；
- `metadata` 适合证据等级、fixture hash/ref、来源与风险标签。

Task 还应在关联协议中记录禁止动作、cleanup（清理）、人工 rubric 和任务版本。当前 JSON Schema 允许 `acceptance`、`metadata` 为任意对象，因此“字段存在”不证明验收足够；task 作者和 checker 仍需验证语义。

一个好任务能回答“怎样算完成”和“即使输出正确，哪些行为也算失败”。例如浏览器提取不仅断言返回记录，还要断言外部导航为 0、页面注入被拒绝。

## Action：候选动作不是授权或完成

`action-v1` 使用 `oneOf` 表达两个互斥分支：`tool` 必须含完整 `tool_call` 与有限非负 `cost_usd`，`complete` 必须含 `output` 与成本；任何混合字段、缺失字段或额外字段都拒绝。Tool call 至少固定 `call_id`、非空名称、JSON object 参数与 `idempotency_key`。

Schema 只定义线协议。Python `Action.from_dict` / `ToolCall.from_dict` 和 TypeScript `validateAction` 才是在进程边界把不可信对象转成内部 Action；两边都递归拒绝非有限 JSON 数字，Python 还显式拒绝循环对象。直接调用 dataclass 构造器或写 `as Action` 不能替代 wire parsing；Python runner 还会深拷贝并重建 Adapter 返回的 Action，避免带坏嵌套值或返回后可变引用越过边界。

Action 合法仍不代表可以执行：tool 分支还需 policy、参数约束、预算和幂等检查；complete 分支还需 acceptance validator。`cost_usd` 只是当前动作申报值，也不能替代 provider usage 对账。公共 fixture 用 13 个 Action 正反例固定结构接受边界，不声称覆盖 provider stream、消息连续性或业务授权。

## Config：把控制变量变成可比较身份

`config-v1` 固定 `config_id`、说明、`model_id`、adapter、证据等级、live 开关、网络模式、步骤/调用预算与工具集合，并可记录 controls 和 `changed_variable`。Config 不应只叫 `candidate-final`；名称之外还要计算或保存精确内容 hash，并绑定 harness/instruction/environment 版本。

Task budget 和 Config budget 同时存在时应定义合并规则，例如取更严格上限。未定义优先级会导致相同 Task 在不同实现里获得不同权限。当前示例 runner 由运行时契约解释这些字段；跨语言实现必须用同一组负例校验。

`live_enabled=false` 与 `network=none` 是两道不同边界：前者禁止真实 adapter，后者限制运行环境。只有一个字段为安全值不足以证明离线；还要看实际 adapter、工具与网络策略。

## Run：在动作发生前固定现场

`run-v1` 需要 `run_id`、`task_id`、ISO date-time 的 `started_at`、environment 和 config。当前 environment 至少记录 `offline`、Python 版本与 platform；正式研究还应扩展 Node、依赖锁、镜像 digest、region、代码 commit 和网络策略。

Run 应在第一次模型调用或工具副作用之前写入。启动后如果 config、fixture 或 instruction 变化，应该终止并产生新 Run，不能覆盖原封套。`fixture_hash` 虽在当前 schema 中是可选字段，但需要 fixture 的任务应由更高层契约强制它存在并与 Task/Lineage 一致。

环境信息不是自由文本“same as before”。可比较条件必须能机器匹配；无法固定的服务端身份记录时间与返回 ID，并在报告中降级结论。

## Trace：追加事件，而不是拼接日志

当前 `trace-v1.1` 用 `run_id` 关联运行，事件包含 `sequence`、`kind`、`timestamp_ms` 和结构化 `data`。允许的事件类型是：

```text
run_started → model_action → acceptance_result/tool_result/policy_denied/retry/checkpoint → run_stopped
```

Trace 应 append-only（只追加）：已写事件不可因后续成功而删除。`sequence` 从 0 连续递增，时间戳使用同一单调时钟，重试和复用保留原 action 关联。并发工具调用需要额外 correlation ID，不能仅靠时间先后推断因果。

新增 `acceptance_result` 扩大了事件枚举，因此当前 schema 使用 `schema_version=1.1`；旧 `trace-v1.0.json` 原样保留，只接受此前七类事件。不要用 1.0 包络承载新事件，也不要修改历史 Trace 的版本号。

独立 Trace JSON Schema 只保证每个 `sequence` 是非负整数，不保证唯一、连续或按数组顺序排列；这些是 recorder/validator 的语义责任。当前 `RunResult` 运行时 validator 会进一步要求内嵌 trace 从 `run_started` 开始、以匹配 Result 终态的 `run_stopped` 结束，且序号从 0 连续；独立 Trace reader 仍需执行同类关系校验。

事件 `data` 不是倾倒 prompt、源码和工具原始响应的借口。采集前就做字段 allowlist、敏感值替换和大小限制；公开时再做第二次脱敏。只保存 `"redacted": true` 而没有脱敏规则和抽查证据，也不能证明安全。

## Result：终态快照与停止语义

当前 `result-v1.1` 固定十个字段：`schema_version`、`run_id`、`task_id`、`status`、`stop_reason`、`output`、metrics、trace、checkpoint 和 error。字段必须显式存在；没有 checkpoint/error 时写 `null`，避免消费者猜测“未生成”“被截断”还是“不适用”。旧 `result-v1.0.json` 原样保留；它只做较宽松的字段检查，不能承载本节新增的关系保证。当前状态有 `completed/stopped/failed`，停止原因包括：

| stop_reason | 含义 | 常见 status |
| --- | --- | --- |
| `completed` | 当前运行时声明的验收条件通过 | `completed` |
| `max_steps` / `model_budget` / `timeout` | 到达资源边界 | `stopped` |
| `cancelled` | 用户或上游取消 | `stopped` |
| `permission_denied` | policy 拒绝动作 | `stopped` |
| `tool_error` | 工具执行失败且无法恢复 | `failed` |
| `invalid_action` | 模型 action 不满足契约 | `failed` |

状态与停止原因不是两列独立枚举：`completed` 只配 `completed`；`stopped` 只配预算、timeout、cancelled 或 permission denial；`failed` 只配 tool/contract error。未完成结果的 output 必须为 `null`，失败结果必须给非空 error，完成结果的 error 必须为 `null`。当前运行时对 invalid action 采用 fail-closed（失败关闭）：在指标累计前返回 `failed/invalid_action`，防止 `NaN` cost 或坏工具名进入预算计算。

当前默认验收器把 `Task.acceptance` 解释为完成输出必须包含的 JSON 子集，并产生 `acceptance_result`；失败可在预算内返回下一轮，成功后才允许 completed。这个事件证明比对被执行，不证明 acceptance 足够或字段来自真实测试/外部系统。空 acceptance 会记录零条件后通过；自定义 validator 异常暂使用 `failed/invalid_action`，新增独立停止原因需要发布新 schema 版本。

Metrics（指标）中的 steps、model/tool calls、复用计数、duration 和 cost 必须是有限非负数。这里把 `steps` 明确定义为已完成的工具状态转移，因此 `steps = tool_calls + reused_tool_calls`；completion proposal 与 acceptance repair 会消耗 model call，却不增加 tool step。这个定义同时用于预算、Python 和 TypeScript，避免成功结果出现 off-by-one。

Checkpoint（检查点）是最近一次可恢复状态，不是终态副本。它的计数和 cost 可以早于最终 Result，例如 checkpoint 后又发生一次成功 completion；但不能超过最终 metrics，且内部仍满足 `step = tool_calls + reused_tool_calls`。内嵌 trace 必须从 0 连续，首尾事件合法，最后 `run_stopped.status/reason` 与 Result 一致。

`run-result-v1.json` 的 14 个共享案例区分 `schema_valid` 与 `runtime_valid`。字段缺失、错类型和大部分终态矛盾由 JSON Schema 拒绝；`steps` 求和、连续序号、终止事件对账和 checkpoint 是否超前属于跨字段/跨项关系，由 Python `RunResult.from_dict` 与 TypeScript `validateRunResult` 一致拒绝。Schema 通过不是跳过运行时 validator 的理由。

Result 可以内嵌脱敏 trace 方便消费，也可以引用独立 Trace；项目必须选择一种权威来源。两份副本并存时要比较 hash，避免报告读到旧副本。

## Study 与 EvalRun：从执行事实到比较矩阵

`study-v1.1` 要求至少两个唯一 config、至少 20 个 task、至少 3 次重复，并为任务指定 workload 与 development/holdout split。它显式固定 `pass_rate_analysis_unit=task` 和 `task_pass_min_runs`；当前样例规定 3 次中至少 2 次成功才把一个任务记为通过。Promotion 把成功率差定义为候选减基线的 task-level 绝对比例，把 P90 成本差定义为候选减基线的绝对 USD/run，并要求零安全违规；运行时拒绝非有限、越出 `[-1, 1]` 的成功率阈值，以及超过 repeats 的任务成功门槛。这里的数量和点估计是项目学习模板约束，不是任何工作负载都充分的统计保证。

`study-v1.0.json` 作为历史 reader 保留：它的成功率门槛按 holdout run 直接计算，没有任务聚合字段。不能把旧 Study 静默按 1.1 解释，也不能给 1.0 对象补两个字段却不升级 `schema_version`。当前 `study.json` 只接受 1.1；运行时汇总器同时读取两版，并在输出中记录 `study_schema_version` 与实际 `analysis_unit`。

`eval-run-v1` 把矩阵单元写成 `(task_id, config_id, repeat)`，并携带 split、通过/安全状态、资源、失败类型、fixture/instruction hash、模型与 harness 身份、证据等级。每个逻辑单元只能出现一次；基础设施重试需要另外的尝试谱系，不能用第二行占据同一 cell 而不解释。

EvalRun 的 `passed` 与 `failure_type` 有跨字段约束：通过时 failure 应为 null；失败时应使用允许分类。`safety_violation=false` 不表示 `failure_type=safety` 不可能出现——当前固定样例用它表示安全行为检查失败但没有发生真实违规。报告必须解释这两个字段的判定口径。

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

- Task 的 fixture ref 能解析到固定 Git commit/path；
- 历史 manifest 中三个文件 hash 与重新计算值一致，bundle hash 再与 ref 一致；
- Task metadata、FixtureLineage 和每条 EvalRun 的 fixture hash 相同；
- Study 中存在该 task/config，EvalRun split 与 Study 一致；
- `run_id` 唯一，`(task, config, repeat)` cell 唯一且 repeat 在范围内；
- 同一 `config_id` 下 config version、model、harness、instruction hash 和 evidence 身份不漂移；
- 观察 cell 加缺失 cell 等于预期矩阵，而不是用总行数代替覆盖率。

仍需正式系统补充的关系包括：独立 Run/Trace/Result 的 ID 与 hash 一致性、metrics 与具体事件数量、重试的 `attempt_of`、Judge/rubric 版本、environment/config hash 和 artifact 签名。当前 Result validator 只对内嵌 trace 做连续性和终态对账；这些更大的跨 artifact 缺口应在报告中公开，不能由读者从文件名猜测。

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

## 在本项目验证契约

### 前置条件与输入

要求 Python 3.11+、uv 0.11、Node.js 22+，依赖已按 `uv.lock` 和 `package-lock.json` 固定，并从仓库根目录执行。输入位于 `lab/schemas/`、`lab/tests/`、`lab/ts/` 与 `evals/`；命令使用本地固定数据，不调用真实模型或网络。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_contracts_and_schema.py
npm run lab:ts-runtime-test
npm run eval:validate
```

### 预期输出与断言

Python 契约/schema 测试应显示 64 个测试通过：17 个 Task、13 个 Action 和 14 个 Result 案例按各自 schema/runtime 预期通过或拒绝，运行时 completed Result 与含 `acceptance_result` 的 Trace 也能通过公共 schema；TypeScript 输出应报告 30 个 Task/Action、14 个 RunResult 与九个共享验收案例通过；Eval validator 应报告 20 tasks、6 workloads、6 holdout、2 configs、3 repeats、6 fixture refs、120 个预期矩阵单元、12 个唯一样例单元和 108 个缺失单元。

不要只看退出码。还要确认 validator 明确写出 `sample_matrix_complete=false` 和 E1 边界；这表示 schema/谱系样例有效，但正式比较尚未完成。

### 失败案例与停止

缺字段、非法 `task_id`、空/重复工具、混合 Action 分支、坏 tool call、非有限预算/输出/action cost、矛盾 checkpoint、重复 cell、身份漂移、错误 split、坏 fixture ref/hash 都应被拒绝。若 schema 与任一语言对共享案例给出不同结论、坏值进入 metrics、历史 commit 无法解析或 validator 把 12 行称为完整矩阵，立即停止，不要补虚构 run 或修改历史 hash 来过门禁。

### 清理、回滚与限制

命令只读固定输入并创建可忽略的测试缓存；需要时只清理 `.pytest_cache/` 等缓存。误改 schema 或样例时先用 `git diff -- lab/schemas/ evals/` 定位，只恢复自己改动的文件，不做整库重置。Schema 演进失败时保留旧 reader 与旧 artifact，撤回新消费者，而不是重写历史。

当前验证没有覆盖真实 provider、完整 E2/E3 数据、Run/Trace/Result 全部跨对象关系、并发事件 correlation 或重试谱系。因此它证明的是公共契约与固定 E1 样例能拒绝已知坏输入，不是生产日志系统已经完备。

下一步阅读[指标与区间](/evaluation/metrics)，再用[评测方法](/evaluation/method)组织 Study，并在[报告纪律](/evaluation/reporting)公开缺口。

## 检查题

1. `Task` schema 合法为什么仍可能是一个不可评测的任务？
2. `Result` 的两个枚举字段分别合法，为什么组合仍可能矛盾？
3. Trace 中 `sequence` 都是非负整数，是否足以证明事件有序且完整？
4. Fixture 当前文件发生变化时，为什么不能更新历史 EvalRun 的 hash？
5. 哪一层检查负责阻止 E1 的 12 行样例被解释成正式 E3 矩阵？
