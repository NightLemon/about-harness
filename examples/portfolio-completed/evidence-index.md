# 证据索引

| 主张 | 可复核产物 |
| --- | --- |
| 完整 12 单元 | [runs.jsonl](../../lab/results/public/study-demo/runs.jsonl)、[study.json](../../lab/results/public/study-demo/study.json) |
| 原始任务不变 | [tasks.json](../../lab/results/public/study-demo/fixtures/tasks.json)；每条 EvalRun 绑定原始字节 hash |
| 独立验收通过 | [候选测试](../../lab/results/public/study-demo/demo-collection-candidate/test-2.json)、[Result](../../lab/results/public/study-demo/demo-collection-candidate/result.json) |
| 假通过不能改变失败 | [基线 Result](../../lab/results/public/study-demo/demo-collection-baseline/result.json) |
| 实际工作区差异 | [workspace.json](../../lab/results/public/study-demo/demo-collection-candidate/workspace.json)、[预审补丁](../../lab/results/public/study-demo/demo-collection-candidate/candidate.patch) |
| 版本、配置、清理与产物 | [Run](../../lab/results/public/study-demo/demo-collection-candidate/run.json) |
| 四个框架实际执行 | [独立示例汇总](../../lab/results/public/frameworks/summary.json)；与编码研究分开 |
| 仓库验证 | [逐页修订表](../../maintenance/content-review.md)、[维护入口](../../maintenance/development.md) |

这些产物是本地生成的公开候选文件，尚未推送或发布。E1 不能作为真实模型质量或产品采用证据。复核者可按 README 的命令生成新结果，再比较关键断言，不逐字比较计时。

[实际执行源码存档](../../maintenance/execution-sources/README.md) 可复核每条记录的源码字节 hash，避免把后续代码整理误认为原执行版本。
