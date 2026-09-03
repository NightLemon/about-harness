# 回归集、Holdout 与持续评测

回归评测不是“每次升级后跑一遍旧题”，而是持续回答三个问题：旧能力是否退化，新改动是否越过安全与成本边界，观察到的差异是否来自同一套可比较条件。它保护的是一个有版本、可追溯、能回退的决策过程，而不是某个孤立分数。

## 三类任务集各做什么

**Development set（开发集）**是允许反复观察并用于调试的任务。可以用它定位工具、指令、上下文、预算和恢复策略的问题；正因为开发者会看到结果，它只能说明对已知任务的适配情况。

**Holdout set（留出集）**是在候选配置、指标和晋级阈值冻结后才揭示结果的未见任务。它用于估计改动能否迁移到同分布的新任务，不能参与选提示词、挑 checkpoint、移动阈值或解释后再返工。每次查看都在消耗它的保密价值；团队若反复针对同一 holdout 调整，它事实上已经变成开发集，应换一批未见任务。

**Incident regression set（事故回归集）**由真实失败最小化、脱敏并固定下来。它不是秘密集合，而是每次相关改动都要运行的已知护栏。事故样本不能只保留“正确答案”，还要保留触发条件、禁止副作用和能够证明修复有效的断言。

| 集合 | 允许看结果后调参 | 运行时机 | 主要用途 | 不能证明 |
| --- | --- | --- | --- | --- |
| development | 是 | 开发循环中频繁运行 | 定位失败、比较单一改动 | 对未见任务有效 |
| holdout | 否 | 候选与规则冻结后 | 检查泛化和晋级门槛 | 脱离该任务分布的通用质量 |
| incident regression | 是，但不能弱化断言 | 每次受影响改动 | 防止已知事故复发 | 未知事故已被覆盖 |

正式比较至少覆盖四类 workload（工作负载），本项目模板覆盖六类。每个配置、每个任务至少重复 3 次；主要独立样本是 task（任务），不是同一 task 的多次 run（运行）。重复可以暴露随机性，却不会凭空增加任务多样性。

## 从任务进入到退出的生命周期

一个回归任务应经过 `proposed → active → quarantined/retired`，不要在失败后悄悄删除：

1. **提出**：记录来源、目标风险、workload、输入许可、预期断言和禁止动作；先确认题目没有把答案泄漏给 agent。
2. **冻结**：给任务、fixture、Judge rubric 和环境生成版本或 hash。输入或 oracle（判定标准）变化后建立新版本，旧结果不再与新版本直接拼接。
3. **激活**：先在 baseline（基线配置）上运行，确认它能区分预期行为，而不是永远通过、永远失败或依赖外部偶然状态。
4. **隔离**：任务出现非产品性不稳定、依赖失效或答案歧义时进入 quarantine（隔离区）。隔离项仍计入报告的缺口，不能从分母中无声消失。
5. **退役**：只在业务场景消失、风险被替代任务完整覆盖或数据许可到期时退役；保存退役日期、原因、最后版本和替代任务 ID。

任务清单至少记录 `task_id`、版本、split、workload、风险标签、fixture hash、断言版本、创建来源、状态和替代关系。运行记录则保存 config/model/harness/instruction 身份、时间与成本、退出码、失败分类和原始证据位置。二者分开，才能判断“系统变了”还是“题目变了”。

## Holdout 污染与泄漏

以下任一行为都会污染 holdout：把输入、断言或 Judge 反馈放进开发提示；看结果后选择候选；只重跑失败题并保留成功题；按 holdout 结果修改阈值；把泄漏题改名后继续当未见题。日志访问、调试 trace 和聚合分数也属于“看过结果”，不只完整答案才算揭示。

发现泄漏时应立即停止本轮晋级，标记受影响的候选和观察时间，保留原始记录供审计，把已揭示任务降为 development 或常规 regression，并从同一目标分布重新抽取真正未见的 holdout。不能把泄漏题从报表中删掉后继续宣称该轮有效。

若团队需要频繁发布，优先维护滚动 holdout 池：每轮只揭示一个预注册子集；子集揭示后退出秘密池，由新任务补入。样本量、抽样方式和轮换条件都应在看结果前确定。

