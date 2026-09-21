# 完整离线编码研究

E1：固定补丁的实际执行结果，仅用于本案例回归。

| 任务 | 配置 | 验收 | 失败分类 | Result |
| --- | --- | --- | --- | --- |
| demo-collection | baseline | False | verification | [demo-collection-baseline](demo-collection-baseline/result.json) |
| demo-collection | candidate | True | None | [demo-collection-candidate](demo-collection-candidate/result.json) |
| demo-normalize | baseline | False | verification | [demo-normalize-baseline](demo-normalize-baseline/result.json) |
| demo-normalize | candidate | True | None | [demo-normalize-candidate](demo-normalize-candidate/result.json) |
| demo-range | baseline | False | verification | [demo-range-baseline](demo-range-baseline/result.json) |
| demo-range | candidate | True | None | [demo-range-candidate](demo-range-candidate/result.json) |
| demo-missing | baseline | False | verification | [demo-missing-baseline](demo-missing-baseline/result.json) |
| demo-missing | candidate | True | None | [demo-missing-candidate](demo-missing-candidate/result.json) |
| demo-sorting | baseline | False | verification | [demo-sorting-baseline](demo-sorting-baseline/result.json) |
| demo-sorting | candidate | True | None | [demo-sorting-candidate](demo-sorting-candidate/result.json) |
| demo-deduplicate | baseline | False | verification | [demo-deduplicate-baseline](demo-deduplicate-baseline/result.json) |
| demo-deduplicate | candidate | True | None | [demo-deduplicate-candidate](demo-deduplicate-candidate/result.json) |

矩阵完整：True

决定：只保留通过独立工作区测试的候选作为这些固定任务的回归基线。

不用于真实模型质量、产品采用或发布；失败记录和临时仓库清理回执均保留。
