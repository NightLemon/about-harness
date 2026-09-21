# 评测、可观测性与基准的连接

评测回答“这个配置在指定任务上是否值得采用”，可观测性回答“这一次运行到底发生了什么”。两者都需要 trace（轨迹），却不能互相替代：完整的 trace 不证明业务结果正确；一条通过的业务断言也不能解释成本、失败位置或安全控制是否真的执行。

本页把观测、业务验收和公开基准放进同一条证据链。它不提供模型排名，也不把基准分数当作本项目的模型质量证据。

## 先固定三种观察对象

一次 agent 运行至少有三种不同的事实：

1. **运行事实**：模型调用、工具调用、重试、拒绝、耗时和资源消耗是否发生；
2. **业务事实**：结果是否满足 Task 的 acceptance（验收条件），外部状态是否真的改变或保持不变；
3. **研究事实**：该配置在一组冻结 Task 上的分子、分母、区间和边界是什么。

把三者塞进一个 `success=true` 会制造错误归因。例如，工具 span 成功只能说明 handler 返回；它既不证明补丁通过项目测试，也不证明远端写入已经对账。相反，业务验收通过也可能掩盖一次不必要的高成本重试或 policy 绕过尝试。

## 用 OpenTelemetry 组织运行事实

OpenTelemetry GenAI Semantic Conventions（OpenTelemetry 生成式 AI 语义约定）覆盖 GenAI client、MCP、provider 的 span、metric 和 event 三类信号。[FACT:otel-genai] 它是跨实现对齐字段语义的参考，不是“接入后自动安全或自动正确”的保证。

一个实用的层级是：

```text
run span
├─ context-build span
├─ model-call span
│  ├─ retry event / resample event
│  └─ proposed-action event
├─ tool-call span
│  ├─ policy-decision event
│  └─ external-receipt event
└─ validator span
   └─ acceptance-result event
```

**Span（跨度）** 适合有开始、结束和父子关系的工作单元，例如一次模型或工具调用。它保存关联身份和结果边界；其中 `run_id` 和 Task hash 通常是高基数，应留在 trace/span 或 artifact 的关联字段：`run_id`、Task/config hash、工具名、规范化目标类别、状态、停止原因、耗时与受控的用量字段。**Event（事件）** 适合瞬时且可能重复的事实，例如 policy 拒绝、重试理由、checkpoint、外部 receipt 已对账。**Metric（指标）** 是从大量 trace 聚合的分布或计数，例如按 workload 的成功率、P90 延迟、拒绝率和单位成功成本。

不要把完整 prompt、原始工具结果、Secret、个人数据、动态 URL 或完整文件路径塞进 span attribute。Metric label（指标标签）宜选工具类别、状态、workload 等受控低基数维度，避免用每次都不同的 run ID、Task hash 或 URL 产生海量时间序列。Trace 中的高基数关联身份则有诊断价值，仍需遵守最小化和访问控制。需要复核时保存脱敏 artifact reference、hash 和最小片段，并把访问控制留在 artifact store，而不是把内容复制进遥测后端。

## 采样不是丢掉责任

全量保留所有调试细节通常代价高，也可能违反最小化原则。采样策略必须先写清目的：

- 计数和安全拒绝事件可保留聚合总量；
- 失败、unknown outcome、权限拒绝和高风险写入保留可追溯样本；
- 成功 trace 按 workload、风险和成本分层抽样，避免只留下廉价短任务；
- 对任何被抽样的 trace，记录 sampler 版本、决策和保留期限。

反例是只抽取“慢请求”再报告平均工具错误率：慢请求成了分母，指标已经不能代表全部运行。更危险的是在发现泄漏后先清空证据；正确顺序是先隔离访问、保全脱敏关联信息，再按保留和删除流程处理原始副本。

## 验收要回到业务对象

