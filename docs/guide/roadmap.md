# Harness 完整知识地图

Agent harness 把概率模型放进可执行、可约束、可观察、可恢复的工作环境。[FACT:boundary-harness] 本页既是学习顺序，也是查漏入口。

## 先看依赖，而不是看目录

学习顺序不是产品列表。先建立稳定机制，再理解产品映射，最后才做比较和迁移：

```text
术语与责任边界
      ↓
Task → Agent loop → Action/Observation
      ↓             ↓
Context/Instruction Tool/Protocol
      ↓             ↓
Policy/Sandbox ── State/Trace/Recovery
      └──────┬──────┘
             ↓
      Validator/Acceptance
             ↓
      Lab → Eval → Decision
             ↓
  Model/Harness 配置、路由与迁移
```

依赖箭头表示“后面的结论需要前面的概念”，不是说实际运行一定串行。例如 Policy 必须在动作执行前工作，Validator 却应独立于提出动作的模型；两者都会影响最终 Result，但职责不同。

第一次阅读建议沿纵向主线走；遇到真实问题时按页面末尾的诊断入口横向跳转。不要因为某个产品页面更熟悉，就跳过 Task、协议、权限和验收。

## 一、对象与责任边界

先区分 model、provider、adapter、agent、framework、runtime/controller、protocol、surface 与 harness。同一模型在不同 surface 上可能接收不同指令、工具、权限和停止策略；framework 也不自动等于完整 harness。

入口：[什么是 Harness](/foundations/what-is-harness)、[术语表](/references/glossary)、[兼容性矩阵](/references/compatibility)。

## 二、一次运行如何成立

| 节点 | 必答问题 | 核心机制 |
| --- | --- | --- |
| 任务契约 | 目标、输入、边界和验收是什么？ | 拆分、风险、人工确认 |
| Agent loop | 何时观察、行动、验证、继续或停止？ | event、state、controller |
| 上下文与指令 | 此刻看什么，冲突如何解决？ | 选择、排序、作用域、压缩 |
| 记忆 | 什么可跨步或跨会话保留？ | 写入、检索、失效、删除 |
| 推理 | 如何分配思考时间和调用预算？ | step、timeout、cost、fallback |
| 工具与协议 | 能做什么，输入输出如何约束？ | schema、CLI、MCP、错误语义 |
| 权限 | 哪些副作用允许发生？ | sandbox、allowlist、approval |

完整入口：[系统架构](/foundations/architecture)、[Agent 循环](/foundations/agent-loop)、[上下文](/foundations/context)、[指令](/foundations/instructions)、[记忆](/foundations/memory)、[推理机制](/foundations/reasoning)、[工具设计](/foundations/tools)、[模型与工具协议](/foundations/protocols)、[安全边界](/foundations/security)。

## 三、可靠执行与人工控制

可靠 harness 还需覆盖 timeout、有限重试、幂等、取消、checkpoint、可观测性、多 agent 委派与高风险批准。进入实现前先读[状态与可靠执行](/foundations/state-reliability)、[可观测性](/foundations/observability)、[多 Agent 编排](/foundations/multi-agent)和[人在循环中](/foundations/human-control)，再对照[Python 最小实现](/implementation/minimal-harness-python)、[Adapter 契约](/implementation/adapter-contract)和[扩展机制](/implementation/extensions)。需要亲手观察“写入已提交但响应丢失”时，运行[可靠性恢复工作坊](/practice/reliability-recovery)。

## 四、指定模型适配

固定顺序是：解析精确模型/provider/adapter；验证消息、工具、流与错误协议；定义工作负载、风险和预算；保存开箱基线；一次只改变上下文、指令、工具、权限、记忆或推理设置中的一个主要变量；用重复、holdout、安全与成本决定是否采用。

