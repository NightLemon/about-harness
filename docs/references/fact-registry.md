# 产品事实注册表

本表同时供人阅读和 `npm run facts:check` 解析。每一行只登记一个可定位主张；正文使用 `[FACT:ID]` 引用。表格列名和顺序属于稳定接口。

## 状态规则

- `verified`：来源、目标版本与核对日期已实际检查；
- `pending`：只有 URL、legacy 记录或待运行探针，正文不得写成确定事实；
- `conflict`：官方来源或目标版本行为不一致，正文必须限定版本并解释冲突；
- `retired`：页面不再使用，但保留历史记录。

易变等级 `high` 的 verified 事实发布前 30 天内复核；超过 30 天进入待复核，超过 90 天的在线页面显示过期提示。滚动仓库尽量固定 commit/tag。

## Registry

| ID | Claim | Kind | Source | Version | Checked | Volatility | Evidence | Status | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| boundary-harness | 本项目将 harness 定义为承载和约束 agent loop 的工作环境 | project | /foundations/what-is-harness | v1-contract | 2026-08-20 | low | E1 | verified | /guide/roadmap |
| review-legacy | legacy 十轮缺少 v1 所需的冻结 baseline、逐轮 diff 与 result tag，因此不计入 v1 | repository | /reviews/legacy/ | legacy-baseline-v1 | 2026-08-20 | low | E1 | verified | /meta/changelog |
| codex-agents-md | Codex 项目指令的发现、作用域与覆盖行为 | product | https://learn.chatgpt.com/docs/agent-configuration/agents-md | rolling | 2026-08-20 | high | E1 | verified | /harnesses/codex |
| codex-config | Codex 配置层、字段与 surface 行为 | product | https://learn.chatgpt.com/docs/config-file/config-basic | rolling | 2026-08-20 | high | E1 | verified | /harnesses/codex |
| codex-sandbox-approval | Codex sandbox mode、approval policy 与 network 是相互配合但职责独立的控制层 | product | https://learn.chatgpt.com/docs/agent-approvals-security | rolling | 2026-08-21 | high | E1 | verified | /harnesses/codex |
| openai-function-calling | OpenAI function/tool calling 由模型请求、应用执行并用 call ID 回传结果组成 | product | https://developers.openai.com/api/docs/guides/function-calling | rolling | 2026-08-21 | high | E1 | verified | /models/openai |
| openai-reasoning-items | Responses reasoning model 的连续 function calling 需要保留相关 reasoning/function/output items，可用 previous response ID 或完整回放 | product | https://developers.openai.com/api/docs/guides/reasoning | rolling | 2026-08-21 | high | E1 | verified | /models/openai |
| openai-reasoning-effort | Reasoning effort 的支持值和默认值依具体模型而异 | product | https://developers.openai.com/api/docs/guides/reasoning | rolling | 2026-08-21 | high | E1 | verified | /models/openai |
| claude-memory | Claude Code 的 CLAUDE.md 作用域与加载行为 | product | https://code.claude.com/docs/en/memory | rolling | 2026-08-20 | high | E1 | verified | /harnesses/claude-code |
| claude-settings | Claude Code settings 与权限配置行为 | product | https://code.claude.com/docs/en/settings | rolling | 2026-08-20 | high | E1 | verified | /harnesses/claude-code |
| pi-readme | Pi coding agent 的工具、session、compaction、context、skills 与 extensions 行为 | product | https://github.com/earendil-works/pi/tree/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent | 496185f6e4267b979e3663c45f7eb70b0c6a97b4 | 2026-08-20 | medium | E1 | verified | /harnesses/pi |
| mcp-spec | MCP 定义 host/client/server 间的能力与消息协议，而不是自动授予工具权限 | standard | https://modelcontextprotocol.io/specification | rolling | 2026-08-20 | medium | E1 | verified | /foundations/tools |
| langgraph-overview | LangGraph 是面向长运行、有状态 agent 的低层 orchestration framework/runtime | product | https://docs.langchain.com/oss/python/langgraph/overview | rolling | 2026-08-20 | high | E1 | verified | /frameworks/langgraph |
| openai-agents-sdk | OpenAI Agents SDK 提供 code-first agent runtime 组件 | product | https://developers.openai.com/api/docs/guides/agents-sdk | rolling | 2026-08-20 | high | E1 | verified | /frameworks/openai-agents-sdk |
| google-adk | Google ADK 提供 agent、tool、session、runtime、deployment、observability 与 evaluation 等构件 | product | https://google.github.io/adk-docs/ | rolling | 2026-08-20 | high | E1 | verified | /frameworks/google-adk |
| autogen-overview | AutoGen 区分 AgentChat、Core、Extensions 与 Studio 等层 | product | https://microsoft.github.io/autogen/stable/ | stable-docs | 2026-08-20 | high | E1 | verified | /frameworks/autogen |
| publication-v1 | V1 学习站点已从固定 commit e13bd93 发布到项目 GitHub Pages URL | repository | https://nightlemon.github.io/about-harness/ | e13bd93c5f82fe0d84494d45883cd121fb2b80c3 | 2026-08-22 | medium | E1 | verified | /meta/publishing |

## 冲突处理

若网页、安装版本 `--help` 与运行探针不一致，保留全部证据，把状态改为 `conflict`，正文只描述目标版本。不得为让检查变绿而删除冲突记录。
