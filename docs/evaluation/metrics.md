# 指标、区间与效应量

指标的作用是把“哪个配置更适合这个工作负载”变成可证伪判断。一个百分比没有说明样本单位、缺失数据、风险和成本时，往往比没有数字更容易误导。

## 先写测量契约

在运行候选前，把指标分为四层：

| 层级 | 作用 | 示例 | 决策方式 |
| --- | --- | --- | --- |
| Hard gate（硬门槛） | 阻止不可接受后果 | 未授权动作、泄密、破坏性写入 | 任一触发即否决 |
| Primary metric（主指标） | 回答本次优化是否有效 | task-level 成功、规则得分 | 预注册最小改善 |
| Guardrail（护栏指标） | 防止用代价换表面提升 | P90 延迟、费用、人工介入 | 不得超过预算/退化阈值 |
| Diagnostic（诊断指标） | 解释为何变化 | tool error、失败类型、重试 | 不单独决定晋级 |

安全违规、禁止动作与确定性验收优先于平均质量。一个配置只要扩大危险权限，即使成功率更高也不能晋级。反过来，安全门槛通过只表示“没有观察到门槛事件”，不证明系统普遍安全。

## 样本单位决定问题含义

Task（任务）通常是主要独立样本；同一任务的多次 run 是对随机性和运行可靠性的重复观察，不能当作许多全新任务。

- **Run-level 成功率**：成功 run / 有效 run，回答“一次尝试成功的概率如何”；
- **Task-level 成功率**：达到预注册任务聚合规则的 task / 不同 task，回答“覆盖了多少问题”；
- **Workload-level 结果**：按 coding、browser 等任务族分层，防止一个大类掩盖另一个小类；
- **Pair-level 差异**：同一 task、repeat 下候选与 baseline 的直接对照，减少任务难度差异。

Task-level 聚合必须提前定义，例如“3 次中至少 2 次通过”或“3 次全部通过”。`npm run eval:summary` 当前输出的是 run-level `pass_rate` 和 `distinct_tasks`，并没有计算 task-level 成功率；报告不能仅凭这两个字段拼出未预注册的 task-level 结论。

## 先验证矩阵完整性

预期矩阵大小是：

```text
任务数 × 配置数 × 每任务重复数
```

每个单元由 `(task_id, config_id, repeat)` 唯一标识。缺一行不是自动失败，也不是自动成功；它是缺失单元，必须按预注册规则分类。当前模板为 `20 × 2 × 3 = 120` 个单元，样例只有 12 行，因此缺少 108 个单元。

同时报告 scheduled、started、completed、valid 和 analyzed 数量，才能看出结果在哪一层消失。重复 run ID、同单元重复占位、配置身份漂移或 split 不匹配应先拒绝，不能进入统计。

## 二元结果与区间

成功率应同时给出 `k/n`、点估计和 Wilson interval（威尔逊区间）。区间表达有限样本下的估计不确定性，不是“真实值有 95% 概率位于这里”的后验概率。

当前 E1 样例中：

| 配置 | 成功 | Run-level 成功率 | Wilson 95% |
| --- | ---: | ---: | --- |
| `offline-default` | 1/6 | 0.1667 | [0.0301, 0.5635] |
| `offline-engineering` | 6/6 | 1.0000 | [0.6097, 1.0000] |

“6/6”的点估计是 100%，但区间下界约为 61%；正确表述是“这 6 个离线样例全部通过，样本仍小”，而不是“真实成功率为 100%”。样本扩大时要增加不同任务，而不是只在一个容易任务上重复更多次。

若任务得分是连续值，还应报告分布、差值和异常点；把任意阈值后的 pass/fail 作为唯一指标会丢失接近门槛的信息。

## 配对比较优先

同一任务和 repeat 下比较 baseline 与 candidate：

- win：candidate 通过、baseline 失败；
- loss：candidate 失败、baseline 通过；
- tie：两者状态相同；
- incomplete：缺少任一配置，不能计入完整 pair。

当前样例得到 5 win、0 loss、1 tie，共 6 个完整 development pair。这个结果只描述固定离线样例的相对状态，不能消除矩阵不完整、无 holdout 和 E1 证据边界。

配对报告至少给出 win/loss/tie 原始计数、完整 pair 数和缺失 pair 数。只报“胜率”会隐藏大量 tie 或缺失；只比较两个配置各自的总体均值，会把任务构成差异误当配置效果。

## 效应量而不只是显著性

Effect size（效应量）描述差异有多大。二元主指标可报告成功率绝对差；连续指标可报告每个配对单元的绝对差、相对差、中位数和分位数。阈值要与业务意义绑定，例如“成功率至少提高 5 个百分点，同时 P90 延迟不增加超过预算”。

统计检验回答“在某些假设下，这种数据有多意外”，不回答差异是否值得成本，也不修复偏置任务、holdout 泄漏或配置漂移。小样本下应把原始配对和区间放在 p-value 前面。

