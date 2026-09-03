# 推理预算、规划与回退

Reasoning（推理）在 agent harness 中不是一段必须展示的“思维过程”，而是模型在有限信息、工具、预算和权限下选择下一步行动的机制。Harness 真正能控制和审计的是输入、结构化 action、外部观察、验证结果、状态转移与停止原因，而不是依赖不可见的内部推理文本。

稳定系统把推理放进一个闭环：

```text
目标与边界
    ↓
观察状态 → 选择下一步 → policy/schema 检查 → 执行动作
    ↑                                      ↓
更新计划与预算 ← 保存证据/状态 ← 外部验证结果
    │
    └─ 完成 / 回退 / 提问 / 人工接管 / 明确停止
```

模型提出候选决定；controller 负责预算、权限和状态；工具改变或观察环境；validator 判断结果。把这些职责分开，失败才可归因、恢复和回归。

## 先判断哪里真的需要模型推理

模型适合处理歧义、证据综合、候选方案和非结构化输入；确定性程序适合校验、计数、权限与可重复转换：

| 问题 | 优先机制 | 原因 |
| --- | --- | --- |
| JSON 是否满足 schema | Validator（验证器） | 可确定、可重复、可给字段错误 |
| 当前工具是否获准 | Policy（策略） | 权限不能由模型自我授予 |
| 哪几个文件可能相关 | 模型 + 搜索工具 | 需要语义判断与逐步检索 |
| 测试是否通过 | 测试 runner 与 exit code | 不依赖模型主观解释 |
| 两种架构怎样权衡 | 模型生成候选 + 人工/规则审核 | 需要多约束综合与责任人决定 |
| 是否超过步骤/费用/deadline | Controller（控制器） | 必须在动作前后确定性检查 |
| 外部事实是否最新 | 带来源的检索与核验 | 更多思考不能产生新事实 |

把确定性检查交给模型，会产生“说已完成但没有运行”的假阳性；把所有开放判断硬编码成规则，又会得到脆弱的关键词系统。设计问题不是二选一，而是明确每一层的证据与所有权。

## 推理的输入必须有边界

每一步可用输入至少包括：

- 当前 goal、non-goals、acceptance 与风险；
- 已确认事实、待验证假设和非可信数据；
- 当前文件/环境/外部状态的最新观察；
- 已执行 action、结果、错误和副作用状态；
- 计划、未决项、被否定方案及原因；
- 可用工具、schema、权限和审批状态；
- 已消费与剩余步骤、调用、时间、token/费用预算。

模型不知道的内容不能靠“认真推理”补出。缺文件先检索，需求歧义先提问，产品事实可能过期就核对来源，权限不足就停止。把信息缺失误判为推理不足，会增加自信但不增加证据。

上下文还要区分 instruction（指令）与 data（数据）。网页、邮件、issue 和 tool output 可以提供证据，但不能改变目标、扩大权限或关闭验证。详见[上下文工程](/foundations/context)与[Prompt Injection](/security/prompt-injection)。

## 计划是可更新的外部状态

Plan（计划）不是越长越好，也不是模型第一次输出后永远不变。它应把目标拆为可验证的中间状态，显式记录依赖、完成证据和重规划条件。

### 三种常见计划

| 形式 | 适合 | 关键字段 |
| --- | --- | --- |
| Linear（线性） | 依赖明确的小任务 | step、输入、done evidence |
| DAG（有向无环图） | 可并行但有依赖的多组件任务 | node、dependency、owner、join rule |
| Contingent（条件计划） | 结果决定下一步的调查/恢复 | observation、branch、stop/fallback |

例如调试任务不是“读代码 → 修复 → 测试”三个口号，而是：复现固定失败；收集能区分两个根因的观察；只改对应层；运行目标和邻近回归；若失败分类变化则重规划，若重复相同状态则停止。

计划项要用状态机而非自然语言勾选：`pending → ready → running → verified/failed/blocked/skipped`。只有外部证据满足 done condition 才进入 `verified`；“模型认为完成”不是状态转移依据。

