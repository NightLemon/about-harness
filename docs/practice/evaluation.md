# 评测实验室：先验证矩阵，再解释结果

这一实践不调用真实模型，也不比较任何产品排名。你将使用仓库现有的合成 JSONL（JSON Lines，每行一个 JSON 对象）记录，验证 Task、不可变 fixture、run 和 study 的来源链，再阅读一个故意不完整的 A/B（两配置对照）汇总。目标是学会拒绝坏数据和过强结论，而不是从绿色命令中制造“哪个模型更好”的答案。

## 学习目标与证据边界

完成后你应能：

1. 区分实验设计的 formal matrix（正式矩阵）与当前已观察样本；
2. 解释 run 身份、配置身份、fixture lineage（fixture 来源链）为什么要同时冻结；
3. 读懂通过率、Wilson 95% 区间、P50/P90、配对 win/loss/tie 和缺失 cell；
4. 证明 validator 会拒绝重复、漂移、hash 篡改和不安全公开产物；
5. 在矩阵或证据等级不足时输出“不可晋级”，而不是补零或外推。

本页命令提供 E1：脚本在固定离线数据上可重复执行，并能拒绝列出的负例。它没有模型请求、真实仓库任务、费用、在线延迟或人工评分，因此不能升级为 E2/E3，也不能用于模型或 harness 质量结论。

## 当前四类输入各管什么

| 文件 | 当前内容 | 责任 |
| --- | --- | --- |
| `evals/study.example.json` | 20 tasks、6 workloads、2 configs、3 repeats、6 holdout | 定义比较矩阵和预注册门槛 |
| `evals/tasks.example.jsonl` | 6 个 fixture-backed 示例 Task | 固定目标、工具、预算、验收和 fixture ref |
| `evals/fixture-refs.example.json` | 6 个完整 commit/path/hash 引用 | 从不可变 Git 对象重算 fixture bundle |
| `evals/runs.example.jsonl` | 12 个 development 配对样例 | 演示 run schema、汇总和失败分类 |

正式矩阵大小是：

```text
20 tasks × 2 configs × 3 repeats = 120 cells
```

当前只有 12 个唯一 cell，全部来自 6 个 development task 的第一次重复；其余 108 个 cell 缺失，holdout 没有 run。`tasks.example.jsonl` 也只定义了这 6 个 fixture-backed Task，不是 20 个任务的完整可执行集。这是有意保留的教学缺口，不能把未出现的 run 当失败、成功或零成本。

## Run 记录必须回答什么

`lab/schemas/eval-run.json` 要求每条 run 至少覆盖四组字段：

- **矩阵身份**：`run_id`、`task_id`、`config_id`、`repeat`、`split`；
- **配置身份**：`config_version`、`model_id`、`harness_version`、`instruction_hash`；
- **结果与资源**：`passed`、`duration_ms`、`cost_usd`、token、tool errors、human turns；
- **归因与证据**：`failure_type`、`safety_violation`、`fixture_hash`、`evidence`。

`run_id` 唯一还不够；同一个 `task_id + config_id + repeat` 只能出现一次，否则只是换 ID 重复计票。相同 `config_id` 的版本、模型、harness、指令 hash 和证据等级也必须保持一致，避免实验中途静默换配置。

成功 run 的 `failure_type` 必须为 `null`。失败则使用 `contract`、`context`、`planning`、`tool`、`execution`、`verification`、`safety`、`budget` 或 `infrastructure`。分类描述第一处可归因故障，不应把所有未通过都写成模型错误。

## 不可变 fixture 来源链

Validator 不只比较 run 中的一个 hash。它会：

1. 解析 registry 中的完整 40 位 Git commit；
2. 从该 commit 的固定 path 读取 manifest、input、expected 和 negative；
3. 规范化 JSON 并重算三个文件 hash 与 bundle hash；
4. 交叉核对 registry、Task metadata 和每条 run。

