# Agent Framework 对照与选型方法

Framework（框架）提供构建 Agent 的部件或 runtime（运行时）；Harness 是让 Agent 在真实任务中可执行、可约束、可验证、可恢复的完整工作环境。安装 SDK、导入包或跑通 quickstart，只证明最小接缝可用，不能证明任务质量、安全、运维或生产适配已经成立。

本页比较的是“框架抽象怎样映射到 Harness 责任”，不是给模型或框架排通用名次。任何结论都必须绑定 workload（工作负载）、框架版本、provider/model、工具、预算、部署环境和证据等级。

## 四个对象分别从哪里切入

| Framework | 官方材料首先强调的抽象 | 适合用来观察 | 采用后仍由项目负责 |
| --- | --- | --- | --- |
| LangGraph | 面向长运行、有状态流程的低层 orchestration framework/runtime [FACT:langgraph-overview] | 状态图、节点/边、checkpoint、interrupt 与恢复 | 节点契约、工具、权限、部署和业务验收 |
| OpenAI Agents SDK | Code-first agent runtime，由 SDK runner 管理 agent loop，并提供 tools、handoff、guardrail、session/state 与 tracing 等构件 [FACT:openai-agents-sdk] | Agent 生命周期、工具轮次、所有权转移、暂停/恢复 | Server、工具实现、状态存储、审批决定和产品接入 |
| Google ADK | Agents、models、tools、sessions、runtime、deployment、observability、evaluation 等构件 [FACT:google-adk] | Agent/model/tool/session/runtime 的组合边界 | Provider 身份、policy、数据治理、业务 validator 和部署治理 |
| AutoGen | AgentChat、Core、Extensions 与 Studio 等分层 [FACT:autogen-overview] | 对话模式、事件运行时、扩展与原型界面的分层 | 终止、权限、状态、成本、数据生命周期和发布门禁 |

这些是产品来源事实 E0，不是本项目对上游包的运行结论。当前仓库没有安装或执行这四个 Framework；离线实验只验证部分职责接缝 E1。详细来源、核对日期和证据状态见[事实注册表](/references/fact-registry)与各 Framework 页面。

## Framework 不是完整 Harness

选型前先列责任，再看框架能减少哪部分实现。不要因为框架提供了同名类，就假定它满足你的语义。

| Harness 责任 | Framework 可能提供 | 项目必须定义的验收 |
| --- | --- | --- |
| Task contract | Agent/graph/run 的输入类型 | 目标、输入版本、禁止项、完成条件和失败分类 |
| Controller | Runner、graph runtime、conversation/event loop | 总 step/deadline/cost、取消传播和一致终态 |
| Adapter | Model client、provider integration | 精确 model/surface、消息/action/error/usage 映射 |
| Tool registry | Decorator、tool wrapper、MCP/OpenAPI 接口 | Schema、allowlist、权限、Secret、幂等与对账 |
| State | Session、checkpoint、message history | Tenant 隔离、版本、恢复、保留/删除与迁移 |
| Multi-agent | Handoff、agent-as-tool、team/group chat | Owner、上下文最小化、预算继承、终止与回退 |
| Human control | Interrupt、approval、guardrail | 谁批准哪个精确 action，超时/拒绝后怎样停止 |
| Observability | Trace、event、callback、exporter | 脱敏、关联 ID、采样、保留和故障归因 |
| Evaluation | Eval hooks、dataset/runner 集成 | 任务集、确定性 validator、rubric、统计和晋级规则 |
| Deployment | Server/runtime/deployment target 接口 | 身份、网络、队列、扩缩容、SLO、发布与回滚 |

例如“支持 checkpoint”只说明某种状态可以保存和恢复，不证明外部写入不会重复；“支持 approval”也不说明审批绑定了哪个参数和目标。选型时要把产品名词还原成项目自己的不变量。

## 先决定是否需要 Framework

Framework 有学习、升级和调试成本。以下情况先保留小型自建 loop 往往更清楚：

- 只有一到两次模型调用，控制流固定；
- 工具少、无长运行恢复、无多 Agent 所有权转移；
- 业务状态机已经由现有 workflow/queue 系统可靠表达；
- 主要难题是数据、权限或业务 validator，而不是 Agent 编排；
- 团队还没有可复现 Task、fixture 和 baseline。

