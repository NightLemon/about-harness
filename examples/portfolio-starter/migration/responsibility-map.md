# Cross-Harness Responsibility Map

## 范围

```text
Source Harness/version:
Target Harness/version:
Task/config/fixture:
Domains and external state:
Evidence: E0
```

| Responsibility | Source semantics | Target semantics | Gap | Compensating control | Evidence | Preserves boundary |
| --- | --- | --- | --- | --- | --- | --- |
| instructions |  |  |  |  | untested | unknown |
| tools |  |  |  |  | untested | unknown |
| sandbox |  |  |  |  | untested | unknown |
| approval |  |  |  |  | untested | unknown |
| network |  |  |  |  | untested | unknown |
| state |  |  |  |  | untested | unknown |

## 资格与切换

先设计 read-only、deny、ask、network、resume 和 Validator probe；再运行 shadow。配置文件名相似不表示语义相同，目标边界未知时不切换。

## Rollback

保存 source commit/config/checkpoint、目标状态迁移、外部 receipt、停止入口和回切阈值。恢复聊天文本不等于恢复业务状态。
