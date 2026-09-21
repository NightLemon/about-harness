# 现代 Agent runtime：按控制形状选择，不按名气堆栈

本页于 2026-09-21 读取 DeepAgents、PydanticAI、CrewAI 官方资料。[FACT:deepagents-overview] [FACT:pydantic-ai-overview] [FACT:crewai-overview] 以下是 E0 机制说明；本仓库没有安装或运行它们。MCP、A2A、Skills、Agents API 是协议、能力包或服务 API 层，不是可互换的 runtime，生态入口见[/ecosystem/overview](/ecosystem/overview)。

## 先选要控制的复杂度

| 候选 | 主要机制 | 合适的瓶颈 | 首先警惕 |
| --- | --- | --- | --- |
| DeepAgents | planning、文件系统、子任务和长期上下文 | 长任务必须分解且要隔离子任务上下文 | 规划文件和 delegation 会增加状态/同步成本 |
| PydanticAI | typed dependencies、tools、structured output | 数据契约和测试可观察性是首要问题 | 类型通过不等于业务正确或获准写入 |
| CrewAI | crew 的角色协作与 flow 的状态编排 | 角色合作和可恢复流程都已被明确设计 | 把 crew 对话误当成确定性业务状态 |
| MAF | agent loop、workflow 与互操作 | 新项目要比较 loop 和显式流程 | 远端协议连通不等于权限继承 |

任何候选先与纯函数、单 Agent 或现有 workflow baseline 比较。固定 workload、版本、provider、工具、权限、预算与 validator；每轮只改变 runtime/config。import 成功、MCP 连通或角色输出流畅都不是业务 acceptance。

## DeepAgents：规划文件与隔离子任务的代价

官方将 DeepAgents 定位为可 plan、使用 subagents、利用文件系统处理复杂任务的库；它还列出 context 管理、隔离 context window 的并行子任务、virtual filesystem、路径读写权限和可选 sandbox。[FACT:deepagents-overview] 这适合“整理一批有冲突来源的研究资料”：主任务保留问题、预算和 citation contract，子任务各自读取允许来源，返回结构化 claim，而不是共享完整聊天历史。

规划文件或任务列表可使长任务的下一步可见，却也成为须版本化的状态；子任务隔离减少无关上下文，却增加 handoff、结果合并和重复工具调用风险。若任务只是一次检索或所有步骤本已确定，用普通状态机更容易审计。`task`、filesystem 或 MCP 工具的出现不改变 handler 前 policy、tenant、预算、幂等与 validator 的责任。

最小探针不是“能否生成计划”，而是：计划写入后取消，恢复时是否仍知道已完成项、尚未执行项和每个子任务的允许来源；两个隔离子任务返回同一 claim 的冲突值时，reducer 是否保留冲突和 provenance。若只能用最后一条自然语言摘要合并，就不应扩大并行。

## PydanticAI：类型契约缩小接口，不替代业务判断

官方说明 PydanticAI 提供 typed structured output、dependency injection 和 typed tools；结构化输出由 schema 约束并在 run 末验证，依赖可经 `RunContext` 传递。[FACT:pydantic-ai-overview] 这适合“读取已验证订单后生成退款建议”：把订单、规则版本和只读数据库连接声明为依赖，把建议限制为 typed schema，再由业务系统复算金额、权限与可退款状态。

失败取舍是：类型检查能发现错误 annotation，schema validation 能拒绝不合格输出，但都不能证明规则版本正确、数据新鲜、付款已获批准或外部写入成功。validation failure 的 retry 也不能无限消耗预算；写工具仍需 action-level policy 和对账。若领域的核心是并发路由或跨系统状态迁移，单靠类型化 Agent 不会减少该复杂度。

一个可观察负例是 schema 合法但金额来自过期规则版本：typed output 可以通过，而业务 validator 必须失败并保留 `rule_version`。这说明类型契约把模型和应用的接口变窄，却不能替代领域 oracle；若读者需要的是流程编排，应先选择 state machine/Flow，再把 PydanticAI 放在受限的生成节点。

## CrewAI：Crew 是协作形状，Flow 是状态形状

