# 资料来源

本项目优先引用官方文档与官方维护仓库。产品事实均按核对日期理解，不推断套餐、账号权限或未来路线。

::: warning 当前证据状态
本页链接来自 legacy baseline。日期表示 baseline 中记录的核对日期；M4 必须把正文中的易变主张逐项登记到[事实注册表](/references/fact-registry)，并重新确认版本、来源与证据等级。未完成登记的链接不能单独证明产品事实。
:::

## OpenAI / Codex

核对日期：**2026-08-20**。

- [Models](https://learn.chatgpt.com/docs/models)：当前 Codex/ChatGPT Work 模型、推理档位与本地默认配置。
- [Codex best practices](https://learn.chatgpt.com/guides/best-practices)：任务结构、`AGENTS.md`、配置、验证、MCP、skills 与长任务。
- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)：发现顺序、override、大小限制与验证方式。
- [Customization](https://learn.chatgpt.com/docs/customization/overview)：`AGENTS.md`、memories、skills、MCP、subagents 的职责。
- [Model Context Protocol](https://learn.chatgpt.com/docs/extend/mcp)：Codex MCP 行为。
- [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic)：配置层与基本字段。

## Anthropic / Claude Code

核对日期：**2026-08-20**。

- [Claude Code overview](https://code.claude.com/docs/en/overview)：产品表面、能力与扩展入口。
- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)：验证、上下文、`CLAUDE.md`、skills、hooks、subagents 与自动化。
- [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works)：agentic loop 与 context。
- [Store instructions and memories](https://code.claude.com/docs/en/memory)：`CLAUDE.md` 的作用域与加载。
- [Settings](https://code.claude.com/docs/en/settings)：settings 与权限配置。

## Pi

核对日期：**2026-08-20**。`badlogic/pi-mono` 在访问时重定向至当前维护仓库。

- [Pi coding agent README（固定 commit `496185f`）](https://github.com/earendil-works/pi/tree/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent)：本轮实际核对的设计哲学、provider/模型、工具、session、compaction、context files、skills、extensions、project trust 与 CLI。
- [Pi coding agent README（当前主分支）](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)：操作前检查新版本；主分支不是可复现引用。
- [Pi repository](https://github.com/earendil-works/pi)：源码、版本、examples 与详细 docs。

## 跨产品标准与方法

- [Model Context Protocol specification](https://modelcontextprotocol.io/specification)：协议角色与能力。
- [AGENTS.md](https://agents.md/)：开放的 agent 项目指令格式。
- 评测方法综合软件测试、实验设计与可靠性工程的一般原则；具体门槛由读者的业务风险和任务分布决定。

## 引用纪律

- 稳定原理会在正文直接解释；版本敏感命令提供原始链接和核对日期。
- 官方文档没有说明的套餐、限制、默认值或未来行为，正文不作确定断言。
- 若运行环境的 `--help` 与网页冲突，先记录版本和冲突，以实际目标版本行为为准。
- 外部博客与 benchmark 可用于形成假设，不应单独证明对所有模型和工作负载都成立。
- 禁止网络或真实 API 的执行阶段可以保留官方 URL 与待核验主张，但必须标为 E0/待核验，不能填写伪造的核对结果。

## 事实与建议如何区分

| 类型 | 例子 | 证据要求 |
| --- | --- | --- |
| 产品事实 | 配置路径、命令、默认工具、模型可用面 | 官方文档/维护仓库 + 核对日期；滚动仓库尽量加 commit |
| 跨产品原理 | 上下文有限、压缩有损、工具副作用需授权 | 正文给出机制与边界；不伪装为某厂商承诺 |
| 本项目建议 | 三档路由、至少 3 次重复、晋级阈值 | 明确是建议，读者用自己的任务集验证 |
| 示例 | 模型 ID、路径、成本门槛 | 标注示例/日期，不外推为默认或保证 |
