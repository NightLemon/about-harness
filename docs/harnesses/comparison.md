# Codex、Pi 与 Claude Code 横向比较

本页比较职责与设计取向，不做“谁最好”的排名。产品事实核对于 **2026-08-20**；版本变化前请看[官方来源](/references/sources)。

表格汇总官方产品文档/维护仓库明确的机制；“如何选择”和迁移顺序属于本项目的工程建议。可用性可能受版本、surface、套餐和组织策略影响。

## 同一职责，不同表面

| 职责 | Codex | Pi | Claude Code |
| --- | --- | --- | --- |
| 仓库持久指令 | `AGENTS.md`，支持嵌套与 override | `AGENTS.md` 或 `CLAUDE.md`，支持 override | `CLAUDE.md`，支持层级/导入 |
| 项目设置 | `.codex/config.toml` | `.pi/settings.json` | `.claude/settings.json` |
| 按需工作流 | `.agents/skills/*/SKILL.md` | `.pi/skills` 或 `.agents/skills` | `.claude/skills/*/SKILL.md` |
| 外部工具 | MCP、插件/connector、CLI | 默认偏向 CLI；MCP 可由 extension 添加 | MCP、插件、CLI |
| 机械规则 | Hooks、sandbox/策略、CI | Extension、自建 sandbox/container、CI | Hooks、permissions、sandbox、CI |
| 隔离委派 | Subagents、多任务 | 核心刻意不内建；extension 或独立 Pi 进程 | Subagents、agent teams、多会话 |
| 会话生命周期 | resume/fork/compact 等会话能力 | JSONL 会话、resume/tree/fork/compact | resume、compact、checkpoint/rewind |
| 工作区隔离 | 本地/云任务与 Git worktree 工作流 | 依靠 Git worktree、tmux/container 等外部机制 | worktree、多本地/云会话 |
| 可编程运行 | 非交互、SDK、app server、automation | print/JSON/RPC/SDK | `-p`、JSON/stream JSON、Agent SDK |

表中“支持”不代表默认启用、所有套餐可用或权限相同。

## 名字相似不代表可以直接复制

| 对象 | 可迁移程度 | 迁移方式 |
| --- | --- | --- |
| 构建、测试、目录约定 | 高 | 保留语义，放入目标产品实际读取的项目指令文件 |
| `SKILL.md` 正文 | 中到高 | 保留工作流；核对 frontmatter、触发、脚本路径和目标工具名 |
| Prompt template | 中 | 转为目标命令/skill；检查变量语法和参数传递 |
| MCP server | 中 | server 可能复用，但认证、配置、审批和工具命名要重新接线 |
| Hook | 低到中 | 按目标 lifecycle 事件与退出语义重写，并重新做超时/失败测试 |
| Subagent 定义 | 低到中 | 重新映射模型、工具、权限、上下文和汇报协议 |
| Pi extension / 产品插件 | 低 | 通常依赖专用 API，需要重写或以 CLI/MCP 重构 |
| Session/checkpoint | 很低 | 不假设轨迹或文件快照格式兼容；用 Git/artifact 交接 |
| Settings 文件 | 无直接兼容 | 逐项按职责重建，绝不改扩展名后直接使用 |

即使三者都使用 `SKILL.md`，可发现目录、元数据扩展、自动/显式触发、允许工具和脚本执行环境仍可能不同。跨产品共用时保留一个中立的流程源，再为每个 harness 写薄适配层，并用相同任务回归。

## 三个容易忽略的语义差异

### 指令发现与优先级

Codex、Pi、Claude Code 都支持持久项目指令，但搜索起点、全局目录、嵌套/override/导入规则和大小限制不完全相同。迁移后第一条验证应是让目标 harness 列出实际加载来源与顺序，而不是检查文件是否存在。

### 权限与项目信任

“能运行 shell”不等于权限模型相同。Codex 与 Claude Code 提供各自 sandbox/approval/permission 表面；Pi 的核心哲学是由容器或 extension 自行实现控制，同时另有项目资源信任流程。迁移 allowlist 时应重新画文件、网络、进程和外部系统边界。

### 计划、委派与恢复

计划模式、subagent、agent team、独立进程、checkpoint、session tree 和 Git worktree 分别解决不同问题。不能把“能并行”当作“能自动协调”，也不能把会话 rewind 当作 Git 回滚。

## 三种设计取向

### Codex：分层工作环境

适合希望在 CLI、IDE、桌面、云和自动化间复用项目规则、skills 与外部连接的工作。重点是选对持久层：一次性要求放任务，仓库约定放 `AGENTS.md`，流程放 skill，实时系统放 MCP，机械约束放 hook/策略。

### Pi：最小核心、主动组装

Pi 明确把自己定位为 minimal terminal coding harness。核心给出模型、会话和少量工具，并用 TypeScript extensions、skills、prompt templates 与 packages 扩展。它刻意不内建 plan mode、subagents、MCP 与权限弹窗；这给高级使用者极大控制，也意味着安全、团队一致性和扩展维护由你承担。

### Claude Code：内建工作流与多表面

Claude Code 提供 terminal、IDE、desktop、web 等表面，围绕 `CLAUDE.md`、skills、hooks、MCP、subagents、permissions/sandbox 和会话工具形成完整工作流。官方最佳实践把“给 agent 可运行的验证”和“积极管理上下文”放在核心位置。

## 如何选择

| 你最在意 | 先试 |
| --- | --- |
| 跨多种 Codex 表面、OpenAI 模型与团队定制 | Codex |
| 想精确控制循环、工具、UI、provider，接受自己组装 | Pi |
| 想要成熟的内建上下文/权限/扩展/多 agent 工作流 | Claude Code |
| 需要比较很多 provider/本地模型 | Pi（先确认目标模型工具调用兼容） |
| 需要企业治理 | 评估对应产品的管理、审计、数据与套餐文档，不只看 CLI 功能 |

“先试”不是最终结论。用你的任务集同时运行两个候选，尤其比较验证率、人工纠正和安全边界。

## 迁移原则

1. 列出现有配置每一项承担的职责。
2. 找目标 harness 的最小等价层，不追求文件名一一对应。
3. 先迁移项目指令、验证命令和权限边界。
4. 再迁移 skills/commands、外部工具和自动化。
5. 用相同任务集回归，观察目标 harness 的默认提示和工具差异。

例如，从 Claude Code 迁移到 Pi 时，`CLAUDE.md` 可以被 Pi 读取，但 hooks/subagents/MCP 不会因为文件存在自动等价；需要 extension、外部 CLI 或不同工作流。从 Pi 迁移到 Codex 时，extension 改变循环的能力也不能全部翻译成 skill。

## 迁移工作表

```md
| 现有对象 | 它解决的职责 | 作用域/优先级 | 权限/副作用 | 目标机制 | 重写点 | 回归任务 |
| --- | --- | --- | --- | --- | --- | --- |
| CLAUDE.md | 项目构建与验证 | repo | 无直接副作用 | AGENTS.md | 删除 Claude 专用命令 | task-01 |
| PostToolUse hook | 编辑后 lint | project | 执行本地命令 | Codex hook/CI | 重写事件与退出语义 | task-02 |
```

每一行先写职责再选目标机制。无法找到等价物时，明确改用人工步骤、外部 CI 或取消该能力，不用提示词假装实现确定性保障。
