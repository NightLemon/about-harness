# 模型适配卡

Model adaptation card（模型适配卡）是一份可复核的采用记录：它说明一个精确的模型运行组合在什么任务、配置、证据和限制下可以使用，以及何时必须停止或回退。它不是模型简介、参数收藏夹，也不是“最佳模型”排行榜。

一张卡的最小身份是：

```text
model × provider × adapter × harness × surface
```

卡内可以比较 default、engineering、candidate 多个 config，但不能把不同 provider、adapter 或 harness 的结果合成同一“模型成功率”。身份发生变化时新建卡或新 revision，并保留旧卡的历史决定。

## 一张卡要支持四个决定

读者不应通读所有 trace 才知道该怎么做。卡片首页应直接回答：

1. **Eligibility（资格）**：Required 协议、安全和数据能力是否通过？
2. **Adoption（采用）**：哪个 config 在哪类 workload 中可以成为当前基线？
3. **Routing（路由）**：什么可观察条件触发升级、降级、澄清或人工接管？
4. **Rollback（回退）**：出现哪些信号时回到哪个精确 config？

证据不足时，合法决定是 `inconclusive` 或 `untested`。卡片不要求每次都选出赢家。

## 卡片生命周期

| 状态 | 含义 | 允许的结论 |
| --- | --- | --- |
| `draft` | 身份或探针仍不完整 | 只列缺口，不用于路由 |
| `protocol-qualified` | Required 协议正负例通过 | 可以进入目标任务评测 |
| `evaluated` | 代表任务矩阵已按计划运行 | 可提出 adopt/reject/inconclusive |
| `adopted` | 采用门槛和 guardrail 均满足 | 仅在声明的 workload 内使用 |
| `rejected` | 硬门槛失败或净效用不足 | 保留版本与失败原因 |
| `retired` | 身份、任务或政策变化使卡失效 | 只做历史参考 |

状态不能跳级。来源文档核验不能把卡从 `draft` 直接变为 `protocol-qualified`；离线 replay 也不能让真实 provider 组合变成 `adopted`。

## 两条证据轴必须分开

卡片同时记录但不混合：

| 证据轴 | 回答的问题 | 合法值 |
| --- | --- | --- |
| Source status（来源状态） | 官方/维护来源是否支持这条产品事实？ | `verified / pending / conflict / retired` |
| Experiment level（实验等级） | 本项目实际运行了什么？ | `E0 / E1 / E2 / E3` |

官方来源已核验通常仍是 E0；离线 fake/replay 通常是 E1；目标环境窄范围运行才可能是 E2；代表任务重复比较才可能是 E3。一次命令退出 0 不会自动升级实验等级。

## 可复制的完整模板

模板中的 `unknown`、`untested` 和 `not-applicable` 含义不同：无法取得、尚未测试、不适用。不要都写成空白。

```md
# 适配卡：<model> / <provider> / <adapter> / <harness> / <surface>

## 卡片元数据
- card_id：
- revision：
- status：draft | protocol-qualified | evaluated | adopted | rejected | retired
- owner：
- created_at / reviewed_at：
- supersedes / superseded_by：

## 决定摘要
- eligibility：pass | fail | incomplete
- decision：adopt | reject | inconclusive | untested
- adopted_config：
- applicable_workloads：
- excluded_workloads：
- rollback_config：
- one-line evidence boundary：

## 完整身份
- requested model ID / snapshot / alias：
- observed model identity / alias resolution：
- provider / region / API surface / API version：
- SDK / adapter version and commit：
- harness / surface version and commit：
- runner / Judge / environment identity：
- checked_at：

## 来源事实
| fact_id | claim | source | version/date | source_status | experiment_level |
| --- | --- | --- | --- | --- | --- |

## 目标工作负载
- task categories and frequencies：
- input/repository scale：
- required tools/modalities：
- risk and data class：
- latency/cost/human limits：
- deterministic acceptance：
- out of scope：

## 协议资格
| capability | required? | status | positive probe | negative probe | state/error notes |
| --- | --- | --- | --- | --- | --- |
| text/message roles | yes/no | supported/emulated/rejected/untested | | | |
| tool schema and call/result ID | | | | | |
| sequential/parallel tools | | | | | |
| state carrier/resume | | | | | |
| streaming/cancel/late result | | | | | |
| stop/error/usage mapping | | | | | |

## 配置版本
| config_id | role | config_hash | only intended difference | permissions | budgets |
| --- | --- | --- | --- | --- | --- |
| | default | | | | |
| | engineering | | | | |
| | candidate | | | | |

## 能力假设与探针
| hypothesis | workload slice | probe IDs | result | next action |
| --- | --- | --- | --- | --- |

## 评测设计
- preregistration / study ID：
- task set / fixture commits：
- development / holdout split：
- repeats and interleaving：
- primary metric：
- safety/resource guardrails：
- retry and missing-data policy：
- promotion / stop rules：

## 评测结果
| config | tasks/runs | task success + interval | safety | P50/P90 | total/unit-success cost | human turns |
| --- | ---: | --- | ---: | --- | --- | ---: |

- pairwise win/loss/tie：
- failure classes and worst cases：
- missing/infrastructure failures：
- result artifact / summary hash：

## 路由与回退
| observable condition | route/config | shared budget effect | validation | fallback |
| --- | --- | --- | --- | --- |

- manual approval conditions：
- rollback triggers：
- rollback procedure and verification：
- unknown-side-effect reconciliation：

## 证据与限制
- raw traces / redacted artifacts：
- E0/E1/E2/E3 boundary：
- untested / unknown / conflicts：
- known adapter/harness loss：
- prohibited interpretations：

## 重测触发与变更日志
- identity/config triggers：
- workload/policy triggers：
- regression set：
- revision / date / change / evidence / decision：
```

