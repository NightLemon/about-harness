# Anthropic Claude：适配差异与验证入口

本页集中说明这一模型家族需要额外核对的条件。通用流程只在[模型适配与选择](/models/adaptation)维护，探针格式见[协议兼容](/models/protocol-compatibility)。

<span id="核对入口与证据边界"></span>
<span id="先区分三种被混叫-claude-的对象"></span>
<span id="先区分三种被混叫claude的对象"></span>
<span id="先过协议资格-再评任务能力"></span>
<span id="先过协议资格再评任务能力"></span>
<span id="tool-loop-的关键不变量"></span>
<span id="claude-code-是-harness-变量"></span>
<span id="长上下文与-prompt-caching"></span>
<span id="thinking-与预算"></span>
<span id="coding-工作例"></span>
<span id="失败归因"></span>
<span id="评测与晋级"></span>
<span id="在本项目验证离线边界"></span>

<span id="anthropic-claude-模型家族适配"></span>

## 来源与版本

[官方入口](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview)，本轮检查日期 2026-09-08。[FACT:anthropic-tools] 工具请求与工具结果分别使用 tool_use 和 tool_result 内容块，结果需要对应原工具调用身份。应用执行工具，模型输出不授予权限。

来源记录属于 E0；本仓库没有该家族真实模型运行结果。具体型号、套餐、区域、上下文和价格不跨版本继承。

## 冻结这个组合

第一方 API、云转售接口和 Claude Code 分开记录；核对模型 ID、消息块、停止原因、thinking 设置和缓存用量。

<span id="检查题与下一步"></span>

## 产品特有的检查

CLAUDE.md 和自动记忆属于产品上下文；它们不能替代工具权限。使用产品时进入 [Claude Code 教程](/harnesses/claude-code)。

先做一个无副作用文本探针、一个完整工具往返和一个错误/取消探针。保存请求与实际型号、协议映射、用量状态和终态；协议不合格时修适配层，不进入质量比较。

<span id="最小配置身份"></span>

## 配置与操作路径

用[适配卡](/practice/model-playbook)记录 requested/observed model、供应方、版本、工具和预算。产品用户按[Harness 教程](/harnesses/comparison)配置；自建循环先对照[Responses 参考实现](/models/openai)，只复用控制边界，不复制其他供应方的 wire 字段。

当前没有本家族可直接调用的适配器，页面不再通过共享 Replay 测试冒充家族验证。真实探针需单独授权；缺少身份、字段来源或费用上限时停止。回退恢复完整旧配置，未知写操作先对账。
