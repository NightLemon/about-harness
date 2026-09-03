# OpenAI Agents SDK

OpenAI Agents SDK 是面向 TypeScript/Python 的 code-first agent application（代码优先 Agent 应用）路径。它把 agent definition、runner、tool loop、handoff、guardrail、session/state、tracing 与 evaluation 等运行组件组织在一起，但不会替应用完成部署、业务工具、数据治理和采用评测。

官方入口：[Build agents](https://developers.openai.com/api/docs/guides/agents)。本页于 2026-09-03 实际复核该页面；SDK 的具体 API、可用能力和默认行为仍以目标语言、目标版本的官方文档为准。[FACT:openai-agents-sdk]

## 先决定是否需要 SDK

官方文档把 Responses API 与 Agents SDK 的责任边界概括为：前者让应用直接管理 model interaction、output item、tool、state 和 branching；后者由 SDK runner 管理反复 tool call、handoff、pause/resume 等 agent lifecycle（Agent 生命周期）。

| 需求 | 更接近 Responses API | 更接近 Agents SDK |
| --- | --- | --- |
| 自己实现精确 loop/branch/state | 是 | 可行，但会绕过部分抽象价值 |
| 单个模型调用或高度定制 workflow | 是 | 未必需要 |
| 多次工具调用与标准运行生命周期 | 应用自己编排 | Runner 负责主要循环 |
| 多 specialist 所有权转移 | 自建 routing/delegation | Handoff 或 agent-as-tool |
| Session、trace、guardrail、可恢复审批 | 自行组合 | SDK 提供相应构件 |
| 现有业务基础设施深度集成 | 应用直接控制 | 仍由应用集成，SDK 管 loop |

不要因“SDK 层级更高”就默认采用。先画出状态、工具、副作用、恢复和审批；只有 SDK 抽象确实减少重复控制代码、且不会遮蔽业务不变量时才值得引入。

## SDK 与完整 Harness 的边界

Harness 是 agent loop 的完整工作环境；SDK 只是其中的 runtime/编排组件。责任可以这样分：

| 责任 | SDK 可承担 | 应用/平台仍必须承担 |
| --- | --- | --- |
| Agent 定义 | 指令、模型、工具、输出类型的组合 | 业务目标、版本策略、适用范围 |
| Run loop | 调用模型、处理工具轮次、形成 run result | 总预算、外部 deadline、任务幂等 |
| Tool 接入 | Function/hosted/MCP 等工具接口 | Handler 正确性、权限、Secret、副作用对账 |
| Handoff | Specialist 间转移控制 | 所有权政策、上下文裁剪、预算继承 |
| Guardrail/approval | 输入输出或工具关口、暂停/恢复 | 风险规则、责任人、OS sandbox、真实批准决定 |
| Session/state | 会话与可恢复运行构件 | 存储、租户隔离、加密、保留/删除和迁移 |
| Trace | 模型、工具、handoff 等可观察记录 | 脱敏、访问控制、采样、保留和事件响应 |
| Evaluation | 工作流评估入口 | 任务集、rubric、业务 validator、晋级规则 |
| Deployment | 可与应用组合 | Server、队列、扩缩容、网络、SLO 与发布回退 |

Guardrail 不等于 sandbox。Guardrail 可以判断或阻止一条输入/输出/工具路径；sandbox 限制进程、文件、网络等技术可达范围；approval 决定由谁在何时授权。三者需要独立设计。

## 用六个契约理解 SDK

### Agent definition：一个 specialist 的静态身份

Agent definition（Agent 定义）至少绑定：

- 精确 model/provider 与模型设置；
- 版本化 instructions 和输入/输出契约；
- Tool allowlist、schema 与使用说明；
- Handoff/agent-as-tool 边界；
- Guardrail 和 approval policy 的引用；
- 运行预算、trace policy 与 owner。

不要把所有业务都塞入一个“大 Agent”。只有任务目标、工具或政策确实不同，才拆 specialist。拆分后还要证明额外转移降低了可测瓶颈，而不是只增加 token、延迟和责任模糊。

### Runner：运行状态机，不是业务正确性证明

Runner 负责推进 run，但应用仍需定义 terminal state（终止状态）：

```text
started
  → model_requested
  → tool_requested → policy/approval → tool_result → model_requested
  → handed_off → next_agent
  → paused_for_approval → resumed | cancelled
  → completed | failed | budget_exhausted | timed_out
```

每个 terminal state 都应映射到稳定 failure class、exit code 和业务动作。SDK 返回 final output 只表示运行结束，不表示答案通过业务验收；完成后仍要运行确定性 validator 或人工 rubric。

### Tool：模型请求与应用副作用分离

Tool call 至少经历四个边界：模型提出调用、SDK/adapter 解析、应用 policy 决定、handler 执行。记录 call ID、name、arguments、approval、idempotency key、result/error 和副作用状态。

Handler 前必须完成 schema、allowlist、租户、权限与敏感参数检查。Timeout 后远端状态未知时先按幂等键对账，不因 runner retry 再执行一次。MCP server 或 hosted tool 也不天然可信；分别核对执行方、凭据流、网络出口、结果 schema 和撤销方式。

### Handoff：所有权转移，不是消息广播

Handoff（移交）要回答：

- 当前 specialist 为什么无权或不适合继续？
- 哪个 agent 成为下一步 owner？
- 哪些上下文、tool result 与未决风险随移交保留？
- 父/子 run 如何共享步骤、token、费用和 deadline？
- 原 agent 何时停止，是否可能重复执行？
- 新 agent 失败时回到哪里？

把多个 agent 的文本都追加到一个群聊不等于 handoff。正确性也不能由多个模型“投票同意”证明；仍需独立 validator。

### Guardrail 与 human review：明确暂停点

Guardrail（护栏）应绑定可观察事件和结果：allow、block、pause、redact 或 route。不要只写“检查安全”。至少覆盖：

- 不可信输入是否能改变 system/business policy；
- 输出是否满足 schema、引用、隐私与禁止内容；
- 高影响工具在 handler 前是否暂停；
- 审批人看到的 diff、参数、目标和风险是否充分；
- 拒绝、超时或取消后 run 如何终止；
- Resume 是否恢复同一 run/config/预算，而非新建无限重试。

Human-in-the-loop（人工在环）不是让人点击一个无上下文按钮。批准记录应绑定精确 action、版本、有效期和审批人角色；参数或目标变化后旧批准失效。

### Result、session 与 trace：三种不同记录

| 记录 | 主要用途 | 不能替代 |
| --- | --- | --- |
| Run result | 当前运行的输出、状态和必要 continuation data | 长期业务数据库 |
| Session/state | 跨 turn 延续消息或运行状态 | 审计日志与业务事实 |
| Trace | 调试模型、tool、handoff、guardrail 的事件链 | 用户可见历史或永久 memory |

Session 恢复成功不代表外部副作用幂等；trace 完整也不代表可以无限保存。应用要定义 tenant boundary、加密、访问、保留/删除、导出与 redaction。公开 artifact 只保留脱敏内容和可核验 hash。

## 单 Agent 先于多 Agent

采用顺序建议：

1. 一个 agent、一个只读 tool、一个确定性 validator；
2. 增加一个可恢复错误和 bounded retry（有界重试）；
3. 增加 session/resume，验证不重复副作用与预算；
4. 增加一个需 approval 的低风险可回滚 tool；
5. 只有单 Agent 已出现可测职责瓶颈时，才加入 handoff 或 agent-as-tool；
6. 最后才评估并发、多 agent routing 与复杂 trace/eval。

每一步保留上一版为 engineering baseline。若增加 handoff 后质量没有提高、P90/费用/人工却上升，应回到单 Agent，而不是继续增加角色。

## 最小架构草图

以“读取合成工单—分类—提出退款建议—等待审批”为例：

```text
Task API
  → validate task / tenant / budget
  → Triage agent（只读 ticket tool）
      ├─ 信息不足 → ask/stop
      ├─ 非退款 → typed result → business validator
      └─ 退款候选 → handoff to Refund agent
          → read-only policy tool
          → proposed action（尚未执行）
          → approval gate
              ├─ reject/timeout → cancelled
              └─ approve exact action
                  → idempotent refund handler
                  → reconcile external result
  → independent validator
  → redacted trace + business record
```

退款 tool 不应暴露给 Triage agent；审批前只生成 proposal；外部 handler 使用幂等键；最终业务状态从支付系统对账，而不是相信模型文本。

## 设计 Handoff 时避免上下文泄漏

默认传完整 history 很方便，却可能把无关个人数据、隐藏 policy 或另一个 specialist 的内部状态带过去。为每条 handoff 定义 context contract：

| 字段 | 规则 |
| --- | --- |
| Task identity | 始终保留，禁止跨 tenant |
| 用户目标与验收 | 结构化摘要并回链来源 |
| Tool results | 只传下一 agent 必需且已脱敏的结果 |
| Pending actions | 显式列出 call ID、approval 和副作用状态 |
| Budget | 继承父 run 剩余额度，不重置 |
| Opaque/provider state | 按协议原样保存，不解释、不展示 |
| Private trace/debug | 默认不传给模型，只供受控调试 |

用负例测试：handoff 后不应获得原 agent 独有 tool；敏感字段应被 redaction；父 agent 不再继续执行；预算和取消信号传播到子 agent。

## 评测的是完整工作流

引入 SDK 前后至少比较：

- Task-level success 与确定性验收；
- 安全/权限/数据违规和未知副作用；
- Model/tool/agent/handoff 次数；
- P50/P90、timeout、retry 与人工等待；
- Token、provider/tool/Judge 费用和单位成功成本；
- Handoff accuracy、错误 owner 与重复工作；
- Approval precision、拒绝率、超时和 resume 成功；
- Trace 缺失、redaction 失败与存储增长；
- 实现/升级/调试和 on-call 维护成本。

必须保留同任务、同预算的非 SDK 或单 Agent baseline。否则“集成成功”只能证明能运行，不能证明它比更简单方案更合适。

## 失败归因

| 现象 | 首查 | 不要先归因给 |
| --- | --- | --- |
| Agent 不调用 tool | Tool schema、instructions、model protocol | SDK 总体质量 |
| Tool 重复执行 | Retry、resume、幂等和副作用对账 | 模型故意重复 |
| Handoff 后丢验收 | Context contract、owner 与 instruction | 下游模型能力 |
| Approval 后参数变化 | Approval/action binding | 审批人失误 |
| Session 恢复后状态错 | Storage version、migration、external state | 模型记忆 |
| Trace 缺事件 | Sampling/exporter/async flush | 没发生该事件 |
| Run completed 但任务失败 | Business validator 与 stop mapping | Runner 异常 |
| 费用激增 | Loop、handoff、retry、trace/eval 总调用 | 单次模型价格 |

修复后创建新 config/version 并重跑受影响负例。旧 trace 保留为历史故障证据，不混入修复后配置结果。

## 采用前门槛

在项目中引入 SDK 前，至少满足：

- 已固定 TypeScript/Python SDK 版本、model/provider 与运行 surface；
- 单 Agent 的 tool loop、错误、cancel、timeout 和 typed result 有正负例；
- Tool policy、OS sandbox、network 与 approval 的责任没有混写；
- Session/resume 不重复副作用、不重置预算；
- Handoff 有 owner、context、budget、termination 和 fallback；
- Trace 已脱敏，并有访问、保留与删除策略；
- 业务 validator 与 SDK result 分开；
- Default、engineering、candidate 和 rollback config 可重建；
- 真实 provider 证据和费用另获授权，未测试项保持 `untested`。

任一 required 能力仍为 `untested/rejected` 时，不进入对应生产 workload。可以缩小范围，例如只做内部只读 shadow，而不是把未知写成 supported。

## 在本项目验证责任边界

当前仓库未安装 OpenAI Agents SDK，也没有 OpenAI provider client 或 credential reader。下面只用已有最小 harness 验证“SDK 集成前应先具备哪些控制责任”，不验证 SDK API。

### 前置条件与固定输入

需要 Python 3.11+、uv 0.11、Node.js 22+；依赖由 `uv.lock` 和 `package-lock.json` 固定。从仓库根目录离线执行，不设置 API key，不授予网络、费用或远程写权限。

固定输入是 `lab/tests/test_replay_and_live.py` 的 replay/live-disabled adapter、`lab/tests/test_loop.py` 的预算/权限/幂等/resume 负例，以及兼容性矩阵中的三条证据轴。

### 命令

```powershell
uv run --frozen --offline python -c "import importlib.util; assert importlib.util.find_spec('agents') is None"
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py lab/tests/test_loop.py
npm run compat:check
npm run compat:self-test
```

### 预期输出与断言

- 第一条命令退出 0，证明当前锁定环境没有可导入的 `agents` SDK 包；
- Python 测试全部通过：replay 能完成进程内 tool loop，live adapter 在 provider action 前硬拒绝，controller 能区分预算、权限、tool error、timeout、幂等复用与 resume；
- `compat:check` 确认 Source fact、Offline seam 与 Live evidence 分列，并明确上游 SDK 未安装；
- `compat:self-test` 拒绝缺少证据轴、责任缺口、独立控制或含未来占位符的固定 canary；
- 全程没有 API credential 请求、OpenAI 网络调用或费用。

### 失败、停止、清理与回退

若当前环境意外能导入 `agents`、replay 需要网络/credential、live adapter 未硬拒绝、重复副作用发生，或 checker 接受缺失证据的负例，停止“当前仅 E0/离线 E1”的结论并先审计依赖与实现。不要运行 SDK quickstart、配置真实 API key 或放宽负例来获得绿色结果。

这些命令只读固定输入并可能产生 `.pytest_cache/` 等可忽略缓存。若误改依赖或实现，先运行：

```powershell
git diff -- pyproject.toml uv.lock package.json package-lock.json lab docs/frameworks/openai-agents-sdk.md
```

精确确认差异，只恢复自己的改动。候选集成失败时回到当前无 SDK、replay/live-disabled 的锁定基线；不要覆盖工作树中其他变化。

### 证据边界

官方页面与 `[FACT:openai-agents-sdk]` 提供 E0 产品事实；本仓库测试提供独立 E1，说明固定 replay/controller 覆盖部分 tool loop、policy、budget、timeout、idempotency 和 resume 责任。

它没有 import 或运行 Agents SDK，没有验证其 Agent/Runner/Handoff/Guardrail/Session/Trace API，也没有调用 OpenAI 模型。因此不能声称 SDK 已接入、目标版本兼容、真实工作流可用或性能较好。未来接入必须建立新的依赖、配置、provider 和任务证据，不得升级现有 E1 标签冒充。

## 学习检查表

- 选择 SDK 是因为需要 runner/lifecycle，还是只因 quickstart 更短？
- SDK 与应用分别负责哪些工具、存储、审批、部署和验证责任？
- Agent、tool、handoff、guardrail、session 与 trace 是否各有明确契约？
- Handoff 是否转移 owner、继承预算并停止原 agent？
- Approval 是否绑定精确 action，参数变化后是否失效？
- Resume 与 retry 是否共享账本并避免重复副作用？
- Trace 是否经过脱敏、访问控制和生命周期治理？
- Run completed 后是否仍有独立业务 validator？
- 多 Agent 是否相对单 Agent baseline 解决了可测瓶颈？
- 当前结论是否严格区分 E0 SDK 来源、E1 离线责任与尚未运行的 E2/E3？

下一步：先读[Agent Framework 对照](/frameworks/comparison)确认抽象层，再用[Adapter 契约](/implementation/adapter-contract)定义 provider 边界；需要多 specialist 时继续学习[多 Agent 编排](/foundations/multi-agent)。

## 检查题

1. Agents SDK 管理 tool loop 后，为什么应用仍需 task budget 和业务 validator？
2. Guardrail、approval 与 OS sandbox 分别限制什么？
3. Handoff 与把消息广播给多个 agent 有什么本质区别？
4. Session 可以恢复时，为什么外部工具仍需要幂等与对账？
5. 本仓库离线测试全部通过后，为什么还不能声称 Agents SDK 已接入？