因此当前 migration 工作目录中的 fixture 即使后来更新，也不能冒充历史 `482c…` 样例。保留历史输入是可复现性要求；如果任务内容确实变化，应创建新 fixture ref 和 run，而不是改写旧结果。

## 第一步：验证输入与矩阵

前置条件是 Node.js 22+、锁文件依赖已经安装，并且当前仓库包含 fixture ref 指向的历史 commit。在仓库根目录运行：

```powershell
npm run eval:validate
```

预期退出码为 0，关键输出为：

```json
{
  "tasks": 20,
  "workloads": 6,
  "holdout": 6,
  "configs": 2,
  "repeats": 3,
  "sample_rows": 12,
  "fixture_refs": 6,
  "formal_matrix_rows": 120,
  "unique_matrix_cells": 12,
  "missing_matrix_cells": 108,
  "sample_matrix_complete": false
}
```

这里的 `tasks=20` 来自 study 设计，不表示 20 个 Task 都已有定义或运行记录。验证通过只证明现有数据满足当前 schema、身份和来源链约束；`sample_matrix_complete=false` 才是对覆盖率的准确陈述。

## 第二步：汇总，但不要晋级

```powershell
npm run eval:summary
```

预期 `matrix.complete=false`、`promotion_eligible=false`，阻断项包含：

```json
{
  "promotion_blockers": [
    "incomplete_matrix",
    "evidence_below_target"
  ]
}
```

Study 的目标是 E3，当前 run 全是 E1，所以即使 120 cells 全部补齐也不能仅凭这些离线记录达到目标证据。当前合成数据中 `offline-default` 为 1/6、`offline-engineering` 为 6/6，配对结果为 5 wins、0 losses、1 tie；这些数字由作者构造来演示分析路径，不是模型测量值。

汇总器输出的是 **run-level pass rate**，并给出成功数、run 数、distinct tasks 和 Wilson 95% 区间。它没有按“3 次中至少 2 次通过”等规则计算 task-level 成功，也没有做显著性检验。报告时必须写清分析单位，不能用 `distinct_tasks` 和 run 通过率自行拼成任务通过率。

只有矩阵完整、证据达到目标且安全违规为零时，汇总器才对 holdout 执行预注册阈值。`min_pass_rate_delta=0.05` 表示候选的 run-level 成功率至少比基线高 5 个百分点；`max_p90_cost_delta=0.2` 表示候选的每次运行 P90 费用最多高 0.20 USD。当前样例没有 holdout，因此 `promotion_analysis` 将候选标为 `blocked` 并把观察值留为 `null`，不会借用 development 数字。

## 第三步：证明门禁真的会失败

```powershell
npm run eval:self-test
```

预期退出码为 0，并显示负例已被拒绝。这个命令在临时目录依次构造：

- 重复 `run_id` 与不同 ID 的重复矩阵 cell；
- 同一配置的 `instruction_hash` 漂移；
- 被篡改的 fixture ref、错误 path、Task hash 和 run hash；
- 会让不完整 E1 样例错误晋级的条件，以及完整矩阵中的通过率不足、P90 费用超限和非法阈值；
- 含合成 Secret、`rawPrompt` 或不支持 `.log` 格式的公开产物。

外层命令通过，含义是“坏输入按预期失败”，不是坏输入被接受。测试会删除自己创建的临时目录，不修改 `evals/`。

如果要发布脱敏后的公开结果，再运行：

```powershell
npm run results:redact
```

当前扫描只接受公开目录中的 JSON/JSONL，并检查有限的键名、路径和凭据模式。通过不证明任意自由文本都已安全脱敏；原始 prompt、trace 和私有源码应默认留在受限存储。

## 如何设计自己的 A/B

### 1. 先写决策，不先跑分

说明用户场景、主要指标、安全硬门槛、最小有意义改善、不劣界限和失败后的回退。比较推理档位时固定 model/provider/harness、Task、工具、权限和起始 commit；比较 harness 时固定模型与任务，同时诚实保留 checkpoint、工具体验等产品差异。

### 2. 冻结任务与 split

