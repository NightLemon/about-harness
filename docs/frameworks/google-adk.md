# Google Agent Development Kit

官方 ADK 文档（核对 2026-08-20）提供 agents、models、tools、sessions、runtime、deployment、observability、evaluation 与 safety/security 导航。[FACT:google-adk]

## 在 Harness 中的位置

ADK 可承担 agent/runtime 组合，但你仍需冻结 provider/model、任务 schema、权限、secret、fixture、成本和 release gates。支持多个 deployment target 不等于任一目标已通过你的合规要求。

## 适配检查

1. Agent 与 tool 的输入输出契约；
2. Session/state 的持久与删除；
3. Action confirmation 与真实副作用边界；
4. MCP/OpenAPI/auth tool 的凭据流；
5. Cancel/resume、event loop 与 trace；
6. Evaluation criteria 与目标业务 validator 的映射。

## 当前证据

只核对官方导航和架构入口，没有安装 ADK 或调用 Gemini/Vertex；示例为 E0 方法说明。
