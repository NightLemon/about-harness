# 端到端模型适配案例：从资格探针到受限晋级

## 案例性质与学习目标

本页把 Task、模型身份、协议、Harness、工具、评测、安全、路由和回退串成一条完整决策路径。模型名、任务与运行数字均为**教学虚构**，是 E0 纸面案例，不表示任何真实产品性能，也不是本仓库已经执行的 E2/E3 证据。

完成后你应能：

- 先做协议资格测试，再比较模型任务能力；
- 冻结 model/provider/Harness/config 与 Task；
- 设计有 holdout、重复、预算和失败分类的配对实验；
- 识别分母错误、选择性报告和混杂变量；
- 把结果转成按 workload（工作负载）的路由，而不是全局排名；
- 将失败固化为回归，并保留可执行回退。

## 场景与不可变约束

团队计划评估虚构模型 `acme/code-model-2026-08`，通过虚构 provider 在 Pi 的 TypeScript 单仓库中运行。历史工作构成：

```text
60% 小修
30% 多文件功能 / 调试
10% 只读调查
```

业务约束：

- 模拟 Secret 外传必须为 0；
- 单任务墙钟时间不超过 20 分钟；
- 只允许目标 worktree 内编辑；
- 依赖、网络与生成文件默认禁止；
- 任何外部写操作不在本研究范围；
- 尽量减少人工纠正，但不以取消必要批准换取低数字。

候选只比较 reasoning/thinking（推理预算）`low` 与 `medium`。两者使用相同 model/provider、Pi 版本、项目指令、工具、权限、Task、顺序策略和总预算。

## 开始前建立证据目录

建议每次研究产生不可变 artifact，而不是只有一份总结：

```text
study/
  protocol-probes.jsonl
  tasks.jsonl
  fixture-refs.json
  configs/
    low.json
    medium.json
  runs.jsonl
  incidents.jsonl
  report.md
  unresolved.md
```

每个 run 至少绑定：

```text
run_id / timestamp / operator class
model request + resolved identity / provider / endpoint
Pi + Adapter + tool schema versions
repository commit / clean worktree ID / Task ID / fixture hash
instruction hash / context construction / thinking setting
allowed tools + sandbox + approval + network
steps/calls/time/token/cost budgets
trace / actual diff / tests / validator result
stop reason / failure class / human interventions
```

身份字段缺失的 run 可以保留用于诊断，但不能进入模型配置比较。

## 阶段 0：写决策问题

错误问题是：“medium 是否比 low 聪明？”它没有限定任务、系统或代价。

可检验问题是：

> 在固定模型快照、Pi/Provider/Adapter、工具与安全边界下，对这个仓库的小修、多文件功能和调试 Task，medium 是否在零安全违规前提下提高 task acceptance，且 P90 时长不超过预设增幅？

主变量是 thinking 档位；主要 outcome（结果指标）是单次 run 的 Task acceptance；安全是硬门槛；时间、token/费用和人工纠正是代价。

## 阶段 1：确认身份与协议

### 身份不是模型自报

从 Pi 状态、请求配置与 provider 可验证响应记录：requested alias、resolved model ID、provider、region/endpoint、Adapter 与核对时间。不要问模型“你是谁”作为身份来源。

Alias 漂移、Provider 路由变化或 Adapter 更新都产生新 config。无法解析真实身份时停止比较，不能把两个不确定对象放进同一组。

### 先运行资格探针

至少覆盖：

| Probe | 要验证的边界 | 失败如何处理 |
| --- | --- | --- |
| Text | system/user/assistant、多轮与空内容 | 修 message mapping |
| Single tool | schema、call ID、arguments、result | 修 tool Adapter |
| Multi-tool | 连续 ID 与结果回送 | 修状态/事件拼装 |
| Invalid args | 错误是否可见并能 repair | 修 validation/error contract |
| Stream | 文本/arguments 不重不漏、终态唯一 | 修 event aggregator |
| Cancel/timeout | 迟到结果不覆盖终态 | 修 controller |
| Usage | 单位、缺失、cache/retry 口径 | 修计量，不补零 |
| Safety | 注入/越权在副作用前拒绝 | 修 policy/执行环境 |

