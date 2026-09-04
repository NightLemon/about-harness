# AutoGen：从对话原型到可控多 Agent 系统

官方来源：[AutoGen stable docs](https://microsoft.github.io/autogen/stable/)，核对日期：2026-08-20。

官方 stable 文档（核对 2026-08-20）将 AutoGen 描述为构建 AI agents/applications 的 framework，并区分 AgentChat、Core、Extensions 与 Studio。[FACT:autogen-overview] 这是 E0 产品事实；本页其余内容是项目的架构分析与采用建议，不表示这些能力已在本仓库运行。

## 学习目标与采用问题

读完本页，你应能判断：为什么需要 AutoGen 而不是普通函数或单 Agent loop；应从哪个抽象层切入；多个 participant（参与者）如何划分所有权、消息、工具、预算与终止；以及怎样用单 Agent baseline（基线）证明新增编排确实解决了问题。

先问一句：任务的困难来自模型能力、工具和验收，还是确实来自多个相对独立的角色需要协作？如果单 Agent 配合确定性工具已经可控，多 Agent 只会增加消息、路由、状态同步和失败组合。

## 四层分别解决什么

| 层 | 官方入口所表达的抽象中心 | 适合先验证 | 不能自动提供 |
| --- | --- | --- | --- |
| Studio | 可视化原型与交互入口 | 流程是否容易演示和检查 | 生产部署、安全边界、可重复评测 |
| AgentChat | 较高层 conversation pattern（对话模式） | participant、team、handoff/route 与终止 | 业务正确性、最小权限、外部幂等 |
| Core | 事件驱动与运行时层 | 消息生命周期、并发、状态与错误传播 | 应用 Task、可信数据和验收 oracle |
| Extensions | 模型、工具等集成 | Adapter 身份、schema、认证与失败映射 | 集成来源可信、动作已获授权 |

这张表用于选择阅读和 PoC（概念验证）起点，不是 API 兼容承诺。实际类名、字段和生命周期必须在目标 AutoGen 版本的官方文档与锁定依赖中重新核对。

## Framework 仍不是完整 Harness

无论选择哪层，应用仍需定义：

```text
Task / acceptance / budgets
        │
        ▼
AutoGen conversation or event runtime
        │ proposes messages / tool actions
        ▼
application policy / sandbox / tool executor
        │
        ▼
business validator / trace / rollback
```

Framework 能承载消息和 Agent 协作，不会凭空知道哪些文件可改、网页内容是否可信、工具副作用是否获权、任务何时业务完成。Model output、participant 共识和 framework run completed 都不能替代外部 validator（验证器）。

## 给每个参与者写责任契约

不要先写人格描述；先写可执行责任：

| 字段 | 必须回答 |
| --- | --- |
| `owner` | 谁对哪个中间产物和最终决定负责 |
| `input` | 接收哪些结构化字段，哪些内容不可见 |
| `output` | 交付什么 schema，失败怎样表示 |
| `tools` | 允许的只读/写入工具和资源 scope（范围） |
| `budget` | model calls、messages、tokens、time、cost |
| `termination` | 成功、拒绝、冲突、超时和升级条件 |
| `handoff` | 转移哪些上下文、预算、权限和未决项 |
| `validator` | 谁用什么外部证据判定产物 |

两个参与者都“负责最终答案”会造成所有权冲突；所有参与者都看完整敏感上下文会扩大数据暴露；每个角色各有独立预算而没有总预算，会让父任务失控。

## Conversation、route 与 state 分开

Conversation（对话）是消息交换记录，不自动等于可靠状态。应用还要保存当前 owner、任务版本、已完成步骤、工具回执、预算、待批准 Action 和终止原因。恢复时不能只重放聊天文字后猜哪些副作用已经发生。

Route（路由）至少要决定：谁能成为下一位 speaker（发言者）、为什么切换、何时不再切换、目标不可用时回到谁。基于自由文本让模型无限选择下一位容易形成 ping-pong（来回转交）。优先使用结构化状态和有限 transition（转换），并设置全局消息/step 上限。

Handoff（所有权移交）与 broadcast（广播）不同。移交后原 owner 应停止写同一产物；广播则要求定义如何合并并行结果。多个参与者同时修改同一文件时，需要隔离 worktree、明确 merge owner 或条件更新，不能依赖“他们会协调”。

## 多 Agent 何时有可测价值

合理拆分通常满足至少一项：

- 子任务能并行，且输入/输出边界稳定；
- 不同角色需要互斥工具或数据权限；
- 独立 verifier 能减少同源偏差，但不参与生成；
- 专业上下文彼此很大，隔离后显著减少无关内容；
- owner 转移本身是业务流程，例如人工复核后才能发布。

“让三个 Agent 讨论”不是目标。对同一任务保留单 Agent baseline，比较端到端成功、总 model/tool calls、token/cost、墙钟时间、人工介入、消息循环、权限拒绝和副作用。若质量没有改善而成本和故障面上升，应回到更简单设计。

## 工作例：研究、写作与引用验证

项目建议的最小设计如下；它不是已运行的 AutoGen 配置：

```text
Supervisor（唯一最终 owner）
   ├─ Researcher：只读固定 source，输出 claim/source/version
   ├─ Writer：只读已审核 claim，输出段落与 citation ID
   └─ Citation validator：确定性检查，不参与投票
```

先跑一个单 Agent 完成相同任务。只有当检索与写作能隔离或并行时才拆开。Researcher 不能发布，Writer 不能扩展来源，validator 不能凭语言判断补造引用。Supervisor 合并前检查：每个 claim 有允许 source、冲突未被抹平、引用能解析、总预算未超限。

终止条件不是“大家同意”：`all_claims_valid` 才能完成；来源冲突返回 `needs_review`；预算耗尽返回 `stopped`；任何 participant 请求越权工具立即停止该 Action。人工批准绑定具体产物 hash，改写后旧批准失效。

## 工具、权限与不可信消息

Extensions 暴露模型或工具，不意味着 participant 可以自动执行。应用 policy 仍要在 handler 前核对 Task allowlist、主体、资源、参数、数据来源和审批。读网页的参与者收到的文本是 untrusted data（不可信数据），不能改变 team route、加载新工具或要求另一个角色外发文件。

按角色最小化工具集：Researcher 有检索/读取，Writer 有草稿写入，publisher 若存在则独立且默认不可见。Secret 不进入群聊；错误返回脱敏。工具 timeout 后结果未知时先对账，不让另一个 participant 换工具重复写入。

## 可靠性与恢复

Checkpoint（检查点）至少保存任务/config 版本、每个 participant 状态、消息游标、owner、累计预算、未决 handoff、工具幂等键与外部回执。恢复时检查框架消息状态与业务对象是否一致。

| 故障 | 第一项检查 | 安全处理 |
| --- | --- | --- |
| participant 重复发言 | route、speaker 选择与 termination | 限制转换并保留循环 trace |
| 两个角色同时写同一产物 | owner、隔离与 merge policy | 停写、对账、指定唯一合并者 |
| handoff 后上下文泄漏 | 转移字段与接收方权限 | 撤销多余数据，缩小 schema |
| 恢复后重复工具副作用 | checkpoint 时机、幂等键、回执 | 先查询外部状态，不盲重试 |
| 多数投票得出错答案 | validator 与共同来源偏差 | 使用外部 oracle，不加角色投票 |
| 成本突然上升 | 总 messages/model/tool calls | 停止循环，回到单 Agent 基线 |

## 评测和采用门槛

评测单位是完整 workflow（工作流），不是单 participant 的漂亮回复。固定 Task、模型/provider、AutoGen 版本、工具实现、权限和起始状态，比较单 Agent 与候选 team。预注册：安全违规为零；关键任务不退步；成功提升达到业务门槛；P90 时长/费用不超限；循环、handoff 和人工介入可解释。

采用前至少满足：

- 层与目标版本已锁定，未知 API 保持 `untested`；
- 每个 participant 有输入、输出、owner、工具、预算和终止；
- route、handoff、并行合并和取消有正负例；
- policy、sandbox、approval 与 framework routing 没有混写；
- checkpoint/retry 不重置预算或重复副作用；
- trace 能关联消息、Action、ToolResult、owner 与最终 validator；
- 单 Agent baseline 仍可重建并作为 rollback。

## 在本项目验证证据边界

当前仓库未在 `pyproject.toml`/`uv.lock` 安装 AutoGen，没有 provider client、真实 participant runtime 或 credential reader。下面验证“未安装 + 证据轴分离”，不验证 AutoGen API。

前置条件是 Python 3.11+、`uv 0.11.16`、Node.js 22+ 和锁定依赖。在仓库根目录离线运行：

```powershell
uv run --frozen --offline python -c "import importlib.util as u; assert u.find_spec('autogen') is None"
npm run facts:check
```

预期两条命令退出码均为 0：第一条证明当前 Python 环境没有可导入的 `autogen` 包；事实检查确认官方 Source fact 已登记。人工复核兼容矩阵应继续把 AutoGen 标为只有职责说明，不能用产品名或页面措辞替代 Offline seam/Live evidence。

这些结果只有已核验的 E0 来源和本地依赖缺失检查。它们没有创建 AgentChat team、运行 Core、加载 Extensions/Studio 或调用模型，不能声称 AutoGen 已接入、兼容、可恢复、生产可用或优于其他 Framework。

若意外发现包可导入、事实或人工矩阵核对把 AutoGen 误写成 E1/live，或命令要求 API key/网络，停止结论并审计依赖与证据文件；不要运行 quickstart、配置真实凭据或删除负例来获得绿色输出。命令只读仓库并可能产生可忽略 cache。误改时先检查：

```powershell
git diff -- pyproject.toml uv.lock package.json package-lock.json docs/frameworks/autogen.md docs/references/compatibility.md
```

只恢复自己的修改；候选集成失败时回到当前无 AutoGen、无 provider、E0-only 的 baseline。

## 检查题与下一步

1. AgentChat team 完成运行后，为什么仍需业务 validator？
2. Handoff 与广播在 owner、预算和上下文上有什么不同？
3. 多个 participant 投票为什么不能消除共同来源错误？
4. 怎样证明多 Agent 相对单 Agent 解决了可测瓶颈？
5. 当前两条命令能证明哪些边界，又不能证明什么？

先读[多 Agent 编排](/foundations/multi-agent)，再按[Framework 对照](/frameworks/comparison)建立单 Agent 基线，并用[评测指标](/evaluation/metrics)比较完整工作流成本。
