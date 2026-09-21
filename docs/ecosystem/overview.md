# Agent 生态全景：先定位责任，再选择产品

Agent（智能体）生态容易看起来像不断增长的产品名单。真正可迁移的知识是：一个请求从用户目标变成可验收产物，要经过哪些环节；某个产品承担哪部分责任；你仍需要补什么。

本页是横向地图，[学习路径](/guide/start)是唯一主学习顺序。初学者先沿学习路径跑通一个离线案例；遇到新产品名或架构选择时，再用本页定位。产品资料快照核对日为 **2026-09-21**；具体来源、版本和未核实项见[事实注册表](/references/fact-registry)。这里选择有代表性的系统解释每一层，不把名单长度或流行度当作完备性与质量证据。

## 一次任务经过哪些层

```text
用户目标与验收
  → CLI / IDE / 桌面 / Web 等使用界面
  → Harness：上下文、权限、工具、状态和验证
      → 模型服务：托管 API 或自托管推理
      → Framework/runtime：循环、状态图和协作
      → 协议与技能：连接、委派、按需加载流程
      → 数据与记忆：检索、来源、权限、版本
      → 执行环境：进程、沙箱、队列与持久存储
  → 产物、业务验收、运行观测与评测
```

安全和数据治理贯穿所有层。框架可以嵌在 Harness 内；托管服务也可以同时提供 Harness 和执行环境。因此这些是责任层，不是必须安装九种软件的采购清单。

## 九个能力层

| 能力层 | 你要回答的工程问题 | 代表对象与阅读入口 |
| --- | --- | --- |
| 模型与服务 | 相同模型名是否意味着相同协议和运行条件？ | [模型与服务](/ecosystem/models-and-services)：OpenAI、Anthropic、Gemini、Qwen、DeepSeek、Llama、vLLM、SGLang、Ollama |
| Harness 与界面 | 指令在哪里加载、工具在哪台机器执行、谁批准动作？ | [职责对照](/harnesses/comparison)：Codex、Claude Code、Pi、Gemini CLI |
| 框架与运行时 | 主要难题是循环、状态图、团队协作还是类型契约？ | [Framework 选型](/frameworks/comparison)、[现代运行时](/frameworks/modern-runtimes)、[Microsoft Agent Framework](/frameworks/microsoft-agent-framework) |
| 工具与互操作 | 连接工具、委派给另一Agent、装入操作流程分别用什么？ | [协议与技能](/ecosystem/protocols-and-skills)：MCP、A2A、Agent Skills、程序化工具调用 |
| 上下文与知识 | 本轮应读什么、什么值得保留、过期数据怎样失效？ | [知识与记忆](/ecosystem/knowledge-and-memory)：RAG、LlamaIndex、上下文压缩与长期记忆 |
| 长任务与部署 | 进程退出后谁接手，外部动作结果未知时如何恢复？ | [长任务与部署](/ecosystem/long-running)：持久状态、队列、审批、沙箱、Agents API |
| 应用形态 | 文本、页面、截图和音频带来哪些不同约束？ | [多模态与交互](/ecosystem/multimodal)，以及[编码](/domains/coding)、[研究](/domains/research)、[数据](/domains/data)、[文档](/domains/document) |
| 评测与观测 | 运行事件是否齐全，指标测的是哪种任务和单位？ | [评测与观测](/ecosystem/evaluation-observability)：OTel GenAI、业务验收与基准族 |
| 安全与研究 | 新方法改善哪项可测瓶颈，代价和剩余风险是什么？ | [研究前沿](/ecosystem/research-frontiers)、[威胁模型](/security/threat-model)、[安全评审](/practice/security-review) |

## 用一个例子练习定位

假设任务是“阅读三份公司政策，给出有引用的差异报告”。模型负责提出候选解释；检索负责找对版本和片段；Harness 保持问题、权限和停止条件；文档工具负责提取内容；Validator（验收程序）检查结论与引用。若加入自动发邮件，还新增了收件人授权、正文预览、提交身份和结果对账。

这时换模型无法修复检索用了旧版本；加入多个 Agent 不能替代引用检查；MCP 能连接文档工具，却不自动授权读取所有公司的文件。先画责任和失败路径，再判断需要哪些组件。

## 三种常见选择路径

- **使用现成编码助手**：从 Harness 对照选择使用界面，固定项目指令和权限，先做可回滚的小改动。不要把桌面、CLI 和云端的默认值互相套用。
- **构建自己的业务 Agent**：先定义任务、工具、验收和失败状态；用最小循环建立基线，确有状态恢复或编排需要时再引入框架。
- **评估托管 Agent 服务**：逐项确认状态、工具、沙箱和运维由谁提供；即使循环托管了，业务授权、数据权限和结果验收仍要由应用定义。

## 怎样阅读“当前支持”

产品页至少要区分：官方文档说明、项目的离线教学实现、真实目标环境的运行证据。本项目新增生态材料主要是 **E0 来源事实和设计解释**；[生态工作坊](/practice/ecosystem-workshop)提供限定的 **E1**。没有调用真实上游系统的对象保持 `untested`。

当官方接口或版本变化时，应更新来源与资格探针，保留历史结果。来源失联时标 `pending`；没有证据时不要用“通常兼容”填满矩阵。下一步选一个自己的任务，在[Harness 设计工作表](/practice/harness-design)上画出责任，再做生态工作坊中的一个反例。