## 什么变化触发哪些回归

“只跑受影响子集”必须有依赖依据。无法证明影响边界时，运行完整集合。

| 变化 | 最小检查 | 晋级前检查 | 需要新身份或版本 |
| --- | --- | --- | --- |
| 精确 model/provider 或采样参数 | 协议 smoke、development | 相关完整矩阵与未见 holdout | 新 `config_id` 或 config version |
| harness、adapter、消息/流协议 | 契约负例、受影响 workload | 相关 development、事故集和 holdout | harness/adapter 版本 |
| 工具 schema、权限或副作用策略 | 工具契约、安全拒绝、幂等/回滚 | 所有会调用该工具的任务 | schema 与 policy hash |
| system instruction、上下文选择或 memory | 相关 development | 冻结后再开 holdout | instruction/config hash |
| fixture、task 或 Judge rubric | 新旧断言校验、baseline 重跑 | 新版本完整矩阵 | task/fixture/rubric 版本 |
| runner、计费器或聚合脚本 | checker 自测、旧记录重放 | 重新生成所有受影响指标 | evaluator 版本 |
| 依赖、操作系统或运行镜像 | 安装与协议 smoke | 对环境敏感的回归集 | environment/image digest |
| 新生产事故 | 最小化后的单个负例 | 加入事故集并运行相关配置 | 新 incident/task ID |

同一 `config_id` 内的 model、provider、adapter、harness、instruction hash 与证据等级必须一致。模型 alias 指向变化也算身份变化；不能把 alias 相同当成底层模型相同。仅文案、无运行时影响的改动可以不跑模型评测，但仍应运行文档或 schema 门禁并留下影响判断。

## 失败、重跑与 Flaky 规则

**Flaky test（不稳定测试）**是相同身份和输入下结果会在通过与失败之间漂移的测试。先区分产品失败与基础设施失败：

- `contract`、`context`、`planning`、`tool`、`execution`、`verification`、`safety`、`budget` 是候选行为的一部分，应按预注册统计规则进入结果；
- provider 5xx、runner 崩溃、机器磁盘耗尽等与候选无关的故障记为 `infrastructure`。可以按预注册次数重跑，但原行、退出码和失败证据必须保留；
- 不能看到失败后才把它改叫基础设施问题。分类规则、最大尝试次数、退避和最终计分方式应在运行前冻结；
- 重跑要有新的 `run_id`，并能关联原尝试。当前项目的示例 schema 能记录 `failure_type=infrastructure`，但尚无 `attempt_of` 字段；正式研究需要在扩展 schema 或独立运行清单中保存这条关系；
- 同一 task 超过预注册的不稳定阈值时，停止候选比较，诊断随机源。若必须隔离，报告隔离数量、原因和对各配置是否对称，不能只隔离候选失败项。

安全违规、未授权副作用、凭据或个人数据暴露、费用越界、身份不明、fixture hash 不匹配时立即停止。此类失败不能靠增加重跑次数“洗成通过”。

## 晋级、否决与回退

先冻结候选，再按顺序判断：

1. **有效性**：任务、配置、环境和运行谱系完整，矩阵缺失与排除项已经公开；
2. **硬护栏**：安全违规为零，权限、数据处理和停止条件全部满足；
3. **质量**：在 task 层面的主指标达到预注册的最小改善，并报告区间、win/loss/tie 和失败分布；
4. **资源**：p90 延迟、token、费用、工具错误和人工接管没有越过护栏；
5. **可恢复性**：默认配置、依赖和数据迁移存在可执行回退路径，回退本身通过 smoke test。

任何硬门槛失败都否决候选；不要删除失败 task、换分母或在看结果后降低阈值。候选被否决时保留上一默认配置及其可复现结果，记录否决原因和下一次允许重试的变化条件。若已经上线，先切回锁定的上一版本，再验证关键 incident regression，而不是边修边继续扩大流量。

