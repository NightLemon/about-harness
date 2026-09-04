# Harness 设计工作表：把一个任务变成可验证的运行系统

## 本页解决什么问题

读懂 Agent loop、Tool、Policy、State 和 Validator，不等于能设计一套 Harness。真正的设计工作要把一个具体 Task 变成可审核的责任、状态、协议和证据，并明确哪些部分已经实现、哪些只是目标架构。

本页是一份从零开始的 Harness design workbook（Harness 设计工作表）。它不要求先选模型、Framework 或云服务；先把稳定机制和项目边界写清，再决定哪些部分自己实现、交给 Framework，或留在应用层。

完成后，你应能交付：

- 一份可判定的 Task 与失败边界；
- 一张组件责任、信任边界和状态所有权图；
- 一条从 Action 提议到验收的完整生命周期；
- 一份工具、权限、预算、状态与恢复契约；
- 一组正例、负例、故障注入和回退验证；
- 一个 `implement`、`prototype`、`defer` 或 `reject` 的设计决定。

本页讲稳定工程方法，不新增产品事实。最后的仓库练习使用固定 Fake adapter 和进程内工具，证据等级为 E1；它不调用真实模型，不访问网络，也不证明生产架构已经实现。

## 最终证据包

目录名可以调整，但下列责任不应消失：

```text
harness-design/
  question.md              # 要解决的任务、决策和范围
  task.json                # 输入、能力、预算、验收与停止
  system-context.md        # 主体、资产、边界和外部依赖
  responsibilities.md      # 组件 owner 与禁止事项
  action-lifecycle.md      # 提议、校验、授权、执行、验收
  capability-policy.md     # auto / ask / deny 与参数约束
  state-recovery.md        # 状态、checkpoint、回执和崩溃窗口
  observability.md         # 事件、关联 ID、脱敏和保留
  verification.md          # 正例、负例、故障和实际结果
  decision.md              # 采用范围、未决项与重测触发
  rollback.md              # 代码、状态、流量与外部副作用恢复
```

这些文件不是文档数量要求。小项目可以合成一份设计记录；关键是另一位读者能从 Task 一直追到 Result，并找到每项声明的实际证据。

## 第一步：把需求改写成 Task

先写可观察目标，不写“做一个智能 Agent”：

```text
Task ID / revision:
Goal:
Structured input and immutable identity:
Allowed capabilities:
Forbidden actions:
Acceptance:
Safety invariants:
Step / model-call / time / cost budgets:
Stop conditions:
Cleanup:
Rollback target:
```

一个 Task 至少同时回答“什么结果算通过”和“哪些行为即使结果正确也算失败”。例如“生成补丁并通过测试”仍不完整；还要说明允许改哪些路径、是否可联网、能否安装依赖、测试退出码来自哪里，以及越界修改怎样判失败。

### 用结果条件和过程不变量夹住任务

| 类型 | 例子 | 谁验证 |
| --- | --- | --- |
| 结果条件 | 目标测试通过，输出满足 schema | 独立 Validator |
| 范围不变量 | 只修改允许路径 | Policy + diff Validator |
| 安全不变量 | 不读取 Secret，不访问外域 | Sandbox/Policy + Trace |
| 资源不变量 | 不超过调用、时间和费用预算 | Controller |
| 恢复不变量 | Timeout 后先对账，不盲目重写 | State + Tool executor |

`allowed_tools` 是 Task 的能力上界，不是已经授权执行。工具是否存在、参数是否合法、当前主体是否获权，以及审批是否仍有效，仍要在 Action 边界分别检查。

## 第二步：从责任开始画架构

先填责任表，再决定它们是函数、进程、队列还是服务：

