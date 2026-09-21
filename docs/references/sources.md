# 资料来源与核对方法

本项目优先引用官方文档、标准规范、维护仓库与原作者论文。核对日期表示当天实际阅读了支持主张的内容，不保证之后页面不变，也不证明特定账号、区域或版本能够使用该功能。

本次全面复核日期为 **2026-09-21**。逐条来源、版本、状态、实验等级和正文入口以[事实注册表](/references/fact-registry)为准；下表帮助选择材料，不重复维护全部事实。来源已核验仍可只有 E0，真实实验必须另有记录。

## 按问题选择一手资料

| 问题 | 官方或原作者入口 | 阅读时需要分开的对象 |
| --- | --- | --- |
| Codex 项目指令、配置、权限 | [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[配置](https://learn.chatgpt.com/docs/config-file/config-basic)、[审批与隔离](https://learn.chatgpt.com/docs/agent-approvals-security) | project trust、approval policy、permission profile及不同surface |
| OpenAI 模型协议和运行时 | [工具调用](https://developers.openai.com/api/docs/guides/function-calling)、[推理](https://developers.openai.com/api/docs/guides/reasoning)、[流式响应](https://developers.openai.com/api/docs/guides/streaming-responses)、[Agents 总览](https://developers.openai.com/api/docs/guides/agents) | Responses、Agents SDK与托管Agents API；请求和会话状态 |
| 工具程序与技能 | [程序化工具调用](https://developers.openai.com/api/docs/guides/tools-programmatic-tool-calling)、[Skills](https://developers.openai.com/api/docs/guides/tools-skills)、[提示缓存](https://developers.openai.com/api/docs/guides/prompt-caching) | 运行环境、发现/版本机制、缓存与数据保留 |
| Claude 与 Claude Code | [模型目录](https://platform.claude.com/docs/en/models/overview)、[Memory](https://code.claude.com/docs/en/memory)、[Settings](https://code.claude.com/docs/en/settings)、[Permissions](https://code.claude.com/docs/en/permissions) | 模型ID、项目指令、自动记忆及实际权限 |
| Pi | [固定 commit 的 README](https://raw.githubusercontent.com/earendil-works/pi/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent/README.md)、[同版本 settings](https://raw.githubusercontent.com/earendil-works/pi/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent/docs/settings.md) | context、trust、重试、extensions与外部隔离 |
| Gemini CLI | [官方文档](https://geminicli.com/docs/) | 用户层迁移公告、CLI版本、GEMINI.md、会话与沙箱 |
| 模型家族 | [Gemini](https://ai.google.dev/gemini-api/docs/models)、[Qwen](https://qwenlm.github.io/)、[Llama维护仓库](https://raw.githubusercontent.com/meta-llama/llama-models/main/README.md) | 精确型号、权重revision、模型卡、许可与provider |
| 推理服务 | [vLLM stable](https://docs.vllm.ai/en/stable/)、[SGLang](https://docs.sglang.io/)、[Ollama](https://docs.ollama.com/) | stable与开发文档、本地与云、模型支持与协议支持 |
| 状态图与Agent运行时 | [LangGraph](https://docs.langchain.com/oss/python/langgraph/overview)、[Deep Agents](https://docs.langchain.com/oss/python/deepagents/overview)、[Google ADK](https://adk.dev/) | 图、任务循环、会话、状态与部署 |
| 框架迁移与组合 | [MAF](https://raw.githubusercontent.com/microsoft/agent-framework/main/README.md)、[AutoGen维护说明](https://raw.githubusercontent.com/microsoft/autogen/main/README.md)、[PydanticAI](https://pydantic.dev/docs/ai/overview/)、[CrewAI](https://docs.crewai.com/) | 维护状态、Agent与workflow、类型校验与业务正确 |
| 协议与开放格式 | [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28.md)、[Tasks](https://modelcontextprotocol.io/extensions/tasks/overview)、[Apps](https://modelcontextprotocol.io/extensions/apps/overview)、[A2A](https://a2a-protocol.org/latest/)、[Agent Skills](https://agentskills.io/specification) | 核心与扩展、版本、能力与授权 |
| 数据与浏览器 | [LlamaIndex](https://developers.llamaindex.ai/python/framework/)、[Browser Use Cloud](https://docs.browser-use.com/cloud/quickstart.md) | 文档概念与真实集成、Cloud SDK与本地库 |
| 可观测性 | [OTel GenAI维护仓库](https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/README.md) | span/event/metric、约定成熟度及业务评分 |
| 基准设计 | [SWE-bench](https://www.swebench.com/)、[Terminal-Bench](https://www.tbench.ai/)、[GAIA论文](https://arxiv.org/abs/2311.12983)、[旧τ-bench](https://raw.githubusercontent.com/sierra-research/tau-bench/main/README.md)、[当前τ³入口](https://raw.githubusercontent.com/sierra-research/tau2-bench/main/README.md) | 版本、环境、任务分母、模型和Agent组合 |
| 研究跟踪 | [推理时计算论文](https://arxiv.org/abs/2408.03314)、[Agent Lightning维护仓库](https://raw.githubusercontent.com/microsoft/agent-lightning/main/README.md) | 发表日与核对日、方法和实测、旧架构与当前版本 |

## 未核实项怎样呈现

[DeepSeek 官方入口](https://api-docs.deepseek.com/)在本次两种客户端读取中都出现 TLS 握手失败。价格、model alias、上下文和可用性继续为 `pending`，不从第三方摘要补写为已核验，也不把失败访问日期当作成功核对日期。[FACT:deepseek-api-surface]

GAIA 原始数据卡的 raw 请求返回 HTTP 401；本次仅通过作者论文核对任务设定，没有下载受控数据、运行基准或核验当前排行榜。资料可阅读与数据可访问是不同事实。

滚动仓库尽量固定 tag或commit；只能核对滚动文档时，记录当天内容身份并缩小结论。OTel GenAI等材料不因仓库存在就被标成“稳定标准”；上游写有 production-ready 也只是上游声明，不能替代本项目资格测试。

## 一条主张需要哪种证据

| 类型 | 需要保存什么 | 不能据此推出什么 |
| --- | --- | --- |
| 稳定机制 | 因果解释、反例、适用条件 | 某产品当前实现完全相同 |
| 产品/规范事实 | 精确来源、目标版本、核对日期、FACT ID | 账号可用、部署成功、模型质量 |
| 项目建议 | 工作负载、约束、理由、验证与回退 | 对所有团队都最优 |
| 示例与离线练习 | 固定输入、命令、断言、失败分类与输出身份 | 已运行真实协议或上游框架 |
| 性能与质量比较 | 任务、全部预算、重复、holdout及不确定性 | 跨环境、跨任务的通用排名 |

同一页可以包含多类内容，但措辞与标记应使读者能分辨。用官方概览支持精确默认值、把研究摘要中的增益搬进产品推荐、用一份固定fixture推导真实模型质量，都是证据跨界。

## 刷新与引用纪律

`npm run facts:check` 检查表结构、引用和日期；`npm run facts:freshness` 对超过30天的高易变 verified 事实报错。两者不会阅读网页并判断它是否支持主张。`npm run links:check` 默认只做URL结构检查；带 `--network` 的探针才访问来源，但HTTP成功也可能得到登录页或空页面。

因此，编辑易变事实和发布前都要实际阅读相应来源。发生重定向、生命周期改变或能力迁移时，同步更新正文、来源状态与兼容矩阵；季度全量外链检查只是补充。保留来源冲突，不能通过删记录或批量刷新日期获得绿色。

引用只保留必要短摘录和原链接。代码、原创文档和第三方资料分别遵守各自许可；不把完整上游网页、原始私有轨迹、凭据或个人路径提交到仓库。公开的审核报告记录证据摘要，HTTP响应身份与语义判断分开保存。
