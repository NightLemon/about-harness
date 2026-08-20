# 兼容性与责任矩阵

本页不声称所有组合已经运行。`已定义` 表示文档或接口有明确映射，`E1` 表示离线 fake/replay 已验证，`E2/E3` 需要独立真实 API 与费用授权。

## Harness 与核心职责

| 责任 | Codex | Pi | Claude Code | 当前证据 |
| --- | --- | --- | --- | --- |
| 项目持久指令 | 待 M4 核验 | 待 M4 核验 | 待 M4 核验 | E0 |
| 工具与扩展 | 待 M4 核验 | 待 M4 核验 | 待 M4 核验 | E0 |
| 权限与审批 | 待 M4 核验 | 待 M4 核验 | 待 M4 核验 | E0 |
| 状态、压缩与恢复 | 待 M4 核验 | 待 M4 核验 | 待 M4 核验 | E0 |
| 非交互/自动化 surface | 待 M4 核验 | 待 M4 核验 | 待 M4 核验 | E0 |

## Framework 与领域代表

| 对象 | 在本项目中的角色 | 目标案例 | 当前状态 |
| --- | --- | --- | --- |
| LangGraph | 状态图与研究 agent 代表 | 冲突来源研究 | 待 M4/M5 |
| OpenAI Agents SDK | 通用 agent SDK | framework 对照 | 待 M4 |
| Google ADK | 通用 agent 开发工具包 | framework 对照 | 待 M4 |
| AutoGen | 多 agent framework | framework 对照 | 待 M4 |
| Browser Use | 浏览器 agent 集成 | 本地合成站点 | 待 M5 |
| PydanticAI | 结构化数据 agent 集成 | schema 漂移 | 待 M5 |
| LlamaIndex | 文档检索 agent 集成 | 版本化问答 | 待 M5 |

## 解释约束

协议兼容不等于工具语义、权限或恢复行为等价；同名配置也不能逐字迁移。任何“支持”结论都需写明模型、provider、adapter、版本、surface、已测操作与未测范围。
