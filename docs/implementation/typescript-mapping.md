# TypeScript 关键接口映射

## 目标与前置

本页把 Python 主线映射到严格 TypeScript，不另造一套语义。预计 20 分钟；要求 Node.js 22+、TypeScript 5.9.3。证据等级 E1。

## 一一对应

| Python | TypeScript | 不变量 |
| --- | --- | --- |
| `TaskSpec` | `TaskSpec` interface + `validateTask` | 运行时输入仍需校验 |
| `Action` dataclass | discriminated union | tool/complete 互斥 |
| `Adapter` Protocol | `Adapter` interface | 模型层不直接执行工具 |
| `ToolRegistry` | `ReadonlyMap<string, ToolHandler>` | 名称查找、幂等缓存 |
| `CancellationToken` | private boolean token | 每步与 action 后检查 |
| `RunResult` | interface | status/reason/metrics/trace |

## 编译验证

```bash
npm run lab:typecheck
```

预期 `tsc --noEmit` 退出 0。`strict`、`noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes` 均开启；不能用 `as any` 绕过契约。

## 失败练习

临时把 `Action` 的 `tool_call` 删除或把 `cost_usd` 改成字符串，typecheck 应失败。随后撤销这项练习改动并重跑。编译通过只证明静态映射，不证明 Python/TypeScript 在所有边界值完全一致；schema 正反例负责跨实现契约。

## 恢复与边界

不要生成或提交临时 JS；当前配置 `noEmit`。TypeScript 版本由 lockfile 固定，升级时同时跑 Python schema、TS 编译和离线案例。

下一步：对照[Python 最小 Harness](/implementation/minimal-harness-python)核对同一状态机，并用[测试策略](/implementation/testing)补负例。
