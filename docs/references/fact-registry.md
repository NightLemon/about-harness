# 产品事实注册表

本表供读者追溯易变主张，也供 `npm run facts:check` 解析。每行只登记一个可定位事实；正文使用 `[FACT:ID]` 引用。表格列名和顺序是机器接口。

来源状态与实验等级是两条独立证据轴。官方页面已核验只会把 `Source status` 设为 `verified`，不会自动提升 `Experiment level`。E1–E3 必须在 `Experiment ref` 指向仓库内实际结果；没有实验时保持 E0 并填写 `-`。

## 状态与时效

- `verified`：来源、目标版本与核对日期已实际检查；
- `pending`：尚无足够核验，正文不得写成确定事实；
- `conflict`：目标版本或官方来源不一致，正文必须解释边界；
- `retired`：正文不再使用但保留兼容记录。

高易变事实用于发布前检查时须在 30 天内复核；超过 90 天的在线页面应显示过期提醒。滚动仓库尽量固定 commit 或 tag。

## Registry

| ID | Claim | Kind | Source | Version | Checked | Volatility | Source status | Experiment level | Experiment ref | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| boundary-harness | 本项目将 harness 定义为承载和约束 agent loop 的工作环境 | project | /foundations/what-is-harness | handbook-v1 | 2026-09-21 | low | verified | E0 | - | /guide/roadmap |
| codex-agents-md | Codex 项目指令的发现、作用域与覆盖行为 | product | https://learn.chatgpt.com/docs/agent-configuration/agents-md | rolling | 2026-09-21 | high | verified | E0 | - | /harnesses/codex |
| codex-config | Codex 配置层、字段与 surface 行为 | product | https://learn.chatgpt.com/docs/config-file/config-basic | rolling | 2026-09-21 | high | verified | E0 | - | /harnesses/codex |
| codex-sandbox-approval | Codex sandbox mode、approval policy 与 network 是相互配合但职责独立的控制层 | product | https://learn.chatgpt.com/docs/agent-approvals-security | rolling | 2026-09-21 | high | verified | E0 | - | /harnesses/codex |
| openai-function-calling | OpenAI function/tool calling 由模型请求、应用执行并用 call ID 回传结果组成 | product | https://developers.openai.com/api/docs/guides/function-calling | rolling | 2026-09-21 | high | verified | E0 | - | /models/openai |
| openai-function-controls | OpenAI function calling 的 strict schema、allowed tools 与 parallel tool calls 是独立协议控制 | product | https://developers.openai.com/api/docs/guides/function-calling | rolling | 2026-09-21 | high | verified | E0 | - | /models/openai |
| openai-reasoning-items | Responses reasoning model 的连续 function calling 需要保留相关 reasoning/function/output items，可用 previous response ID 或完整回放 | product | https://developers.openai.com/api/docs/guides/reasoning | rolling | 2026-09-21 | high | verified | E0 | - | /models/openai |
| openai-reasoning-effort | Reasoning effort 的支持值和默认值依具体模型而异 | product | https://developers.openai.com/api/docs/guides/reasoning | rolling | 2026-09-21 | high | verified | E0 | - | /models/openai |
| openai-incomplete-status | Responses reasoning 调用可能以 incomplete 状态结束，并通过 incomplete details 区分输出预算等原因 | product | https://developers.openai.com/api/docs/guides/reasoning | rolling | 2026-09-21 | high | verified | E0 | - | /models/openai |
| openai-streaming-events | Responses HTTP streaming 使用带类型的语义事件，增量、完成与错误必须分别处理 | product | https://developers.openai.com/api/docs/guides/streaming-responses | rolling | 2026-09-21 | high | verified | E0 | - | /models/openai |
| claude-memory | Claude Code 的 CLAUDE.md 作用域与加载行为 | product | https://code.claude.com/docs/en/memory | rolling | 2026-09-21 | high | verified | E0 | - | /harnesses/claude-code |
| claude-settings | Claude Code settings 与权限配置行为 | product | https://code.claude.com/docs/en/settings | rolling | 2026-09-21 | high | verified | E0 | - | /harnesses/claude-code |
| pi-readme | Pi coding agent 的工具、session、compaction、context、skills 与 extensions 行为 | product | https://raw.githubusercontent.com/earendil-works/pi/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent/README.md | 496185f6e4267b979e3663c45f7eb70b0c6a97b4 | 2026-09-21 | medium | verified | E0 | - | /harnesses/pi |
| mcp-spec | MCP 定义 host/client/server 间的能力与消息协议，而不是自动授予工具权限 | standard | https://modelcontextprotocol.io/specification/2026-07-28.md | 2026-07-28 | 2026-09-21 | medium | verified | E0 | - | /foundations/tools |
| langgraph-overview | LangGraph 是面向长运行、有状态 agent 的低层 orchestration framework/runtime | product | https://docs.langchain.com/oss/python/langgraph/overview | rolling | 2026-09-21 | high | verified | E0 | - | /frameworks/langgraph |
| openai-agents-sdk | OpenAI Agents SDK 提供 code-first agent runtime 组件 | product | https://developers.openai.com/api/docs/guides/agents | rolling | 2026-09-21 | high | verified | E0 | - | /frameworks/openai-agents-sdk |
| google-adk | Google ADK 提供 agent、tool、session、runtime、deployment、observability 与 evaluation 等构件 | product | https://google.github.io/adk-docs/ | rolling | 2026-09-21 | high | verified | E0 | - | /frameworks/google-adk |
| autogen-overview | AutoGen 区分 AgentChat、Core、Extensions 与 Studio 等层 | product | https://microsoft.github.io/autogen/stable/ | stable-docs | 2026-09-21 | high | verified | E0 | - | /frameworks/autogen |
| deepseek-api-surface | DeepSeek API 的价格、model alias、上下文和可用性尚待网络复核 | product | https://api-docs.deepseek.com/ | rolling | 2026-08-20 | high | pending | E0 | - | /models/deepseek |
| vite-dev-server-advisory | 当前锁定的 Vite 5.4.21 位于 Windows alternate path 可绕过 server.fs.deny 的受影响范围 | product | https://github.com/advisories/GHSA-fx2h-pf6j-xcff | 5.4.21 | 2026-09-21 | medium | verified | E0 | - | /security/supply-chain |
| esbuild-dev-server-advisory | 当前锁定的 esbuild 0.21.5 位于任意网站可读取开发服务器响应的受影响范围 | product | https://github.com/advisories/GHSA-67mh-4wv8-2f99 | 0.21.5 | 2026-09-21 | medium | verified | E0 | - | /security/supply-chain |

