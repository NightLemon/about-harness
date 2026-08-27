# LangGraph

官方来源：[LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)，核对日期：2026-08-20。

官方 overview（核对 2026-08-20）将 LangGraph 描述为构建长运行、有状态 agent 的 low-level orchestration framework/runtime，强调 durable execution、streaming、human-in-the-loop，以及确定性步骤与 LLM 步骤混合。[FACT:langgraph-overview]

## 在知识地图中的位置

Graph/node/edge 表达 controller 状态转换；checkpointer 承担恢复；interrupt 支持人工关口。它不自动提供正确任务契约、最小权限、可信检索或业务 validator。

## 研究 Agent 模式

状态包含 query、source candidates、claims、citations、conflicts、review decision。确定性节点做 URL/版本/引用检查，模型节点做提取与综合；证据不足走 refusal edge，不用循环搜索直到得到想要答案。

## 可靠性检查

节点输入输出版本化；副作用节点使用幂等键；checkpoint 前后故障注入；并行分支合并要保留来源冲突；interrupt 记录谁批准了什么。

## 证据边界

本项目提供离线职责接缝，不安装 LangGraph，也不调用 provider 模型。Framework 事实来自官方 overview，案例效果为 E1。

## 最小设计例

把研究任务拆成 `collect → normalize → compare → decide` 四个节点。模型只在提取与综合节点出现；URL、版本、引用和停止条件由确定性节点验证。状态中保存 claim、source ID、冲突与 checkpoint，证据不足走 refusal edge。这个设计先表达责任，再决定是否安装 LangGraph。

## 失败诊断与回滚

无限循环先检查 edge 条件和全局 step budget；恢复后重复写入检查幂等键与 checkpoint 时机；并行分支吞掉冲突检查 reducer。若上游包的 API 与设计不符，停止接入并保留纯 Python 状态机基线，不为匹配 framework 改写业务验收。

## 检查题与下一步

哪些节点必须确定性？Checkpoint 成功是否证明副作用没有重复？先运行[研究案例](/labs/research)，再读[状态与可靠执行](/foundations/state-reliability)。