入口：[模型适配方法](/models/adaptation)、[协议兼容](/models/protocol-compatibility)、[模型参数与推理预算](/models/reasoning-budget)、[实验方法](/optimization/experiment)。模型家族页负责版本敏感事实，适配方法页负责可迁移流程。不要把[稳定推理机制](/foundations/reasoning)、[产品参数](/models/reasoning-budget)与[路由实验](/optimization/reasoning-routing)混为一层。

## 五、Harness、framework 与领域模式

深度 coding harness 页面覆盖 Codex、Pi、Claude Code；framework 页面覆盖 LangGraph、OpenAI Agents SDK、Google ADK、AutoGen。领域页用工作负载组织风险与指标。

入口：[三个 Harness 对照](/harnesses/comparison)、[Framework 对照](/frameworks/comparison)、[Coding](/domains/coding)、[浏览器](/domains/browser)、[研究](/domains/research)、[数据](/domains/data)、[文档](/domains/document)。

## 六、实验与评测

证据等级不按“命令是否成功”自动升级：

- E0：没有仓库实验记录；
- E1：固定 fixture、fake 或 replay 的离线证据；
- E2：锁定真实模型与环境的有限可用性探针；
- E3：有足够任务、重复、holdout、预注册、安全和成本门槛的正式比较。

本仓库默认只运行 E1。建议正式比较至少包含 20 个不同任务、每配置每任务 3 次、holdout 至少 20% 且不少于 5 题；具体阈值应按风险调整。入口：[实验环境](/labs/setup)、[评测方法](/evaluation/method)、[任务 Schema](/evaluation/task-schema)、[指标](/evaluation/metrics)、[Judge](/evaluation/judges)、[回归门禁](/evaluation/regression)、[结果报告](/evaluation/reporting)。

## 七、安全、事实与维护

安全不是提示词附录。先建立[威胁模型](/security/threat-model)，再处理[Prompt Injection](/security/prompt-injection)、[Secret 与隐私](/security/secrets-privacy)、[供应链](/security/supply-chain)和[事件响应](/security/incident-response)。产品主张通过[事实注册表](/references/fact-registry)追溯来源；易变事实、依赖、许可与 Pages 维护说明在仓库 README 和贡献指南中。

## 四条可独立完成的学习路径

### 路径 A：先理解一次运行

适合第一次接触 Agent 系统，或只能看到聊天结果、无法解释中间过程的人。

```text
what-is-harness → architecture → agent-loop
→ context → tools → state-reliability
→ minimal-harness-python → 任一 Lab
```

阶段产物：组件责任图、一条成功 trace、一条失败 trace，以及对 `completed` 为什么不等于业务通过的说明。若仍把 ToolCall 当作已执行动作，先不要进入模型比较。

### 路径 B：适配一个指定模型

适合已经有明确 provider/model，希望判断它能否在某个 Harness 内可靠工作的人。

```text
adaptation → protocol-compatibility → reasoning-budget
→ harness comparison → model-playbook
→ experiment → metrics → reporting
```

阶段产物：完整身份、协议资格矩阵、默认与候选配置、配对 Task、路由和回退规则。只有文档来源时保持 E0；获得真实调用授权后先做 E2，不从一次成功跳到全局排名。

### 路径 C：修复一个失败任务

适合已有失败 run、成本异常、越权动作或“偶尔成功”的系统。

```text
observability → debugging → threat-model
→ 对应领域页 → 最小 fixture
→ regression → reporting
```

阶段产物：冻结身份的失败包、最小复现、责任层分类、单变量修复、原失败与相邻负例。若原始副作用状态未知，先对账再重试；不要用提高预算或权限掩盖根因。

### 路径 D：迁移 Harness

适合把工作流从 Codex、Pi、Claude Code 或自建 runtime 迁往另一环境。

```text
harness comparison → 目标 Harness 专题
→ migration Lab → security/human-control
→ 领域状态清单 → qualification/shadow/cutover
```

