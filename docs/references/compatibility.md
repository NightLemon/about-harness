# 兼容性与责任矩阵

本页不声称所有组合已经运行。`已定义` 表示文档或接口有明确映射，`E1` 表示离线 fake/replay 已验证，`E2/E3` 需要独立真实 API 与费用授权。

## Harness 与核心职责

| 责任 | Codex | Pi | Claude Code | 当前证据 |
| --- | --- | --- | --- | --- |
| 项目持久指令 | `AGENTS.md`/override 分层链 | context files / `AGENTS.md` | `CLAUDE.md`/rules 与 auto memory | 官方页/固定 README，E1 |
| 工具与扩展 | skills、MCP、plugins/subagents | 默认四工具；skills/templates/extensions/packages | tools、skills、hooks、plugins/subagents | 官方页/固定 README，E1 |
| 权限与审批 | permission profile、sandbox、approval；项目 trust 影响 project config | project trust；扩展需自行实现更强 policy | permission rules、sandbox、hooks | 文档职责映射，E1；未做 live 探针 |
| 状态、压缩与恢复 | 随 surface 变化，需目标版本探针 | JSONL tree、resume/fork/compaction | conversation/context 能力需目标版本探针 | Pi 为固定 README E1；其余窄事实 E0 |
| 非交互/自动化 surface | 需目标 CLI/app 版本核验 | CLI print/JSON/RPC 需按固定文档逐项验证 | 需目标 CLI 版本核验 | 未运行目标版本，E0 |

## Framework 与领域代表

| 对象 | 在本项目中的角色 | 目标案例 | 当前状态 |
| --- | --- | --- | --- |
| LangGraph | 状态图与研究 agent 代表 | 冲突来源研究 | M4 文档核验 E1；M5 集成待完成 |
| OpenAI Agents SDK | 通用 agent SDK | framework 对照 | M4 文档核验 E1；无 live run |
| Google ADK | 通用 agent 开发工具包 | framework 对照 | M4 文档核验 E1；无 live run |
| AutoGen | 多 agent framework | framework 对照 | M4 文档核验 E1；无 live run |
| Browser Use | 浏览器 agent 集成 | 本地合成站点 | 待 M5 |
| PydanticAI | 结构化数据 agent 集成 | schema 漂移 | 待 M5 |
| LlamaIndex | 文档检索 agent 集成 | 版本化问答 | 待 M5 |

## 解释约束

协议兼容不等于工具语义、权限或恢复行为等价；同名配置也不能逐字迁移。任何“支持”结论都需写明模型、provider、adapter、版本、surface、已测操作与未测范围。
