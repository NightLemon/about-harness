# Python 最小 Harness：从契约到可恢复循环

## 学习目标与证据

你将运行一个不联网、不读取凭据的 fake adapter，观察 task、action、tool、trace、checkpoint 与 result 如何连接。预计 30–45 分钟；证据等级 E1，只证明控制流和约束，不证明任何厂商模型性能。

前置：[环境自检](/guide/prerequisites)、Python 3.11+、uv 0.11.x。依赖由 `uv.lock` 固定；容器基线使用 Python 3.12 slim。

## 组件映射

| 文件 | 责任 | 失败时停止点 |
| --- | --- | --- |
| `contracts.py` | task/action/result 与预算 | schema/类型不合法即拒绝 |
| `loop.py` | 继续、完成、预算、取消、timeout、checkpoint | 任一门禁先于副作用 |
| `policies.py` | allowlist、敏感参数与审批 | 拒权产生 trace |
| `tools.py` | 工具注册、重试与幂等缓存 | 未注册/最终失败即停止 |
| `trace.py` | 有序事件、耗时与脱敏 | secret/path 不得输出 |
| `memory.py` | 工作/长期记忆、失效和删除 | 默认只检索可信记录 |

## 运行

```bash
uv sync --frozen --offline
npm run lab:smoke
uv run pytest
```

预期 smoke 输出是一行 JSON，`status` 为 `completed`、`stop_reason` 为 `completed`、`tool_calls` 为 1，并含 `offline: true` 的起始事件。机器断言在 `lab/tests/`，不要复制示例输出冒充运行证据。

## 跟踪一次运行

Fake adapter 先返回 `echo` ToolCall。Policy 确认工具在 task allowlist 且参数没有敏感键；registry 以 `idempotency_key` 执行一次并缓存；loop 写 checkpoint；下一 action 完成后产生 result。Adapter 决定“想做什么”，harness 决定“是否允许、怎样执行、何时停止”。

## 失败与攻击练习

运行以下已自动化场景：空 goal/schema 错误、未授权工具、重复幂等键、两次临时失败后成功、无限 action、预算耗尽、timeout、并发取消、checkpoint 恢复、过期/污染记忆，以及 trace 中的 token 和用户路径。

```bash
uv run pytest -q lab/tests/test_loop.py
uv run pytest -q lab/tests/test_memory_context_trace.py
```

失败时停止；保存命令与退出码，不删测试。当前 live adapter 会抛出 `LiveAdapterDisabled`，这是设计门禁。

## 清理与恢复

删除可重建的 `.venv/`、`.pytest_cache/`、`.ruff_cache/` 即可清理本地缓存；源码恢复使用最近 checkpoint tag，禁止 `reset --hard` 覆盖未知改动。容器运行时只读、无网络、drop capabilities。

## 适用边界与下一步

实现故意省略 provider client、真实 token 计量、分布式队列和持久数据库。完成后阅读[Adapter 契约](/implementation/adapter-contract)和[测试策略](/implementation/testing)，再把自己的工作负载写成固定 fixture。
