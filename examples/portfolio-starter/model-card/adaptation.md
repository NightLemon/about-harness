# Model Adaptation Card

## 决定摘要

```text
Decision: untested
Workload:
Requested model alias:
Resolved model identity:
Provider/surface/Adapter/Harness:
Config identity:
Evidence: E0
```

## 来源事实

| Claim | Exact surface/version | Official source | Checked date | Status |
| --- | --- | --- | --- | --- |
| 待核验 |  |  |  | pending |

## 协议资格

| Probe | Required | Positive | Negative | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| identity | yes |  | alias 漂移 | untested | E0 |
| message/tool/result | yes |  | 丢 call ID/坏参数 | untested | E0 |
| stream/stop/error | yes |  | 断流/未知事件 | untested | E0 |
| usage/budget | yes |  | 非有限/缺失 usage | untested | E0 |
| cancel/retry | yes |  | 迟到/重复副作用 | untested | E0 |

## 配置与边界

记录 Context、Instruction、Tool、Policy、Memory、Reasoning、预算和 changed variable。没有真实调用授权时停在 E0/E1，不填写虚构 live 结果。

## 路由、回退与重测

写明适用 workload、fallback 完整配置、回退触发，以及 model/provider/adapter/Task 哪项变化会要求重测。