## 先写摘要，后填细节

推荐按以下顺序创建第一版：

1. 写完整身份、workload、范围外和硬门槛；
2. 运行[模型协议兼容性](/models/protocol-compatibility)探针，未运行项保留 `untested`；
3. 冻结 default 与 engineering baseline 的 config hash；
4. 为一个可证伪假设建立 candidate，只改一个主要变量；
5. 预注册任务、重复、主要指标、guardrail、停止和采用规则；
6. 从原始 run 生成汇总，并逐项回链失败 trace；
7. 最后写决定摘要、路由、回退和重测条件。

“先写摘要”指先声明需要回答的字段，不是预先填写采用结论。结果出来前 `decision` 应为 `untested`。

## 身份与配置怎样填写

### 不把 alias 当快照

Requested model（请求模型）与 observed model identity（实际身份）分别记录。Rolling alias 无法解析时标 `rolling`，保存时间、区域和响应元数据，并把漂移列为限制。不要用模型自报作为唯一身份来源。

### Config hash 不是配置说明的替代品

Hash 用来检查字节身份，仍需保存可读字段：instruction、工具 schema、context/compaction、reasoning/sampling、权限、网络、步骤/调用/时间/费用与 retry budget。只有 hash 无法解释两个配置为什么不同。

### 只允许一个主要处理变量

候选若同时换模型、扩大权限、增加工具和提高预算，卡片只能说整个 bundle 发生变化。要评价某一变量，拆成多个 config revision；共享不变项也应由 hash 或引用证明。

## 协议资格怎样填写

每行必须同时有 capability、required/optional、四态和探针引用：

- `supported`：精确组合原生通过正例与负例；
- `emulated`：adapter/harness 补偿，并写明限制和责任方；
- `rejected`：无法无损表示或项目主动拒绝；
- `untested`：没有目标组合实测。

Required 项为 `rejected` 或 `untested` 时，`eligibility` 不能写 `pass`。协议 bug 修复前的 run 保留为历史故障，但不进入修复后模型能力统计；修复 adapter 后建立新身份。

## 结果怎样写才不误导

### Task 是主要分析单位

同一 task 重复三次有助于观察随机性，但不等于三个独立任务。卡片同时写 task 数、run 数、配对 win/loss/tie 和区间，不只写一个百分比。

### 安全和资格不是加权分

越权、副作用失控、状态丢失等硬门槛失败不能被更高平均质量抵消。它们单列为 guardrail，触发 reject、rollback 或人工接管。

### 缺失不是零

Usage、cost、latency 或 trace 缺失时写 `missing/unknown` 并解释分母。把缺失 token 填 0 会制造虚假的低成本结论；基础设施失败也应保留，按预注册规则决定是否进入主要分析。

### 保留最差案例

