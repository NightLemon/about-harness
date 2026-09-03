# 指标、区间与效应量

指标的作用是把“哪个配置更适合这个工作负载”变成可证伪判断。一个百分比没有说明样本单位、缺失数据、风险和成本时，往往比没有数字更容易误导。

## 学习目标

完成本页后，你应该能够：

- 为一个指标写清目标量、样本单位、分子、分母、聚合与缺失规则；
- 区分 run、task、pair、workload 和 attempt，避免把重复运行当独立样本；
- 为二元结果选择区间，并用配对差异而不是两组孤立均值比较配置；
- 正确解释 P50/P90、timeout、未知 usage 和单位成功成本；
- 识别选择性缺失、多重比较、权重变化和 evaluator 漂移；
- 把结果落到 `adopt/reject/inconclusive`，同时保留证据等级与适用范围。

## 先写测量契约

在运行候选前，把指标分为四层：

| 层级 | 作用 | 示例 | 决策方式 |
| --- | --- | --- | --- |
| Hard gate（硬门槛） | 阻止不可接受后果 | 未授权动作、泄密、破坏性写入 | 任一触发即否决 |
| Primary metric（主指标） | 回答本次优化是否有效 | task-level 成功、规则得分 | 预注册最小改善 |
| Guardrail（护栏指标） | 防止用代价换表面提升 | P90 延迟、费用、人工介入 | 不得超过预算/退化阈值 |
| Diagnostic（诊断指标） | 解释为何变化 | tool error、失败类型、重试 | 不单独决定晋级 |

安全违规、禁止动作与确定性验收优先于平均质量。一个配置只要扩大危险权限，即使成功率更高也不能晋级。反过来，安全门槛通过只表示“没有观察到门槛事件”，不证明系统普遍安全。

### 一份完整的指标契约

Estimand（目标量）是希望从目标总体估计的量；metric（指标）是怎样从实际记录计算它。两者不一定相同：目标量可以是“日常 TypeScript 维护任务在预算内成功的概率”，实际样本却只有六个手写 fixture。公式算对也不能填补这段代表性差距。

每个用于决策的指标至少冻结：

```text
name / version
decision and estimand
target population + sampling frame
analysis unit + eligibility
numerator / denominator / direction
repeat-to-task aggregation
missing / retry / timeout / invalid handling
workload weights + split
interval / uncertainty method + seed
minimum meaningful effect + guardrail
owner / evaluator version / rollback rule
```

例如不要只写 `success_rate`，而要写“holdout 中满足所有确定性断言、无安全违规且在 task budget 内达到 2/3 repeats 成功的不同 task 数，除以该 holdout 全部有效 task 数；fixture/schema 错误阻断研究，timeout 计失败，基础设施重试保留原 attempt 并按预注册规则选最终 run”。

指标名和公式也要版本化。改变 timeout 是否计失败、task 的 2/3 聚合规则或 workload 权重，就已经改变测量契约，不能沿用同一趋势线。

### 不要用一条总分吞掉约束

把成功、费用、延迟、安全和人工接管加权为一个 composite score（复合分数）看似方便，却会隐藏补偿关系：一次未授权写入可能被低费用“抵消”，大量失败也可能因单次延迟短而得高分。

更清晰的顺序是：

```text
数据/身份有效
→ hard gate 全部通过
→ primary metric 达到效果门槛
→ latency/cost/human 等 guardrail 不退化
→ diagnostic metrics 解释变化与残余风险
```

确实需要复合分数时，权重、标准化、缺失规则和不可补偿项必须在看结果前冻结，并同时公开原始分量。复合分数只服务特定决策，不应包装成通用模型排名。

## 样本单位决定问题含义

Task（任务）通常是主要独立样本；同一任务的多次 run 是对随机性和运行可靠性的重复观察，不能当作许多全新任务。

- **Run-level 成功率**：成功 run / 有效 run，回答“一次尝试成功的概率如何”；
- **Task-level 成功率**：达到预注册任务聚合规则的 task / 不同 task，回答“覆盖了多少问题”；
- **Workload-level 结果**：按 coding、browser 等任务族分层，防止一个大类掩盖另一个小类；
- **Pair-level 差异**：同一 task、repeat 下候选与 baseline 的直接对照，减少任务难度差异。