| 责任 | 输入 | 权威输出 | 唯一 owner | 明确禁止 | 当前状态 |
| --- | --- | --- | --- | --- | --- |
| Surface / ingress | 用户请求、身份 | Task 候选 |  | 不直接执行高风险动作 | implemented/target/unknown |
| Task validator | 外部对象 | 冻结 Task |  | 不猜权限和默认值 |  |
| Controller | Task、状态、结果 | 下一状态、唯一终态 |  | 不生成业务答案 |  |
| Context builder | Task、规则、状态、来源 | 模型输入快照 |  | 不升级不可信文本 |  |
| Model Adapter | 内部协议、Provider 事件 | canonical Action / error |  | 不授权、不执行工具 |  |
| Action validator | 不可信输出 | 可信 Action |  | 不让坏值进入 metrics |  |
| Policy / approval | 主体、Action、资源 | allow/ask/deny |  | 不执行工具 |  |
| Tool executor | 已授权 ToolCall | ToolResult / receipt |  | 不自行扩大重试 |  |
| State / checkpoint | 控制、Adapter、业务引用 | 版本化快照 |  | 不把聊天当业务事实 |  |
| Acceptance validator | 冻结产物、验收条件 | pass/fail evidence |  | 不由生成者自证 |  |
| Trace / artifact | 边界事件、版本 | 可复核证据 |  | 不保存无关敏感原文 |  |

`implemented` 表示当前有代码和验证；`target` 表示计划中的责任；`unknown` 表示尚未查明。不要把目标架构画成当前事实，也不要因为两个责任暂时在同一个 class 中，就省略它们之间的所有权边界。

### 检查三个平面

```text
Data plane:     Task / context / model message / Action / ToolResult
Control plane:  identity / policy / budget / state transition / cancel
Evidence plane: trace / metrics / checkpoint / artifact / validation
```

数据面中的内容可以影响候选答案，不能自行修改控制面。证据面记录发生过什么，也不能仅凭一条日志把真实状态改成 completed。

## 第三步：标出信任与权限变化

每条数据流填写：

| From → To | 数据与来源 | 身份/租户 | 信任级别 | 可拥有的 authority | 校验与失败行为 |
| --- | --- | --- | --- | --- | --- |
| User → ingress |  |  |  |  |  |
| Repository/Web → context |  |  |  | 通常为 0 |  |
| Context → Provider |  |  |  | 不能授权本地工具 |  |
| Adapter → Controller |  |  |  | 仅 Action 提议 |  |
| Policy → Tool |  |  |  | 绑定参数的执行许可 |  |
| Tool → State/Model |  |  |  | 结果不是新指令 |  |
| Validator → Controller |  |  |  | 仅验收判断 |  |

Trust（可信度）、authority（授权）与 provenance（来源）是三条轴。官方来源可能可信，却不能授权发布；用户明确授权一个动作，也不会让网页中的文字自动成为高优先级指令。

高风险边界应写出规范化后的真实对象：解析后的路径、最终 URL、实际账号、资源版本、参数 hash 和数据来源。只检查模型展示的字符串，无法防止重定向、符号链接或审批后换参。

## 第四步：定义 Action 生命周期

把一次动作拆成不可跳过的状态：

```text
proposed
  → runtime_validated
  → budget_accounted
  → authorized | waiting_approval | denied
  → executing
  → succeeded | failed | outcome_unknown
  → state_reconciled
  → acceptance_checked
  → continued | completed | stopped | failed
```

对每条转换写清：

| 转换 | 前置条件 | 写入者 | 证据 | 失败终态 | 能否重试 |
| --- | --- | --- | --- | --- | --- |
| proposed → validated | schema、有限数字、字段语义 | Action validator | parser result | invalid_action | 修正后新 Action |
| validated → authorized | Task、主体、资源、policy | Policy | decision/approval ID | permission_denied | 不能换名绕过 |
| authorized → executing | 预算、deadline、幂等身份仍有效 | Controller/Tool | intent | stopped/failed | 取决于副作用 |
| executing → result | handler 回执或 typed error | Tool | ToolResult/receipt | tool_error/unknown | 按错误分类 |
| completion → accepted | 冻结产物满足 acceptance | Validator | assertion/result hash | continue/failed | 在预算内修正 |
| terminal → terminal | 已有唯一终态 | Controller | final revision | 保持原终态 | 不允许重开 |