第一次 multi-tool 测试丢失 tool call ID。团队先修 provider Adapter，并把失败加入协议回归；该 run 不计入模型能力分母，因为模型没有收到完整 ToolResult。

资格失败不能通过提高 thinking、重写任务或增加模型预算绕过。先让传输和控制层合格，才能解释后续差异。

## 阶段 2：冻结工程基线

### 项目指令只写仓库知识

```md
# AGENTS.md

- Install with `npm ci`.
- Start architecture searches at `docs/architecture/index.md`.
- Fast verification: `npm run lint && npm run test -- --changed`.
- Do not edit generated files under `packages/api/generated/`.
- Finish with changed files and exact check results.
```

它没有重复“做个好工程师”之类泛化建议，而是提供模型无法从当前文件可靠推断的安装、入口、禁区和验证命令。保存有效加载内容的 hash，不只保存仓库中的源文件。

### 按阶段暴露工具

调查 run 只暴露 `read/search/list`；实现 run 才增加 `edit/write/test`。外部发布、发送和删除工具完全不加载。项目运行在受限 container 中，模拟 Secret 不进入真实环境变量。

### Task 先于 Prompt

每个任务固定：

```text
task_id / repository commit / fixture
goal / allowed paths / allowed tools
acceptance tests / forbidden outcomes
timeout / model calls / tool calls / cost cap
failure taxonomy / stop / rollback
```

Prompt 可以是 Task 的表达，但不是唯一契约。Validator、policy 和 controller 使用结构化字段。

## 阶段 3：跑小探针形成假设

| 探针 | 纸面观察 | 处置 |
| --- | --- | --- |
| 指令作用域 | 两档都正确采用子目录 override | 保持配置 |
| 检索 | low 多读约 40% 文件 | 为两档共同加入架构入口，不做单边特例 |
| 工具恢复 | Adapter 修复后均能恢复 | 加入协议回归 |
| 状态保持 | low 在长日志后漏掉一个禁区 | 进入正式集观察，不先下结论 |
| 验证 | 两档都主动复跑目标测试 | 保持 validator |
| 安全 | 均拒绝 README 内的外传诱导 | 正式集继续保留安全 Task |

探针用于修实验环境、确定任务难度和形成假设，不用于宣布 medium 更好。探针阶段看到的任务不能再当纯 holdout 使用。

如果为了公平加入架构索引，必须同时更新两档 config，并重新冻结 baseline；不能只帮助表现较差的一组后继续使用旧 run。

## 阶段 4：设计配对实验

### 任务与重复

从目标工作抽 6 个固定 Task：2 个小修、2 个多文件功能、2 个调试。每个 Task 有固定 commit、机器 acceptance、禁止动作和 20 分钟 timeout。

两档对每个任务各运行 3 次：

```text
6 tasks × 2 configs × 3 repeats = 36 runs
18 runs per config
```

每对 Task/config 在干净 worktree 中运行，顺序交错；共享不可变 fixture，不共享候选运行产生的 state 或 memory。

### Development 与 Holdout

开发集用于修 Adapter、工具描述和 validator；holdout 只用于冻结配置后的判断。若看过 holdout 失败并据此修改系统，它就成为 development，需要另建未见样本。

### 预注册晋级条件

```text
Safety: 0 violations（硬门槛）
Critical tasks: 不允许任务级退步
Quality: overall single-run success delta >= 5 percentage points
Latency: P90 增长 <= 35%
Data: 所有计划 cell 完整，缺失 run 有预注册处理
```

基础设施 5xx 最多重跑一次，原失败与重跑都保留并标记 lineage。确定性协议、权限和验证错误不重跑“碰运气”。

### 样本单位

同一 Task 的三个 repeat 不是三个独立业务需求。报告 run-level 通过率，也报告 task-level（例如三次中至少两次通过）与每 Task 配对差异，避免一个容易任务贡献过多胜利。

## 阶段 5：先验证数据完整性

评测 runner 首先交来以下**错误汇总（不可用于决策）**：

| 指标 | low | medium |
| --- | ---: | ---: |
| 通过 run | 24/18? | 29/18? |
| 安全违规 | 0 | 0 |
| P50 时长 | 280 s | 330 s |
| P90 时长 | 510 s | 620 s |
| 人工纠正 | 7 | 3 |

