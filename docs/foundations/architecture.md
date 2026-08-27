# Harness 系统架构

## 从边界开始

一个最小 harness 至少有 controller、model adapter、context builder、policy、tool registry、state/checkpoint、validator 与 trace sink。完整产品还可能提供 IDE/CLI surface、队列、协作、计费与管理控制面。把这些都叫“agent”会让故障归因失真。

```text
Task contract
   ↓
Controller → Context builder → Model adapter
   ↑                              ↓ action
Validator ← Tool result ← Policy → Tool executor
   ↕              State / checkpoint              ↕
                 Trace / metrics
```

## 数据面与控制面

数据面承载消息、工具输入输出、文件与检索内容；控制面决定模型、预算、权限、重试、并发、停止和人工批准。模型输出属于数据面建议，不能覆盖控制面策略。安全边界应在模型不可绕过的位置实现。

## 一次事件流

1. TaskSpec 固定目标、输入、许可工具、预算和验收。
2. Context builder 选择可信、相关且在预算内的信息。
3. Adapter 把内部消息映射到目标模型协议。
4. Controller 接受 tool/complete action，不直接信任其正确性。
5. Policy 在副作用前检查 allowlist、schema 和审批。
6. Executor 使用 timeout、重试与幂等键执行工具。
7. Validator 检查产物；checkpoint 与 trace 支持恢复和审计。

## 设计检查

- 每个副作用有唯一授权者吗？
- 模型、adapter 与工具错误能否区分？
- 取消能否传播到并发任务？
- checkpoint 是否在副作用后原子写入？
- trace 是否脱敏且仍足够复现？

对应实现见[Python 最小 Harness](/implementation/minimal-harness-python)。

## 工作例与失败诊断

模型提出写文件时，adapter 只转换 action，policy 先核对路径和授权，executor 才执行，validator 最后检查内容。若文件未写入，沿 adapter、policy、tool result 逐层定位；若写入两次，检查幂等键与 checkpoint 时机。不要把所有异常都归为“模型不够强”。下一步可在[状态与可靠执行](/foundations/state-reliability)逐项验证。
