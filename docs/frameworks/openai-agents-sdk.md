# OpenAI Agents SDK

核对日期：2026-08-20。官方 [Agents SDK](https://developers.openai.com/api/docs/guides/agents-sdk) 将 SDK 定位为 code-first agent app 路径，覆盖 agent definition、models/providers、running agents、handoffs、guardrails/human review、results/state、MCP、tracing 与 evaluation。[FACT:openai-agents-sdk]

## 与 Harness 的边界

SDK 运行 agent loop 并调用工具；应用仍负责 server/deployment、工具实现、状态存储、审批决策、数据治理与产品逻辑。Responses API 更底层，SDK 提供更高层 runtime 组合；两者都不替代工作负载评测。

## 设计映射

- Agent definition → 指令、模型、工具与输出契约；
- Handoff → 所有权转移，需记录父/子上下文与终止；
- Guardrail/human review → 输入输出/风险关口，不等于 OS sandbox；
- Result/state → continuation 与恢复输入；
- Tracing → 调试证据，公开前需脱敏。

## 当前限制

本项目不安装 SDK 或调用 OpenAI API；示例只描述接口责任。模型/价格/账号可用性必须从官方页面另行核验，性能为 E0。
