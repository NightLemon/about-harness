# 实验方法

Agent optimization experiment（Agent 优化实验）是用受控干预回答一个工程决策：某项上下文、工具、推理、记忆或编排改动，是否在目标工作负载上带来值得保留的净收益。它不是“改完跑一次看起来不错”，也不等同于一次完整 E3 评测研究。

本页聚焦日常调优循环：如何从失败证据提出机制假设、设计最小候选、快速否决、记录结果并决定下一步。正式的抽样、预注册、统计区间和证据晋级见[评测方法与证据晋级](/evaluation/method)。

## 优化实验从决策开始

先写如果结果不同，你会采取什么动作：

```text
若候选在固定 debugging tasks 上减少无效工具调用，
同时任务成功不下降、安全违规为 0、P90 不超预算，
则将它加入工程基线；否则保留原配置并记录失败机制。
```

“试试更长 prompt”“比较几个模型”只是活动，不是决策。没有采用、回退、路由或继续调查的分支，就很容易看见任何改善都宣布成功。

把研究问题压缩成五项：

| 项 | 要明确什么 | 示例 |
| --- | --- | --- |
| Workload（工作负载） | 结论只适用于哪些任务 | TypeScript 日常调试，不含架构迁移 |
| Baseline（基线） | 当前真正会使用的配置 | 工程基线 commit/config hash |
| Intervention（干预） | 唯一主要变化 | 合并两个重叠的搜索工具 |
| Outcome（结果） | 主要改善与硬护栏 | 无效调用下降；成功不退化；安全为 0 |
| Decision rule（决策规则） | adopt/reject/inconclusive 的阈值 | 区间、成本上限、停止条件 |

## 从症状到可证伪的机制假设

先保存失败 trace，再区分 symptom（症状）、mechanism（机制）和 intervention：

```text
症状：模型连续三次选择了错误的代码搜索工具。
机制假设：三个工具的名称、数据域和返回格式重叠，选择不可辨识。
干预：合并其中两个工具；模型、prompt、预算和任务不变。
反证：合并后选错率不降，或任务成功/延迟明显退化。
```

“模型不够聪明”通常太宽，无法决定改哪里。可检验机制应指向具体层：

- **环境**：依赖、目录、认证、网络或工具实际不可用；
- **任务契约**：目标、输入、边界或验收有歧义；
- **上下文**：证据没加载、过期、冲突、被截断或位置不当；
- **工具**：名称/schema/错误返回重叠，权限或幂等缺失；
- **推理**：证据齐全但多约束综合、规划或验证判断失败；
- **运行控制**：预算、重试、并发、取消或 checkpoint 错误；
- **评分**：测试、rubric 或 Judge 没有测到目标行为。

一条失败可能有多个候选机制。先用只读检查或小探针排除低层断裂，再投入模型/推理实验。工具根本未注册时提高 reasoning，不能验证模型能力。

## 写一张实验卡再动配置

```yaml
experiment_id: tool-overlap-v1
decision: 是否合并两个代码搜索工具
workload: debugging
evidence_target: E1
baseline_ref: config/default@<hash>
hypothesis: 合并重叠工具会减少 invalid_tool_selection
changed_variable: tool_registry
held_constant:
  - task_and_fixture
  - model_provider_harness_surface
  - instructions_and_reasoning
  - permissions_and_budgets
primary_outcome: invalid_tool_calls_per_task
hard_gates:
  safety_violations: 0
  task_success_non_inferiority: true
stop_if:
  - unauthorized_side_effect
  - fixture_or_identity_drift
  - secret_or_personal_data_exposed
rollback: restore baseline config ref
```

这是 E0 模板，不是本项目已经运行的工具比较。实验卡提交到版本历史，正式运行后不原地改假设和门槛；偏离另记原因。

Held constant（保持不变项）要写出可比较身份，而不是“其他相同”。至少保存 task/fixture hash、model/provider/adapter、harness/surface、system/project/task instruction hash、tool schema、权限、reasoning、预算、代码与依赖 commit、runner/Judge 版本。

无法固定的远端模型或服务端路由记录返回 identity、区域和时间，并降低结论范围。配置身份中途变化就停止或建立新实验版本，不能拼接为一个候选。

