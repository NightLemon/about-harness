# 指标、区间与效应量

## 门禁优先

先看安全违规、禁止动作与确定性验收，再看任务质量、人工介入、时延、token/费用和工具错误。一个配置只要扩大危险权限，即使平均成功率更高也不能晋级。

## 必报字段

- run/task 数与 distinct task 数；
- task-level 与 run-level 成功率、Wilson 95% 区间；
- 配对 win/loss/tie 与实际差值；
- P50/P90 时延、总费用、token、tool error、human turns；
- failure type 分布与最差案例；
- development/holdout 分开报告。

`npm run eval:summary` 输出上述可由 E1 样例计算的部分，并把 development/holdout 的 config 与配对结果分开，报告 input/output token 总量、矩阵缺口和晋级阻断原因。12 行小样本没有 holdout run，`holdout=null`、`promotion_eligible=false` 才是正确结果；区间很宽时结论应为“不足”，不能因 6/6 就声称真实成功率 100%。

## 成本为零的解释

E1 的 `cost_usd=0` 表示没有真实调用，不等于模型免费。E2/E3 必须从 provider/harness 的可审计 usage 记录成本；字段缺失时标为 unknown，不用猜测填零。

下一步：[Judge](/evaluation/judges)。
