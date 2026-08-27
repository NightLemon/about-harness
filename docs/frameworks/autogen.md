# AutoGen

官方来源：[AutoGen stable docs](https://microsoft.github.io/autogen/stable/)，核对日期：2026-08-20。

官方 stable 文档（核对 2026-08-20）将 AutoGen 描述为构建 AI agents/applications 的 framework，并区分 AgentChat、Core、Extensions 与 Studio。[FACT:autogen-overview]

## 分层理解

Studio 适合原型 UI；AgentChat 提供较高层 conversation patterns；Core 面向事件驱动/运行时；Extensions 连接模型与工具。选层过高会难以控制状态，过低则增加实现成本。

## 多 Agent 门禁

每个 participant 有目标、工具、预算和终止；group chat 不能用“大家同意”替代外部 validator。记录消息路由、speaker/owner、重复循环、人工介入和总成本，并保留单 agent 基线。

## 生产缺口

补充 sandbox、secret、数据生命周期、checkpoint、幂等、副作用审批、dependency pinning 和 trace redaction。本项目不安装 AutoGen；当前为官方架构事实和 E0 设计建议。

## 最小设计例

对“检索—写作—验证”任务，先建立单 agent 基线。只有检索与写作确实能并行且上下文可隔离时，才拆成两个 participant；verifier 使用确定性引用检查，不参与投票。每个 participant 都有工具 allowlist、消息上限、timeout 和终止原因，supervisor 负责取消传播。

## 失败诊断与回滚

重复发言先检查 speaker route 与终止条件；多个 agent 得出相同答案仍需外部证据；成本暴涨要统计总 model/tool calls，而不是单 participant。Studio 原型不能替代部署权限与数据生命周期。候选多 agent 流程失败时回到保存的单 agent 配置，不删除失败 trace。

## 检查题与下一步

增加角色解决了哪个可测瓶颈？结论投票为何不是正确性证明？先读[多 Agent 编排](/foundations/multi-agent)，再按[评测指标](/evaluation/metrics)比较编排成本。
