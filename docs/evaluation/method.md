# 评测方法与证据晋级

评测不是先跑几个案例再寻找好看的数字，而是从一个真实决策反向设计证据：要在什么任务上、以什么代价、规避什么风险，选择哪个配置。只有问题、样本、身份、指标、执行与报告形成闭环，结果才足以指导 harness 改动。

## 先区分四个问题

开始前写下一页以内的 study brief（研究摘要），回答：

1. **决策**：结果会决定采用、路由、回退，还是只决定继续调查？
2. **对象**：比较的是模型、harness、工具策略，还是一整个配置包？
3. **范围**：目标用户、workload（工作负载）、环境、风险和预算是什么？
4. **Estimand（目标量）**：真正想估计的是单次成功率、预算内成功率、任务级质量差异，还是单位成功的成本？

如果结果不会改变任何行动，这次运行更像演示或监控，不必包装成正式比较。如果同时改变模型、提示、工具和权限，可以评价“配置包 B 是否比 A 合适”，但不能把差异归因给其中某一个组件。

一个可检验假设应把边界和否决条件写进去：

```text
在锁定的 TypeScript 日常修改任务上，保持模型、工具与预算不变，
候选上下文策略相对工程基线的 task-level success 至少提高 5 个百分点，
且安全违规为 0、p90 成本增幅不超过 20%。
```

“候选更聪明”“效果更好”没有分析单位、门槛和适用范围，无法证伪。

## 从决策到报告的九步流程

| 阶段 | 冻结的对象 | 阶段出口 |
| --- | --- | --- |
| 1. 问题 | 决策、目标量、范围、证据目标 | 可证伪假设 |
| 2. 任务 | 抽样框、task、fixture、split | 任务清单与 hash |
| 3. 配置 | baseline、candidate、身份与预算 | 不可变 config |
| 4. 评分 | 主指标、硬护栏、rubric、门槛 | 评分协议 |
| 5. 预注册 | 重复、顺序、排除、重跑、停止规则 | 带时间/commit 的方案 |
| 6. Pilot | runner、检查器、任务歧义 | 可运行且不泄漏的设计 |
| 7. 正式运行 | 干净环境、随机顺序、原始记录 | 完整或明确中止的矩阵 |
| 8. 分析 | 分母、配对、区间、失败与敏感性 | 可复算 summary |
| 9. 决策 | 门槛、限制、回退 | adopt/reject/inconclusive |

### 1. 定义任务总体与抽样框

Population（目标总体）是希望结论适用的真实任务集合；sampling frame（抽样框）是这次实际上能抽到的任务来源。两者不相同就要公开差距。例如“团队近三个月 TypeScript 维护任务”不能只用六个手写语法修复题代表。

先按会改变系统行为的因素分层：workload、难度、工具类型、上下文长度、副作用风险、是否需要人工确认。每层说明来源和数量，不要因为某类任务难以自动评分就删掉它。生产频率高的任务影响平均体验，低频高损失任务则应成为独立安全护栏，不能被平均值稀释。

每个 task 至少包含：干净起点、给 agent 的输入、允许工具、预算、确定性验收、禁止动作、人工 rubric、fixture 版本、cleanup（清理）和停止条件。先用人工或简单实现验证题目可解，再确认测试名、文件名和错误信息没有泄漏答案。

任务分为 development（开发集）、holdout（留出集）和 incident regression（事故回归集）。开发集可用于诊断；holdout 只在候选和规则冻结后揭示；事故集用于防止已知失败复发。划分、污染和轮换规则见[回归集与持续评测](/evaluation/regression)。

### 2. 选择有意义的对照

至少保留两个基线：

- **默认基线**：目标用户拿到产品时的合理默认；
- **工程基线**：包含团队实际会维护的指令、验证和安全边界，但没有针对评测答案的隐藏技巧。

候选与基线使用同一任务起点、权限、预算口径和评分器。比较 harness 时可以保留它们真实的内建能力，但必须显式记录差异；若给一方额外工具，就不能把结果只归因于模型。

想解释因果时一次改变一个主要变量，或预先设计 factorial experiment（因子实验）估计交互。一次改变多项时把整体配置作为处理对象。Ablation（消融实验）是在候选中移除一个组件，检查收益是否仍存在；它适合解释机制，但不能用同一 holdout 反复挑组件。

### 3. 冻结身份与执行条件

Config 不能只是一个昵称。保存精确 model/provider/adapter、harness commit、API surface（接口形态）、采样和推理设置、system/project/task instruction hash、工具 schema、权限策略、MCP/extension 版本、依赖锁、操作系统或镜像 digest、仓库起点和 runner/Judge 版本。

模型 alias、远端工具和服务端路由可能漂移；无法固定时至少记录返回身份、区域和运行时间，并把它当成限制。身份字段变化就建立新 config version，不能把变化前后的 run 拼成同一配置。

