# Round 07 修改前 Findings

- Round：07
- Baseline：`934015e`
- Baseline tag：`review-v1-round-07-baseline`
- Rubric：评测、统计、holdout 和数据完整性
- 记录时间：2026-08-21 12:11 +08:00
- 状态：已在任何 round-07 修正前冻结

## R07-P1-01：唯一 run ID 不能保证矩阵单元唯一，重复单元与混合配置会污染正式比较

- 严重性：P1
- 位置：`scripts/eval-lib.mjs`、`scripts/eval-validate.mjs`、`scripts/test-m5-checks.mjs`
- 复现：复制一条 run，改成新的 `run_id`，但保留相同 `task_id/config_id/repeat`；validator 通过。还可把同一 `config_id` 的一条记录改成不同 `config_version`、`model_id`、`harness_version` 或 `instruction_hash`，仍会聚合。最后用重复单元补足总行数，`sample_matrix_complete` 仅比较行数，可能在缺少真实单元时返回 true。
- 影响：重复运行被当成不同矩阵单元、不同配置被合并，成功率、配对结果和“完整矩阵”声明失真，可能错误晋级配置。
- 根因：只检查 `run_id`，没有建立逻辑 cell key、期望 cell 集合与 config identity invariant。
- 修正要求：拒绝重复 `(task, config, repeat)`；同 config 的 version/model/harness/instruction/evidence 必须一致；按期望 cell 集计算 missing/complete；新增不同 run ID 的重复单元和配置漂移 canary。

## R07-P2-02：汇总混合 development/holdout 且漏报 token，无法审计 holdout 与成本

- 严重性：P2
- 位置：`scripts/summarize-evals.mjs`、`lab/schemas/eval-run.json`、`docs/evaluation/metrics.md`
- 复现：summary 只按 `config_id` 聚合，`pairwise` 也把所有 split 放在一起；输出没有 development/holdout 分层。`input_tokens/output_tokens` 出现在样例和 schema properties，却不是 schema/runner required，也没有进入汇总。
- 影响：调优集与未见集的差异被掩盖，holdout 泄漏难以发现；真实 API 的 token 成本无法与费用交叉核对。
- 根因：指标实现落后于文档“split 分开报告”和 token 必报字段，schema/汇总没有共同门禁。
- 修正要求：按 split 输出 config 与 pairwise 指标；token 字段成为 required 非负整数并汇总；显式输出 matrix coverage 与 `promotion_eligible=false`（矩阵不完整或证据不足时）；增加 summary 结构和负例测试。

## 计数判断

R07-P1-01 可直接使正式比较数据失真，是独立 P1；R07-P2-02 阻断 holdout 与成本解释。修正涉及 schema、validator、summary、文档和负例，不与 Round 03 runner 或 Round 06 教程根因重复，满足实质 review 门槛。