平均值会隐藏长尾。至少回链所有安全失败、协议失败、不可恢复副作用和每个 config 的代表性最差 trace。一个 adopter 应能从卡片直接找到“什么时候不要使用”。

## 路由规则必须可执行

路由只使用决策时已经可观察的特征，例如文件/组件数量、工具类型、风险、验收强度和已有验证信号。不能用任务最终成功或 Judge 分数路由，否则产生标签泄漏。

一个最小路由表可以是：

| 可观察条件 | 动作 | 共享预算 | 回退 |
| --- | --- | --- | --- |
| 局部、低风险、强确定性验证 | engineering baseline | 正常扣减 | 验证失败转 standard |
| 多组件约束且上下文已齐 | bounded candidate | 只允许一次升级 | 失败回 baseline/人工 |
| 信息或权限缺失 | retrieve/ask/abstain | 不消耗危险工具预算 | 等待输入 |
| 协议、schema 或环境错误 | 修对应层并停止 | 不用换模型重置预算 | 已验证 config |
| 高影响且无法确定性验证 | human review | 停止自动副作用 | 人工流程 |

升级、fallback 和子任务共享总账本。提高推理强度不能扩大权限；降级到快配置也不能关闭 schema、安全和验收。

## 回退必须指向完整配置

“改回原模型”不是可执行回退。至少保存 rollback config 的 model/provider/adapter/harness、instructions、tools、permissions、budgets 和 config hash，并说明：

- 触发信号由谁或哪个 monitor 观察；
- 是否允许当前 task 继续，还是从干净起点重跑；
- Timeout 后副作用未知时如何按幂等键对账；
- 回退后运行哪些确定性验证；
- 何时允许重新评估被否决 candidate。

涉及外部副作用时，先对账再重试。卡片不能承诺由模型自行判断自己是否安全。

## 本仓库的离线示例卡

下面是当前教学实现能诚实填写的范围。它刻意不写任何真实模型名称，因为 lab 没有 provider client。

```md
# 适配卡：not-applicable / offline fixture / ReplayAdapter / minimal Python harness / test

## 卡片元数据
- status：protocol-qualified（仅限固定离线 contract）
- decision：adopt（仅作为仓库回归基线）

## 决定摘要
- eligibility：pass for recorded replay; incomplete for live provider
- applicable_workloads：固定 sum replay、loop controller 回归
- excluded_workloads：所有真实模型、provider、streaming、费用与质量判断
- rollback_config：当前仓库锁定版本的 replay/live-disabled baseline
- evidence boundary：E1 offline fixture；live remains untested

## 协议资格
| capability | required? | status | evidence |
| --- | --- | --- | --- |
| 两步 tool loop 与 call ID trace | yes | supported in local contract | replay test |
| 权限、预算、幂等、timeout、resume | yes | supported in local controller | loop tests |
| Live provider transport | yes for live use | untested / hard-disabled | live-disabled test |
| Provider streaming/state/usage | yes for live use | untested | no client implementation |

## 禁止解释
- 不能称任何真实模型/provider compatible；
- 不能从 synthetic run 得出模型排名；
- 不能把静态 checker 通过写成真实产品行为。
```

这里的 `adopt` 只表示“采用为仓库离线回归基线”，不是“采用某个真实模型”。若卡片标题换成真实模型而证据仍只有 replay，状态必须回到 `draft/untested`。

## 验证并复核这张离线卡

### 前置条件与固定输入

需要 Python 3.11+、uv 0.11、Node.js 22+；使用 `uv.lock` 与 `package-lock.json` 固定依赖。从仓库根目录离线执行，不设置 provider credential，不授予网络、费用或远程写权限。