预算也属于处理的一部分：`max_steps`、模型调用、timeout、token、费用、重试和人工轮次都要固定。允许 candidate 使用更高预算可以回答“更贵的整体方案是否值得”，却不能回答同预算下谁更有效。

### 4. 设计评分与门槛

评分顺序从硬到软：

1. 权限、安全和禁止动作；
2. 编译、测试、schema、引用等确定性断言；
3. 人工或 Judge rubric 的任务质量；
4. 人工接管、工具错误和恢复；
5. 延迟、token 与费用。

在运行前只选一个 primary outcome（主要结果），并定义分子、分母和分析单位。`single-run success`（单次成功）、`success within budget`（预算内成功）与 `best-of-k`（多次取最佳）代表不同体验，不能混在同一“成功率”列。重复 run 用于观察随机性，task 才是跨任务泛化的主要单位。

安全通常是零容忍硬门槛；质量与成本则定义最小有意义改善或不劣界限。阈值来自使用风险和机会成本，不应看到结果后再移动。可机器判断的事实不要交给主观 Judge；使用 Judge 时盲化配置和顺序，并用人工标注集校准，详见[Judge 与人工评分](/evaluation/judges)。

### 5. 预注册会改变结论的选择

Preregistration（预注册）不是发表论文专用，它是在看到正式结果前冻结分析自由度。至少记录：

```text
study/version/owner
hypothesis + evidence_target
task source + split + exclusions
configs + budgets + repeats
primary metric + safety/cost gates
run order + random seed + concurrency
infrastructure retry + flaky policy
stopping rules + missing-data treatment
analysis command + promotion rule
```

把方案提交到有时间和 commit 的版本历史。后续偏离时保留原方案，并在报告中列出 deviation（偏离）及原因；不要原地改写得像从未变更。探索性结果可以保留，但要与确认性主分析分开。

### 6. 先 Pilot，再冻结正式矩阵

Pilot（试运行）用于发现 runner 错误、任务歧义、超时不合理和指标不可计算。只使用开发任务或专门的试运行任务；不要为了调试基础设施提前查看正式 holdout。

试运行应验证：基线能否运行，正负断言是否真的会通过/失败，清理能否恢复起点，计时和费用是否覆盖所有组件，失败分类是否互斥，输出是否能脱敏。修订后的 task/fixture/config 产生新版本。Pilot run 单独标记，不能混进正式矩阵。

样本量由想分辨的最小差异、任务方差、风险和预算共同决定。仓库的“至少 20 个任务、每配置每任务 3 次、holdout 至少 20% 且不少于 5 题”是学习模板下限，不是所有研究的通用充分条件。高风险或高方差场景需要更多任务和重复；预算不足时缩小结论范围，不要夸大精度。

### 7. 配对、随机化并隔离运行

同一 task 在各配置下都运行，形成 paired design（配对设计），以减少任务难度差异。将 task/config/repeat 顺序按预注册 seed 随机交错或分块，避免某个配置总在缓存热、服务低负载或特定时段运行。

每个 run 使用干净 worktree、容器或等价快照，不共享候选可见的对话、记忆和产物。若缓存是目标产品体验的一部分就统一预热和计量；若不是，就清空或为各配置对称处理。并发量、rate limit、网络策略和区域保持一致。

运行时先校验 task/config/fixture 身份，再执行，再保存 run、trace、result 和退出码。不要等全部结束才发现前半矩阵用了旧指令 hash。真实 API、费用和外部副作用按本仓库规范另行授权；离线成功不会自动授权 live run。

### 8. 预先处理失败与停止

Provider 5xx、runner 崩溃等基础设施失败可以按预注册上限重跑，但原尝试和关联关系必须保留。产品失败、安全拒绝和预算耗尽属于结果，不能看到后改叫“环境问题”。重复 cell、未知 task、split 泄漏、身份漂移和坏 hash 使数据无效，应停止而不是继续聚合。

以下情况立即停止本轮：安全违规或未授权副作用；凭据/个人数据泄漏；费用越界；holdout 提前揭示；模型或环境身份无法确认；fixture 不可恢复。停止后的结果仍保存并报告，不能用一次干净重跑覆盖事件。

### 9. 按预注册顺序分析

先检查矩阵覆盖、数据谱系和硬护栏，再计算主要结果；无效数据不能靠统计方法修复。Development 与 holdout 分开，baseline 与 candidate 按 task 配对。报告分子/分母、点估计、区间、win/loss/tie、失败类型、workload 切片和资源分布。

主分析之后再做 sensitivity analysis（敏感性分析），例如将基础设施重跑按失败计入、移除歧义 task、改变成本权重，观察结论是否翻转。它用于暴露脆弱性，不用于挑一个最有利口径。完整报告要求见[评测报告与公开结果](/evaluation/reporting)。