## 选择最小充分干预

一次改变一个主要变量，才能回答机制问题：

| 想验证 | 可以改变 | 应保持不变 |
| --- | --- | --- |
| Prompt 是否更清楚 | 一个任务契约片段 | 模型、工具、context、预算 |
| Tool schema 是否更易用 | schema/错误返回 | tool 语义、模型、prompt |
| Context 排序是否有效 | selection/order | 内容集合、模型、工具 |
| Reasoning 档位是否有增益 | provider reasoning 参数 | model ID、prompt、工具、总预算口径 |
| Memory 是否有帮助 | 写入/检索策略 | sequence、scope、其余上下文 |

若同时换模型、prompt、工具和权限，仍可以问“整个 bundle 是否值得采用”，但不能把收益归因给某个组件。需要研究交互时预先设计 factorial experiment（因子实验）；不要事后从少量组合猜因果。

干预要有删除路径。Prompt 候选可切回旧 hash；工具 schema 保留旧 reader；记忆候选用隔离 namespace；hook 可禁用；模型路由可回到固定工程基线。无法安全回退的变更先在 fake/replay 或影子模式中验证。

## 用漏斗逐层提高证据成本

```text
静态/单元契约
      ↓
E1 fixed fake/replay + 负例
      ↓
小型 development matrix
      ↓
E2 live probe（单独授权）
      ↓
E3 预注册 + holdout + 完整报告
```

- 静态/单元检查快速发现 schema、解析、预算和数据谱系错误；它们不是模型质量证据。
- E1 验证固定离线接缝能否复现、拒绝坏输入，适合淘汰明显错误的候选。
- Development matrix 用代表任务比较方向、失败类型和方差，但仍允许调参。
- E2 只支持锁定真实版本与窄场景的有限可用性，不支持通用排名。
- E3 才能在限定 workload 内支持采用或比较决定。

每一层都可否决候选；通过不会自动跳过下一层。E1 命令退出 0 不能证明真实 provider 接受 reasoning 参数。真实 API、费用、Git 远程、PR、Pages 与发布仍需单独授权。

## 基线不是“什么都不做”

至少区分：

- **默认基线**：目标 harness 的合理开箱配置；
- **工程基线**：团队实际会维护的短指令、验证和最小安全边界；
- **候选**：在工程基线上只加本次干预。

默认基线回答配置带来多少总体收益，工程基线回答候选是否在现实工作方式上继续增值。拿精心调优候选只对比空 prompt 会夸大效果；给候选额外权限、预算或答案线索会破坏公平性。

基线也要版本化。生产问题修复后，旧基线可以作为历史对照，但不能继续冒充当前默认。候选失败时回到锁定的当前基线，并把失败输入加入 regression，而不是回到一个模糊“之前状态”。

## 任务集要覆盖收益和副作用

从真实任务来源建立抽样框，按 workload、输入规模、工具、风险和验证类型分层。每个 task 固定：起点、输入、权限、预算、机器断言、人工 rubric、禁止动作、cleanup、停止条件与 fixture hash。

调优候选不能只看会受益的 happy path。上下文压缩还要测否定条件和精确数字；工具重试还要测重复副作用、partial success 和 unknown outcome；记忆还要测跨 scope、更新、污染和删除；模型路由还要测 schema/权限错误不被错误升级。

任务分三类：

1. Development（开发集）：诊断和调参；
2. Holdout（留出集）：配置与规则冻结后确认；
3. Incident regression（事故回归集）：防止已知高损失失败复发。

同一 holdout 被反复查看后已经成为开发集，应更换未见任务。测试名、文件名、错误消息或 tool description 也可能泄漏答案，不能只检查 prompt 正文。

## 重复、配对和运行顺序

同一 task 在 baseline/candidate 上都运行，形成 paired design（配对设计）。这样比较的是任务内差异，不会因候选碰巧分到简单题而胜出。

每个 task/config 的重复用于观察模型与环境随机性，但 10 次同一 task 仍不是 10 个独立任务。结论推广的主要单位通常是 task；分析时同时保留 run-level 原始数据与 task-level 汇总。