任务来自真实工作负载分层，包含确定性验收和禁止动作。development（开发集）用于调试；holdout（留出集）在候选冻结后才揭示；incident regression（事故回归集）防止已知失败复发。每个 run 使用干净 worktree 或不可变 fixture，不能继承上一次代码、cache 或会话。

### 3. 完整记录每次尝试

预先生成矩阵 cell 和 run ID，随机或交错执行顺序。超时、拒绝和基础设施错误也写入记录，按预注册规则决定是否允许重跑；不要删除失败后只保留最好一次。Single-run、允许重试后的 success 和 best-of-k 是不同产品问题，必须分列。

### 4. 先过 lineage，再看数字

验证 Task/fixture/run 身份、缺失和重复后，才计算结果。评分顺序通常是安全硬门槛、主要质量指标、关键任务不退步、成本/延迟约束，最后才是辅助指标和轨迹分析。至少审阅全部失败、所有安全事件以及各配置的成功样例。

### 5. 结论绑定边界

可以写：

```text
在 task-set commit X、Harness Y vZ、provider P 和固定工具 schema 下，
候选在 N 个独立 run 中……；提升集中在……；区间与缺失为……。
因此只对……工作负载采用候选；未测试……；失败时回退到配置 A。
```

不要写“B 更聪明”“这个模型最好”或“命令通过所以可用于生产”。模型排名必须同时说明 workload、harness、设置和证据边界。

## 当前实现尚未替你做什么

- `promotion_eligible` 会执行完整 holdout 的 run-level 成功率与 P90 费用点估计阈值，但它不是自动采用决定；task-level 重复聚合、区间和业务复核仍需独立完成。
- 汇总器不计算 task-level 聚合、bootstrap、配对区间、统计检验或多重比较修正。
- Validator 证明六个当前示例的 lineage，不证明 formal study 中其余 14 个 Task 已实现。
- `instruction_hash` 证明字节身份，不证明指令实际被 harness 加载；模型、provider 和 harness 字段也需要运行时采集来源。
- 当前样例没有 trace、真实 usage、外部副作用对账或 Judge（模型/人工评分器）结果。

这些限制应出现在报告的 blockers 与 residual uncertainty（剩余不确定性）中，不能通过手工补数消失。

## 失败、停止、清理与回滚

若 validator 报 duplicate、identity drift 或 lineage mismatch，停止汇总，保留原文件和错误，不通过删除失败行、改历史 hash 或降低 evidence target 让结果变绿。若发现 Secret、未授权副作用或 run 起点被污染，隔离产物并废弃受影响 cell；是否重跑按预注册规则处理。

本页三个验证命令只读 `evals/`；自测使用系统临时目录并自动清理。自己的实验先写到独立目录和分支。回滚时恢复上一个已审核 study/config 和不可变 task-set commit，不覆盖历史 run；新增更正记录说明哪些 cell 作废、为什么作废。

## 把真实失败变成回归

1. 脱敏并最小化失败案例；
2. 固定可解析的起始 commit、fixture 和 oracle；
3. 先证明旧配置在预定重复次数中失败；
4. 修 harness、提示或工具，并通过原失败、相邻正例和安全负例；
5. 加入 incident regression，记录来源类别和复审条件。

真实失败通常比想象的 benchmark 更能暴露 harness 边界，但单个 incident 也不能代表全部工作负载。

## 检查题

1. 为什么 12 条合法 run 不能支持 120-cell study 的晋级？
2. 重复 `run_id` 与重复矩阵 cell 有什么区别？
3. `fixture_hash` 为什么还需要 commit 和 path？
4. 当前 `promotion_eligible` 没有执行哪两个预注册阈值？
5. 1/6 与 6/6 的样例为什么不能形成模型排名？

下一步：阅读[评测方法与证据晋级](/evaluation/method)、[指标与区间](/evaluation/metrics)和[报告纪律](/evaluation/reporting)，再把自己的矩阵设计成可验证而非只可汇总的数据。
