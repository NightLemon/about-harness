# 评测记录：实际运行后的决定

本研究为 Study 1.2 learning。六个任务覆盖不同缺陷，按固定输入分开发/留出各三；两配置各运行一次。样本用于演示执行链，没有随机抽样或模型生成代码，留出标签也不是防人工查看机制。

| 任务 | 分组 | 基线 | 候选 | 候选 Result |
| --- | --- | --- | --- | --- |
| 集合边界：保留最后一个元素 | development | verification 失败 | 通过 | [demo-collection-candidate](../../lab/results/public/study-demo/demo-collection-candidate/result.json) |
| 字符串规范化：去除首尾空白并转小写 | development | verification 失败 | 通过 | [demo-normalize-candidate](../../lab/results/public/study-demo/demo-normalize-candidate/result.json) |
| 数值范围：将数值夹在闭区间 0 到 10 | development | verification 失败 | 通过 | [demo-range-candidate](../../lab/results/public/study-demo/demo-range-candidate/result.json) |
| 缺失值：仅缺少键时使用默认值 | holdout | verification 失败 | 通过 | [demo-missing-candidate](../../lab/results/public/study-demo/demo-missing-candidate/result.json) |
| 稳定排序：按 score 排序并保留同分顺序 | holdout | verification 失败 | 通过 | [demo-sorting-candidate](../../lab/results/public/study-demo/demo-sorting-candidate/result.json) |
| 去重：保持首次出现的顺序 | holdout | verification 失败 | 通过 | [demo-deduplicate-candidate](../../lab/results/public/study-demo/demo-deduplicate-candidate/result.json) |

完整矩阵为 12/12，候选 6/6、基线 0/6；所有基线都真正运行了测试并失败。开发与留出组分别为候选 3/3、基线 0/3。一次确定性运行不能估计真实模型的随机方差。

本次核心循环 P90：基线 625.0 ms，候选 438.0 ms。计时不含准备临时仓库和初始测试；基线有拒绝后的再次完成提议，路径长度也不同，不能把时长差当作模型速度比较。

汇总保留 Wilson 与配对区间，但固定小样本上的区间不能证明泛化。零 token 和零 API 费用来自没有模型服务请求，不是供应方免费。

决定：只采用 candidate 作为这些固定任务的回归基线。promotion_eligible=false；阻断项为 learning_only。

[完整汇总](../../lab/results/public/study-demo/summary.json)、[全部 EvalRun](../../lab/results/public/study-demo/runs.jsonl) 与 [研究设计](../../lab/results/public/study-demo/study.json) 是数字来源。原 evals/ 的不完整合成研究保持不变。

任务、补丁、验证器或预算改变后以新目录重跑。失败证据不覆盖；结果哈希或身份不一致时停止采用。
