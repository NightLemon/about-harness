# 在 Codex 中优化模型

本页聚焦 Codex 的配置方法，不是模型排行榜。产品事实基于 2026-08-20 的官方 OpenAI 文档；模型与可用表面会变化。

> **事实基线与本文建议：** 模型名称、配置层和命令来自页面中链接的官方 OpenAI 文档；任务路由、调优顺序和安全门槛是本项目建议，需要在你的工作负载上验证。

## 当前模型选择原则

[官方模型页](https://learn.chatgpt.com/docs/models)将 GPT-5.6 系列概括为：Sol 面向复杂、开放、高价值任务；Terra 是日常均衡选择；Luna 面向清晰、可重复和高吞吐任务。默认从中等推理开始，任务需要更深规划时再增加。Max 给单任务更多推理，Ultra 使用 subagents 并行分解复杂工作；多数任务不需要最高档。

这只是起始先验。你的代码库、任务和延迟约束仍要用[实验方法](/optimization/experiment)验证。

## 配置层次

| 层 | 放什么 | 不应放什么 |
| --- | --- | --- |
| 当前任务 | 本次目标、上下文、边界、完成条件 | 永久团队规则 |
| `AGENTS.md` | 构建/测试、目录路由、非显然约定、完成定义 | 长教程、易变 API 文档 |
| `.codex/config.toml` | 仓库可信后适用的模型、推理、sandbox、MCP、hooks 等 | 密钥、只对一次任务的覆盖 |
| `.agents/skills` | 可复用流程、领域知识、脚本/模板 | 每次都必须常驻的短规则 |
| MCP/插件 | 实时外部数据与受控动作 | 可直接从仓库读取的静态内容 |
| Hooks/CI | 必须机械执行的检查和限制 | 主观架构判断 |

根据[配置文档](https://learn.chatgpt.com/docs/config-file/config-basic)，CLI、IDE extension 和 ChatGPT desktop app 共享 `config.toml` 配置层；云端 surface 的模型和环境行为可能不同，实验时必须记录 surface。

## 最小起步

先用项目 `AGENTS.md` 给出：

```md
# Project instructions
- Install: `npm ci`
- Fast check: `npm run lint && npm run test -- --changed`
- Full check: `npm run check`
- Start architecture searches at `docs/architecture/index.md`.
- Do not edit generated files under `dist/`.
- Finish with changed files and exact verification results.
```

然后在可信仓库中配置所需模型与推理强度。示例 ID 仅代表 2026-08-20 的可用命名，运行前以模型选择器/官方页为准：

```toml
model = "gpt-5.6-sol"
model_reasoning_effort = "medium"
```

先验证 Codex 实际加载了目标 `AGENTS.md`、配置文件与工作目录，再调模型。

## 针对模型的调优

### Sol：给开放任务明确终点

复杂模型能探索更多路径，也可能做得过宽。写清不在范围内的重构、性能/兼容约束和可执行完成条件。高风险任务增加独立 review，而不是只让同一上下文自评。

### Terra：为日常路径优化反馈速度

保持短 `AGENTS.md`、准确测试命令和常用入口。先以 medium 作为基线；若任务已清晰，比较 low 的成本；若多文件依赖判断失败，再测试 high，而非永久把所有任务设到最高。

### Luna：把任务和工具收窄

用于提取、分类、格式转换和明确小修时，提供样例、schema 和窄工具集。避免把模糊架构探索直接交给快模型，再用大量纠正抵消成本优势。

### 第三方或自托管模型

Codex 可连接兼容 Responses 或 Chat Completions 的 provider；[官方模型页](https://learn.chatgpt.com/docs/models)已提示 Chat Completions 支持将被移除。重点验证工具调用、多轮错误恢复、上下文上限、流式协议和 reasoning 参数是否被 provider 正确映射。不要只验证一轮文本回答。

## 用 Codex 能力闭合外循环

- 重复纠正写入最接近作用域的 `AGENTS.md`。
- 重复流程做成 skill；已有插件时优先复用并审查。
- 外部新鲜信息走 MCP/connector，不复制陈旧快照。
- 噪声调查交给 subagent，主任务保留干净上下文。
- 稳定后再变成 automation；自动化应在独立 worktree 或受控环境运行。
- 用 `/review`、测试和 diff 证据验证，不接受“应该可以”。

## 常见误区

- 把全局个人偏好、团队规则、任务细节全部塞进一个根 `AGENTS.md`。
- 没确认 sandbox/工作目录就把权限失败归因于模型。
- 让多个本地任务写同一 checkout，不用 worktree 隔离。
- 把 Ultra 当成更高单模型推理档；它的关键是 subagent 并行。
- 使用已经退役的保存模型 ID，却只修改 prompt。

参见：[OpenAI Models](https://learn.chatgpt.com/docs/models)、[Codex best practices](https://learn.chatgpt.com/guides/best-practices)、[`AGENTS.md`](https://learn.chatgpt.com/docs/agent-configuration/agents-md)。