Task-level 聚合必须提前定义，例如“3 次中至少 2 次通过”或“3 次全部通过”。`npm run eval:summary` 当前输出的是 run-level `pass_rate` 和 `distinct_tasks`，并没有计算 task-level 成功率；报告不能仅凭这两个字段拼出未预注册的 task-level 结论。

### 数据通常是嵌套的

一次研究常见层级是：

```text
workload
  └─ task
      └─ config × repeat
          └─ infrastructure attempt
```

同一 task 的 repeat 共享输入、验收和难度，相关性通常高于不同 task；同一次 repeat 的基础设施 attempt 更不是新任务。把 20 个 task × 3 repeats 写成 `n=60` 的独立任务，会让区间过窄。主要结论以 task 为抽样单位时，区间或 bootstrap 也应在 task 层重采样，并把该 task 下的配对配置和 repeats 一起带走。

Repeat 聚合规则代表不同产品体验：

| 聚合 | 回答的问题 | 必须同时记录 |
| --- | --- | --- |
| 任一次成功 | 允许 best-of-k 时最终能否完成 | 全部 k 次费用、延迟与失败 |
| 多数成功 | 常规运行是否较稳定 | k、阈值和每次结果 |
| 全部成功 | 是否要求高重复可靠性 | 任一失败类型与成本 |
| 首次成功 | 默认单次体验如何 | 后续重试不能回填首轮 |

选择“任一次成功”不能只保留最好的一次；它测的是带重试策略的整体系统。若线上只允许一次运行，离线 best-of-5 不对应目标体验。

## 先验证矩阵完整性

预期矩阵大小是：

```text
任务数 × 配置数 × 每任务重复数
```

每个单元由 `(task_id, config_id, repeat)` 唯一标识。缺一行不是自动失败，也不是自动成功；它是缺失单元，必须按预注册规则分类。当前模板为 `20 × 2 × 3 = 120` 个单元，样例只有 12 行，因此缺少 108 个单元。

同时报告 scheduled、started、completed、valid 和 analyzed 数量，才能看出结果在哪一层消失。重复 run ID、同单元重复占位、配置身份漂移或 split 不匹配应先拒绝，不能进入统计。

### 分母账本与流失

为每个 config/split 保存一条 denominator ledger（分母账本）：

```text
scheduled
├─ not_started: quota / cancellation / setup
└─ started
   ├─ no_terminal_result: crash / lost worker
   └─ terminal
      ├─ invalid: identity / schema / fixture
      └─ valid
         ├─ unpaired: counterpart missing
         └─ paired_and_analyzed
```

每一层都应满足“父计数 = 子计数之和”，并按配置和 workload 报原因。只报告 analyzed 分母会隐藏 attrition（样本流失）。若最难任务更容易 timeout 或丢失，缺失不是随机的；删掉它们会系统性抬高成功率。

`invalid` 不能随意当失败，因为坏 fixture 可能与候选无关；也不能随意删除后继续晋级，因为它削弱覆盖并可能不对称。身份、schema 或 fixture 不一致通常先阻断比较，修复生产路径后建立新研究版本。

## 二元结果与区间

成功率应同时给出 `k/n`、点估计和 Wilson interval（威尔逊区间）。区间表达有限样本下的估计不确定性，不是“真实值有 95% 概率位于这里”的后验概率。

当前 E1 样例中：

| 配置 | 成功 | Run-level 成功率 | Wilson 95% |
| --- | ---: | ---: | --- |
| `offline-default` | 1/6 | 0.1667 | [0.0301, 0.5635] |
| `offline-engineering` | 6/6 | 1.0000 | [0.6097, 1.0000] |

“6/6”的点估计是 100%，但区间下界约为 61%；正确表述是“这 6 个离线样例全部通过，样本仍小”，而不是“真实成功率为 100%”。样本扩大时要增加不同任务，而不是只在一个容易任务上重复更多次。

若任务得分是连续值，还应报告分布、差值和异常点；把任意阈值后的 pass/fail 作为唯一指标会丢失接近门槛的信息。

### 区间要匹配目标量与设计

Wilson 区间适合描述一组二元观察的单个比例；比较两配置的差异时，不应简单把两个 Wilson 端点相减。配对设计应直接对每个 task 的差值建区间，或使用与配对二元数据相符的方法。