以下信号才值得评估 Framework：

- 需要反复 tool loop、暂停/恢复或长运行 checkpoint；
- 确定性步骤与模型步骤形成多个显式分支；
- 多个 specialist 确实拥有不同工具、policy 或上下文；
- 多条流程需要复用相同 runner、state、trace 或 approval 模式；
- 自建控制器的错误恢复和可观察性已经成为可测瓶颈。

“代码行更少”不是充分理由。框架可能把代码变成隐式默认值、callback 顺序或运行时状态；总理解成本反而更高。

## 从任务形状选择抽象中心

不要从功能清单开始。先画任务状态和失败路径，再判断哪个抽象最接近主要问题。

### 状态图型任务

任务由清晰状态、条件边、并行分支、人工暂停和恢复组成时，优先比较 graph/state runtime。关键不是“能画图”，而是：状态 schema 是否版本化、节点能否幂等重放、checkpoint 与外部副作用是否有一致边界、错误边是否可测试。

这类任务可用 LangGraph 的官方抽象作候选映射，但是否采用仍取决于目标版本的 checkpoint、interrupt、stream 和部署行为。先读[LangGraph](/frameworks/langgraph)，不要把 graph 通过当成模型质量证据。

### Agent loop 型任务

任务主要是“模型决策—工具调用—结果回传—继续决策”，并需要 typed result、guardrail、approval、session 或 specialist handoff 时，比较 code-first agent runner。重点检查 tool handler 前的 policy、run 预算、暂停/恢复身份和业务 validator 是否仍可由应用控制。

OpenAI Agents SDK 可作为这一类候选。官方 OpenAI 文档明确区分：Responses API 适合应用自己拥有 loop，Agents SDK 适合由 SDK 运行 loop；即便采用 SDK，server、工具实现、状态存储和审批决定仍由应用负责。具体边界见[OpenAI Agents SDK](/frameworks/openai-agents-sdk)。

### 组件组合型任务

当问题是把 agent、model、tool、session、runtime、deployment、observability 与 evaluation 组合到同一开发模型中时，比较 kit/platform-style framework。要验证组件之间的身份和生命周期，而不是只看组件是否存在。

Google ADK 可作为这一类候选。重点检查 model/provider 能否精确固定、session 与业务数据库怎样分离、tool credential 流向何处、不同 deployment target 是否保持相同 policy。见[Google ADK](/frameworks/google-adk)。

### Conversation/event 型多 Agent 任务

当多个参与者通过消息、topic 或事件协作，比较 conversation/event runtime。先证明为什么需要多个 Agent；如果只是把串行步骤换成角色对话，通常只会增加 token、延迟和归因难度。

AutoGen 的 AgentChat/Core/Extensions/Studio 分层可用于观察高层对话模式与较低层事件运行时的差异。无论选哪层，都要补 owner、路由、终止、总预算和独立 validator。见[AutoGen](/frameworks/autogen)。

## 七步选型流程

### 1. 冻结问题，不先写候选名

记录 Task schema、输入数据、成功断言、风险、副作用、deadline、成本上限和环境。把“研究助手”“客服 Agent”拆成可执行状态与验收，不要让候选 Framework 反过来定义需求。

### 2. 建立无 Framework 或更简单的 baseline

Baseline 至少能处理一个正常用例和一个失败用例。它可以是纯函数状态机、一个受控 loop 或现有 workflow engine。没有 baseline，就无法知道 Framework 减少了复杂度，还是只换了术语。

### 3. 标出控制责任

对每个状态写清：确定性还是模型决策；读还是写；谁授权；能否重试；checkpoint 在副作用前还是后；谁决定 completed。责任不清时不要安装依赖。

### 4. 只选一到两个合理候选

候选应由任务形状决定，而不是流行度。为每个候选固定版本、语言、provider/model adapter 和最小抽象层。不要同时评测四个 Framework 的所有能力，那会把学习成本当成任务差异。

### 5. 映射同一内部契约

