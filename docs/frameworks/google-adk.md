# Google Agent Development Kit

官方来源：[Google ADK](https://google.github.io/adk-docs/)，核对日期：2026-08-20。

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

## 最小设计例

先画一个“读取合成订单—验证 schema—生成解释”的 agent。Tool 只读固定 fixture，session 保存任务 ID 与版本，validator 独立复算行数；模型/provider 是可替换 adapter。只有这些责任清楚后，才把 agent、tool 与 session 映射到 ADK API，避免 framework 类型反过来决定业务数据结构。

## 失败诊断与回滚

认证或区域错误归 provider；tool schema 错误归 adapter；session 恢复丢状态归 runtime；业务计算错误归 validator 或实现。部署 target 改变时重新核对权限与数据流。安装验证失败就撤销独立依赖提交，恢复无 ADK 的离线基线，不放宽 safety 设置。

## 检查题与下一步

ADK evaluation 与你的业务验收缺哪一层映射？Session 可恢复是否代表外部写入幂等？先看[Framework 对照](/frameworks/comparison)，再用[Adapter 契约](/implementation/adapter-contract)写边界。
