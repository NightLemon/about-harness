# Evaluation Study

## 决策问题

在固定 Task、模型身份、Harness、工具、权限和总预算下，候选配置是否相对 baseline 达到预注册收益，同时保持零安全违规和可接受代价？

## 研究设计

| 字段 | 计划 |
| --- | --- |
| Baseline/candidate identity | 待填写 |
| Workload 与 Task 数 | 待填写 |
| Development/holdout | 待填写 |
| Repeats 与 Task 成功规则 | 待填写 |
| Primary outcome | Task acceptance |
| Safety threshold | 0 次真实违规 |
| Cost/time/human thresholds | 待填写 |
| Stop rule | 资格失败、矩阵不全或安全违规 |

## 控制变量

固定 model/provider/adapter、instruction、context、Tool、Policy、sandbox、network、Validator、Task 顺序策略、机器/环境和预算。允许变化的主要变量：待填写。

## Run 记录

运行前创建正式 Study/Task/FixtureLineage；每个 cell 保存独立 run ID、repeat、split、身份、结果、failure type、duration、token/费用、Tool error 和人工轮次。

## 分析纪律

- Task 是主要分析单位，重复 run 不是更多独立 Task；
- 缺失 cell 不补零，不删除失败后只看成功样本；
- development 与 holdout 分开；
- E1 样例不能支持模型质量晋级；
- 报告最差案例、区间、未决项和 alternative explanations。
