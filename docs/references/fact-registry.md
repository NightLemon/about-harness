# 产品事实注册表

本表供读者追溯易变主张，也供 `npm run facts:check` 解析。每行只登记一个可定位事实；正文使用 `[FACT:ID]` 引用。表格列名和顺序是机器接口。

## 状态与时效

- `verified`：来源、目标版本与核对日期已实际检查；
- `pending`：尚无足够核验，正文不得写成确定事实；
- `conflict`：目标版本或官方来源不一致，正文必须解释边界；
- `retired`：正文不再使用但保留兼容记录。

高易变事实用于发布前检查时须在 30 天内复核；超过 90 天的在线页面应显示过期提醒。滚动仓库尽量固定 commit 或 tag。

## Registry

| ID | Claim | Kind | Source | Version | Checked | Volatility | Evidence | Status | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| boundary-harness | 本项目将 harness 定义为承载和约束 agent loop 的工作环境 | project | /foundations/what-is-harness | handbook-v1 | 2026-08-20 | low | E1 | verified | /guide/roadmap |
| codex-agents-md | Codex 项目指令的发现、作用域与覆盖行为 | product | https://learn.chatgpt.com/docs/agent-configuration/agents-md | rolling | 2026-08-27 | high | E1 | verified | /harnesses/codex |
| codex-config | Codex 配置层、字段与 surface 行为 | product | https://learn.chatgpt.com/docs/config-file/config-basic | rolling | 2026-08-27 | high | E1 | verified | /harnesses/codex |
| codex-sandbox-approval | Codex sandbox mode、approval policy 与 network 是相互配合但职责独立的控制层 | product | https://learn.chatgpt.com/docs/agent-approvals-security | rolling | 2026-08-27 | high | E1 | verified | /harnesses/codex |
| openai-function-calling | OpenAI function/tool calling 由模型请求、应用执行并用 call ID 回传结果组成 | product | https://developers.openai.com/api/docs/guides/function-calling | rolling | 2026-08-21 | high | E1 | verified | /models/openai |
| openai-reasoning-items | Responses reasoning model 的连续 function calling 需要保留相关 reasoning/function/output items，可用 previous response ID 或完整回放 | product | https://developers.openai.com/api/docs/guides/reasoning | rolling | 2026-08-21 | high | E1 | verified | /models/openai |
| openai-reasoning-effort | Reasoning effort 的支持值和默认值依具体模型而异 | product | https://developers.openai.com/api/docs/guides/reasoning | rolling | 2026-08-21 | high | E1 | verified | /models/openai |
| claude-memory | Claude Code 的 CLAUDE.md 作用域与加载行为 | product | https://code.claude.com/docs/en/memory | rolling | 2026-08-20 | high | E1 | verified | /harnesses/claude-code |
| claude-settings | Claude Code settings 与权限配置行为 | product | https://code.claude.com/docs/en/settings | rolling | 2026-08-27 | high | E1 | verified | /harnesses/claude-code |
| pi-readme | Pi coding agent 的工具、session、compaction、context、skills 与 extensions 行为 | product | https://github.com/earendil-works/pi/tree/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent | 496185f6e4267b979e3663c45f7eb70b0c6a97b4 | 2026-08-27 | medium | E1 | verified | /harnesses/pi |
| mcp-spec | MCP 定义 host/client/server 间的能力与消息协议，而不是自动授予工具权限 | standard | https://modelcontextprotocol.io/specification | rolling | 2026-08-20 | medium | E1 | verified | /foundations/tools |
| langgraph-overview | LangGraph 是面向长运行、有状态 agent 的低层 orchestration framework/runtime | product | https://docs.langchain.com/oss/python/langgraph/overview | rolling | 2026-08-20 | high | E1 | verified | /frameworks/langgraph |
| openai-agents-sdk | OpenAI Agents SDK 提供 code-first agent runtime 组件 | product | https://developers.openai.com/api/docs/guides/agents-sdk | rolling | 2026-08-20 | high | E1 | verified | /frameworks/openai-agents-sdk |
| google-adk | Google ADK 提供 agent、tool、session、runtime、deployment、observability 与 evaluation 等构件 | product | https://google.github.io/adk-docs/ | rolling | 2026-08-20 | high | E1 | verified | /frameworks/google-adk |
| autogen-overview | AutoGen 区分 AgentChat、Core、Extensions 与 Studio 等层 | product | https://microsoft.github.io/autogen/stable/ | stable-docs | 2026-08-20 | high | E1 | verified | /frameworks/autogen |
| deepseek-api-surface | DeepSeek API 的价格、model alias、上下文和可用性尚待网络复核 | product | https://api-docs.deepseek.com/ | rolling | 2026-08-20 | high | E0 | pending | /models/deepseek |

## 冲突处理

若官方网页、目标安装版本的 `--help` 与实际探针不一致，保留全部证据，把状态改为 `conflict`，正文只描述已锁定版本。不得为了让检查通过而删除冲突记录。

事实的选择与引用原则见[资料来源](/references/sources)，产品组合的证据边界见[兼容性矩阵](/references/compatibility)。