按预注册 seed 随机交错 A/B 或分块运行，避免候选总在 cache 热、服务空闲或某时段。每个 run 从干净 worktree/container/状态开始；共享 memory、artifact、tool cache 或对话会产生 carryover（残留影响）。若 cache 是产品体验的一部分，则对两配置使用相同预热协议并单独计量。

Pilot（试运行）只用于检查 runner、任务歧义、断言、计量和清理，不能混入正式结果。Pilot 修改 fixture、超时或评分后生成新版本，旧 run 保留为 pilot。

## 先定分母、失败和重跑规则

运行前定义：

- 什么是 task success、single-run success 和 success within budget；
- timeout、取消、权限拒绝和预算耗尽是否算产品结果；
- provider 5xx、runner crash 等 infrastructure failure 如何重跑、最多几次；
- 缺失 cell 如何报告；
- 重复 cell、identity drift、坏 fixture hash 如何使数据无效；
- 安全违规、费用越界、数据泄漏和 holdout 泄漏的停止动作。

原基础设施失败和重跑关联都保留。不能在看见失败后把它改名为“异常”并从分母删除；也不能把缺失 run 自动当成功或普通产品失败。数据无效先修生产路径，统计无法修复错误谱系。

## 结果不只是一列成功率

按以下顺序读结果：

1. 身份、矩阵和 fixture 是否完整有效；
2. 安全、权限、Secret 和禁止动作是否满足；
3. Primary outcome（主要结果）的分子、分母、分析单位和区间；
4. P50/P90、token、费用、调用与人工介入；
5. 失败分类和 workload/risk 切片；
6. 最差案例、回退能力与维护成本。

二元结果报告 Wilson 等合适区间；配对结果报告 win/loss/tie 与差值。均值可能隐藏长尾，P90 也需要足够样本。小样本 100% 只说明观察样本全过，不代表真实成功率为 100%。

`best-of-k`、允许重试的预算内成功和单次默认体验分别报告。只展示“多次里最好的一次”会把额外调用成本和失败体验藏起来。

## 失败轨迹是实验产物

为每个失败先按层分类，再抽查 trace：

| 分类 | 关键问题 | 常见下一实验 |
| --- | --- | --- |
| goal/contract | 目标或验收是否歧义 | 重写一个契约字段 |
| context | 是否未加载、冲突、过期或截断 | 选择/排序/压缩单变量 |
| planning/reasoning | 证据是否齐全仍无法综合 | reasoning/分解实验 |
| tool | 选择、参数、错误和幂等是否清楚 | schema/返回单变量 |
| execution | 环境、依赖、网络是否异常 | 先修 runner，不评价模型 |
| verification | 检查是否缺失或读错结果 | verifier 负例 |
| safety/permission | 是否越权或被注入 | policy/隔离硬门槛 |
| budget/timeout | 总账本与 deadline 是否正确 | 预算/停止边界测试 |

不要只分析候选失败，也要看 baseline 成功但候选失败、候选成功但行为更危险的反转案例。修复一个 fixture 后加入邻近变体，防止对单一文本过拟合。

## 保存“候选墓地”避免重复试错

每个候选无论结果好坏，都记录：experiment/config ID、假设、changed variable、task/fixture/instruction/tool hash、命令与退出码、原始 artifact、summary、deviation、决定、限制和 rollback。

Reject（否决）也要写原因：没有改善、质量退化、安全失败、成本过高、结果不稳定、数据无效，还是证据不足。下次版本变化时可以判断旧失败是否仍适用，而不是凭印象重跑同一方案。

Inconclusive（结论不足）不是软性通过。样本太少、区间跨阈值、身份漂移或缺 holdout 时保持 baseline；可以设计下一实验，但不能把候选默认为生产配置。

## 什么时候停止调优

停止条件不只是事故：

- 已达到任务质量与安全门槛，边际收益小于维护/运行成本；
- 剩余失败来自任务/数据歧义，而非配置；
- 两个有意义候选均未达到最小改善；
- 预算只能支持更窄结论；
- 继续调整会反复接触 holdout，需先补新任务；
- 上游模型/harness/tool 版本即将改变，当前实验会失效。

