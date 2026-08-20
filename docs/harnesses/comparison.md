# Codex、Pi 与 Claude Code：职责对照

比较目标是迁移职责，不是选“绝对最好”。产品事实核对日期 2026-08-20；具体版本与 source 见各专题和[事实注册表](/references/fact-registry)。

## 责任矩阵

| 责任 | Codex | Pi | Claude Code | 迁移时保留 |
| --- | --- | --- | --- | --- |
| 项目指导 | 分层 AGENTS.md | context/project files（按目标版本核验） | CLAUDE.md / rules | 规则意图、作用域、优先级 |
| 重用流程 | skills/plugins | skills/templates/packages | skills/plugins | 触发、输入、版本、卸载 |
| 程序化扩展 | MCP/tools/plugins | TypeScript extensions | tools/hooks/plugins | schema、权限、timeout |
| 硬控制 | permissions/sandbox/approval | project trust + 自建 policy | permissions/sandbox/hooks | 禁区与批准语义 |
| 状态恢复 | task/session/worktree 能力按 surface 核验 | session/tree/fork/import | conversation/checkpoint 能力按 surface 核验 | checkpoint、幂等与未决项 |
| 委派 | subagents | 由扩展/工作流实现 | subagents | 子任务契约与父级验收 |

## 不可逐字复制

同名 skill、plugin、memory、permission 的发现顺序和执行权限不同；同一模型名也可能解析为不同 provider/alias。迁移文档需写 source semantics → target semantics → gap → compensating control。

## 选择维度

- 目标 surface 与团队既有工具；
- 需要内建能力还是最小可扩展核心；
- permission、sandbox 和审计要求；
- session/并行/自动化模式；
- provider/model 协议与成本；
- 扩展供应链和维护能力。

## 配对迁移实验

选择同一受约束 coding fixture，固定 model/provider（若实际可共用）、输入 commit、验收和预算；分别记录指令、工具、权限、trace、恢复与结果。若 surface 无法对齐，报告差异而不是伪造公平排名。

## 当前证据边界

Codex/Claude/Pi 产品事实来自官方页或固定仓库；没有真实三方配对 run，性能比较为 E0。M5 的迁移案例只提供 E1 runner 和 schema。
