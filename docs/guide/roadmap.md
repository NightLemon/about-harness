# Harness 完整知识地图

Agent harness 把概率模型包在一个可执行、可约束、可观察、可恢复的系统里。本页既是学习顺序，也是内容覆盖审计入口。

## 第一层：对象与责任边界

先区分 model、provider、adapter、agent、framework、runtime/controller、protocol、surface、harness 和完整产品。相同模型在不同 surface 上可能得到不同指令、工具、权限与停止策略；framework 也不自动等于完整 harness。

入口：[什么是 Harness](/foundations/what-is-harness)、[术语表](/references/glossary)、[兼容性矩阵](/references/compatibility)。

## 第二层：一次运行如何成立

| 节点 | 必答问题 | 核心机制 |
| --- | --- | --- |
| 任务契约 | 目标、输入、边界和验收是什么？ | 任务拆分、风险、人工批准 |
| Agent loop | 何时观察、行动、验证、继续或停止？ | event、state、controller |
| 上下文 | 此刻应该让模型看到什么？ | 选择、排序、预算、压缩、污染 |
| 指令 | 规则放在哪一层，冲突如何解决？ | system、project、directory、task |
| 记忆 | 什么可以跨步或跨会话保留？ | 写入、检索、失效、删除、隐私 |
| 推理与路由 | 用哪个模型、预算与回退？ | reasoning budget、router、fallback |
| 工具与协议 | 能做什么，输入输出如何约束？ | schema、CLI、MCP、错误语义 |
| 权限 | 哪些副作用允许发生？ | sandbox、allowlist、approval |

当前入口：[Agent 循环](/foundations/agent-loop)、[上下文](/foundations/context)、[指令](/foundations/instructions)、[工具](/foundations/tools)、[安全](/foundations/security)。M3/M4 会补齐独立的架构、记忆、推理、协议和权限页面。

## 第三层：可靠运行与治理

一个可用 demo 不等于可靠 harness。必须覆盖：

- 超时、重试、退避、幂等键、并发、取消、checkpoint 与恢复；
- trace、事件日志、工具记录、token、成本、延迟和失败分类；
- 多 agent 委派、上下文隔离、共享状态、冲突解决和终止传播；
- 人在循环中的计划批准、危险动作审批、升级和责任边界；
- adapters、skills、hooks、plugins、MCP servers 的扩展与配置漂移。

这些节点将在 M3 的最小实现与 M4 的原理页面中同时出现，避免“只有概念”或“只有代码”。

## 第四层：模型适配

指定模型优化按固定顺序进行：

1. 解析精确模型身份、provider 与 adapter；
2. 验证消息、工具、流式事件、错误和上下文协议兼容；
3. 用小探针校准能力假设；
4. 写目标工作负载、风险与预算画像；
5. 保存开箱默认与工程基线；
6. 分别调节上下文、指令、工具、权限、记忆与推理预算；
7. 形成带回退条件的路由；
8. 用配对任务、重复、holdout、安全和成本证据决定是否晋级。

首版覆盖 OpenAI、Anthropic、Google、Qwen、DeepSeek、Llama 六个模型家族，但不会建立脱离工作负载的通用排行榜。

## 第五层：Harness、framework 与领域模式

深度 coding harness 是 Codex、Pi、Claude Code；通用 framework 是 LangGraph、OpenAI Agents SDK、Google ADK、AutoGen。五类 agent 领域为 coding、浏览器、研究、数据和文档，对应的主要风险分别包括错误修改、页面注入、来源冲突、schema 漂移与陈旧检索。

入口：[三个 Harness 对照](/harnesses/comparison)。M4 会建立 framework 与五类领域的正式页面。

## 第六层：实验与评测

内循环负责完成一次任务；外循环负责收集失败、分类根因、修改一个主要变量、重跑任务集并固化改进。证据分级如下：

- E0：未验证假设；
- E1：固定 fixture、fake 或 replay 的离线证据；
- E2：锁定真实模型与环境的有限烟测；
- E3：满足任务量、重复、holdout、预注册、安全和成本门槛的正式比较。

当前 Goal 只允许 E1。正式比较至少需要 20 个不同任务、每配置每任务 3 次重复、holdout 至少 20% 且不少于 5 题。

## 第七层：安全、事实与发布

安全覆盖 prompt injection、secret、数据流、供应链和事件响应；治理覆盖来源、许可、依赖、review 证据、GitHub Pages 和维护周期。易变事实发布前 30 天内复核，超过 90 天的在线页面必须显示过期提示。

入口：[事实注册表](/references/fact-registry)、[审阅方法](/meta/review-method)、[隐私](/meta/privacy)、[维护](/meta/maintenance)。

## 完成检查

只有当上述所有节点都有主页面、实现或案例映射，且[六项作品集](/guide/portfolio)可被实际评分时，知识地图才算覆盖完成。空白节点应标为“待交付”，不能用导航标题冒充内容。
