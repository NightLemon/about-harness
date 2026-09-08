# 逐页修订与验收对照

本表覆盖原提交 `bd5ed23f8b1904c8f276cecff4fb6ae490dcbdd0` 的全部 86 页。原始文件 hash、标题和实际 VitePress 锚点保存在 [内容基线](content-baseline.json)。本轮复核者为实施助手；这不是独立第三方审稿或真实模型质量评测。

## 修订原则与发现

正文按学习职责整理：问题入口、学习顺序、概念依赖分开；协议机制、探针矩阵、适配器接口分开；领域设计与实验操作分开。三篇合并页保留迁移入口和旧锚点，移出导航及搜索。工作表保留模板、填好实例、输入、断言、失败与回退，理论指向专门章节。

修正了工具步骤计数、Result/Trace/Study 版本、研究 unsupported_claims、页面请求预先标注、规范化/原始字节 hash、历史晋级阈值、测试总数与 TypeScript 取消位置。完整编码研究、原始材料领域实验、四个框架和 Responses 模拟传输为新增 E1 证据；产品来源为 E0，DeepSeek 待核项保持 pending。

## 原 86 页逐项对照

“正文复核”表示已核对本列职责、相邻章节分工、例子与结论、输入及断言和未知项。自动验收结果统一记录在[验证记录](verification.md)；不把链接或构建通过当成内容透彻性的证明。