输入是 `lab/tests/test_replay_and_live.py`、`lab/tests/test_loop.py`、Task/Action TypeScript 负例，以及 `evals/` 下固定 task、fixture ref、study 和 run 示例。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py lab/tests/test_loop.py
npm run lab:ts-runtime-test
npm run eval:validate
npm run eval:summary
```

### 预期输出与断言

- Python 测试全部通过：replay 完成进程内 `sum`，live adapter 在 provider action 前拒绝，controller 的预算、权限、幂等、timeout 与 resume 负例成立；
- TypeScript 测试拒绝坏 Task/Action，不让非有限成本进入 metrics；
- `eval:validate` 报告 20 tasks、6 fixture refs、12 sample rows、正式矩阵 120 rows，并明确矩阵不完整；
- `eval:summary` 报告 E1 synthetic/offline、108 个 missing cells、`promotion_eligible=false`；
- 全程没有 credential 请求、network/provider action 或真实费用。

这些具体数量属于当前仓库固定示例。若 fixture/study 有意更新，应同时更新卡片 revision、预期输出和证据 hash，不能只改文字。

### 失败、停止、清理与回退

任一命令非零、live adapter 未被硬拒绝、fixture lineage 不一致、summary 允许晋级，或输出把 E1 写成真实模型证据时，停止使用该卡作回归基线。先修 contract/validator/summary 并保留负例，不配置真实 key 或放宽晋级规则来获得绿色结果。

命令只读固定输入并可能产生 `.pytest_cache/` 等可忽略缓存。误改时先运行：

```powershell
git diff -- lab evals scripts docs/practice/model-playbook.md
```

确认本轮范围后只恢复自己的改动。验证失败时回到上一张已通过的卡片 revision 和对应 config hash；不要覆盖其他工作树修改。

### 证据边界

命令通过提供 E1：固定 replay、controller 和评测 schema/lineage 在当前实现上工作，且晋级保护拒绝不完整 synthetic matrix。它没有真实 provider、model response、streaming、usage 或费用证据，不能支持任何 E2/E3 可用性或排名结论。

## Revision 与审阅方法

每次修改卡片时追加 revision，不改写旧决定。审阅者按以下顺序检查：

1. 卡片身份是否与 artifact 内 identity 一致；
2. Required 协议行是否都有正负例；
3. Config diff 是否真的只有声明变量；
4. Task/run 分母、split、重复和缺失是否对得上；
5. 决定是否满足预注册 promotion/stop rule；
6. 路由是否只用决策时特征；
7. 回退 config、触发与验证是否可执行；
8. 结论是否超出 source status 和 E0–E3 边界。

Model snapshot/alias、provider/region/API surface、adapter/harness、tool schema、权限/网络、任务分布或 Judge/rubric 变化时，新建 revision 并重跑相应协议与任务集。固定日历可以提醒复核，但不能替代变化触发。

## 常见失真

| 写法 | 问题 | 改法 |
| --- | --- | --- |
| “模型 A 效果很好” | 没有组合、workload 和指标 | 写完整身份、任务和范围 |
| “官方支持，所以已验证” | 混合来源与实验等级 | Source verified、experiment E0 分列 |
| “18 次 run = 18 个任务” | 把重复当独立样本 | 同时报 tasks、runs 与配对结果 |
| “成本 0” | Usage/价格可能缺失 | 写 missing/unknown 与计算口径 |
| “失败就换高档再试” | 可能掩盖环境/协议错误并重置预算 | 先归因，有限升级共享预算 |
| “回退到旧模型” | 配置不完整、不可复现 | 指向精确 rollback config/hash |
| “没有发现问题” | 可能只是覆盖不足 | 写 untested、探针覆盖和限制 |

## 完成检查表

- 标题是否固定到完整 model/provider/adapter/harness/surface？
- 卡片 status、decision、eligibility 和 experiment level 是否互不冒充？
- Workload、范围外、硬门槛、资源上限和验收是否明确？
- Required 协议项是否有正负 probe 和 artifact？
- Default、engineering、candidate 与 rollback 是否各有完整 config/hash？
- Task 数、run 数、区间、失败、缺失、安全和成本是否同时报告？
- 路由是否可执行、使用决策时特征并共享预算？
- 回退是否说明触发、对账、恢复和验证？
- 所有采用语句是否能回链原始 run 与预注册规则？
- 另一位维护者能否仅凭卡片判断何时使用、何时停止、何时重测？

下一步：先完成[端到端适配案例](/practice/end-to-end)，再用[评测实验室](/practice/evaluation)生成自己的 task/run 证据，并将卡片与[兼容性矩阵](/references/compatibility)交叉复核。

## 检查题

1. 为什么同名模型在两个 provider 上不应共用一张结果卡？
2. Source status 为 verified 时，为什么 experiment level 仍可能只是 E0？
3. Candidate 同时扩大权限和预算后，卡片可以支持什么、不能支持什么归因？
4. 为什么 rollback 必须指向完整 config，而不是一个 model name？
5. 当前仓库的离线示例卡为什么可以作为回归基线，却不能作为真实模型采用证据？