先执行再授权、先把 `NaN` 成本计入 metrics、先提交 completed 再验收，或把 timeout 当作“肯定未执行”，都会破坏生命周期。

## 第五步：设计 Context 与 Instruction

Context builder 应给每块内容记录来源、用途、范围、时效、可信度和 token 成本。最小表格：

| Block | 来源 | 作为 instruction 还是 data | 必须保留 | 截断策略 | 失效条件 |
| --- | --- | --- | --- | --- | --- |
| System/project rules |  | instruction |  |  |  |
| Task/acceptance |  | instruction | 是 | 不可静默删除 | Task revision |
| Workspace evidence |  | data |  |  | commit/path 改变 |
| Tool result |  | data |  |  | call/version 改变 |
| Memory |  | data by default |  |  | TTL/scope/source |

压缩后仍应能回答当前目标、禁止动作、未决副作用、剩余预算和验收条件。若这些内容无法放入一次调用，不应靠无限上下文掩盖状态设计；把权威事实保存在结构化 State，只把当前所需快照送给模型。

## 第六步：把能力分成 auto、ask 和 deny

Approval（审批）只用于人需要决定的真实风险边界，不应成为每个普通步骤的仪式。

| 动作类别 | 默认 | 需要绑定的条件 | 典型升级原因 |
| --- | --- | --- | --- |
| 已授权范围内只读 | auto | 根目录、数据分类、结果大小 | 触达隐私或新租户 |
| 工作区内可逆写 | auto 或 ask | 路径、diff、版本、回滚 | 大范围改写或冲突 |
| 外部可逆写 | ask | 账号、目标、内容、幂等键 | 面向多人或生产 |
| 发布、费用、删除、权限变化 | ask/deny | 真实副作用、预算、有效期 | 不可逆或高影响 |
| Task 外工具、凭据读取、未知目标 | deny | 不适用 | 重新定义新 Task |

一次批准必须绑定规范化参数、资源版本、执行身份、费用和有效期。Task 范围内的普通编辑可以预先授权并自动执行；当工具、目标、数据或影响面改变时才重新进入 ask，避免审批疲劳。

## 第七步：为每个 Tool 写执行契约

```text
tool name / version:
input schema:
normalized resources:
side-effect class:
authorization rule:
idempotency identity:
timeout and cancellation:
retryable errors:
permanent errors:
unknown-outcome reconciliation:
output schema and size:
redaction:
cleanup / compensation:
```

`timeout` 只说明调用方没有及时拿到确定结果。对于外部写入，必须有幂等键、业务回执或查询接口，才能判断重试、补偿还是人工对账。把所有异常 catch 成空结果会同时破坏模型反馈、故障分类和最终验收。

工具描述面向模型，执行契约面向 controller。前者解释何时使用，后者必须在模型之外强制输入、权限、错误和副作用规则。

## 第八步：设计 State、Checkpoint 与恢复

先分三类状态：

| 状态 | 权威来源 | Checkpoint 保存什么 | 恢复前检查 |
| --- | --- | --- | --- |
| 控制状态 | Controller | status、budget、revision、pending Action | 终态、deadline、计数单调 |
| Adapter 状态 | Adapter/Provider | cursor、response/item ID、不可重建片段 | 协议版本与连续性 |
| 业务状态 | Tool/目标系统 | receipt、resource version、intent ref | 查询真实对象并对账 |

为每个副作用枚举崩溃窗口：

1. intent 保存前；
2. intent 已保存、工具未执行；
3. 工具已执行、回执未保存；
4. 回执已保存、checkpoint 未提交；
5. checkpoint 已提交、结果迟到或重复投递。

