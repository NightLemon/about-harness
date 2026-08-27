# Agent Framework 对照

Framework 提供构建部件或 runtime；完整 harness 还需任务入口、配置、权限、工具、状态、可观测、部署与运维。不要把 SDK import 成功写成“生产 agent 已完成”。

| Framework | 首版关注 | 适合验证 | 仍由你负责 |
| --- | --- | --- | --- |
| LangGraph | 状态图、durable execution、HITL | 研究流程和恢复 | 节点契约、工具、权限、部署 |
| OpenAI Agents SDK | agent loop、tools、handoff、guardrail、state/trace | code-first agent app | server、存储、审批、产品接入 |
| Google ADK | agent/model/tool/session/runtime 组合 | Google 生态与多 agent 对照 | provider、policy、部署治理 |
| AutoGen | AgentChat/Core/Extensions/Studio 分层 | conversation 与多 agent 原型 | 终止、权限、状态、生产门禁 |

## 选择方法

先画任务状态、确定性/模型节点、恢复点和权限，再选最少抽象。用同一 fixture 比较实现复杂度、可观察性、恢复、安全与成本；不比较 hello-world 代码行数。

## 反模式

把 workflow graph 当模型能力、让多 agent 自由聊天无终止、用 framework 默认 memory 保存敏感数据、让 tool decorator 绕过统一 policy、升级依赖后不跑 replay regression。

下一步：先用[LangGraph](/frameworks/langgraph)观察状态图责任，再比较[OpenAI Agents SDK](/frameworks/openai-agents-sdk)、[Google ADK](/frameworks/google-adk)与[AutoGen](/frameworks/autogen)的抽象层。