### 保护不变量

Invariant（不变量）是在所有计划分支都必须成立的条件，例如：

- 不修改用户既有未提交文件；
- 不在未授权时访问真实 API 或产生费用；
- 写工具调用使用幂等键；
- 关键测试与安全门槛不能为加速而关闭；
- 父子任务共享总预算与取消信号。

重规划可以更换步骤，不能静默放弃不变量、目标或验收。若目标与不变量冲突，进入人工决策，不让模型自行“权衡掉”权限边界。

## 分解任务，但不要丢失责任

Decomposition（任务分解）的价值是缩小每次决定的状态空间、并行独立工作并设置中间验证。合理边界通常沿模块、证据源或独立 artifact 划分，而不是机械按文件数量均分。

子任务契约至少包含：父 task/run ID、目标、输入引用、允许动作、预算、输出 schema、验收、deadline、取消和回退。父级负责合并、冲突处理和端到端验收；子任务成功不能自动推出父任务成功。

过度分解会增加上下文复制、协调、重复工具调用和冲突。满足以下情况再拆：工作可以独立验证；共享写入少；结果能结构化合并；协调成本低于并行收益。多 Agent 细节见[多 Agent 编排](/foundations/multi-agent)。

## 每一步都应产生信息或进展

一个 action 的价值至少是：改变候选解决方案、获得能区分假设的新证据、推进可验证状态，或安全结束。以下循环没有新增信息：

- 同一 prompt、上下文和配置连续“再想一遍”；
- 重复读取相同文件但不改变查询；
- 测试同样失败却不保存错误分类；
- timeout 后不对账就重放写操作；
- 在 schema/权限错误上不断提高 reasoning 档位。

可以用 progress signal（进展信号）约束循环：未解释断言数减少、候选根因减少、通过的独立验收增加、可复现范围缩小、外部状态得到确认。连续若干步没有新信号时保存 checkpoint 并停止/升级，而不是无限消耗预算。

## 验证是推理闭环的一部分

Validation（验证）不是最后统一运行一次。高质量循环在关键假设后尽快得到外部信号：

```text
假设 → 最小探针 → 观察 → 更新置信/计划
修改 → 目标断言 → 邻近回归 → 端到端验收
```

不同 claim 使用不同 verifier：代码用测试/类型/静态分析，数据用 schema/不变量/对账，网页用可见状态与网络结果，研究事实用来源/日期/冲突，内容用人工 rubric 与链接检查。

Verifier 自身也可能错误：测试过期、Judge 偏好、UI 缓存、构建 artifact 陈旧。重要结论使用独立信号，并保存 validator version、输入和原始输出。一个检查退出 0 只能支持它覆盖的断言，不能证明整个产品可用。

## 反思只有得到新信号才值得

Reflection（反思）是让模型重新评估计划、假设或输出。它可发现遗漏，也会确认偏误、改坏正确答案和增加延迟。

触发反思的好信号包括：

- 确定性测试给出新的具体失败；
- 工具返回与假设冲突；
- 两个可信来源不一致；
- 预算/风险进入预设阈值；
- reviewer 指出 rubric 中的具体缺口。

“结果不好，再想一次”没有提供新信息。反思 prompt 应引用新证据、要求比较原假设，并限制可改变范围；反思输出仍需相同 schema、policy 和 verifier。

自我评分不能替代外部验收。模型既生成又作为唯一 Judge，错误可能高度相关；确定性事实优先用程序检查，主观质量用盲化、校准的 Judge/人工流程。

## 重试与反思是不同控制

Retry（重试）通常处理暂时性 transport/tool 错误；reflection 处理已有新证据后的决策修正：

| 情况 | 合适动作 |
| --- | --- |
| Provider 明确 5xx/retry-after | 在共享 deadline 内限次退避 |
| Tool 参数 schema 错误 | 根据字段错误修 action，不重放原参数 |
| 写请求 timeout、结果未知 | 先按幂等键查询/对账，再补偿或停止 |
| 测试暴露新断言 | 带新错误反思方案 |
| 权限拒绝 | 停止并请求授权，不换模型绕过 |
| 相同状态重复 | 循环检测并停止 |

