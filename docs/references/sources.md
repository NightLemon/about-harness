# 资料来源与核对方法

本项目优先引用产品官方文档、标准规范与维护中的源代码仓库。核对日期表示维护者在当天实际查看了对应页面或固定版本；它不保证页面之后没有变化，也不证明账号、区域或套餐具备相同能力。

## 产品与模型

### OpenAI 与 Codex

核对日期：**2026-08-27**。

- [Function calling](https://developers.openai.com/api/docs/guides/function-calling)：工具调用的请求、应用侧执行与结果回传。
- [Reasoning models](https://developers.openai.com/api/docs/guides/reasoning)：推理档位及连续工具调用中的状态要求。
- [Codex approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security)：sandbox、approval 与 network 的职责。
- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)：项目指令的发现、作用域与覆盖。
- [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic)：配置层与基本字段。
- [Models](https://developers.openai.com/api/docs/models)：运行前核对精确 model ID 的入口。

### Anthropic 与 Claude Code

核对日期：**2026-08-27**（settings/permissions）；memory 页面沿用 2026-08-20 的核对记录。

- [Claude models](https://docs.anthropic.com/en/docs/about-claude/models/overview)：模型目录。
- [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works)：agent loop 与 context。
- [Memory](https://code.claude.com/docs/en/memory)：`CLAUDE.md` 与记忆的作用域。
- [Settings](https://code.claude.com/docs/en/settings)：配置和权限。

### Pi

核对日期：**2026-08-27**。

- [Pi coding agent，固定 commit `496185f`](https://github.com/earendil-works/pi/tree/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent)：工具、session、compaction、context files、skills 与 extensions。
- [Pi 当前仓库](https://github.com/earendil-works/pi)：执行前确认新版本；滚动主分支不作为可复现结果。

### 其他模型家族

核对日期：**2026-08-20**。这些链接只用于解析目标模型、许可与 provider，不构成性能比较。

- [Google Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [Qwen](https://qwenlm.github.io/)及目标 checkpoint 的 model card
- [DeepSeek API docs](https://api-docs.deepseek.com/)；价格、alias 与上下文主张仍为待核验/E0
- [Meta Llama docs](https://www.llama.com/docs/overview/)及目标权重的 license/model card

## Framework 与协议

核对日期：**2026-08-20**。

- [LangGraph](https://docs.langchain.com/oss/python/langgraph/overview)
- [OpenAI Agents SDK](https://developers.openai.com/api/docs/guides/agents-sdk)
- [Google ADK](https://google.github.io/adk-docs/)
- [AutoGen](https://microsoft.github.io/autogen/stable/)
- [Browser Use](https://docs.browser-use.com/)
- [PydanticAI](https://ai.pydantic.dev/)
- [LlamaIndex](https://docs.llamaindex.ai/)
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification)
- [AGENTS.md specification](https://agents.md/)

本仓库没有安装或运行上述第三方 framework。实验中的同名模块是“离线职责接缝”：它们用固定 fixture 演示边界，不是上游接入或兼容性证明。

## 如何判断一条主张

| 类型 | 需要什么证据 | 不足以证明什么 |
| --- | --- | --- |
| 稳定机制 | 解释因果、边界和反例 | 某产品当前实现完全相同 |
| 产品事实 | 官方来源、目标版本、核对日期、事实 ID | 账号可用、模型质量或未来行为 |
| 项目建议 | 工作负载、阈值理由、可复现实验 | 对所有团队都最优 |
| 示例 | 脱敏输入、固定版本、验证和回滚 | 已在真实产品上成功 |
| 性能比较 | 同任务、同预算、重复、holdout 与不确定性 | 跨任务的通用排行榜 |

产品事实在[事实注册表](/references/fact-registry)登记。来源冲突时保留双方证据并标为 `conflict`；无法访问时标为 `pending`/E0。外部博客与 benchmark 可形成假设，但不能单独支持通用结论。

## 时效、许可与刷新

`npm run facts:check` 校验结构、引用和日期；`npm run facts:freshness` 对超过 30 天的高易变事实报错。季度 workflow 才运行网络外链探针，普通本地检查只校验 URL 结构，避免把网络抖动误判成内容错误。

引用保留原链接并只摘录必要部分。代码使用 MIT，原创文档使用 CC BY 4.0；第三方文本、图像、fixture 与 logo 仍遵循原许可。依赖升级后需重新运行许可、构建与行为检查。
