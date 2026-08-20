# AutoGen

官方 stable 文档（核对 2026-08-20）将 AutoGen 描述为构建 AI agents/applications 的 framework，并区分 AgentChat、Core、Extensions 与 Studio。[FACT:autogen-overview]

## 分层理解

Studio 适合原型 UI；AgentChat 提供较高层 conversation patterns；Core 面向事件驱动/运行时；Extensions 连接模型与工具。选层过高会难以控制状态，过低则增加实现成本。

## 多 Agent 门禁

每个 participant 有目标、工具、预算和终止；group chat 不能用“大家同意”替代外部 validator。记录消息路由、speaker/owner、重复循环、人工介入和总成本，并保留单 agent 基线。

## 生产缺口

补充 sandbox、secret、数据生命周期、checkpoint、幂等、副作用审批、dependency pinning 和 trace redaction。M4 不安装 AutoGen；当前为官方架构事实和 E0 设计建议。
