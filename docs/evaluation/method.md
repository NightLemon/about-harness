# 评测方法与证据晋级

## 外循环

先冻结任务/fixture/配置/主指标，再运行 baseline，按失败类型修改一个主要变量，最后才打开 holdout。结果必须保存 task、run、trace、result、fixture/config/instruction hash、模型/harness 版本、退出码与失败分类。

## E0–E3

| 等级 | 能证明 | 不能证明 |
| --- | --- | --- |
| E0 | 假设与待运行方案 | 可用性或推荐 |
| E1 | 固定 fake/replay 的流程、schema 与门禁 | live 模型质量 |
| E2 | 锁定真实组合的有限可用性 | 广泛最优 |
| E3 | 预注册、重复、holdout、安全/成本门槛下的限定比较 | 脱离工作负载的总榜 |

`evals/study.example.json` 定义 20 任务、6 workload、2 配置、3 次重复和 6 个 holdout；`runs.example.jsonl` 只有 12 条 E1 分析样例，故 validator 明确报告 matrix 不完整。不能把模板空位补成虚构运行。

## 命令与停止

```powershell
npm run eval:validate
npm run eval:summary
```

重复 run ID、重复 `(task, config, repeat)` 单元、同 config 的模型/版本/指令漂移、未知任务、split 泄漏、坏 hash、违规 failure type 会失败。矩阵 coverage 必须按期望单元计算，不能用总行数代替。出现安全违规、holdout 提前用于调参、费用超预算或环境版本不明时停止，不发布晋级结论。

继续阅读[Schema](/evaluation/task-schema)、[指标](/evaluation/metrics)和[报告纪律](/evaluation/reporting)。
