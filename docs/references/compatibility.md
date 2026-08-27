# 兼容性与责任矩阵

“支持”必须拆成来源、项目接缝与真实运行三条证据轴。官方文档声明能力，不等于本机 CLI 可用；离线 fixture 通过，也不等于上游产品或模型组合可用。

| 证据轴 | 回答的问题 | 合法表述 |
| --- | --- | --- |
| Source fact | 官方文档或维护仓库是否声明该能力？ | `verified / conflict / pending`，附版本和日期 |
| Offline seam | 项目是否用 fake/replay 验证了对应责任？ | E1 或 `not-implemented`，附 fixture |
| Live evidence | 目标产品和模型是否真实运行？ | E2/E3 或 `untested`，附版本、任务和授权边界 |

## Coding harness

| 对象 | 来源状态 | 项目示例 | 真实运行 | 阅读边界 |
| --- | --- | --- | --- | --- |
| Codex | 官方滚动文档，2026-08-21 | 脱敏静态配置 E0；迁移 fixture E1 | untested | 分开 AGENTS、config、sandbox、approval 与 network |
| Pi | 固定 README `496185f`，2026-08-20 | 脱敏静态配置 E0；迁移 fixture E1 | untested | 按固定版本映射工具、session、context 与 extension |
| Claude Code | 官方滚动文档，2026-08-20 | 脱敏静态配置 E0；迁移 fixture E1 | untested | 指令上下文、settings、permissions 和 hook 职责不同 |

三套可复制示例只通过仓库静态校验，没有启动对应产品。读者应先看各[Harness 实战](/harnesses/comparison)，再用目标安装版本的帮助命令核对字段。

## 职责迁移

| 责任 | Codex | Pi | Claude Code | 缺口处理 |
| --- | --- | --- | --- | --- |
| 持久指令 | AGENTS 分层 | context files / 项目指令 | CLAUDE.md / rules | 保存作用域与加载顺序，不逐字复制 |
| 技术隔离 | sandbox / permission profile | 运行环境或容器补偿 | sandbox，按版本核验 | 缺失时使用受限用户、容器或隔离 worktree |
| 询问与授权 | approval policy | project trust 与自建 policy | permission rules / hooks | “会询问”不等于技术上不可执行 |
| 网络 | 独立网络策略 | 运行环境与 extension | settings / sandbox | 默认拒绝并记录实际出口 |
| 扩展 | skills、MCP、plugins | skills、templates、extensions | tools、skills、hooks、plugins | 审计 schema、权限、来源、timeout 与卸载 |
| 恢复 | task/session/worktree 因 surface 而异 | session tree、resume、fork、compaction | conversation/context 因版本而异 | 保存 checkpoint、幂等键和未决项 |

Codex 中 sandbox 决定技术可达范围，approval 决定何时停下来询问，network 还需独立控制。[FACT:codex-sandbox-approval] 迁移时要逐项寻找等价控制。

## Framework 与领域职责接缝

| 名称 | 官方来源 | 本项目实际执行 | 证据边界 |
| --- | --- | --- | --- |
| LangGraph | 已核对低层有状态 orchestration/runtime | 研究案例的确定性状态转换 | E1 离线职责接缝；未安装上游包 |
| Browser Use | 来源入口已列，版本未锁定 | 浏览器案例的本地合成页面与注入拒绝 | E1 离线职责接缝；未安装上游包 |
| PydanticAI | 来源入口已列，版本未锁定 | 数据案例的 schema 漂移与敏感字段 | E1 离线职责接缝；未安装上游包 |
| LlamaIndex | 来源入口已列，版本未锁定 | 文档案例的版本化问答 | E1 离线职责接缝；未安装上游包 |
| OpenAI Agents SDK / Google ADK / AutoGen | 官方架构入口已核对 | 只有职责说明 | E0；未安装、未运行 |

`lab/src/about_harness/integrations/` 的代码不会 import 上游 framework。文件名只用于教学映射，不能据此声称已接入产品。

## 如何使用本矩阵

迁移报告逐项保存“源语义 → 目标语义 → 缺口 → 补偿控制 → 证据轴”，并固定 model/provider、版本、surface、任务与预算。协议外形相似不代表工具语义、权限或恢复行为等价。可执行负例见[跨 Harness 迁移](/labs/migration)。