第三个窗口不能从本地状态推断“没发生”。恢复流程应先查询目标系统，再决定复用、补偿或重试。Checkpoint 版本与 Task/config/tool identity 不一致时默认拒绝，而不是尽量猜测。

## 第九步：让 Validator 拥有完成事实

把每条 acceptance 映射到独立 oracle（判定器）：

| Acceptance | 证据来源 | Validator | 失败反馈 | 伪阳性负例 |
| --- | --- | --- | --- | --- |
| 文件符合 schema | 冻结最终字节 | JSON Schema + 语义检查 | 精确字段路径 | 结构合法但业务值错 |
| 修复没有回归 | 目标 commit/worktree | 目标 + 回归测试 | 命令、退出码 | 只跑一个 happy path |
| 页面可用 | 构建产物/浏览器状态 | DOM/交互/视觉断言 | 失败 viewport | 只检查 HTTP 200 |
| 外部写成功 | 目标系统查询 | receipt + 资源版本 | unknown outcome | 仅依赖客户端日志 |

完成文本只是 completion proposal（完成提议）。Controller 只能在 Validator 返回与 Task 一致的通过证据、且 timeout/cancel 没有先发生后，写入唯一 completed 终态。

主观质量可以使用 rubric、独立 Judge 或人工验收，但要固定评分规则、输入可见范围和分歧处理。生成同一内容的模型不应单独为自己打分并决定晋级。

## 第十步：只记录能归因的最小证据

建议关联：

```text
task_id → run_id → model_call / step
                    ├─ action_id / call_id
                    ├─ policy_decision / approval_id
                    ├─ idempotency_key / receipt
                    └─ checkpoint / artifact / validation
```

每类事件写允许字段，不倾倒整个 prompt、源码、环境变量或 Tool 原始输出。至少能区分：

- 模型没有提出正确 Action；
- Adapter 映射丢失或损坏；
- Policy 正确拒绝；
- Tool 已失败或结果未知；
- State 恢复使用了错误 revision；
- Validator 拒绝了看似完成的结果。

Trace 应只追加；更正使用新事件，不覆盖旧失败。公开 artifact 需要第二次脱敏，但采集前的数据最小化才是第一道控制。

## 第十一步：把设计变成可反驳的验证计划

每个关键不变量至少需要一个正例和一个邻近负例：

| 层 | 正例 | 负例/故障注入 | 必须断言 |
| --- | --- | --- | --- |
| Task/Action | 合法对象进入循环 | 空工具名、重复工具、非有限成本 | 在 metrics 前拒绝 |
| Policy | 已授权只读动作执行 | 已注册但 Task 未允许的工具 | handler 次数为 0 |
| Tool | 首次写入得到回执 | timeout、相同 key 重放、参数变更 | 不重复副作用 |
| Acceptance | 正确产物完成 | 格式正确但业务错误 | 不得 completed |
| State | 同版本 checkpoint 恢复 | 损坏、旧 config、计数倒退 | 拒绝恢复 |
| Cancel/time | 正常调用返回 | Adapter/Tool/Validator 迟到 | 迟到结果不覆盖终态 |
| Trace/privacy | 必要事件可关联 | 合成 Secret、个人路径、超长字段 | 公开结果无泄漏 |

验证记录不能只有命令名。保存起始 commit、输入/fixture hash、环境、实际命令、退出码、关键观察、失败分类，以及这条证据不能证明什么。

### 实现前的最小设计审核

逐项回答：

1. 哪个 Task 值变化会产生新 revision？
2. 谁是终态唯一写入者？
3. 哪些输入不可信，却会进入模型上下文？
4. 哪条 policy 在 handler 前强制执行？
5. 哪种错误允许重试，哪种必须对账？
6. Checkpoint 没有保存哪些业务事实？
7. Validator 从哪里读取独立产物？
8. 取消怎样传播到在途调用和子任务？
9. 哪个负例证明权限、预算和验收不是恒真？
10. 怎样回到上一已知良好版本，且不丢外部回执？

