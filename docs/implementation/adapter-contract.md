# Adapter 契约与协议边界

Adapter 只负责把 provider/harness surface 的消息、action、stream 与错误映射为内部契约；它不拥有权限策略，也不能绕过 ToolRegistry。

## 必须实现

- `next_action(task, trace)`：只返回 tool 或 complete；
- `snapshot()` / `restore(state)`：支持 checkpoint 后继续；
- 稳定 `name`：写入 trace 与 run config；
- 明确错误分类：协议错误、限流、认证、timeout 与取消不能混为一类。

## Fake、replay 与 live

Fake 使用内存 action 序列；replay 读取固定记录并做运行时校验。二者可提供 E1。Live 外壳当前硬禁用，不读取环境变量、凭据文件或 provider SDK；真实调用需独立授权，并补模型 ID、provider、adapter 版本、费用上限与数据范围。

## 协议探针

真实 adapter 最少探测消息角色、工具 schema、并行调用、流式事件、上下文上限、停止原因、重试语义和 usage 字段。探针成功只是 E2 可用性证据，不等于目标任务效果更好。

## 错误恢复

只有明确可重试错误进入有限退避；认证、schema、拒权和数据污染立即停止。恢复必须复用 checkpoint 与幂等键，不能把同一副作用再次执行。

## 工作例：映射一次工具调用

Provider 返回工具名、JSON 参数和 call ID。Adapter 只把它转换成内部 `ToolCall`，保留原 call ID 与顺序；policy 决定能否执行，registry 校验 schema，结果再由 adapter 映射回 provider。若 JSON 无效，返回协议错误并停止，不让 adapter 猜测字段或直接执行 shell。

## 失败诊断

消息缺失先检查 role/item 连续性；重复副作用检查 call ID 与幂等键；stream 中断检查 partial event 是否被错误提交；认证与限流不能合并成“模型失败”。Replay 与 live 的事件字段不同就建立新 adapter 版本，不静默兼容。

## 检查题与下一步

为什么 adapter 不应该拥有审批策略？探针成功还缺哪些任务级证据？阅读[协议兼容](/models/protocol-compatibility)，再用[测试策略](/implementation/testing)覆盖错误分类。