| codex-permission-profiles | Codex支持命名permission profiles；项目配置与组织强制约束分层 | product | https://learn.chatgpt.com/docs/config-file/config-basic | rolling | 2026-09-21 | high | verified | E0 | - | /harnesses/codex |
| codex-retired-approval | 显式untrusted approval policy已退役；项目trust状态与approval policy不是同一字段 | product | https://learn.chatgpt.com/docs/agent-approvals-security | rolling | 2026-09-21 | high | verified | E0 | - | /harnesses/codex |
| claude-agents-md | Claude Code的AGENTS.md默认加载取决于CLAUDE文件存在性、版本和功能开关 | product | https://code.claude.com/docs/en/memory | rolling; AGENTS support prerequisites v2.1.277+ | 2026-09-21 | high | verified | E0 | - | /harnesses/claude-code |
| claude-permissions | Claude Code权限规则按deny、ask、allow次序求值并由宿主执行 | product | https://code.claude.com/docs/en/permissions | rolling | 2026-09-21 | high | verified | E0 | - | /harnesses/claude-code |
| gemini-cli-overview | Gemini CLI是终端Agent，官方文档分别列出上下文、扩展、MCP、会话和工具能力 | product | https://geminicli.com/docs/ | rolling | 2026-09-21 | high | verified | E0 | - | /harnesses/gemini-cli |
| maf-overview | Microsoft Agent Framework提供agent与workflow构件及MCP/A2A互操作入口 | product | https://raw.githubusercontent.com/microsoft/agent-framework/main/README.md | main snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /frameworks/microsoft-agent-framework |
| autogen-maintenance | AutoGen维护仓库宣布maintenance mode，并将新用户引导至Microsoft Agent Framework | product | https://raw.githubusercontent.com/microsoft/autogen/main/README.md | main snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /frameworks/autogen |
| deepagents-overview | Deep Agents将规划、文件系统与子Agent等构件用于复杂任务 | product | https://docs.langchain.com/oss/python/deepagents/overview | rolling | 2026-09-21 | high | verified | E0 | - | /frameworks/modern-runtimes |
| pydantic-ai-overview | PydanticAI提供类型化Agent、结构化结果与依赖注入的应用开发构件 | product | https://pydantic.dev/docs/ai/overview/ | rolling | 2026-09-21 | high | verified | E0 | - | /frameworks/modern-runtimes |
| crewai-overview | CrewAI区分协作Crews与事件驱动状态控制Flows | product | https://docs.crewai.com/ | rolling | 2026-09-21 | high | verified | E0 | - | /frameworks/modern-runtimes |
| anthropic-catalog | Anthropic当前目录将Claude API模型ID描述为固定快照，包括4.6代起无日期ID | product | https://platform.claude.com/docs/en/models/overview | rolling | 2026-09-21 | high | verified | E0 | - | /models/anthropic |
| google-catalog | Google模型目录按型号区分Gemini API能力与Live等使用路径 | product | https://ai.google.dev/gemini-api/docs/models | rolling | 2026-09-21 | high | verified | E0 | - | /models/google |
| qwen-catalog | Qwen官方入口链接模型发布、代码及模型卡渠道，具体权重以目标revision为准 | product | https://qwenlm.github.io/ | rolling | 2026-09-21 | high | verified | E0 | - | /models/qwen |
| llama-catalog | Llama维护仓库按模型版本提供model card、license与use policy入口 | product | https://raw.githubusercontent.com/meta-llama/llama-models/main/README.md | main snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /models/llama |
| llamaindex-overview | LlamaIndex提供数据上下文增强、Agent与事件驱动workflow相关构件 | product | https://developers.llamaindex.ai/python/framework/ | rolling | 2026-09-21 | high | verified | E0 | - | /ecosystem/knowledge-and-memory |
| otel-genai | OpenTelemetry GenAI约定涵盖GenAI clients、MCP及provider的span、metric和event | standard | https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/README.md | main snapshot 2026-09-21; maturity not inferred | 2026-09-21 | high | verified | E0 | - | /ecosystem/evaluation-observability |
| swe-bench | SWE-bench官方页面区分Verified等变体，并标示Agent环境和条件 | product | https://www.swebench.com/ | official site snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /ecosystem/evaluation-observability |
| terminal-bench | Terminal-Bench当前站点显示4.0，结果列出model、agent、resolution rate及区间 | product | https://www.tbench.ai/ | site displayed 4.0 | 2026-09-21 | high | verified | E0 | - | /ecosystem/evaluation-observability |
| gaia-benchmark | GAIA作者论文的问题设计结合推理、多模态、网页浏览与工具使用 | repository | https://arxiv.org/abs/2311.12983 | arXiv:2311.12983v1 | 2026-09-21 | low | verified | E0 | - | /ecosystem/evaluation-observability |
| tau-benchmark | 旧tau-bench维护仓库警告旧任务未更新并引导到后续基准 | repository | https://raw.githubusercontent.com/sierra-research/tau-bench/main/README.md | main snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /ecosystem/evaluation-observability |
| tau3-benchmark | tau2-bench维护仓库当前README标示τ³并包含语音及知识检索方向 | repository | https://raw.githubusercontent.com/sierra-research/tau2-bench/main/README.md | README displayed tau3; snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /ecosystem/evaluation-observability |
| openai-runtime-options | OpenAI当前区分托管Agents API、应用内Agents SDK与直接模型Responses API | product | https://developers.openai.com/api/docs/guides/agents | rolling | 2026-09-21 | high | verified | E0 | - | /ecosystem/long-running |
| openai-agents-api | Agents API由OpenAI管理Codex Harness，定义agent、environment、session和events/items | product | https://developers.openai.com/api/docs/guides/agents-api/overview | rolling | 2026-09-21 | high | verified | E0 | - | /ecosystem/long-running |
| browser-use-cloud | Browser Use官方Cloud quickstart提供托管浏览器Agent路径，本次未核验本地库接口等价性 | product | https://docs.browser-use.com/cloud/quickstart.md | Cloud quickstart snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /ecosystem/multimodal |
| ollama-overview | Ollama当前文档同时提供本机和云模型的使用路径 | product | https://docs.ollama.com/ | rolling | 2026-09-21 | high | verified | E0 | - | /ecosystem/models-and-services |
| vllm-serving | vLLM官方stable文档定位为模型推理与服务库，并列出批处理、缓存及协议服务 | product | https://docs.vllm.ai/en/stable/ | stable docs snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /ecosystem/models-and-services |
| sglang-serving | SGLang官方文档定位为大语言及多模态模型服务框架 | product | https://docs.sglang.io/ | rolling | 2026-09-21 | high | verified | E0 | - | /ecosystem/models-and-services |
| openai-prompt-cache | OpenAI提示缓存复用相同前缀计算，保持会话不保证命中 | product | https://developers.openai.com/api/docs/guides/prompt-caching | rolling | 2026-09-21 | high | verified | E0 | - | /ecosystem/models-and-services |
| a2a-protocol | A2A描述独立Agent间发现、子任务委派与结果交换 | standard | https://a2a-protocol.org/latest/ | latest docs snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /ecosystem/protocols-and-skills |
| agent-skills-format | Agent Skills开放格式以SKILL.md定义元数据和说明，允许支持文件并按需加载 | standard | https://agentskills.io/specification | rolling specification | 2026-09-21 | high | verified | E0 | - | /ecosystem/protocols-and-skills |
| mcp-current-protocol | MCP 2026-07-28规范概览列出无状态请求与逐请求能力协商 | standard | https://modelcontextprotocol.io/specification/2026-07-28.md | 2026-07-28 | 2026-09-21 | high | verified | E0 | - | /ecosystem/protocols-and-skills |
| mcp-tasks | MCP Tasks扩展提供长操作的持久句柄、状态查询和中途输入机制 | standard | https://modelcontextprotocol.io/extensions/tasks/overview | extension docs snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /ecosystem/protocols-and-skills |
| mcp-apps | MCP Apps允许工具关联由支持宿主嵌入的交互HTML界面 | standard | https://modelcontextprotocol.io/extensions/apps/overview | extension docs snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /ecosystem/protocols-and-skills |
| openai-skills-lifecycle | OpenAI文档区分Responses技能包附加与Agents API沙箱目录发现 | product | https://developers.openai.com/api/docs/guides/tools-skills | rolling | 2026-09-21 | high | verified | E0 | - | /ecosystem/protocols-and-skills |
| openai-programmatic-tools | OpenAI程序化工具调用使用受限JavaScript运行环境，调用方式配置依API和工具而异 | product | https://developers.openai.com/api/docs/guides/tools-programmatic-tool-calling | rolling | 2026-09-21 | high | verified | E0 | - | /ecosystem/protocols-and-skills |
| test-time-compute-study | 指定作者论文研究验证器搜索及响应分布调整，算力配置效果依问题难度而异 | repository | https://arxiv.org/abs/2408.03314 | arXiv:2408.03314v1 | 2026-09-21 | low | verified | E0 | - | /ecosystem/research-frontiers |
| agent-lightning-architecture | Agent Lightning当前v1.0说明将Trainer、API Gateway与Rollout Controller分层并保留真实Harness | repository | https://raw.githubusercontent.com/microsoft/agent-lightning/main/README.md | README described v1.0; snapshot 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /ecosystem/research-frontiers |