所有重试计入总调用、时间和费用。写操作没有幂等/对账机制时，自动重试可能重复副作用。

## 预算是 controller 的共享账本

至少区分：

- `max_steps`：允许多少次 agent 状态转移；
- `max_model_calls`：允许多少次模型请求；
- deadline/timeout：端到端和子调用最晚完成时间；
- token：input/output/reasoning/cache 的可用量与计费口径；
- cost：模型、Judge、工具 API 和其他付费资源；
- retry/human：可重试次数与人工轮次；
- concurrency：同时占用的外部/本地资源。

这些不是统一单位。Provider reasoning effort 是单次调用配置，不等于 task 的步骤、token 或费用上限。父任务、子任务、fallback、Judge 和重试从同一 task-level ledger 扣减，不能每层重置一份上限。

预算检查要发生在动作前，也要在 late result 返回后再次检查。`max_model_calls=1` 应在第二次 adapter 调用前停止；deadline 后到达的 completion 不能改写成成功。非有限数字、负数和溢出在进入 metrics 前拒绝。

预算耗尽产生具体 stop reason 和可验证 checkpoint，不是自动失败、自动加钱或自动扩大权限。是否追加预算由上层策略/人工根据已取得的进展决定。

## Checkpoint 保存恢复所需的最小状态

Checkpoint（检查点）至少保存：task/config identity、当前位置、模型/工具状态引用、已完成 action、预算累计、幂等记录、未决副作用、计划/验收状态和 trace continuation。

恢复前验证 checkpoint 与当前 task、代码、fixture、工具 schema 和 config 兼容；不兼容就拒绝或显式迁移。恢复后沿用已消费预算，不能把旧步骤清零。外部系统状态重新对账，防止 checkpoint 认为“未写入”但 timeout 前其实已成功。

当前项目最小 checkpoint 只验证固定 fake adapter 的位置和计数恢复，不证明跨进程持久化、版本迁移、外部副作用对账或分布式 exactly-once。

## 回退顺序从恢复证据开始

Fallback（回退/替代路径）不是失败后无条件换更强模型：

1. 修复环境或 adapter 断裂；
2. 获取缺失信息或澄清目标；
3. 缩小任务/上下文/工具表面；
4. 用新验证信号做一次有限反思；
5. 按预注册策略调整 reasoning/模型；
6. 人工接管、恢复 baseline 或安全停止。

每次转移记录原因、新证据、剩余预算和允许路线。降级或切换 provider 仍保留 schema、权限、Secret 和安全门禁。所有路线不可用时返回 `unavailable`；证据不足返回 `abstained`，不要伪造完成。

## 按症状定位推理失败

| 症状 | 首查 | 不要用什么掩盖 |
| --- | --- | --- |
| 未行动就耗尽调用 | task/context/tool 是否可用 | 只提高调用上限 |
| 反复编辑同一区域 | validator 是否给新信号、状态是否保存 | 无限“再检查一次” |
| 计划勾选但验收失败 | done 是否绑定外部证据 | 更详细的自然语言计划 |
| 高档位反而变差 | 过度反思、上下文污染、随机性 | 宣称预算越高越好 |
| Tool 调用始终失败 | schema、adapter、权限、环境 | 换强模型 |
| Timeout 后副作用未知 | 幂等、对账、late result 处理 | 直接重试写操作 |
| 恢复后重复步骤 | checkpoint identity/计数/幂等 | 清零预算继续 |
| 子任务都成功但整体失败 | 合并契约与端到端验收 | 增加更多子 agent |

修复后保留原失败 fixture 与邻近变体。若问题在 controller，就不要把修复后的提升记为模型变聪明；按责任层更新证据。

## 在本项目观察最小执行闭环

### 前置条件与固定输入

需要 Python 3.11+ 与 uv 0.11，依赖由 `uv.lock` 固定。从仓库根目录离线执行；不配置真实模型、网络、API key 或付费工具。