任何高影响问题只能回答“模型应该会处理”，都应先留在 `prototype` 或 `defer`。

## 工作例：仓库内离线计算

用一个小任务演示工作表怎样落地：

```text
Goal: 对固定输入执行一次进程内 Tool，并返回可验收 JSON
Allowed: 仅 echo
Forbidden: network、filesystem write、外部身份、真实模型
Budget: 3 steps / 3 model calls / 1000 ms / USD 0
Acceptance: {"accepted": true}
Stop: invalid Action、permission denial、budget、timeout、cancel
Rollback: 结束进程；无持久副作用
```

责任链是：

```text
TaskSpec
  → HarnessRunner
  → FakeAdapter proposes echo
  → Action runtime validation
  → PermissionPolicy checks Task allowlist
  → in-memory ToolRegistry executes
  → checkpoint records cursor and counters
  → FakeAdapter proposes completion
  → JsonSubsetAcceptanceValidator
  → completed Result + append-only trace
```

这个例子故意很小。它适合验证控制顺序，却没有真实 Context builder、Provider transport、操作系统 sandbox、外部业务状态或持久 checkpoint。设计工作表应把这些写成 `not implemented`，不能因为组件名出现过就写成已具备。

## 在当前仓库验证设计链

### 前置条件与固定输入

- Node.js 22+、Python 3.11+、`uv 0.11.16`；
- 锁定依赖已在本地 cache，从仓库根目录运行；
- 输入为 `scripts/lab-smoke.py`、`lab/tests/test_loop.py` 和 TypeScript 公共契约 fixture；
- 不配置 API key，不访问网络，不安装 Framework，不产生费用。

先用 `git status --short --branch` 确认自己的起点。已有不明改动时只记录路径，不清理或覆盖它们。

### 命令

下面三条可在 PowerShell、bash 和 zsh 逐行运行：

```powershell
uv run --frozen --offline python scripts/lab-smoke.py
uv run --frozen --offline pytest -q lab/tests/test_loop.py::test_acceptance_rejection_returns_feedback_and_allows_repair lab/tests/test_loop.py::test_permission_denial_stops_before_tool_execution lab/tests/test_loop.py::test_wrong_adapter_return_is_classified_as_invalid_action lab/tests/test_loop.py::test_checkpoint_restores_adapter_position lab/tests/test_loop.py::test_timeout_during_acceptance_cannot_complete
npm run lab:ts-runtime-test
```

### 预期输出与人工断言

Smoke 命令应退出 0，并产生：

- `status=completed`、`stop_reason=completed`；
- `model_calls=2`、`steps=1`、`tool_calls=1`、`cost_usd=0`；
- 连续的 `run_started → model_action → tool_result → checkpoint → model_action → acceptance_result → run_stopped`；
- acceptance evidence 使用 `json-subset-v1`，不是模型自报成功。

Pytest 的五个案例应通过，分别证明：

1. 验收拒绝会反馈并允许在预算内修正；
2. 未授权 Tool 在 handler 前停止；
3. 错误 Adapter 返回归类为 `failed/invalid_action`；
4. Checkpoint 恢复 Adapter 游标而不重放旧 Action；
5. Validator 返回太晚时不能覆盖 timeout。

TypeScript 命令应报告 Task/Action、共享验收和 RunResult fixture 全部通过。它用于检查两种语言对运行时坏值与终态关系的解释一致，不证明真实 Provider 协议一致。

### 失败、停止、清理与回滚

若 Smoke 非零、负例执行了 handler、坏 Action 进入 metrics、恢复后重复旧 Action、timeout 后仍 completed，或 Python/TypeScript 对同一 fixture 结论不同，立即停止扩展设计。先沿 Task → Action validation → Policy → Tool → State → Validator 找第一处分歧，不放宽 schema、权限或 timeout 来获得绿色结果。