最终逐项对照门槛：安全、质量、成本、可恢复性分别写 `pass/fail/not evaluated`。结果只能是 `adopt`、`reject` 或 `inconclusive`；证据不足不是候选通过。

## E0–E3 到底增加了什么

证据等级描述项目实验，不描述来源权威性。官方文档核验为 `verified` 只能说明产品事实有来源，不能把尚未运行的配置从 E0 升成 E1。

| 等级 | 必须实际具备 | 可以支持 | 仍不能支持 |
| --- | --- | --- | --- |
| E0 | 没有仓库实验记录；来源状态另行登记 | 问题定义、设计讨论和待运行方案 | 可用性、效果或推荐 |
| E1 | 固定 fake/replay、版本化输入、断言和结果 | runner/schema/门禁在固定样例可复现 | live 模型质量、真实 provider 兼容 |
| E2 | 锁定真实 model/provider/adapter/harness 的有限探针 | 该版本、环境和窄场景下有限可用 | 广泛最优、正式相对提升 |
| E3 | 预注册、足够任务与重复、未见 holdout、安全/成本门槛和完整报告 | 限定 workload 内的采用或比较决定 | 跨任务、跨版本的通用排名 |

等级不会因为命令退出码为 0 自动上升。E1 升 E2 需要真正替换离线 seam 并保存 live 身份和结果；E2 升 E3 需要新的研究设计、任务覆盖和未见数据，不是多跑几次同一案例。每个结论使用满足其范围的最低充分证据，并公开不能证明的部分。

## 在本项目复核研究接口

### 前置条件与输入

要求 Node.js 22+、依赖已按 `package-lock.json` 安装，并从仓库根目录执行。`evals/study.example.json` 定义任务、配置、重复、split 与晋级门槛；`tasks.example.jsonl` 和 `fixture-refs.example.json` 固定六个 E1 fixture 的历史谱系；`runs.example.jsonl` 是 12 行离线分析样例。命令不调用真实模型、网络或付费 API。

### 命令

```powershell
npm run eval:validate
npm run eval:summary
```

### 预期输出与断言

Validator 应报告 20 tasks、6 workloads、2 configs、3 repeats、6 个 holdout，因此正式矩阵是 120 个 cell；当前只有 12 个唯一 development cell，缺 108 个，`sample_matrix_complete=false`。Summary 应给出：

- `evidence=E1`，且 warning 明确禁止模型排名；
- `promotion_eligible=false`；
- blockers 为 `incomplete_matrix` 与 `evidence_below_target`；
- 两个配置的 `by_split.holdout=null`；
- 六个完整 development 配对是 5 win、0 loss、1 tie。

最后一项只是检验配对汇总逻辑，不能抵消无 holdout、矩阵不完整和证据不足。结构前置条件满足后，summary 会在完整 holdout 上执行 run-level 通过率绝对增量和每次运行 P90 费用绝对增量阈值；它尚未计算 task-level 聚合或不确定性区间，因此即使将来为 `true`，仍需按预注册规则人工复核完整采用条件。

### 失败、停止、清理与回退

若出现 duplicate run/cell、identity drift、split mismatch、fixture ref 无法解析或 hash 不一致，停止分析并修复输入生产路径；不要直接编辑坏 run 让门禁通过。若意外出现未授权 holdout 结果，按泄漏处理并更换未见任务。

命令只读版本化输入并向终端输出，不产生需清理的实验文件。误改 `evals/` 时先用 `git diff -- evals/` 精确定位，只恢复自己本轮修改；不要整库重置或覆盖他人工作。正式研究应把原始失败和旧版本保留为不可变 artifact，候选否决时继续使用上一锁定 baseline。

## 当前示例的设计缺口

示例 `study.json` 足以演示矩阵、split 和三个晋级字段，但尚未表达抽样理由、预注册时间、随机 seed、运行顺序、排除/重跑/停止规则、环境身份、Judge 版本和回退操作。正式 E3 不能因为 schema 没有这些字段就省略；应扩展版本化 study schema 或用关联的 protocol manifest 保存，并让报告引用其 hash。

继续阅读[Task、Run、Trace 与 Result Schema](/evaluation/task-schema)、[指标与区间](/evaluation/metrics)、[Judge](/evaluation/judges)、[回归集](/evaluation/regression)和[报告纪律](/evaluation/reporting)。

## 检查题

1. 同时更换模型、工具和提示后，结果能归因给模型吗？
2. 为什么 3 次同一 task 的 run 不能代替 3 个不同 task？
3. Pilot 发现任务歧义并修改 fixture 后，旧 run 应如何处理？
4. 官方文档已核验为什么不能把未运行方案标成 E1？
5. Summary 的结构门槛通过后，还缺哪些采用证据？
