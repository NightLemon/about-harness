# Knowledge Map

## 责任图

```text
Task ingress
  → Context builder
  → Model/Replay Adapter
  → Action runtime validation
  → Policy / approval
  → Tool executor
  → ToolResult / State / Checkpoint
  → Acceptance Validator
  → Result / Trace / Artifact
```

为每个节点填写：

| 节点 | 输入 | 输出 | 唯一 owner | 失败方式 | 证据 |
| --- | --- | --- | --- | --- | --- |
| Task ingress |  |  |  |  |  |
| Context builder |  |  |  |  |  |
| Adapter |  |  |  |  |  |
| Action validator |  |  |  |  |  |
| Policy |  |  |  |  |  |
| Tool |  |  |  |  |  |
| State/checkpoint |  |  |  |  |  |
| Acceptance validator |  |  |  |  |  |
| Trace/artifact |  |  |  |  |  |

## 三个平面

- Data plane：待填写；
- Control plane：待填写；
- Evidence plane：待填写。

## 两条路径

成功路径：待填写事件与状态。

失败/取消路径：待填写第一处分歧、停止原因、handler 次数和恢复点。

未知责任必须写 `unknown`，不能从产品名称或模型回复推断。
