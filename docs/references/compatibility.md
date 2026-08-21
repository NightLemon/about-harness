# 兼容性与责任矩阵

本页不声称所有组合已经运行。同一个“支持”必须拆成四个证据轴，不能用一格 E1 同时代表产品文档和真实执行：

| 证据轴 | 回答的问题 | 合法状态 |
| --- | --- | --- |
| Source fact | 官方文档/维护仓库是否声明该能力？ | `verified / conflict / pending` + 来源、版本、日期 |
| Local surface | 目标 CLI/app/package 是否在当前环境可用？ | `probed / present-unprobed / missing / untested` |
| Project seam | 本项目是否用 fake/replay/contract seam 验证职责？ | `E1 / not-implemented` + fixture/test |
| Live evidence | 目标产品与模型是否真实运行？ | `E2 / E3 / untested` + 精确版本和费用授权 |

“Source verified + Project seam E1”只证明职责映射可执行，不证明上游产品、账号、模型或 provider 在当前环境可用。

## Coding Harness 证据

| 对象 | Source fact | Local surface | Project seam | Live evidence | 当前边界 |
| --- | --- | --- | --- | --- | --- |
| Codex | OpenAI Docs，rolling，2026-08-21 | Codex desktop task 可用；精确 harness 版本未暴露 | migration fixture E1 | untested | AGENTS/config/sandbox/approval/network 为不同控制层；模型质量未测 |
| Pi | 固定 README `496185f`，2026-08-20 | `pi` CLI missing | migration fixture E1 | untested | 默认工具、session、context 与 extension 只按固定源码映射 |
| Claude Code | 官方文档 rolling，2026-08-20 | CLI `2.1.96` probed | migration fixture E1 | untested | 只验证版本存在；未运行模型、hook、permission 或 sandbox 行为 |

## Harness 职责迁移

| 责任 | Codex | Pi | Claude Code | Gap / compensating control |
| --- | --- | --- | --- | --- |
| 持久指令 | AGENTS/override 分层 | context files / AGENTS（按固定版本） | CLAUDE.md/rules 与 auto memory | 保存加载顺序、作用域、大小限制；不能逐字复制 |
| Sandbox | OS/runtime sandbox | 最小核心不假设等价 OS sandbox | 产品 sandbox（按目标版本核验） | 缺失时用容器/受限用户/隔离 worktree 补偿 |
| Approval/permission | approval policy + permission profile | project trust 与自建 policy | permission rules/hooks | “会询问”不等于技术上无法执行 |
| Network | 独立 network 开关/策略 | 由运行环境与扩展控制 | sandbox/settings（按版本核验） | 默认拒绝；显式 allowlist 并保存实际出口证据 |
| 扩展 | skills、MCP、plugins/subagents | skills/templates/extensions/packages | tools、skills、hooks、plugins/subagents | 逐项审计 schema、权限、来源、timeout 与卸载 |
| 状态/恢复 | task/session/worktree 随 surface 变化 | JSONL tree、resume/fork/compaction | conversation/context 随版本变化 | 保存 checkpoint、压缩点、幂等状态和未决项 |

Codex 中 sandbox mode 决定技术上能做什么，approval policy 决定何时必须询问；network 还需独立启用和约束。[FACT:codex-sandbox-approval] 迁移到其他 harness 时必须分别找到等价控制或记录 gap。

## Framework 与领域代表

| 对象 | Source fact | Local/upstream | Project seam | Live evidence |
| --- | --- | --- | --- | --- |
| LangGraph | verified：低层有状态 orchestration/runtime | upstream package 未安装 | M5 offline seam E1：研究冲突来源 | untested |
| OpenAI Agents SDK | verified：code-first agent runtime 组件 | upstream package 未安装 | not-implemented；只有职责文档 | untested |
| Google ADK | verified：agent/tool/session/runtime 等构件 | upstream package 未安装 | not-implemented；只有职责文档 | untested |
| AutoGen | verified：AgentChat/Core/Extensions/Studio 分层 | upstream package 未安装 | not-implemented；只有职责文档 | untested |
| Browser Use | source 入口已列，具体版本未锁定 | upstream package 未安装 | M5 offline seam E1：本地合成页面与注入拒绝 | untested |
| PydanticAI | source 入口已列，具体版本未锁定 | upstream package 未安装 | M5 offline seam E1：schema 漂移与敏感字段 | untested |
| LlamaIndex | source 入口已列，具体版本未锁定 | upstream package 未安装 | M5 offline seam E1：版本化文档问答 | untested |

`lab/src/about_harness/integrations/` 中的文件是稳定 contract seam，不 import 或冒充上游 framework。它们已经完成 M5 E1，但 upstream package 和真实模型仍未运行。

## 迁移验收

协议兼容不等于工具语义、权限或恢复行为等价。迁移报告逐项保存“源语义 → 目标语义 → 缺口 → 补偿控制 → 证据轴”，并固定 model/provider、版本、surface、任务和预算。任何 live `supported` 结论都需要 E2/E3；未知项写 `untested`，不能从 source fact 推断。可执行字段与负例见[跨 Harness 迁移案例](/labs/migration)。
