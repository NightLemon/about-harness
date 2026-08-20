# Adapter 契约与协议边界

Adapter 只负责把 provider/harness surface 的消息、action、stream 与错误映射为内部契约；它不拥有权限策略，也不能绕过 ToolRegistry。

## 必须实现

- `next_action(task, trace)`：只返回 tool 或 complete；
- `snapshot()` / `restore(state)`：支持 checkpoint 后继续；
- 稳定 `name`：写入 trace 与 run config；
- 明确错误分类：协议错误、限流、认证、timeout 与取消不能混为一类。

## Fake、replay 与 live

Fake 使用内存 action 序列；replay 读取固定记录并做运行时校验。二者可提供 E1。Live 外壳当前硬禁用，不读取环境变量、凭据文件或 provider SDK；启用需独立 A3 授权，并补模型 ID、provider、adapter 版本、费用上限与数据范围。

## 协议探针

真实 adapter 最少探测消息角色、工具 schema、并行调用、流式事件、上下文上限、停止原因、重试语义和 usage 字段。探针成功只是 E2 可用性证据，不等于目标任务效果更好。

## 错误恢复

只有明确可重试错误进入有限退避；认证、schema、拒权和数据污染立即停止。恢复必须复用 checkpoint 与幂等键，不能把同一副作用再次执行。