优化不是越复杂越好。候选只降低 token 但增加失败和人工纠正，净效用可能为负；配置需要大量 task-specific 例外才能赢，维护成本和过拟合风险也应计入。

## 在本项目运行一次离线实验审计

### 前置条件与固定输入

需要 Python 3.11+、uv 0.11、Node.js 22+，依赖由 `uv.lock` 和 `package-lock.json` 固定。从仓库根目录执行；不配置真实模型、网络、API key 或外部写权限。

输入包括六个版本化 E1 fake/replay fixture、`evals/study.example.json`、20 个 task 定义、2 个 config、3 次重复的矩阵协议、固定 fixture lineage 和 12 行 development 样例。

### 命令

```powershell
npm run labs:all
npm run eval:validate
npm run eval:summary
npm run eval:self-test
```

### 预期输出与断言

- `labs:all`：六个固定 case 全部 `passed=true`、`negative_rejected=true`、`offline=true`、`evidence=E1`；
- `eval:validate`：20 tasks、6 workloads、6 holdout、2 configs、3 repeats，因此 120 个预期 cell；只有 12 个唯一 development cell，缺 108，`sample_matrix_complete=false`；
- `eval:summary`：`promotion_eligible=false`，blockers 为 `incomplete_matrix` 与 `evidence_below_target`，holdout 汇总为 null；
- `eval:self-test`：坏 fixture lineage、重复/缺失矩阵、错误晋级、脱敏和不支持格式 canary 被拒绝。

已有 development 配对显示 5 win、0 loss、1 tie，只能验证汇总逻辑。它不能抵消没有 holdout、矩阵不完整和证据仅为 E1，也不能形成真实模型排名。

### 失败、停止、清理与回退

任一固定负例被接受、fixture ref/hash 无法解析、矩阵身份漂移、summary 错误允许晋级或 Secret 未脱敏时，立即停止分析并修 validator/生产路径。不要补虚构 run、删除失败行或修改历史 hash 让结果好看。

命令只读版本化输入并产生可忽略测试缓存/终端输出；需要时只清理明确的 `.pytest_cache/`。误改时用 `git diff -- lab/fixtures evals scripts/` 精确定位并只恢复自己的修改。候选失败或结论不足时保留原工程基线、原始 artifact 和失败分类。

### 证据边界

这组命令提供 E1：固定离线 fixture、schema、谱系、矩阵与 summary 门禁可复现并拒绝列出的坏输入。它不运行真实 model/provider/adapter，不完成 120-cell 矩阵，不包含 holdout run，也不能验证在线延迟、费用或模型质量。

## 实验启动检查表

- 结果会触发什么 adopt/reject/route/rollback 决定？
- 症状、机制假设、干预和反证是否分别写清？
- Baseline 与 candidate 是否有精确身份，只改变一个主要变量？
- Task 是否覆盖收益路径、失败路径和关键副作用？
- Development、holdout 与 incident regression 是否隔离？
- 分母、重复、配对、顺序、重跑、缺失和停止规则是否预先定义？
- 安全、权限、费用与数据泄漏是否为硬门槛？
- 原始失败、配置 hash、deviation、summary 和 rollback 是否可追溯？
- E0–E3 是否只按实际运行证据标注，没有因命令成功自动升级？
- 证据不足时是否保持 baseline，而不是默认采用候选？

下一步根据实验对象进入[上下文与工具调优](/optimization/context-tools)、[推理预算与路由](/optimization/reasoning-routing)或[记忆优化](/optimization/memory)；准备正式比较时再使用[评测方法](/evaluation/method)、[指标与区间](/evaluation/metrics)和[报告纪律](/evaluation/reporting)。

## 检查题

1. “模型经常选错工具”怎样改写成可证伪的机制假设？
2. 同时修改 prompt、模型和权限后，实验还能回答什么，不能回答什么？
3. 为什么 10 次同一 task 的重复不能替代 10 个不同 task？
4. Development 配对 5/0/1 为什么仍不能支持当前候选晋级？
5. 一个被否决的候选为什么也值得保留完整记录？