输入是固定 `FakeAdapter`、进程内工具、单调测试时钟与本地 checkpoint。它覆盖正常 action/tool/completion、模型调用预算、无限工具循环、坏 adapter action、恢复、协作式取消和 late completion。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_loop.py::test_normal_completion_and_structured_trace lab/tests/test_loop.py::test_model_budget_stops_before_an_extra_adapter_call lab/tests/test_loop.py::test_max_steps_breaks_infinite_tool_loop lab/tests/test_loop.py::test_wrong_adapter_return_is_classified_as_invalid_action lab/tests/test_loop.py::test_checkpoint_restores_adapter_position lab/tests/test_loop.py::test_concurrent_cancellation_propagates_after_adapter_returns lab/tests/test_loop.py::test_timeout_stops_before_completing_late_action
```

### 预期输出与断言

应有 7 项通过：

- 一次工具 action 后 completion 得到 `completed`，trace sequence 连续；
- `max_model_calls=1` 在额外 adapter 调用前以 model budget 停止；
- `max_steps=3` 打断无限工具请求并记录 3 steps；
- 非 `Action` 返回被分类为 `failed/invalid_action`；
- 第一个 run 在一步上限停止，第二个 run 恢复 adapter 位置并完成；
- 取消在阻塞 adapter 返回后被观察，最终 stop reason 为 `cancelled`；
- 1000 ms deadline 后到达的 completion 不被标成成功。

### 失败、停止、清理与回退

任一断言失败就停止扩大预算或宣称循环可恢复。先检查 action 验证、预算检查位置、checkpoint 计数、取消和 deadline；不要接入真实 provider 或放宽 stop reason 让测试变绿。保留失败 case 作为 regression。

命令只创建进程内对象和可忽略 pytest 缓存；需要时只清理 `.pytest_cache/`。误改实现时用 `git diff -- lab/src/about_harness/loop.py lab/src/about_harness/contracts.py lab/tests/test_loop.py` 精确定位，并只恢复自己的修改。候选失败时回到已锁定 runner/config baseline。

### 证据边界

这些测试提供 E1：当前最小 Python runner 在固定 fake action 下执行已编码的 action、budget、checkpoint、cancel 和 timeout 语义。它不运行真实模型，不观察隐藏推理，不实现 plan/DAG、token ledger、父子预算、跨进程 checkpoint、强制终止进程或外部副作用对账。

当前取消是 cooperative cancellation（协作式取消）：测试中的 adapter 阻塞期间不会被强行中断，只有返回后 runner 才看到 token。因此测试通过不能证明远端请求、子进程或工具已经停止。

## 检查表

- 哪些决定需要模型，哪些可由确定性 controller/validator 完成？
- 每一步是否拥有目标、最新观察、权限、工具和剩余预算？
- 计划项的完成是否绑定外部证据，而不是模型自报？
- 反思/重试是否得到新信号，并有次数与 deadline 上限？
- 父子、fallback 和 Judge 是否共享预算和取消？
- Timeout/取消后的外部副作用是否能幂等对账？
- Checkpoint 是否绑定 task/config/schema，并保留已消费计数？
- 降级/升级是否保持 schema、权限和安全不变量？
- 完成、预算耗尽、不可用和证据不足是否有不同终态？
- 当前 E1 是否被限制在 fake/replay，而没有冒充真实模型质量？

下一步到[模型参数与推理预算](/models/reasoning-budget)核对版本敏感控制，再用[推理预算与模型路由](/optimization/reasoning-routing)设计配对候选。执行状态和恢复的完整机制见[状态和可靠执行](/foundations/state-reliability)。

## 检查题

1. 为什么模型内部推理文本不是 harness 最可靠的控制面？
2. 重试、反思和回退分别适合什么信号？
3. 子任务各有 12 步上限，为什么父任务仍可能突破总预算？
4. Checkpoint 恢复后为什么不能清零已消费预算？
5. 当前取消测试通过后，为什么仍不能声称阻塞 adapter 已被强制终止？