先定义项目的 `Task → Action → Event → Result`，再为候选写 adapter。Framework 原生对象可以保留为 artifact，但业务 validator 只读取内部 Result。这样才能比较终态、错误与指标，而不是比较不同输出格式。

### 6. 用相同 fixture 做正负例

固定数据、模型/replay、tool handler、policy、预算和运行次数；唯一主变量是 Framework/config。至少测试成功、坏 schema、拒权、tool timeout、重复副作用、取消、checkpoint 恢复和预算耗尽。

### 7. 用采用门槛而非印象做决定

候选只有在目标 workload 的 required 能力全通过、风险可接受且总维护成本更低时才晋级。否则保留 baseline，记录 `rejected` 或 `untested`，不要用“后续可以补”替代当前证据。

## 同条件比较协议

### 固定项与变量

| 类型 | 必须固定或记录 |
| --- | --- |
| Workload | Task ID、数据版本、split、风险级别和验收规则 |
| Model | Provider、精确 model、surface、settings、prompt/instructions |
| Tool | Schema、handler 版本、fixture、timeout、重试与幂等策略 |
| Control | Step/token/cost/deadline、approval、cancel 和 network |
| Runtime | OS、语言、Framework 版本、adapter/config hash |
| Evidence | Run、trace、result、exit code、failure class、artifact hash |
| 主变量 | Framework 或同一 Framework 的配置版本 |

若某候选必须换 model、工具 schema 或预算才能运行，这不是同条件比较。可以做第二项“最佳可行配置”实验，但必须与控制变量实验分开报告。

### 指标不要只看成功率

| 维度 | 示例指标 | 必须同时看的失败 |
| --- | --- | --- |
| 正确性 | Task pass rate、字段/引用/计算断言 | 假完成、validator 漏检 |
| 安全 | 未授权调用、敏感数据、危险写入 | 被拒后绕路调用、输出泄漏 |
| 可靠性 | Resume、timeout、取消、幂等 | 重复副作用、late result 覆盖终态 |
| 效率 | P50/P90、model/tool calls、token、费用 | 无限 loop、handoff 放大 |
| 可观察 | Trace 完整度、关联 ID、failure class | 丢事件、错误合并、无法重放 |
| 工程成本 | 实现、测试、升级、调试和 on-call 时间 | 隐式默认、版本锁定、迁移成本 |

权重由 workload 决定。高风险写入任务中，安全和 unknown outcome 可能是一票否决；内部只读摘要任务可以更关注延迟与维护成本。不要发布一个脱离 workload 的“总分第一”。

### 最小决策记录

```yaml
decision_id: framework-eval-001
workload: cited-policy-research@3
baseline: plain-state-machine@2
candidates:
  - framework: candidate-a
    version: 1.2.3
    adapter: internal-contract@4
    config_hash: sha256:example-a
  - framework: candidate-b
    version: 4.5.6
    adapter: internal-contract@4
    config_hash: sha256:example-b
fixed:
  model: replay-policy-v3
  tool_registry: research-readonly@2
  budget: {steps: 12, deadline_ms: 30000, cost_usd: 0}
required:
  - citations_valid
  - permission_denial_fail_closed
  - resume_no_duplicate_side_effect
evidence_target: E1
decision_rule: no_required_failure_and_lower_total_maintenance_cost
```

这是项目建议格式，不是某个 Framework 的配置。真实记录还要指向 Task、run、trace、result 与失败 artifact。

## PoC 要验证故障，不是重写应用

PoC（Proof of Concept，概念验证）应短小但完整：

1. 一个固定 Task、一个只读 tool、一个确定性 validator；
2. 一个 schema 错误，证明 handler 前拒绝；
3. 一个明确可重试错误，证明有界重试；
4. 一个拒权或人工暂停，证明 action 与批准绑定；
5. 一个 checkpoint/resume，证明预算不重置；
6. 一个取消/timeout，证明 late completion 不覆盖终态；
7. 卸载候选后 baseline 仍能运行，历史 artifact 仍可读取。

PoC 不应连接真实客户数据或不可逆写操作。先用 fake/replay；只有离线责任通过且另获 provider、费用和数据授权，才进入 E2 live probe。目标业务表现需要 E3，不能用 quickstart 成功替代。

