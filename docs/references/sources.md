# 来源与核对记录

来源状态描述产品事实是否核对，E0–E3 描述实验强度，两者分开。核对一个官方页面不代表账号可用；离线框架运行也不代表真实模型质量。

<span id="产品与模型"></span>
<span id="openai-与-codex"></span>
<span id="anthropic-与-claude-code"></span>
<span id="pi"></span>
<span id="其他模型家族"></span>
<span id="framework-与协议"></span>
<span id="如何判断一条主张"></span>
<span id="时效、许可与刷新"></span>
<span id="时效许可与刷新"></span>

<span id="资料来源与核对方法"></span>

## 官方入口

| 对象 | 主要来源 | 本轮使用方式 |
| --- | --- | --- |
| OpenAI API | [Function calling](https://developers.openai.com/api/docs/guides/function-calling)、[Reasoning](https://developers.openai.com/api/docs/guides/reasoning) | Responses 接入与状态、工具约束 |
| OpenAI Agents SDK | [Agents SDK](https://developers.openai.com/api/docs/guides/agents) | 运行器与应用职责 |
| Codex | [配置](https://learn.chatgpt.com/docs/config-file/config-basic)、[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[权限](https://learn.chatgpt.com/docs/agent-approvals-security) | 配置来源与控制边界 |
| Claude Code | [配置](https://code.claude.com/docs/en/settings)、[权限](https://code.claude.com/docs/en/permissions)、[CLI](https://code.claude.com/docs/en/cli-reference) | 配置和启动选项 |
| Pi | [固定源码](https://github.com/earendil-works/pi/tree/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent) | 包身份及项目资源 |
| LangGraph | [Overview](https://docs.langchain.com/oss/python/langgraph/overview) | 状态图与恢复 |
| Google ADK | [模型接口](https://google.github.io/adk-docs/agents/models/) | 自定义模型与运行时组合 |
| AutoGen | [Replay client](https://microsoft.github.io/autogen/stable/reference/python/autogen_ext.models.replay.html) | 实际回放客户端 |
| Anthropic | [工具使用](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview) | 工具内容块与回传 |
| Gemini | [函数调用](https://ai.google.dev/gemini-api/docs/function-calling) | 结构化调用与响应 |
| Qwen | [官方发布入口](https://qwenlm.github.io/) | 定位目标模型卡 |
| Llama | [Meta Developer](https://developer.meta.com/ai/docs/overview/) | 定位目标权重与许可 |
| DeepSeek | [API 文档](https://api-docs.deepseek.com/) | 本轮 TLS 失败，相关事实保持 pending |

具体事实、目标版本和各自检查日期以[注册表](/references/fact-registry)为准，不用一行总日期覆盖不同来源。包版本另由对应锁文件固定，CLI 帮助检查与模型任务运行分别记录。

## 更新方法

只在实际读取来源后更新 checked；来源变化时核对相关正文和示例。不能访问时记录 pending 和失败原因。已经运行的旧实验保持原等级与输入身份，不因为文档更新改写历史结果。

`facts:check` 检查登记与引用，`facts:freshness` 检查日期，网络探针检查可达性；三者都不能替代主张与原文的语义核对。维护入口见仓库 CONTRIBUTING.md。
