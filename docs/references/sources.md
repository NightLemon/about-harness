# 资料来源

本项目优先引用官方文档与官方维护仓库。产品事实均按核对日期理解，不推断套餐、账号权限或未来路线。

::: info 当前证据状态
M4 已在 2026-08-20 实际获取下列官方页面或固定仓库内容，并把正文使用的易变主张登记到[事实注册表](/references/fact-registry)。这里的 E1 只证明来源核对和离线职责映射，不证明模型质量或 live 产品组合可用；真实运行仍需 E2/E3。
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

## Framework 与 runtime

核对日期：**2026-08-20**。

- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)：低层 orchestration、durable execution、streaming、human-in-the-loop 与确定性/模型步骤混合。
- [OpenAI Agents SDK](https://developers.openai.com/api/docs/guides/agents-sdk)：agent、run、tool、handoff、guardrail、state、MCP、tracing 与 evaluation 的 code-first 入口。
- [Google ADK](https://google.github.io/adk-docs/)：agent、model、tool、session、runtime、deployment、observability、evaluation 与 safety/security 导航。
- [AutoGen stable docs](https://microsoft.github.io/autogen/stable/)：AgentChat、Core、Extensions 与 Studio 分层。

## 模型家族核对入口

核对日期：**2026-08-20**。这些入口用于运行前解析精确 model ID、provider、license 和版本，不构成性能比较。

- [OpenAI models](https://developers.openai.com/api/docs/models) 与 [Codex models](https://learn.chatgpt.com/docs/models)
- [Anthropic Claude models](https://docs.anthropic.com/en/docs/about-claude/models/overview)
- [Google Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [Qwen 官方站](https://qwenlm.github.io/)及目标 checkpoint 的 model card
- [DeepSeek API docs](https://api-docs.deepseek.com/)；本轮特定 pricing 页面 TLS 失败，价格/alias 保持待核验
- [Meta Llama docs](https://www.llama.com/docs/overview/)及目标权重的 license/model card

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

## M4 获取指纹

以下 SHA256 对应本轮实际收到的响应正文，仅用于证明“核对了哪一份滚动页面”，不是对外部站点的永久存档。滚动页面更新后应重新抓取并更新日期与指纹。

| Fact ID | 响应 SHA256 |
| --- | --- |
| `codex-agents-md` | `9D1F87A2D1CB55B4782B95ABE710692B35B9659789C2DB31A22C7074A3383E8E` |
| `codex-config` | `46D88F56B56542FF72E50B851D5E011DD01009815C4845137036868320C188A2` |
| `claude-memory` | `631411505E6D6C4AB20FB7985C01033231977B2DF388F957A7D6F3D6C354BDED` |
| `claude-settings` | `4A0EBD8230F89565507CAB2FC8E5817D90C5A53E26887FF9023897E8ED027135` |
| `pi-readme` | `CE0F95C3D314DCACB5F2388B956880A86736EDE3C383FD1F8E91BF9056AA134D` |
| `mcp-spec` | `B6816BB89C9D6E3BD916C07E5D64491F0B44FB0687710B580A5A3C26CDC8EB51` |
| `langgraph-overview` | `F83C53FE1574EA2DB529F048B507F88305ACFDB67F9F63A5D5D58BE35BCB869F` |
| `openai-agents-sdk` | `7855BE154BBC3A8F65CFF8BE0DBF0657008218583C729E4EEE93194744E9CE8D` |
| `google-adk` | `D9B398FE4F94F4C07BD9D7E4F1E8B2B40A0EF3B9DED9EED46D7DC47FA61195C5` |
| `autogen-overview` | `B6DBD2156CB2A0A00AE3C99054A2CEEB98550FF1026C5D48BF2EB335C5C3404E` |
| Anthropic model catalog | `AF3D816038BB040ADA6975DA189ADA02662FA12D9E33E6ECDD0FA0CF7980CB37` |
| Gemini model catalog | `0BDEFB5C2ACC0FEAB0D8D27014C38391F87528DDB2D1B7CF7DDD5B44629815BC` |
| Qwen 官方站 | `F874CC1C99C3454E3EA933DAC9790E5CB329E25BF5766B270AB9E38BD780BFFE` |
| Meta Llama docs（重定向到 developer.meta.com） | `6C33060FD693972D5F58E412E2EDE3EAE10D86211E2ED7FE6CA16ADC715B6521` |

DeepSeek API docs 在同一环境中仍因 TLS 握手失败而无法抓取，因此没有填写响应指纹，相关价格、alias、上下文和可用性主张继续保持 E0/待核验。

## 事实与建议如何区分

| 类型 | 例子 | 证据要求 |
| --- | --- | --- |
| 产品事实 | 配置路径、命令、默认工具、模型可用面 | 官方文档/维护仓库 + 核对日期；滚动仓库尽量加 commit |
| 跨产品原理 | 上下文有限、压缩有损、工具副作用需授权 | 正文给出机制与边界；不伪装为某厂商承诺 |
| 本项目建议 | 三档路由、至少 3 次重复、晋级阈值 | 明确是建议，读者用自己的任务集验证 |
| 示例 | 模型 ID、路径、成本门槛 | 标注示例/日期，不外推为默认或保证 |
