# LangGraph

官方 overview（核对 2026-08-20）将 LangGraph 描述为构建长运行、有状态 agent 的 low-level orchestration framework/runtime，强调 durable execution、streaming、human-in-the-loop，以及确定性步骤与 LLM 步骤混合。[FACT:langgraph-overview]

## 在知识地图中的位置

Graph/node/edge 表达 controller 状态转换；checkpointer 承担恢复；interrupt 支持人工关口。它不自动提供正确任务契约、最小权限、可信检索或业务 validator。

## 研究 Agent 模式

状态包含 query、source candidates、claims、citations、conflicts、review decision。确定性节点做 URL/版本/引用检查，模型节点做提取与综合；证据不足走 refusal edge，不用循环搜索直到得到想要答案。

## 可靠性检查

节点输入输出版本化；副作用节点使用幂等键；checkpoint 前后故障注入；并行分支合并要保留来源冲突；interrupt 记录谁批准了什么。

## 证据边界

M5 提供离线集成映射，不安装/调用真实 LangGraph provider 模型。Framework 事实来自官方 overview，案例效果为 E1。