Bootstrap（自助重采样）可以对复杂的 task-level 聚合或中位差建立经验区间：按 task 有放回抽样，每次带走该 task 的全部 config/repeat，再重算目标量。保存随机 seed、重采样次数、实现版本和失败规则。Bootstrap 不会修复样本偏置，也不会让六个 task 变成充分证据；样本极小时应同时展示原始 task 结果。

置信水平不是越高越“科学”。95% 是常见约定，不是所有风险的默认答案；关键安全决策可能需要更强证据，探索性诊断则可重点展示分布。无论选择什么水平，都应在运行前确定，并用同一口径比较候选。

## 配对比较优先

同一任务和 repeat 下比较 baseline 与 candidate：

- win：candidate 通过、baseline 失败；
- loss：candidate 失败、baseline 通过；
- tie：两者状态相同；
- incomplete：缺少任一配置，不能计入完整 pair。

当前样例得到 5 win、0 loss、1 tie，共 6 个完整 development pair。这个结果只描述固定离线样例的相对状态，不能消除矩阵不完整、无 holdout 和 E1 证据边界。

配对报告至少给出 win/loss/tie 原始计数、完整 pair 数和缺失 pair 数。只报“胜率”会隐藏大量 tie 或缺失；只比较两个配置各自的总体均值，会把任务构成差异误当配置效果。

二元 pair 可以写成四格表：

| Baseline | Candidate | 分类 | 对差异的贡献 |
| --- | --- | --- | --- |
| pass | pass | both pass / tie | 0 |
| fail | pass | win | +1 |
| pass | fail | loss | -1 |
| fail | fail | both fail / tie | 0 |

真正区分两配置的是 discordant pairs（不一致配对），即 win 和 loss。McNemar exact test（McNemar 精确检验）在小样本下可把 `wins` 与 `losses` 视为不一致 pair 内的二项结果；它仍只回答特定零假设下数据是否意外，不表示效果足够大或任务有代表性。

当前样例 5 win、0 loss，只有 5 个不一致 pair。若做双侧精确检验，结果为 `2 × (1/2)^5 = 0.0625`；即使表面是 5:0，小样本也没有提供精确结论。更重要的是样例矩阵缺失、没有 holdout 且只有 E1，不能因一个 p-value 靠近某条习惯阈值就晋级。

Pair 的键必须在运行前定义。若同一 task/config 的 repeat 顺序不对齐，应按固定 seed、attempt lineage 或 task-level 聚合配对，不能事后挑最有利的 run 相互匹配。

## 效应量而不只是显著性

Effect size（效应量）描述差异有多大。二元主指标可报告成功率绝对差；连续指标可报告每个配对单元的绝对差、相对差、中位数和分位数。阈值要与业务意义绑定，例如“成功率至少提高 5 个百分点，同时 P90 延迟不增加超过预算”。

统计检验回答“在某些假设下，这种数据有多意外”，不回答差异是否值得成本，也不修复偏置任务、holdout 泄漏或配置漂移。小样本下应把原始配对和区间放在 p-value 前面。

### 选择可解释的效应

对于二元结果，优先报告 absolute risk difference（绝对成功率差，百分点）。Relative risk（相对成功率比）可以补充，但 baseline 接近 0 时会很不稳定；odds ratio（优势比）也不等于成功率倍数。所有效应都带原始 `k/n`、配对计数与区间。

连续或有序 rubric 分数先展示每个 task 的 candidate-baseline 差值，再报告中位差、分位数和有边界的均值。若 1–4 分只是等级锚点，相邻档位未必等距，不应给“提高 0.37 分”过多小数精度。一个总分上升还要检查是多数任务小幅改善，还是少数异常值拉动。

阈值应表达 minimum meaningful effect（最小有意义效果）。例如绝对成功率至少 `+5` 个百分点，不是“任何正数都算赢”。若目标是保质量降成本，可以预注册 non-inferiority margin（不劣界限），要求质量差的区间下界不低于 `-δ`，同时成本护栏改善；界限必须来自实际损失，而不是为了让当前候选通过。

### Workload 权重决定总体结论

同一组分层结果可以有不同总体答案：