| gemini-cli-lifecycle | Gemini CLI官方公告称未付费层和Google One用户于2026-06-18迁移到Antigravity CLI，不能外推其他用户层 | product | https://geminicli.com/docs/ | notice displayed 2026-09-21 | 2026-09-21 | high | verified | E0 | - | /harnesses/gemini-cli |

| codex-cli-entry | Codex 0.153.4 包入口具有 model、sandbox 和 ask-for-approval 选项 | product | https://learn.chatgpt.com/docs/config-file/config-basic | 0.153.4 | 2026-09-08 | high | verified | E0 | - | /harnesses/codex |
| claude-cli-entry | Claude Code 2.1.263 帮助提供 model、tools 与 permission-mode 选项 | product | https://code.claude.com/docs/en/cli-reference | 2.1.263 | 2026-09-08 | high | verified | E0 | - | /harnesses/claude-code |
| pi-cli-entry | Pi 固定源码包名为 @earendil-works/pi-coding-agent，0.84.2 帮助提供 provider、model 与 tools | product | https://github.com/earendil-works/pi/tree/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent | 0.84.2 | 2026-09-08 | high | verified | E0 | - | /harnesses/pi |
| anthropic-tools | Anthropic 工具使用通过结构化调用与对应结果继续消息循环 | product | https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview | rolling | 2026-09-08 | high | verified | E0 | - | /models/anthropic |
| gemini-function-calling | Gemini 函数调用由应用执行并回传结构化结果 | product | https://ai.google.dev/gemini-api/docs/function-calling | rolling | 2026-09-08 | high | verified | E0 | - | /models/google |
| qwen-source | Qwen 官方站提供目标模型发布与模型卡的发现入口 | product | https://qwenlm.github.io/ | rolling | 2026-09-08 | high | verified | E0 | - | /models/qwen |
| llama-source | Meta Developer 提供 AI 模型与开发资料入口，权重许可需按目标版本核对 | product | https://developer.meta.com/ai/docs/overview/ | rolling | 2026-09-08 | high | verified | E0 | - | /models/llama |

## 冲突处理

若官方网页、目标安装版本的 `--help` 与实际探针不一致，保留全部证据，把状态改为 `conflict`，正文只描述已锁定版本。不得为了让检查通过而删除冲突记录。

事实的选择与引用原则见[资料来源](/references/sources)，产品组合的证据边界见[兼容性矩阵](/references/compatibility)。