## 多 Agent 能力要单独收费和验收

Framework 提供 handoff、team 或 group chat，不表示多 Agent 更好。新增一个 Agent 至少新增：一份 instructions、一组工具权限、一条上下文边界、一个预算消费者、一组 trace 关系和一种终止失败。

只有以下任一瓶颈已被 baseline 证明时再拆分：

- 两个职责需要互斥工具或权限；
- 上下文隔离能明显降低污染或敏感数据暴露；
- 可并行的独立子任务占主要延迟；
- 专门 validator 能提供单 Agent 无法获得的外部信号；
- 不同 owner 的审计和人工批准确实是业务要求。

比较时同时保存单 Agent baseline。质量相同但 token、延迟、错误面和维护成本上升，应回退，不要再增加 supervisor 来修补无终止的 group chat。

## Framework Lock-in 从状态和 Trace 开始

Lock-in（锁定）不只来自 import。最难迁移的通常是 checkpoint、session、event、trace、tool result 和部署运维语义。

降低迁移成本的方法：

- 业务 Task、Action、Result 与 Framework 类型分层；
- Tool handler 不依赖 Framework 全局上下文，权限由独立 policy 决定；
- 保存 framework/version/config/schema identity；
- 外部副作用使用业务幂等键，不使用框架内部 call ID 代替；
- Result 与 trace 导出为版本化内部格式，同时保留原始 artifact 引用；
- 对 checkpoint/session 写迁移 reader 和无法迁移的 quarantine 路径；
- Framework 默认变更后创建新 config，不改写历史 run。

迁移不是逐字翻译 graph、agent 或 team 配置。应映射“源责任 → 目标责任 → 缺口 → 补偿控制 → 证据”。没有等价控制时可以缩小自动化范围，而不是假装兼容。

## 失败归因顺序

| 现象 | 先检查 | 不要立即归因给 |
| --- | --- | --- |
| Tool 没被调用 | Schema、instructions、model protocol、policy | Framework 整体能力 |
| Loop 不停止 | Edge/termination、总 step budget、late event | 模型“不会结束” |
| Resume 重复写入 | Checkpoint 时机、幂等键、外部对账 | Session 存储本身 |
| Handoff 丢任务目标 | Context contract、owner、预算继承 | 下游 Agent 能力 |
| Trace 缺事件 | Sampling、async flush、exporter、版本 | 事件从未发生 |
| Run completed 但答案错 | Stop mapping、业务 validator、Result schema | Runner 已损坏 |
| 成本突然上升 | Retry、loop、handoff、Judge 与 tool 总调用 | 单次模型价格 |
| 升级后行为漂移 | Framework/model/adapter/config/schema diff | 数据随机性 |

归因顺序应是 Task/fixture → config identity → adapter/protocol → controller/policy → tool/runtime → model decision → evaluator。修复后创建新版本并重跑受影响负例；旧失败 trace 保留，不混入修复后结果。

## 在本项目做一次离线选型练习

当前仓库不安装 LangGraph、OpenAI Agents SDK、Google ADK 或 AutoGen。本练习验证的是“用同一内部契约观察职责接缝”，不是框架 API 或模型质量。

### 前置条件与固定输入

需要 Python 3.11+、uv 0.11、Node.js 22+；依赖由 `uv.lock` 和 `package-lock.json` 固定。从仓库根目录离线运行，不配置 API key、真实 provider、外部 Framework 包或费用。

固定输入为 `lab/fixtures/` 下的合成数据、`lab/src/about_harness/integrations/` 的离线职责映射、统一 case/result schema 和 hard-disabled live adapter。

### 命令

```powershell
uv run --frozen --offline python -c "import importlib.util as u; assert u.find_spec('langgraph') is None; assert u.find_spec('agents') is None; assert u.find_spec('autogen') is None; assert u.find_spec('google') is None or u.find_spec('google.adk') is None"
npm run labs:all
npm run facts:check
```

### 预期输出与断言