## 延迟、成本与资源

延迟至少分解 model、tool、approval、queue、validation 与 end-to-end；报告 P50/P90 和样本量。P90 在样本很少时由一两个点决定，应展示原始值或经验分布，不要给出虚假精度。

费用同时报告：

- 总费用与总 token，回答预算消耗；
- 每 run、每 task 与每成功任务费用，回答效率；
- 缓存命中和免费额度是否计入，回答可比性；
- 未知 usage 数量，回答数据完整性。

E1 的 `cost_usd=0` 表示没有真实调用，不等于模型免费。E2/E3 必须使用 provider/harness 的可审计 usage；采集缺失要写 `unknown` 或独立状态，不能猜测填零。baseline 成本为零时，相对百分比变化没有定义，应使用绝对差或明确的零基线规则。

Token 也不是跨模型的通用工作量单位。比较时固定 tokenizer/计费口径和 surface；跨 provider 报告各自 token 与实际费用，不把数字直接相加成“推理量”。

## 安全指标需要暴露分母

报告 `safety_violations=0` 时，还要说明运行了多少安全任务、触发了多少危险机会、policy 拒绝了多少动作，以及是否存在未分类或缺失 trace。没有执行安全负例的 0，与执行 100 次均正确拒绝的 0，证据完全不同。

`failure_type="safety"` 与 `safety_violation=true` 也不是同一字段：前者可表示安全相关任务没有满足验收，后者表示观察到违规行为。报告应同时保留任务结果和实际违规，不能从名称互相推断。

高风险事件通常采用零容忍硬门槛，但“本次零事件”仍要以观察范围为边界。发现违规后保留原行和 trace，不能删除失败任务再重新计算通过率。

## 缺失、重跑与排除

每种异常在实验前指定处理方式：

| 情况 | 推荐记录 | 禁止做法 |
| --- | --- | --- |
| Provider 5xx/runner 崩溃 | 保留原行，标 infrastructure，可按规则重跑 | 静默删除直到成功 |
| 超时或预算耗尽 | 作为任务结果或预注册失败类型 | 当成“没有数据”排除 |
| Schema/fixture 错误 | 阻止比较，修复后建立新版本 | 与旧单元混合 |
| 人工中止 | 保存原因、已用预算和是否产生副作用 | 猜测补成失败或成功 |
| 缺少某配置的 pair | 报 incomplete | 只保留候选更好的 pair |

敏感性分析可展示“基础设施重跑计入/不计入”两种结果，但主口径必须预注册。看到候选结果后再改变排除规则，会把分析自由度伪装成性能提升。

## 晋级条件与当前工具边界

正式晋级至少同时满足：矩阵完整、身份一致、证据达到目标、holdout 未用于调参、硬门槛通过、主指标达到最小改善、护栏未超预算，并且结论限定在目标工作负载。

当前 `scripts/summarize-evals.mjs` 的 `promotion_eligible` 只检查三项结构前置条件：

1. 没有缺失矩阵单元；
2. 每行 evidence 等于 study 的目标等级；
3. 没有 `safety_violation=true`。

它目前**没有执行** `study.promotion.min_pass_rate_delta` 和 `max_p90_cost_delta`，也没有计算 task-level 晋级指标。因此 `promotion_eligible=true` 仍不能单独证明候选达到完整采用标准；在 checker 扩展前，报告必须单独计算并人工复核阈值。这个字段更接近“具备进入决策的结构前提”。

当前 12 行样例因为缺 108 个单元、没有 holdout run，且 E1 低于目标 E3，正确输出是 `promotion_eligible=false`。即使 development 的 candidate 为 6/6，也不能晋级。

## 用当前样例验证

前置条件是 Node.js 22+，输入是已固定的 `evals/study.example.json` 与 `evals/runs.example.jsonl`，命令不联网、不调用真实模型：

```bash
npm run eval:validate
npm run eval:summary
```

预期 validator 报告 20 tasks、2 configs、3 repeats、120 个预期单元、12 个已观察单元和 108 个缺失单元。Summary 应显示 development 的两组 `k/n`、Wilson 区间、5/0/1 配对结果、`holdout: null`、`promotion_eligible: false`，阻断项含 `incomplete_matrix` 与 `evidence_below_target`。

任一数字不符时先停止，不要直接改期望输出。检查 study、run identity、repeat、split 和 fixture lineage；若为了练习修改样例，保存 diff，并只还原自己改动的文件。本命令只读取输入，无需额外清理。

这份输出是 E1 的 schema/分析样例，只证明统计管道能处理固定离线行，不能证明任何模型、provider 或 harness 配置质量。

## 检查题与下一步

报告是否同时给出样本单位、分子/分母、区间、配对计数、缺失和失败分布？一个候选在 20 个任务中赢 12、输 8，但出现一次未授权动作，应由哪个层级否决？继续阅读[Judge](/evaluation/judges)、[回归集](/evaluation/regression)和[报告纪律](/evaluation/reporting)。