每档计划只有 18 次，分子不可能大于分母。正确处理不是猜测“可能把 tool call 当 run”，而是拒绝汇总并回到原始 run：

1. 验证唯一主键 `task_id + config_id + repeat`；
2. 检查是否混入 probe、retry 或旧 study；
3. 确认每个 run 的 config/fixture/model 身份；
4. 重算 planned、observed、duplicate、missing cell；
5. 保存错误报告和修正脚本版本。

核对后的**纸面修正汇总**为：

| 指标 | low | medium |
| --- | ---: | ---: |
| 通过 run | 12/18 | 15/18 |
| 安全违规 | 0 | 0 |
| P50 时长 | 280 s | 330 s |
| P90 时长 | 510 s | 620 s |
| 人工纠正 | 7 | 3 |

Run-level success 分别是 66.7% 和 83.3%，差 16.6 个百分点。但样本很小，不能只比较点估计。还要看 Wilson/配对区间、task-level 分布、失败类型和缺失机制。

P90 从 510 s 到 620 s，增长约 `(620-510)/510 ≈ 21.6%`，在预注册 35% 上限内。这个计算不代表真实值；它只是示范如何对照门槛。

## 阶段 6：读轨迹，避免错误归因

纸面轨迹显示三个新增成功都来自多文件/调试，小修没有收益；medium 的人工纠正更少。Low 的长日志失败可能通过更短 ToolResult 改善。

此时不能直接说“medium 推理更强”，还要排除：

- 两档实际 context 是否相同；
- ToolResult 是否因时间或 truncation 不同；
- Provider 是否解析到同一 snapshot；
- medium 是否获得更多 output token 或 tool calls；
- Validator 是否对某类输出更宽松；
- 人工纠正是否改变后续输入；
- 基础设施失败是否在两档分布不均。

缩短 ToolResult 如果进入下一轮实验，必须对两档共同修改并建立新 study；旧结果只用于提出假设。

## 阶段 7：形成受限路由

基于这组教学结果，合理结论是按 workload 路由，而不是宣布 medium 全面胜出：

- 小修、格式、固定 schema 提取：继续 `low`，因为没有观察到收益；
- 多文件功能、调试、三项以上约束：候选 `medium`；
- 两次不同根因失败或需要架构权衡：升级到更强配置或人工设计评审；
- 任何安全门槛失败：停止自动化，不通过重试寻找一次安全结果；
- Provider/Adapter 协议失败：回退已验证版本，不计为模型判断失败。

路由条目附 model/provider/Pi/config 版本、Task 范围和日期。新仓库、新语言或 Alias 漂移不自动继承。

## 阶段 8：Shadow、晋级与回退

即使纸面 E3 条件满足，也不应一步开放外部写权限。实际上线顺序可为：

```text
offline replay
  → authorized protocol probe
  → read-only shadow
  → local reversible edits + external validator
  → limited cohort
  → broader routing
```

每阶段预注册流量、权限、时间、费用、安全和回退触发器。Shadow 结果不能产生真实副作用；实现候选在隔离 worktree 中，由 CI/人工验收后再合入。

回退包至少固定：上一个 model/provider/Adapter/Pi 组合、指令与工具 schema hash、policy、路由规则、checkpoint 兼容性和停用开关。出现安全违规、身份不明、协议回归、P90/费用超限或 acceptance 退化时自动停止扩大范围。

外部写操作状态未知时先对账，不因为切回旧模型就盲目重试。

## 阶段 9：固化外循环

将 Adapter 丢 call ID、长日志状态保持、安全诱导和错误分母加入 regression（回归集）。每个 incident（事件）形成：

```text
minimal redacted input
expected safe behavior
observed trace + failure class
root cause and alternative explanations
fix commit / config version
positive + negative regression
affected versions / rollback
```

模型、Pi、Provider Adapter、tool schema、project architecture 或 policy 升级时重跑核心集。不是所有失败都改 prompt：

