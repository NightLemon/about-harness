# Harness 问题诊断

## 最小诊断包

Task/fixture hash、model/provider/adapter/harness/surface 版本、有效指令/config、允许工具/权限、trace、输出 diff、验证命令/退出码、预算与环境。先脱敏。

## 按第一处错误归因

| 信号 | 首查 |
| --- | --- |
| 目标理解错误 | task contract / instruction conflict |
| 找不到事实/文件 | context selection / retrieval / cwd |
| ToolCall 无效 | protocol adapter / schema |
| 工具执行错 | executor / environment / permission |
| 重复副作用 | idempotency / checkpoint |
| 输出看似好但验收失败 | validator / model reasoning |
| 偶发失败 | provider/infrastructure / race / timeout |

## 二分变量

回到开箱默认或工程基线，使用 fake/replay 排除 live provider，再逐一恢复模型、context、tools、memory、budget。修复后新增最小回归，避免只在完整任务中“似乎好了”。

## 何时停止

Secret/隐私、破坏性目标不明、数据污染、无法恢复的外部副作用、预算不可控或 baseline 不可复现时立即停止并请求人工处理。

下一步：用[诊断工作表](/practice/debugging)记录一次真实失败，再到[可观测性](/foundations/observability)补足事件字段。