- **Micro average（微平均）**：每个 task 等权，任务多的 workload 权重大；
- **Macro average（宏平均）**：每个 workload 等权，小类与大类影响相同；
- **Target-weighted（目标分布加权）**：按预先估计的真实任务频率或风险权重。

三种口径回答不同问题。固定任务集合的 micro 结果不能自动代表生产频率；macro 也可能过度放大稀有小类。研究前冻结主要权重，并同时报告各层原始分母。若不同配置的有效样本构成不同，聚合值甚至可能出现 Simpson's paradox（辛普森悖论）：各层方向一致或接近，整体方向却因权重变化而反转。

高损失低频 workload 通常作为独立 hard gate，而不是靠很小频率权重并入平均。这样能避免“常见简单任务的收益”稀释一次严重违规。

### 多个切片不是多个晋级机会

同时尝试许多主指标、阈值、prompt、模型和切片，再只报告最好一个，会增加偶然发现。正式研究只设一个 primary metric 和有限的预注册关键次指标；其余标为 exploratory（探索性），用于提出下一轮假设。

需要对多个确认性假设控制错误率时，预先选择校正或分层决策策略，并说明假设族。不要看到结果后才决定哪些比较算“主要”。即使经过统计校正，任务污染、错误 Judge 和身份漂移仍是设计问题，不会被数学消除。

## 延迟、成本与资源

延迟至少分解 model、tool、approval、queue、validation 与 end-to-end；报告 P50/P90 和样本量。P90 在样本很少时由一两个点决定，应展示原始值或经验分布，不要给出虚假精度。

端到端 wall-clock latency（墙钟延迟）不能由并行分支耗时简单相加；总费用却通常要累加所有分支。报告 quantile method（分位数算法）和单位，因为小样本下不同插值定义会得到不同 P90。不要写毫秒级小数，而底层计时器只有秒级精度。

Timeout 不能从延迟分布删除。到达 60 秒上限只知道真实完成时间大于等于 60 秒，这叫 right censoring（右删失）；若产品在 timeout 即终止，则它同时是明确的产品失败。至少并列报告完成者延迟、timeout `k/n`、上限和端到端成功范围。只对成功 run 计算 P90 会让更常超时的配置看起来更快。

冷启动、缓存命中、排队和人工等待要按研究目标决定是否包含。若这些属于用户真实体验就纳入端到端指标；若只诊断模型/工具层，也要另报剔除口径和缓存状态，不能把诊断延迟冒充体验延迟。

费用同时报告：

- 总费用与总 token，回答预算消耗；
- 每 run、每 task 与每成功任务费用，回答效率；
- 缓存命中和免费额度是否计入，回答可比性；
- 未知 usage 数量，回答数据完整性。

E1 的 `cost_usd=0` 表示没有真实调用，不等于模型免费。E2/E3 必须使用 provider/harness 的可审计 usage；采集缺失要写 `unknown` 或独立状态，不能猜测填零。baseline 成本为零时，相对百分比变化没有定义，应使用绝对差或明确的零基线规则。

Token 也不是跨模型的通用工作量单位。比较时固定 tokenizer/计费口径和 surface；跨 provider 报告各自 token 与实际费用，不把数字直接相加成“推理量”。

单位成功成本的分子应包含失败 run、重试、fallback、Judge、工具 API 和人工成本：

```text
cost_per_success = 同一分析范围内全部尝试的总成本 / 成功 task 数
```

成功数为 0 时结果是 undefined（无定义），不是 0，也不应显示为无限后再参与平均。若 candidate 比 baseline 多完成任务，可以补充 incremental cost per additional success（每增加一个成功的增量成本）：

```text
(candidate total cost - baseline total cost)
/
(candidate successful tasks - baseline successful tasks)
```

只有在任务、预算和成本覆盖范围一致且成功差为正时，这个比值才有解释；它不能替代安全、质量和绝对预算护栏。成本为负且成功更多时可以说 candidate 在该样本内占优，仍不能外推到未测工作负载。

Provider 账单、Harness 采集和估算器可能不一致。保存 billed、measured、estimated 与 unknown 状态及计价版本；价格变化后历史实际费用不应按新价格静默改写。若希望回答“按今天价格会怎样”，生成明确标记的重估视图并保留原账单事实。

## 安全指标需要暴露分母