- 第一条命令退出 0，证明锁定环境没有导入四个上游 Framework；
- `labs:all` 的 6 个固定 case 全部 `passed: true`、`offline: true`、`evidence: E1`，且每个 case 的负例被拒绝；
- `facts:check` 确认各 Framework 的产品主张有来源状态、版本、日期和正文引用；人工复核兼容矩阵仍把 Source fact、Offline seam 与 Live evidence 分列；
- 全程没有 provider 网络调用、credential 读取和费用。

### 失败、停止、清理与回退

若任一 Framework 意外可导入、fixture 需要联网、live adapter 未硬禁用、负例通过，或事实/人工矩阵复核把 E1 升级成 E2/E3，立即停止比较结论。先检查 lockfile、环境和证据标签；不要为了得到绿色结果安装上游包、配置 API key 或删除负例。

命令只读固定输入，并可能产生 `.pytest_cache/` 等可忽略缓存。误改依赖或实验时先运行：

```powershell
git diff -- pyproject.toml uv.lock package.json package-lock.json lab docs/frameworks
```

只恢复本轮明确修改，不覆盖其他工作树变化。候选实验失败时保留当前无 Framework、offline replay/live-disabled 的 baseline。

### 证据边界

官方页面与事实注册表提供 E0 产品事实；本项目命令提供 E1，证明统一离线 runner 能执行固定 case、拒绝固定负例，并区分来源事实、项目接缝与真实运行。

这些命令没有执行四个 Framework 的 runtime、checkpoint、handoff、session、deployment 或 trace，也没有调用真实模型。通过后仍不能声称任何候选已接入、兼容、生产可用或优于其他候选。

## 常见反模式

- 用 hello-world 代码行数代表长期复杂度；
- 把 workflow graph 的确定性归功于模型能力；
- 让多个 Agent 自由聊天，却没有 owner、终止与总预算；
- 使用 Framework 默认 memory 保存敏感或跨租户数据；
- 让 tool decorator 绕过统一 policy 和 ToolRegistry；
- 把 guardrail、approval 和 OS sandbox 当成同一层；
- 只看成功 trace，不做 timeout、取消和恢复负例；
- 升级依赖后沿用旧 config 名称和历史结果；
- 因官方支持某能力，就把本地状态写成 `supported`；
- 因离线 replay 通过，就宣称真实 provider 或模型质量已经验证。

## 采用门槛

进入真实集成前，至少确认：

- Workload、版本、provider/model、surface、工具、预算和部署环境已固定；
- 有可运行的简单 baseline，以及候选相对 baseline 的可测收益；
- 项目内部 Task/Action/Event/Result 不被 Framework 类型绑死；
- Schema、policy、approval、sandbox 和 network 责任分开；
- Timeout、取消、retry、checkpoint、resume 与幂等有正负例；
- 多 Agent 有 owner、上下文边界、预算继承、终止和单 Agent 回退；
- Trace 可关联、脱敏、导出、保留和删除；
- Framework upgrade、state migration 和卸载路径已演练；
- Required 能力没有 `untested`，未知项不会被默认值掩盖；
- E0 来源、E1 离线、E2 live 兼容与 E3 workload 质量严格分开。

下一步先把自己的任务填入[Framework 选型工作表](/practice/framework-selection)，再按形状选择候选：状态图看[LangGraph](/frameworks/langgraph)，code-first loop 看[OpenAI Agents SDK](/frameworks/openai-agents-sdk)，组件组合看[Google ADK](/frameworks/google-adk)，conversation/event 分层看[AutoGen](/frameworks/autogen)。然后用[Adapter 契约](/implementation/adapter-contract)建立统一内部边界，以[评测方法](/evaluation/method)设计同条件实验。

## 检查题

1. Framework import 成功为什么不能证明完整 Harness 已经可用？
2. 什么时候保留一个小型自建 loop 比引入 Framework 更合理？
3. 为什么同条件比较与“每个候选使用最佳配置”应分成两项实验？
4. Checkpoint 能恢复时，为什么外部写入仍需要业务幂等键？
5. 多 Agent 候选相对单 Agent baseline 至少要解决什么可测瓶颈？
6. 迁移 Framework 时，为什么 checkpoint、trace 和 Result 通常比 import 更难处理？
