# V1 Review Round 07：评测、统计与 Holdout 完整性

## 结论

本轮基于 `review-v1-round-07-baseline` 修复一个 P1 和一个 P2：不同 run ID 可以重复占用同一评测单元，同一 config ID 也能混合不同身份；汇总又混合 development/holdout 并漏掉 token。它们会直接污染矩阵完整性、配对统计和配置晋级。

## 修改前证据

- Baseline：`934015e6bafd57c0b3037c3f039e972180c54345`
- Findings commit：`93ee376`
- Findings：`R07-P1-01`、`R07-P2-02`
- 详细复现：`artifacts/reviews/v1/round-07/findings.md`

## 修正

- 拒绝重复 `(task_id, config_id, repeat)`，不再只依赖 run ID。
- 同一 config 的 version、model、harness、instruction hash 与 evidence 必须一致。
- 按完整期望 cell 集计算 observed/missing/complete，不能用总行数替代。
- EvalRun schema 要求 input/output token；summary 报告 token、split 分层和分 split 配对结果。
- 矩阵不完整、证据低于目标或有安全违规时显式禁止晋级。
- 新增不同 ID 重复单元、配置漂移、split/promotion/token 的负例。

## 验证与边界

`eval:validate` 报告 120 个期望单元、12 个观察单元、108 个缺口；`eval:summary` 报告 `holdout=null` 与 `promotion_eligible=false`。`m5:self-test`、目标 schema/runner pytest 和完整 `npm run verify` 通过，共 34 项 pytest。内容结果 commit 为 `7d9fbdd`。没有运行 E2/E3、调用真实模型/API、产生费用或执行远程操作。