Baseline 不是“最近一次成功”这么简单。应固定 config、模型快照或精确 ID、harness、工具 schema、指令、fixture、环境和结果引用；供应方无法固定模型时，记录核验时间并把不可控漂移列入限制。旧 baseline 至少保留到新默认经历一个完整观察窗口且回退不再需要为止。

## 把生产事故转成回归任务

事故进入仓库前先复制到隔离环境，移除凭据、个人数据、内部域名和无关上下文；用 fake/replay 替换真实副作用。然后做最小化：每删一段输入都重现一次，直到再删就不触发。最终任务同时包含：

- 触发失败的最小输入和版本化 fixture；
- 修复前应失败、修复后应通过的正向断言；
- “不得调用真实端点、不得写出范围、不得泄露字段”等负向断言；
- 原事故与公开任务之间的内部映射，但公开文件不含敏感原文；
- cleanup（清理）和 rollback（回滚）步骤，以及风险不再适用时的退役条件。

最小化样例证明“这个故障模式被覆盖”，不证明整个生产请求分布都安全。事故涉及的新风险还应补充邻近反例，避免只记住一个字符串。

## 在本项目验证一次

### 前置条件与固定输入

从仓库根目录运行，要求 Node.js 22+，并已按 `package-lock.json` 安装依赖。输入是 `evals/study.example.json`、`tasks.example.jsonl`、`fixture-refs.example.json` 和 `runs.example.jsonl`；后者是固定的离线 replay（重放）样例，不调用真实模型、网络或付费 API。

### 命令

```powershell
npm run eval:validate
npm run eval:summary
```

### 预期输出与断言

Validator 应报告 20 个 task、6 类 workload、2 个 config、3 次重复、6 个 holdout，故正式矩阵是 `20 × 2 × 3 = 120` 个单元。样例只有 12 个 development E1 单元，缺 108 个，`sample_matrix_complete=false`。

Summary 应满足：

- `matrix.complete=false`、`promotion_eligible=false`；
- 阻断项同时包含 `incomplete_matrix` 与 `evidence_below_target`；
- 两个 config 的 `by_split.holdout` 都是 `null`；
- development 配对为 5 win、0 loss、1 tie，但这不能覆盖缺失矩阵或证据边界。

这个输出是 E1：它证明 schema、fixture lineage、矩阵统计和报告路径能处理固定样例，不证明 `offline-engineering` 对真实模型更好。汇总器只会在结构条件满足后，用完整 holdout 执行 run-level 通过率和 P90 费用点估计阈值；当前样例因此保持 `blocked`。Task-level 聚合、区间、污染审计和最终采用仍必须按[指标与区间](/evaluation/metrics)另行复核。

### 失败案例、停止与恢复

若命令因 duplicate cell、split mismatch、identity drift 或 fixture hash 失败，不要编辑 run 让它“看起来正确”；先停止比较，定位产生坏记录的 runner 或输入版本。若输出意外出现 holdout run，先确认它是否已按冻结流程授权揭示；否则按污染处理。

上述命令只读受版本控制的输入并向终端输出，不创建需要清理的实验数据。误改样例时可查看 `git diff -- evals/`，只恢复自己本轮改动的行；不要用会覆盖他人工作的整库重置。正式运行产生新记录时写入新的版本化结果文件，回退时保留失败记录并恢复上一锁定 config，而不是覆盖历史。

## 已知限制与下一步

当前示例没有真实 provider、真实费用、完整重复、holdout run、事故任务状态、重跑谱系和自动回退演练，因此不能宣称 E2/E3、生产可用或模型质量。回归集还会继承任务抽样偏差、Judge 偏差和未覆盖风险；通过只表示“这些锁定断言没有发现退化”。

接下来用[实验方法](/optimization/experiment)冻结候选，在[指标与区间](/evaluation/metrics)定义晋级阈值，再按[结果报告](/evaluation/reporting)分别公开 development、holdout、排除项和回退决定。

## 检查题

1. 为什么同一任务重复 10 次不能算 10 个独立任务？
2. 修改工具权限后，哪些依赖证据能支持只跑部分回归？
3. 基础设施失败重跑后，为什么原失败仍必须保留？
4. 团队看过 holdout 的 Judge 反馈并修改提示词后，应如何处理这批任务？