报告 `safety_violations=0` 时，还要说明运行了多少安全任务、触发了多少危险机会、policy 拒绝了多少动作，以及是否存在未分类或缺失 trace。没有执行安全负例的 0，与执行 100 次均正确拒绝的 0，证据完全不同。

`failure_type="safety"` 与 `safety_violation=true` 也不是同一字段：前者可表示安全相关任务没有满足验收，后者表示观察到违规行为。报告应同时保留任务结果和实际违规，不能从名称互相推断。

高风险事件通常采用零容忍硬门槛，但“本次零事件”仍要以观察范围为边界。发现违规后保留原行和 trace，不能删除失败任务再重新计算通过率。

安全分母最好分为 task、opportunity（危险机会）、proposed action 和 executed action。一个 task 可能没有触发任何危险机会；policy 正确拒绝十个提议也与“模型从未提议”不同。至少同时报告：

```text
safety tasks exercised
dangerous opportunities present
unsafe actions proposed
policy denials / approvals
unsafe actions executed
unclassified or missing traces
```

这样才能区分模型行为、policy 效果和实际后果。拒绝率高不一定更安全，也可能是权限定义过宽导致正常任务无法完成；安全与可用性要分别测，安全 hard gate 不能被可用性平均值抵消。

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

### 用边界分析暴露缺失风险

当少量 cell 缺失但协议允许继续做诊断时，先给 best/worst-case bounds（最好/最坏边界）：把所有缺失 candidate 依次视为成功或失败，把 baseline 同理处理，观察结论是否仍越过门槛。若任何合理处理都会改变决定，结果应是 `inconclusive`，而不是挑一个有利填充值。

Sensitivity analysis（敏感性分析）还可以比较：基础设施首次尝试 vs 最终有效尝试、timeout 计失败 vs 单独列出、macro vs target weight、有无异常 task。主分析保持冻结，其他口径说明结论对假设的依赖。敏感性结果不能替换不理想的主结果。

缺失由安全中止、身份漂移或 holdout 污染造成时，不应靠数值边界继续晋级；这些是研究有效性阻断项。边界分析只帮助解释不确定性，不会恢复丢失的谱系。

## 晋级条件与当前工具边界

正式晋级至少同时满足：矩阵完整、身份一致、证据达到目标、holdout 未用于调参、硬门槛通过、主指标达到最小改善、护栏未超预算，并且结论限定在目标工作负载。

当前 `scripts/summarize-evals.mjs` 的 `promotion_eligible` 只检查三项结构前置条件：

1. 没有缺失矩阵单元；
2. 每行 evidence 等于 study 的目标等级；
3. 没有 `safety_violation=true`。

它目前**没有执行** `study.promotion.min_pass_rate_delta` 和 `max_p90_cost_delta`，也没有计算 task-level 晋级指标。因此 `promotion_eligible=true` 仍不能单独证明候选达到完整采用标准；在 checker 扩展前，报告必须单独计算并人工复核阈值。这个字段更接近“具备进入决策的结构前提”。

当前 12 行样例因为缺 108 个单元、没有 holdout run，且 E1 低于目标 E3，正确输出是 `promotion_eligible=false`。即使 development 的 candidate 为 6/6，也不能晋级。

### 把区间映射为三种决定

预注册 `adopt/reject/inconclusive` 比强迫每轮选赢家更诚实。示例逻辑为：

1. 数据/身份无效、holdout 污染或任一 hard gate 失败：`reject`，先修有效性或安全问题；
2. 主效应区间下界达到最小改善，且所有 guardrail 区间未越界：可进入 `adopt` 的业务复核；
3. 主效应区间整体低于否决界限，或资源退化明确越界：`reject`；
4. 区间跨越采用/否决边界、样本不足或关键分层证据缺失：`inconclusive`，增加有代表性的 task 或缩小结论。

这里的“进入 adopt 复核”不是自动发布。还要确认回退、责任人、证据等级和真实环境边界。点估计刚好超过门槛但区间很宽，应视为证据不足；`inconclusive` 也不是失败，可以阻止团队把噪声变成默认配置。

Evaluator 本身变化会改变结论。聚合器、Wilson/quantile 实现、Judge、失败分类、费用转换或 redaction 规则更新后，用固定 golden rows 和负例重放，生成新 evaluator version。旧 summary 能否复算、新旧差异来自何处，都应进入报告。

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
