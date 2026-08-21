# 模型协议兼容性

## 三层兼容

1. **Transport**：认证、endpoint、超时、流式连接；
2. **Message/tool**：role、content part、schema、call/result ID；
3. **Harness semantics**：停止、取消、重试、usage、缓存和错误映射。

还要记录协议的**状态载体**：有的 provider 只需要消息历史，有的会返回必须原样续传的 typed output item、opaque reasoning item 或 response ID。把它们压平成 assistant 文本可能“能聊天”，却破坏连续 tool calling。

只验证第一层会产生“能聊天但不能可靠 agent”的假阳性。

## 最小探针集

- 单轮文本与多轮历史；
- system/developer 冲突优先级；
- 必填、枚举、嵌套、额外字段和坏 JSON；
- 两个独立工具、重复 call ID 与取消；
- 超长输入、输出截断与 stop reason；
- 限流、认证、server error、timeout 的分类；
- usage 与 cache 字段缺失时的处理。
- Stateful output-item 协议：分别测试 response ID 续接和手工完整回放；删除 opaque state item 的负例必须能归因。

对 OpenAI Responses reasoning model，探针要保存 `call_id`，并验证 `previous_response_id` 与完整 output items 回放两条路径；连续多个 function calls 时不能只保留最后一个可见消息。[FACT:openai-reasoning-items]

每个探针保存脱敏请求、响应、版本、命令和断言。Adapter 应拒绝无法无损映射的功能，而不是静默降级。

## Compatibility card

用 `supported / emulated / rejected / untested` 四态；`supported` 还需 evidence level。每一项同时记录 request shape、state carrier、错误映射和证据 artifact。模型家族页面不假设同一家族的所有模型共享协议能力。