| 根因 | 主要修复层 |
| --- | --- |
| 消息/ToolCall 丢失 | Adapter / protocol |
| 路径或网络越权 | Policy / sandbox / identity |
| 工具错误不可恢复 | ToolResult / retry / idempotency |
| 关键上下文未进入 | Context construction |
| 验收过早 | Validator / Task contract |
| 固定条件下任务推理失败 | Model route / budget / human review |

## 在当前仓库验证方法骨架

本仓库没有虚构 Acme 模型或 Pi live run，但提供 E1 合成 eval 数据用于验证 lineage、矩阵和晋级阻断。

前置条件是 Node.js 22+、锁定依赖已安装，从仓库根目录运行：

```powershell
npm run eval:validate
npm run eval:summary
npm run eval:self-test
```

预期：

```text
tasks=20
workloads=6
configs=2
repeats=3
formal_matrix_rows=120
sample_rows=12
missing_matrix_cells=108
sample_matrix_complete=false
promotion_eligible=false
```

`eval:self-test` 还应证明 checker 会拒绝 fixture lineage、矩阵完整性、promotion 和脱敏负例。它验证“数据不完整时不能晋级”的机制，不验证本页 12/18、15/18 等虚构数字。

若命令尝试联网、结果把 E1 样本当模型排名、缺失矩阵仍允许 promotion，或 unsupported result 格式绕过脱敏，立即停止。不要补造 run 或降低阈值让它通过。

## 复核清单

提交适配结论前，逐项找到 artifact：

1. 模型身份来自可验证元数据，而非自报；
2. Tool/stream/error/usage 协议先于能力评测合格；
3. A/B 除一个主要变量外保持一致；
4. 每个 run 有固定 Task、干净起点和外部 acceptance；
5. Planned、observed、duplicate 与 missing cell 可重算；
6. 安全是硬门槛，失败轨迹未被删除；
7. Development 与 holdout 没有信息泄漏；
8. Run-level 与 task-level 单位被区分；
9. 结论按任务类别路由，并写明未测范围；
10. 回归、停止和回退都有所有者与触发器。

任一项无证据时标记 `unknown/untested`，不要用流畅报告补足。

## 常见失败与处置

| 失败 | 为什么不能继续 | 正确动作 |
| --- | --- | --- |
| Resolved model 不明 | 比较对象不可定位 | 暂停、核对 Provider/Adapter |
| 协议探针丢事件 | 任务结果不可归因 | 修协议并重跑资格集 |
| 工作树不干净 | 输入可能跨 run 污染 | 换隔离 worktree |
| 分子大于分母 | 汇总主键或过滤错误 | 拒绝报告，重算原始 run |
| Holdout 被用于调参 | 独立性已破坏 | 降为 development，另建 holdout |
| 安全违规 | 硬门槛失败 | 停止候选，调查并回归 |
| Timeout 后写状态未知 | 重试可能重复副作用 | 查询目标系统并对账 |
| 只对一档优化工具 | 混杂变量 | 两档共同更新，建立新 study |

## 清理、回滚与证据边界

本页纸面案例不应触发真实 API、费用或外部写操作。当前仓库的 eval 命令只读示例 JSON/JSONL 并输出终端结果；发送 `Ctrl+C` 可停止。

实验候选位于隔离 worktree，清理前确认精确路径与 Git 状态，只恢复本轮候选。保留 baseline、失败 run、错误汇总和修正 lineage；不得删除不利样本、覆盖旧结果或移动已有 tag。

本页的 Acme/Pi 结论始终是 E0 教学设计；仓库 eval 命令是 E1 结构证据。只有在另行授权下真实调用目标 Provider 得到 E2 probe，并用代表性完整矩阵重复运行，才可能形成 E3。

## 检查题与下一步

1. 为什么 multi-tool 丢 call ID 不能计为模型能力失败？
2. 6 个 Task、2 个 config、3 次 repeat 为什么是 36 个 run？
3. 发现 24/18 时，为什么必须拒绝汇总而不是修正分母？
4. Medium 只在复杂任务有收益时，怎样写比“全面更好”更准确的结论？
5. Model 不变但结果变化时，应检查哪些 Harness/Adapter 变量？

下一步将自己的目标填入[模型适配卡](/practice/model-playbook)，使用[评测实践](/practice/evaluation)生成真实 study 设计，并按[学习作品集](/guide/portfolio)准备可复核证据。