Validator（验收器）应针对 Task 的业务结果运行，而不是读模型的完成声明。代码任务可验证冻结测试、diff 与禁止路径；研究任务可验证 claim/evidence ledger；写入任务还需目标系统 receipt 或查询回执。把 validator 的版本、输入 artifact、断言和结果作为独立 span 或 event 记录，才能回答“模型提议成功”和“业务真的通过”之间差了什么。

若外部结果未知，`validator=not_run` 或 `acceptance=unknown` 比伪造失败或成功更诚实。此时 trace 的价值是指向对账所需的幂等键、目标和时间窗；它不能替代对目标系统的查询。

## 公开基准先看测量单位

公开基准是外部工作负载的一种，不是通用智力刻度。它们的 Task、环境、评分器、版本、agent harness 和预算不同，分数只能在同一协议内比较。

| 基准族 | 主要测量单位 | 可观察结果 | 不能直接推出 |
| --- | --- | --- | --- |
| SWE-bench | 固定代码仓库 issue 实例 | 在冻结环境中是否得到测试认可的修复 | 你的语言、仓库流程或生产发布质量 [FACT:swe-bench] |
| Terminal-Bench | 隔离终端环境中的任务 | 是否完成该终端任务及其规定检查 | IDE 体验、真实权限链或业务验收 [FACT:terminal-bench] |
| GAIA | 需要推理、工具和多模态处理的问题实例 | 任务答案是否满足其评测规则 | 长期自主运行或企业系统安全 [FACT:gaia-benchmark] |
| τ-bench | 工具交互的任务与策略约束 | 在该版本环境中是否完成交互并遵守规则 | 当前 τ³ 任务的结果；旧任务不可默认为当前基线 [FACT:tau-benchmark] |
| τ³-bench | 当前 τ³ 定义的任务环境 | 当前版本的交互任务结果 | 与其他版本、其他工具权限或真实客服业务等价 [FACT:tau3-benchmark] |

SWE-bench 官方站点本身区分多个变体，并允许按 agent 环境筛选结果；这已经说明分数依赖评测表面。[FACT:swe-bench] Terminal-Bench 站点将自己描述为衡量 agent work 的 benchmark，页面显示的版本和榜单会变化。[FACT:terminal-bench] GAIA 的原始数据卡在本轮无法以原始地址读取，因此本页只依据作者论文说明其问题设定，不把数据集页面状态写成已核验事实。[FACT:gaia-benchmark]

τ-bench 的维护 README 已警告旧任务不应被当作当前评测入口；本页把当前工作另列为 τ³，而不混用旧结果。[FACT:tau-benchmark] [FACT:tau3-benchmark] 这些来源事实均只说明基准及其维护边界，证据等级仍是 E0；本仓库没有运行它们。

## 把外部基准接回自己的工作负载

先问一个反事实：删除这个基准，团队会漏掉哪种真实失败？若答案是“不会”，它不应成为采用门槛。若会，例如你的产品确实要在隔离 shell 中完成可验证操作，就把基准 Task 映射为项目 Task contract：环境镜像、允许工具、预算、风险、validator、清理、失败分类和 artifact identity 都要落到自己的 schema。

最小报告同时给出基准层与业务层：基准名/版本/commit、任务筛选、agent/model/provider/harness 身份、预算、每 Task 的结果、缺失/重跑、成本和本地 acceptance。不要从一个公开百分比延伸到“模型更适合所有工作”，也不要把基准成功当作真实 API、权限、隐私或部署证据。

## 一次离线练习

在[生态系统工作坊](/practice/ecosystem-workshop)中，为一个已存在的离线 fixture 写出 `run → model → tool → validator` 的 span/event/metric 映射，再补一条业务 acceptance 和一条隐私排除规则。练习只检查设计是否可追溯，属于 E0；不要把字段清单或离线 replay 当作任何基准成绩。

下一步将观测字段接回[可观测性](/foundations/observability)、[指标与区间](/evaluation/metrics)、[任务 Schema](/evaluation/task-schema)和[评测报告](/evaluation/reporting)。