| 原页面 | 处理与当前位置 | 修订后学习职责 | 正文与站点验收 |
| --- | --- | --- | --- |
| [浏览器 Agent 模式](../docs/domains/browser.md) | 保留机制，修订与去重；[正文](../docs/domains/browser.md) | 浏览器观察、动作与安全边界设计 | 正文已复核；页面/链接/旧锚点通过 |
| [Coding Agent 模式](../docs/domains/coding.md) | 保留机制，修订与去重；[正文](../docs/domains/coding.md) | 编码任务的工作区、补丁与验收设计 | 正文已复核；页面/链接/旧锚点通过 |
| [数据 Agent 模式](../docs/domains/data.md) | 保留机制，修订与去重；[正文](../docs/domains/data.md) | 数据契约、变换、复核与写回设计 | 正文已复核；页面/链接/旧锚点通过 |
| [文档 Agent 模式](../docs/domains/document.md) | 保留机制，修订与去重；[正文](../docs/domains/document.md) | 文档解析、版本、权限与引用设计 | 正文已复核；页面/链接/旧锚点通过 |
| [研究 Agent 模式](../docs/domains/research.md) | 保留机制，修订与去重；[正文](../docs/domains/research.md) | 主张、来源、冲突与证据设计 | 正文已复核；页面/链接/旧锚点通过 |
| [Judge 与人工评分](../docs/evaluation/judges.md) | 保留机制，修订与去重；[正文](../docs/evaluation/judges.md) | 裁判有效性、盲化与校准 | 正文已复核；页面/链接/旧锚点通过 |
| [评测方法与证据晋级](../docs/evaluation/method.md) | 保留机制，修订与去重；[正文](../docs/evaluation/method.md) | 抽样、配对、冻结及研究设计 | 正文已复核；页面/链接/旧锚点通过 |
| [指标、区间与效应量](../docs/evaluation/metrics.md) | 保留机制，修订与去重；[正文](../docs/evaluation/metrics.md) | 分母、成本、区间与失败指标 | 正文已复核；页面/链接/旧锚点通过 |
| [回归集、Holdout 与持续评测](../docs/evaluation/regression.md) | 保留机制，修订与去重；[正文](../docs/evaluation/regression.md) | 回归集、阻断与版本晋级 | 正文已复核；页面/链接/旧锚点通过 |
| [评测报告与公开结果](../docs/evaluation/reporting.md) | 保留机制，修订与去重；[正文](../docs/evaluation/reporting.md) | 报告结构、历史反例和结论边界 | 正文已复核；页面/链接/旧锚点通过 |
| [Task、Action、Run、Trace 与 Result Schema](../docs/evaluation/task-schema.md) | 保留机制，修订与去重；[正文](../docs/evaluation/task-schema.md) | Task/Action/Run/Trace/Result/Study 的版本与关系 | 正文已复核；页面/链接/旧锚点通过 |
| [Agent 循环：把模型提议变成受控执行](../docs/foundations/agent-loop.md) | 保留机制，修订与去重；[正文](../docs/foundations/agent-loop.md) | 动作生命周期、预算和终态 | 正文已复核；页面/链接/旧锚点通过 |
| [Harness 系统架构：责任、边界与执行证据](../docs/foundations/architecture.md) | 保留机制，修订与去重；[正文](../docs/foundations/architecture.md) | 组件职责和状态所有权 | 正文已复核；页面/链接/旧锚点通过 |
| [上下文工程：让模型看到正确的当前状态](../docs/foundations/context.md) | 保留机制，修订与去重；[正文](../docs/foundations/context.md) | 一次模型调用的信息选择 | 正文已复核；页面/链接/旧锚点通过 |
| [人在循环中的控制点：少打断，但不越权](../docs/foundations/human-control.md) | 保留机制，修订与去重；[正文](../docs/foundations/human-control.md) | 人类介入、批准和终止 | 正文已复核；页面/链接/旧锚点通过 |
| [指令、自动化与门禁](../docs/foundations/instructions.md) | 保留机制，修订与去重；[正文](../docs/foundations/instructions.md) | 规则来源、作用域和维护 | 正文已复核；页面/链接/旧锚点通过 |
| [记忆的生命周期：写入、检索、失效与删除](../docs/foundations/memory.md) | 保留机制，修订与去重；[正文](../docs/foundations/memory.md) | 记忆生命周期与任务序列实验 | 正文已复核；页面/链接/旧锚点通过 |
| [多 Agent 编排](../docs/foundations/multi-agent.md) | 保留机制，修订与去重；[正文](../docs/foundations/multi-agent.md) | 协作成本、角色和交接责任 | 正文已复核；页面/链接/旧锚点通过 |
| [可观测性与故障归因](../docs/foundations/observability.md) | 保留机制，修订与去重；[正文](../docs/foundations/observability.md) | 事件、指标与最小取证 | 正文已复核；页面/链接/旧锚点通过 |
| [模型与工具协议](../docs/foundations/protocols.md) | 保留机制，修订与去重；[正文](../docs/foundations/protocols.md) | 消息、工具、状态等协议机制 | 正文已复核；页面/链接/旧锚点通过 |
| [推理预算、规划与回退](../docs/foundations/reasoning.md) | 保留机制，修订与去重；[正文](../docs/foundations/reasoning.md) | 规划、执行与确定性判断分工 | 正文已复核；页面/链接/旧锚点通过 |
| [安全与权限：限制能力、后果与恢复成本](../docs/foundations/security.md) | 保留机制，修订与去重；[正文](../docs/foundations/security.md) | 信任边界与安全控制层 | 正文已复核；页面/链接/旧锚点通过 |
| [状态与可靠执行](../docs/foundations/state-reliability.md) | 保留机制，修订与去重；[正文](../docs/foundations/state-reliability.md) | 幂等、检查点和恢复设计 | 正文已复核；页面/链接/旧锚点通过 |
| [工具与协议：从 Action 提议到可审计副作用](../docs/foundations/tools.md) | 保留机制，修订与去重；[正文](../docs/foundations/tools.md) | 工具契约、权限和执行回执 | 正文已复核；页面/链接/旧锚点通过 |
| [什么是 Agent Harness](../docs/foundations/what-is-harness.md) | 保留机制，修订与去重；[正文](../docs/foundations/what-is-harness.md) | 定义 Harness 及责任边界 | 正文已复核；页面/链接/旧锚点通过 |
| [AutoGen：从对话原型到可控多 Agent 系统](../docs/frameworks/autogen.md) | 重写；[正文](../docs/frameworks/autogen.md) | 真实参与者协作与有界终止 | 正文已复核；页面/链接/旧锚点通过 |
| [Agent Framework 对照与选型方法](../docs/frameworks/comparison.md) | 重写；[正文](../docs/frameworks/comparison.md) | 四个真实运行时的机制与应用责任 | 正文已复核；页面/链接/旧锚点通过 |
| [Google Agent Development Kit：把 Agent、Session 与部署责任分开](../docs/frameworks/google-adk.md) | 重写；[正文](../docs/frameworks/google-adk.md) | 真实运行器、会话状态和事件 | 正文已复核；页面/链接/旧锚点通过 |
| [LangGraph：用显式状态图约束长运行 Agent](../docs/frameworks/langgraph.md) | 重写；[正文](../docs/frameworks/langgraph.md) | 实际分支、归并与检查点恢复 | 正文已复核；页面/链接/旧锚点通过 |
| [OpenAI Agents SDK](../docs/frameworks/openai-agents-sdk.md) | 重写；[正文](../docs/frameworks/openai-agents-sdk.md) | 真实 Runner 与确定性模型工具循环 | 正文已复核；页面/链接/旧锚点通过 |
| [综合项目：从 Starter 到可复核作品集](../docs/guide/capstone.md) | 重写；[正文](../docs/guide/capstone.md) | 用同一研究完成六项交付 | 正文已复核；页面/链接/旧锚点通过 |
| [学习作品集与评分规则](../docs/guide/portfolio.md) | 重写；[正文](../docs/guide/portfolio.md) | 验收作品集与评分 | 正文已复核；页面/链接/旧锚点通过 |
| [前置知识与环境](../docs/guide/prerequisites.md) | 重写；[正文](../docs/guide/prerequisites.md) | 固定环境准备和失败恢复 | 正文已复核；页面/链接/旧锚点通过 |
| [Harness 完整知识地图](../docs/guide/roadmap.md) | 重写；[正文](../docs/guide/roadmap.md) | 展示概念依赖与前后关系 | 正文已复核；页面/链接/旧锚点通过 |
| [学习路径：从理解 Harness 到交付可复核证据](../docs/guide/start.md) | 重写；[正文](../docs/guide/start.md) | 给出实际学习顺序和阶段完成标志 | 正文已复核；页面/链接/旧锚点通过 |
| [在 Claude Code 中适配指定模型](../docs/harnesses/claude-code.md) | 重写；[正文](../docs/harnesses/claude-code.md) | 固定 Claude Code 版本的安装、任务与回退 | 正文已复核；页面/链接/旧锚点通过 |
| [在 Codex 中适配指定模型](../docs/harnesses/codex.md) | 重写；[正文](../docs/harnesses/codex.md) | 固定 Codex 版本的安装、任务与回退 | 正文已复核；页面/链接/旧锚点通过 |
| [Codex、Pi 与 Claude Code：职责对照](../docs/harnesses/comparison.md) | 重写；[正文](../docs/harnesses/comparison.md) | 三种产品的职责与验证状态 | 正文已复核；页面/链接/旧锚点通过 |
| [在 Pi 中适配指定模型](../docs/harnesses/pi.md) | 重写；[正文](../docs/harnesses/pi.md) | 固定 Pi 版本的安装、任务与回退 | 正文已复核；页面/链接/旧锚点通过 |
| [Adapter 契约：隔离协议，而不是接管控制](../docs/implementation/adapter-contract.md) | 保留机制，修订与去重；[正文](../docs/implementation/adapter-contract.md) | 适配器代码接口和原始工具回传 | 正文已复核；页面/链接/旧锚点通过 |
| [扩展机制：Tool、CLI、Skill、Hook、Plugin 与 MCP](../docs/implementation/extensions.md) | 保留机制，修订与去重；[正文](../docs/implementation/extensions.md) | 教学实现的扩展边界 | 正文已复核；页面/链接/旧锚点通过 |
| [Python 最小 Harness：从契约到可恢复循环](../docs/implementation/minimal-harness-python.md) | 重写；[正文](../docs/implementation/minimal-harness-python.md) | 最小实现到完整工作区的运行入口 | 正文已复核；页面/链接/旧锚点通过 |
| [Harness 测试策略：验证控制流，而不只验证答案](../docs/implementation/testing.md) | 保留机制，修订与去重；[正文](../docs/implementation/testing.md) | 跨边界测试与业务验收方法 | 正文已复核；页面/链接/旧锚点通过 |
| [TypeScript 关键接口映射：从静态类型到运行时边界](../docs/implementation/typescript-mapping.md) | 保留机制，修订与去重；[正文](../docs/implementation/typescript-mapping.md) | Python/TypeScript 契约及差异 | 正文已复核；页面/链接/旧锚点通过 |
| [首页](../docs/index.md) | 重写；[正文](../docs/index.md) | 按问题选择入口 | 正文已复核；页面/链接/旧锚点通过 |
| [浏览器实验：本地页面与 Prompt Injection](../docs/labs/browser.md) | 重写；[正文](../docs/labs/browser.md) | 本地 HTML/Playwright 观察动作实验 | 正文已复核；页面/链接/旧锚点通过 |
| [Coding：从失败断言到受约束修复](../docs/labs/coding.md) | 重写；[正文](../docs/labs/coding.md) | 六任务编码研究的运行与验收 | 正文已复核；页面/链接/旧锚点通过 |
| [数据实验：Snapshot、Schema、缺失语义与敏感字段](../docs/labs/data.md) | 重写；[正文](../docs/labs/data.md) | 实际 CSV 的确定性变换和计算复核 | 正文已复核；页面/链接/旧锚点通过 |
| [文档实验：版本、权限、解析与块级出处](../docs/labs/document.md) | 重写；[正文](../docs/labs/document.md) | Markdown/HTML 结构解析和授权引用 | 正文已复核；页面/链接/旧锚点通过 |
| [跨 Harness 迁移：保留职责而非文件名](../docs/labs/migration.md) | 重写；[正文](../docs/labs/migration.md) | 责任映射检查及未验证目标 | 正文已复核；页面/链接/旧锚点通过 |
| [研究实验：冲突来源、证据定位与覆盖缺口](../docs/labs/research.md) | 重写；[正文](../docs/labs/research.md) | 本地原始材料的证据定位实验 | 正文已复核；页面/链接/旧锚点通过 |
| [离线 Runner 与职责接缝](../docs/labs/runner.md) | 重写；[正文](../docs/labs/runner.md) | 实验输入、执行链与产物位置 | 正文已复核；页面/链接/旧锚点通过 |
| [实验环境与统一约定](../docs/labs/setup.md) | 重写；[正文](../docs/labs/setup.md) | 按目标选择实验及统一准备 | 正文已复核；页面/链接/旧锚点通过 |
| [指定模型适配方法](../docs/models/adaptation.md) | 保留机制，修订与去重；[正文](../docs/models/adaptation.md) | 统一模型资格、效用与采用流程 | 正文已复核；页面/链接/旧锚点通过 |
| [Anthropic Claude 模型家族适配](../docs/models/anthropic.md) | 重写；[正文](../docs/models/anthropic.md) | Anthropic 协议与产品差异 | 正文已复核；页面/链接/旧锚点通过 |
| [DeepSeek 模型家族适配](../docs/models/deepseek.md) | 重写；[正文](../docs/models/deepseek.md) | DeepSeek 差异及待核来源 | 正文已复核；页面/链接/旧锚点通过 |
| [Google Gemini 模型家族适配](../docs/models/google.md) | 重写；[正文](../docs/models/google.md) | Gemini 产品与调用差异 | 正文已复核；页面/链接/旧锚点通过 |
| [Meta Llama 模型家族适配](../docs/models/llama.md) | 重写；[正文](../docs/models/llama.md) | Llama 模型与托管服务边界 | 正文已复核；页面/链接/旧锚点通过 |
| [OpenAI 模型家族适配](../docs/models/openai.md) | 重写；[正文](../docs/models/openai.md) | Responses 非流式串行接入主线 | 正文已复核；页面/链接/旧锚点通过 |
| [模型协议兼容性](../docs/models/protocol-compatibility.md) | 保留机制，修订与去重；[正文](../docs/models/protocol-compatibility.md) | 协议探针矩阵及支持边界 | 正文已复核；页面/链接/旧锚点通过 |
| [Qwen 模型家族适配](../docs/models/qwen.md) | 重写；[正文](../docs/models/qwen.md) | Qwen 接入身份和协议差异 | 正文已复核；页面/链接/旧锚点通过 |
| [针对模型的推理预算](../docs/models/reasoning-budget.md) | 保留机制，修订与去重；[正文](../docs/models/reasoning-budget.md) | 推理成本和预算配置 | 正文已复核；页面/链接/旧锚点通过 |
| [上下文与工具调优](../docs/optimization/context-tools.md) | 保留机制，修订与去重；[正文](../docs/optimization/context-tools.md) | 上下文和工具配置的效用实验 | 正文已复核；页面/链接/旧锚点通过 |
| [Harness 问题诊断](../docs/optimization/debugging.md) | 合并；旧址迁移；[正文](../docs/practice/debugging.md) | 迁移到实践诊断 | 正文已复核；页面/链接/旧锚点通过 |
| [实验方法](../docs/optimization/experiment.md) | 保留机制，修订与去重；[正文](../docs/optimization/experiment.md) | 优化假设与单变量实验 | 正文已复核；页面/链接/旧锚点通过 |
| [记忆优化](../docs/optimization/memory.md) | 合并；旧址迁移；[正文](../docs/foundations/memory.md) | 迁移到记忆生命周期 | 正文已复核；页面/链接/旧锚点通过 |
| [模型—Harness 匹配](../docs/optimization/model-fit.md) | 合并；旧址迁移；[正文](../docs/models/adaptation.md) | 迁移到模型适配与选择 | 正文已复核；页面/链接/旧锚点通过 |
| [提示与任务契约](../docs/optimization/prompting.md) | 保留机制，修订与去重；[正文](../docs/optimization/prompting.md) | 提示修改的可验证方法 | 正文已复核；页面/链接/旧锚点通过 |
| [推理预算与模型路由优化](../docs/optimization/reasoning-routing.md) | 保留机制，修订与去重；[正文](../docs/optimization/reasoning-routing.md) | 推理预算及路由实验 | 正文已复核；页面/链接/旧锚点通过 |
| [问题诊断：找到第一处分歧](../docs/practice/debugging.md) | 保留机制，修订与去重；[正文](../docs/practice/debugging.md) | 完整诊断方法与可运行工作坊 | 正文已复核；页面/链接/旧锚点通过 |
| [端到端模型适配案例：从资格探针到受限晋级](../docs/practice/end-to-end.md) | 重写；[正文](../docs/practice/end-to-end.md) | 贯穿全站的实际编码证据链 | 正文已复核；页面/链接/旧锚点通过 |
| [评测实验室：先验证矩阵，再解释结果](../docs/practice/evaluation.md) | 重写；[正文](../docs/practice/evaluation.md) | 完整实际研究与历史不完整反例 | 正文已复核；页面/链接/旧锚点通过 |
| [Framework 选型工作表：先证明它减少了哪种复杂度](../docs/practice/framework-selection.md) | 重写；[正文](../docs/practice/framework-selection.md) | 选型模板及本地冲突案例决定 | 正文已复核；页面/链接/旧锚点通过 |
| [Harness 设计工作表：把一个任务变成可验证的运行系统](../docs/practice/harness-design.md) | 重写；[正文](../docs/practice/harness-design.md) | 设计填写模板及完整编码示范 | 正文已复核；页面/链接/旧锚点通过 |
| [模型适配卡](../docs/practice/model-playbook.md) | 重写；[正文](../docs/practice/model-playbook.md) | 模型卡模板及回放适配卡 | 正文已复核；页面/链接/旧锚点通过 |
| [可靠性恢复工作坊：响应丢失后先对账](../docs/practice/reliability-recovery.md) | 保留机制，修订与去重；[正文](../docs/practice/reliability-recovery.md) | 未知副作用的可运行恢复工作坊 | 正文已复核；页面/链接/旧锚点通过 |
| [Agent 安全评审工作表：从数据流到可执行负例](../docs/practice/security-review.md) | 重写；[正文](../docs/practice/security-review.md) | 威胁控制工作表及完整示范 | 正文已复核；页面/链接/旧锚点通过 |
| [兼容性与责任矩阵：把“支持”拆成可验证证据](../docs/references/compatibility.md) | 重写；[正文](../docs/references/compatibility.md) | 产品、框架、协议的实际验证边界 | 正文已复核；页面/链接/旧锚点通过 |
| [产品事实注册表](../docs/references/fact-registry.md) | 保留机制，修订与去重；[正文](../docs/references/fact-registry.md) | 逐项登记易变主张与检查日期 | 正文已复核；页面/链接/旧锚点通过 |
| [术语表](../docs/references/glossary.md) | 保留，术语核对；[正文](../docs/references/glossary.md) | 统一术语的中文定义 | 正文已复核；页面/链接/旧锚点通过 |
| [资料来源与核对方法](../docs/references/sources.md) | 重写；[正文](../docs/references/sources.md) | 官方来源入口及状态 | 正文已复核；页面/链接/旧锚点通过 |
| [Agent 事件响应](../docs/security/incident-response.md) | 保留机制，修订与去重；[正文](../docs/security/incident-response.md) | 事故分诊、遏制、取证和恢复 | 正文已复核；页面/链接/旧锚点通过 |
| [Prompt Injection 防护](../docs/security/prompt-injection.md) | 保留机制，修订与去重；[正文](../docs/security/prompt-injection.md) | 不可信内容到动作授权的边界 | 正文已复核；页面/链接/旧锚点通过 |
| [Secret、隐私与公开结果](../docs/security/secrets-privacy.md) | 保留机制，修订与去重；[正文](../docs/security/secrets-privacy.md) | 敏感数据生命周期与公开数据卫生 | 正文已复核；页面/链接/旧锚点通过 |
| [扩展与供应链安全](../docs/security/supply-chain.md) | 保留机制，修订与去重；[正文](../docs/security/supply-chain.md) | 依赖、工具、构建来源与风险 | 正文已复核；页面/链接/旧锚点通过 |
| [Agent Harness 威胁模型](../docs/security/threat-model.md) | 保留机制，修订与去重；[正文](../docs/security/threat-model.md) | 按主体、资产和边界建模 | 正文已复核；页面/链接/旧锚点通过 |

## 仍然保留的边界

- 所有模型替身和回放结果均为 E1，不评价真实模型质量。
- Codex、Pi、Claude Code 只核验固定包入口与官方配置资料；任务运行、权限实效和跨产品迁移未验证。
- Responses 只完成模拟非流式串行协议资格；真实模式、流式、并行工具和跨进程恢复未通过。
- 固定补丁执行器不是通用沙箱；研究也不是生产分布式平台。
- 旧合成研究和历史 schema 继续按原语义读取，不补造记录。
- 页面职责已收敛；必要的安全、失败与证据边界会在操作入口保留，不追求删除所有重复词句。
