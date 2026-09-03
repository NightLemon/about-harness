# Harness 完整知识地图

Agent harness 把概率模型放进可执行、可约束、可观察、可恢复的工作环境。[FACT:boundary-harness] 本页既是学习顺序，也是查漏入口。

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

可靠 harness 还需覆盖 timeout、有限重试、幂等、取消、checkpoint、可观测性、多 agent 委派与高风险批准。进入实现前先读[状态与可靠执行](/foundations/state-reliability)、[可观测性](/foundations/observability)、[多 Agent 编排](/foundations/multi-agent)和[人在循环中](/foundations/human-control)，再对照[Python 最小实现](/implementation/minimal-harness-python)、[Adapter 契约](/implementation/adapter-contract)和[扩展机制](/implementation/extensions)。

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

## 完成检查

能解释各节点如何连接、运行六个离线案例，并按[六项作品集](/guide/portfolio)给自己的适配工作评分，才算完成主线。需要实操时从[实验环境](/labs/setup)继续，而不是停留在导航清单。