阶段产物：instructions、tools、sandbox、approval、network、state 六类责任表，逐项写 source semantics、target semantics、gap、补偿控制和证据。文件名翻译不是迁移，恢复聊天文本也不是恢复外部状态。

## 五个学习检查点

每完成一层，先用可观察产物检查理解，再继续下一层。

| 检查点 | 你必须能回答 | 最小产物 | 还不能回答时回到 |
| --- | --- | --- | --- |
| 1. 边界 | Model、Adapter、Harness、Tool、Validator 分别拥有什么？ | 一张责任图 | [什么是 Harness](/foundations/what-is-harness) |
| 2. 运行 | 一个 Action 怎样从 proposal 变成 executed/denied？ | 一条带 stop reason 的 trace | [Agent 循环](/foundations/agent-loop) |
| 3. 恢复 | 超时后哪些事实可重放，哪些副作用要对账？ | Checkpoint 与幂等表 | [状态与可靠执行](/foundations/state-reliability) |
| 4. 证据 | Source status 与 E0–E3 为什么不能互相替代？ | 一条限定结论 | [结果报告](/evaluation/reporting) |
| 5. 决策 | 什么条件会采用、拒绝或回退一个配置？ | 预注册阈值与路由 | [实验方法](/optimization/experiment) |

检查点不是仓库门禁，也不是背诵题。它们帮助你发现“读过页面但还没有形成可迁移判断”的位置。

## 按症状查漏

| 现象 | 首先补哪层 | 推荐入口 |
| --- | --- | --- |
| 模型似乎没看到项目规则 | Effective context 与指令作用域 | [指令系统](/foundations/instructions) |
| Tool 参数常错或错误无法恢复 | Schema、协议、错误分类 | [Adapter 契约](/implementation/adapter-contract) |
| 同一动作被重复执行 | Checkpoint、幂等、unknown outcome | [可靠性恢复工作坊](/practice/reliability-recovery) |
| 测试通过但任务仍错 | Acceptance 与独立 Validator | [测试策略](/implementation/testing) |
| 换模型后结果无法归因 | 身份、控制变量、配对 Task | [模型—Harness 匹配](/optimization/model-fit) |
| 页面/文档内容诱导越权 | 不可信 Observation 与 capability policy | [Prompt Injection](/security/prompt-injection) |
| 指标变好但少量任务严重退化 | Task-level 配对、切片与最差案例 | [评测指标](/evaluation/metrics) |
| 迁移后功能存在但边界变宽 | 责任语义、gap 与补偿控制 | [迁移实验](/labs/migration) |

## 三种内容不要混读

| 内容类型 | 本站放在哪里 | 更新方式 | 合法结论 |
| --- | --- | --- | --- |
| 稳定机制 | Foundations、Evaluation、Domains | 用因果、反例和可执行契约复核 | 可迁移的设计原则 |
| 版本敏感产品事实 | Models、Harnesses、Frameworks、References | 官方来源、精确 surface、核对日期 | 截至日期的产品行为 |
| 项目实验结果 | Labs、公开 Result、Eval 样例 | Fixture identity、命令、trace、失败例 | 与 E0–E3 相符的限定证据 |

产品事实过期不会自动推翻稳定机制；离线 Lab 通过也不会证明产品事实或 live 行为。阅读时先判断自己正在处理哪一层，再决定需要来源核对、运行实验还是架构推理。

## 完成检查

能解释各节点如何连接、运行六个离线案例，并按[六项作品集](/guide/portfolio)给自己的适配工作评分，才算完成主线。更具体地说，你应能从一个真实问题开始，留下以下证据链：

```text
Question/decision
  → Task + fixed identity
  → Configuration + capability boundary
  → Run + Trace + artifacts
  → Validator + Result
  → Evidence boundary + decision + rollback
```

需要实操时从[实验环境](/labs/setup)继续，而不是停留在导航清单。若还没有真实 API 或费用授权，完整做完 E1 仍然是有效学习成果；准确停止比伪造更高证据等级更重要。
