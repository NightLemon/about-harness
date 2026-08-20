# 在 Claude Code 中优化模型

Claude Code 是可读写代码库、运行命令并连接开发工具的 agentic coding 环境，覆盖 terminal、IDE、desktop 和 web。产品事实核对于 2026-08-20。

> **事实基线与本文建议：** 产品表面、命令和扩展机制来自 Claude Code 官方文档；三档任务路由与实施顺序是本项目建议，不代表 Anthropic 的模型性能承诺。

## 官方最佳实践的两个核心

1. **给 Claude 可运行的验证**：测试、构建、linter、截图或 fixture diff，让它看到 pass/fail 并迭代。
2. **积极管理上下文**：上下文包含消息、文件与命令输出，填满时质量可能下降；在无关任务间 `/clear`，必要时 `/compact`，调查可交给独立 subagent。

两点均来自官方 [Best practices](https://code.claude.com/docs/en/best-practices)。

这两条对其他 harness 也成立，但 Claude Code 提供了相应内建工作流。

## 配置分工

| 机制 | 用途 |
| --- | --- |
| `CLAUDE.md` | 每次会话加载的构建、风格、架构和工作规则 |
| `.claude/settings.json` | 项目设置、permissions、hooks 等 |
| `.claude/skills/*/SKILL.md` | 按需领域知识或可复用流程 |
| `.claude/agents/*.md` | 有独立上下文、模型和工具的专用 subagent |
| MCP | Notion、Figma、数据库等外部系统 |
| Hooks | 每次都要机械发生或阻止的动作 |

运行 `/init` 可生成 `CLAUDE.md` 起点，但应删掉可从代码推断的内容。官方建议它短且人类可读；每行都问“不写会导致错误吗？”只在偶尔相关的知识应放 skill。

## 模型与任务路由

Claude Code 的可用模型与别名会随订阅、provider 和版本变化，使用 `/model` 或当前官方模型配置确认，不在长期文档里硬编码“最新”。实验时记录实际解析后的模型 ID，而不仅是 `default`、`sonnet` 或 `opus` 之类别名。

一般路由：

- 明确、小、重复任务：快模型/较低预算，给样例与窄范围；
- 日常实现与调试：默认模型，先给验证与相关入口；
- 架构、疑难调查和高价值评审：能力更强的模型，plan mode 或先写 spec，独立验证者。

更强模型也不能弥补缺测试和拥挤上下文。

## 推荐工作流

### 探索—计划—实施—提交

复杂任务先进入 plan mode 只读探索，形成可编辑计划，再切回实现，最后运行验证和复查。若 diff 一句话就能描述，跳过计划。

### 大需求先访谈

让 Claude 针对技术、UI、边界与权衡提问，生成自包含 `SPEC.md`；在干净新会话中实现。这样实现上下文不必携带长段需求讨论。

### 调查用 Subagent

大量读取会污染主上下文。让 subagent 调查认证流程或依赖关系，只回传有路径与证据的摘要。实现后可再用新上下文做 adversarial review，降低同一 agent 自评偏差。

### 机械规则用 Hook

每次编辑后格式化、阻止迁移目录写入、结束前运行快速测试等需要确定执行的规则放 hook。Hook 能执行代码，需审查、限时并处理重复阻塞；它不替代 CI。

## Context 操作

- `/context`：检查当前上下文构成和 `CLAUDE.md` 是否加载。
- `/clear`：无关任务之间清空；连续两次同类纠正仍失败时，保存事实后重开。
- `/compact <focus>`：指定摘要重点。
- `/rewind`/checkpoint：恢复会话或编辑工具产生的文件更改；Bash/外部进程修改不一定被捕获，不能替代 Git。
- `/btw`：询问不需要进入主历史的旁支问题（以当前版本支持为准）。

## 权限与 Sandbox

用 permission allowlist 批准已知安全命令，用 sandbox 限制文件与网络，让范围内动作减少打断。不要为了消除弹窗开放整个系统；对生产、外部发送、删除和权限变更保留动作时审批。自动模式、套餐和 surface 的具体可用性应查当前文档。

## 非交互与并行

`claude -p` 可用于脚本/CI，并能输出 JSON 或 stream JSON。并行 session 应使用独立 worktree，避免同时修改同一文件。自动化仍要设最大预算、明确验收、短期权限和失败停止条件。

参见：[Claude Code overview](https://code.claude.com/docs/en/overview)、[Best practices](https://code.claude.com/docs/en/best-practices)。