官方把 collaborative agents、crews、flows、guardrails、memory、knowledge 与 observability 并列；其 Flows 文档说明 start/listen/router 步骤、state、持久化执行与长流程 resume。[FACT:crewai-overview] Crew 适合“研究者、写作者、引用审阅者”拥有不同输入和工具时的协作形状；Flow 适合“输入校验 → 读取 → 路由 → 人工暂停 → 写入 → 对账”这类明确状态图。

二者可以组合，但不要让 Crew 的消息记录充当业务 state，或让 Flow 的完成事件替代业务 validator。角色都能修改同一 artifact、route 没有终止、或恢复后没有外部 receipt 时，先缩回唯一 owner 的 flow/单 Agent baseline。Crew 中的投票不能消除共同来源错误。

可以把 Crew 理解为“谁给出候选”，把 Flow 理解为“何时允许状态推进”。研究者与写作者可以属于 crew，但引用 validator、批准和发布应在有明确 owner 与终止边的 flow 外层。若协作角色只会串行转发同一段文本，crew 增加的是 token、延迟和归因成本，不能替代一个结构化函数。

## 共同资格计划

前置条件：锁定版本/许可证、隔离 worktree、fake/replay、只读 tool、Task/Action/Result schema，以及 success、坏 schema、拒权、timeout、cancel fixture。实验顺序是：typed/structured result → policy 前置 tool → bounded retry/cancel → resume/幂等对账 → 仅在出现已测瓶颈时加入 delegation、crew 或互操作。

每步保存 config 与 fixture hash、trace 摘要、exit code 和 failure class；断言 tool result 回到所属 action、总预算继承、取消不被 late event 覆盖、业务 validator 独立通过。坏 schema 被接受、多个角色并写、timeout 后重复写、未知对端身份或 trace 含 Secret 时停止。清理临时 fixture/session/trace，回退到无 runtime 的 baseline。

这些计划不证明任一 runtime 的 live API、性能、模型质量或生产可用性；相应结论需另获授权后取得 E2/E3 证据。

## 选择时的反问

| 观察到的痛点 | 先试什么 | 不要错误推出 |
| --- | --- | --- |
| 长日志挤掉任务约束 | DeepAgents 的文件/子任务设计，先测 context contract | 规划文件自然保证恢复正确 |
| 输出字段经常错型 | PydanticAI 的 typed output 与 schema 负例 | schema 通过就是业务正确 |
| 多角色反复转发信息 | Crew 的 owner/input/output 契约 | 增加角色会自动提高质量 |
| 状态路由和暂停已明确 | Flow 或普通状态机 baseline | Crew history 就是可恢复业务状态 |
| 需要跨服务协作 | MAF/A2A/MCP adapter 资格探针 | 连通性就是授权或兼容 |

这些问题的答案只能缩小候选，不足以完成选型。最终仍以相同 Task、fixture、权限、预算和独立 validator 下的结果决定是否采用。

## 共同的结果记录

每次候选运行至少保存 runtime/version、provider/model、Task/fixture、有效指令、工具 schema、owner、总预算、开始/终止状态、validator 结果和回退配置。DeepAgents 的计划文件、PydanticAI 的 output schema、CrewAI 的 crew/flow 配置都应成为版本化 artifact，而不是只留在聊天记录。

失败分类也应区分：模型候选错误、类型/schema 拒绝、路由/owner 冲突、工具 policy 拒绝、timeout 后未知副作用、validator 未通过、基础设施/adapter 故障。只有在模型当时看见的输入、工具结果与控制状态足以支持归因时，才把失败记作模型决策问题。

这些要求使不同 runtime 能以同一业务语言比较，也保留了停止采用的证据：当一个候选需要更宽权限、更高预算或更多人工才能达到基线，就把这项代价报告出来，而不是只展示最顺利的 trace。

先把候选限制在一个工作负载：例如研究资料整理可测试 DeepAgents 的隔离与 provenance；退款建议可测试 PydanticAI 的输出契约；有状态审批流程可测试 CrewAI Flow。跨任务推广前，重新固定输入、oracle 与风险边界。
