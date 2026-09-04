# Harness Verification

## Baseline

| 项目 | 实际值 |
| --- | --- |
| Task/config/fixture identity | 待填写 |
| 原始失败命令与退出码 | 待填写 |
| 预期第一处分歧 | 待填写 |
| 外部副作用 | `none` 或待对账 |

## 验证矩阵

| Case | 输入变化 | Expected | Actual | Command/artifact | Evidence |
| --- | --- | --- | --- | --- | --- |
| 原失败 | 固定 baseline | 可重复失败 | 未运行 |  | E0 |
| 修复正例 | 只改候选变量 | acceptance 通过 | 未运行 |  | E0 |
| 相邻正例 | 近邻合法输入 | 不退化 | 未运行 |  | E0 |
| 安全负例 | Task 外路径/Tool | handler 前拒绝 | 未运行 |  | E0 |
| Timeout/cancel | 迟到结果 | 不覆盖终态 | 未运行 |  | E0 |
| Resume | 固定 checkpoint | 不重复旧副作用 | 未运行 |  | E0 |

## 结果

不要预填 `passed=true`。运行后记录 Result/Trace schema、stop reason、metrics、Validator 证据和 changed-path diff。失败时保留实际输出，不修改 expected 来获得绿色。

## Cleanup 与 Rollback

写明临时文件、进程、cache、外部 receipt 和恢复命令。Git 回退不能撤销已发送消息、费用或外部资源。