这些命令只有进程内状态，可能留下被 Git 忽略的测试 cache。运行后用 `git status --short` 检查；只处理本轮明确生成的临时文件。若为了练习修改实现，先审核：

```powershell
git diff -- scripts/lab-smoke.py lab/src/about_harness lab/tests/test_loop.py lab/ts
```

回滚只撤销自己的候选改动，恢复上一已知良好 commit 和 Task/config identity，再重跑 Smoke 与五个负例。真实系统还必须另行处理数据库、消息、费用和外部资源；Git 回退不能撤销这些副作用。

### 当前证据边界

当前 E1 只证明固定 Fake Action、进程内 Policy/Tool、JSON 子集 Validator、内存 Checkpoint 和公共运行时契约能覆盖上述路径。它不证明：

- 真实模型能稳定提出合格 Action；
- Provider 的 tool/stream/usage/cancel 映射正确；
- 操作系统 sandbox、网络隔离或审批系统有效；
- 分布式 worker、持久状态或外部幂等达到生产要求；
- 默认 acceptance 足以判断任意业务任务；
- 当前设计优于某个 Framework 或产品。

需要真实调用时，先冻结精确 model/provider/adapter/surface，再以 E2 资格探针验证协议；需要做采用或模型比较时，再进入有重复、holdout、安全与成本门槛的 E3。

## 写出设计决定

```text
Decision: implement | prototype | defer | reject
Task and scope:
Current baseline:
Selected responsibility boundaries:
Controls proven now:
Controls still target/unknown:
Qualification evidence:
Residual risks:
Implementation slices:
Rollback target and triggers:
Re-test triggers:
```

- `implement`：关键边界有足够证据，可按小切片落地；
- `prototype`：责任已清楚，但高风险或集成假设仍需隔离验证；
- `defer`：证据、权限、状态策略或业务验收尚不充分；
- `reject`：方案要求扩大边界、无法恢复，或没有比简单 baseline 带来可测收益。

设计评审的目标不是让图更复杂，而是让每个重要事实有唯一 owner、每个危险转换有确定性控制、每项完成声明有独立证据。

## 最终检查表

- [ ] Task 同时定义结果、禁止动作、预算、停止与回退；
- [ ] 当前实现、目标架构和未知项没有混写；
- [ ] Data、Control、Evidence 三个平面及信任边界可定位；
- [ ] Action 在校验、授权、执行、对账和验收之间不能跳步；
- [ ] auto/ask/deny 绑定真实资源和影响，普通动作不会制造审批疲劳；
- [ ] Tool 契约覆盖错误、timeout、幂等和 unknown outcome；
- [ ] 控制、Adapter 与业务状态分开，崩溃窗口有恢复规则；
- [ ] completed 由独立 Validator 和 Controller 共同约束；
- [ ] Trace 足以归因且遵循数据最小化；
- [ ] 正例、邻近负例、故障注入和恢复断言均有实际证据；
- [ ] 决定包含范围、残余风险、回退和重测触发。

## 检查题与下一步

1. 为什么 `allowed_tools` 不能直接等于“已经授权”？
2. 模型、Policy、Tool 和 Validator 分别能改变什么事实？
3. 外部写入 timeout 后，为什么 Checkpoint 不能单独决定是否重试？
4. 哪些信息应进入 Context，哪些必须留在权威 State？
5. 为什么审批过多和完全不审批都可能是边界设计失败？
6. 一条 completed Trace 为什么不能替代业务验收？

先读[系统架构](/foundations/architecture)和[Agent 循环](/foundations/agent-loop)理解责任，再用本页完成第一版设计。要逐文件实现时进入[Python 最小 Harness](/implementation/minimal-harness-python)；要选择现成编排能力时使用[Framework 选型工作表](/practice/framework-selection)；出现失败时回到[诊断工作表](/practice/debugging)找第一处分歧。
