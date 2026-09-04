# 学习作品集与评分规则

## 作品集要证明什么

阅读完成不等于能力形成。Portfolio（作品集）应让另一位读者在不了解你的思考过程时，仅凭版本、输入、命令、artifact（产物）和失败记录，判断你能否：

- 把 Agent 系统拆成 Harness、模型、Provider、工具和环境责任；
- 将模糊需求写成可判定的 Task；
- 用 fake/replay 建立离线基线，并准确限制证据等级；
- 发现协议、权限、状态、验证与恢复缺口；
- 用实验而不是印象比较配置；
- 在失败、费用或风险超限时停止和回退。

作品集不是截图合集、Prompt 收藏或一次成功 demo。最有价值的部分通常是失败样例、归因过程、未决项和你为什么没有扩大结论。

## 建议目录

可以使用下面的结构，也可以映射到现有仓库；文件名不是评分对象，责任和证据才是：

```text
portfolio/
  README.md
  environment.md
  knowledge-map.md
  harness/
    task.json
    config.json
    trace.jsonl
    result.json
  model-card/
    adaptation.md
    protocol-probes.md
  evaluation/
    study.json
    runs.jsonl
    report.md
  security/
    threat-model.md
    incident-drill.md
  migration/
    responsibility-map.md
    result.json
  evidence/
    commands.jsonl
    unresolved.md
```

真实 Secret、私人绝对路径、账号 ID、未脱敏 trace 和许可不明的数据不得进入作品集。公开版本应使用合成 fixture 或已获授权且完成脱敏的数据。

## 六项核心产物

### 1. 完整知识地图

至少画出并解释：Task → context → model/provider → Action → policy → tool → observation → validator → state/recovery。再标出指令、记忆、权限、预算、可观测性和治理从哪里进入。

通过条件：

- 每个组件有输入、输出、所有者和失败方式；
- 区分概率性模型与确定性控制；
- 区分 instruction、approval、sandbox 与 network；
- 至少跟踪一条成功路径和一条失败/取消路径。

不合格示例：只列产品名；把“Agent 会思考”当控制循环；看不到谁最终判定任务完成。

### 2. 最小 Harness 实现

使用 fake/replay 完成一个小任务，支持完成、拒权、无效 Action、未知工具、超时、预算耗尽和 checkpoint 恢复，产生结构化 trace/result。

还没有自己的设计时，先用[Harness 设计工作表](/practice/harness-design)冻结 Task、责任、Action 生命周期、权限和恢复规则，再进入实现。

通过条件：

- Task 明确输入、工具、acceptance、预算和 stop；
- 模型输出先经过 runtime validation 和 policy；
- 非有限 budget/cost、重复或空工具名等坏输入 fail closed；
- ToolResult 与 call ID 可追溯；
- completed 由外部 validator 确认；
- 失败类型和恢复点可机器读取。

不合格示例：模型返回“完成”就成功；错误全部 catch 后写成空结果；只演示 happy path。

### 3. 指定模型适配卡

冻结精确 model/provider/surface/Adapter/Harness/config，记录协议假设、context、tool、reasoning、stream、usage、预算和来源日期。

通过条件：

- Alias 与 resolved identity 分开；
- 稳定机制、产品事实、项目建议和实验结果分开；
- tool/result、stop/error、stream/cancel、usage 均有 probe 设计；
- `pending` 或 `unknown` 不被旧数字补空；
- 没跑 live 时明确停在 E0/E1。

不合格示例：只写模型家族名和上下文数字；用模型自报身份；用公开 benchmark 推断自己的 Harness 表现。

### 4. 配对实验报告

用相同 Task 和资源比较 baseline（基线）与 candidate（候选）。保存 study、fixture lineage、完整 run、失败分布、指标和晋级判断。

通过条件：

- Workload、split、重复次数和阈值事前定义；
- 每个 run 绑定 task/config/fixture/model/Harness；
- 报告 pass、safety、duration、cost/token、tool error 与 human turn；
- development 与 holdout 分开；
- 矩阵缺失时阻止晋级；
- 结论包含适用范围与不确定性。

不合格示例：只挑候选成功样本；两边使用不同工具权限；删除 infrastructure failure 后不披露。

### 5. 安全边界与威胁模型

说明资产、身份、不可信输入、边界、攻击路径、预防/检测、人工批准、停止、事件响应和恢复。至少运行一个 Prompt injection 或权限扩大负例。

通过条件：

- 自然语言 instruction 与强制 policy 分开；
- Secret、网络、文件、工具和供应链各有边界；
- 写操作使用最小权限、幂等或对账机制；
- Trace 有脱敏与保留策略；
- 事件演练记录发现、遏制、恢复和防回归。

不合格示例：唯一控制是“要求模型不要泄密”；权限广泛但理由是“会询问用户”。

### 6. 跨 Harness 迁移报告

把同一任务在 Codex、Pi 与 Claude Code 中的 instructions、tools、sandbox、approval、network 和 state 逐项映射。

通过条件：

- 每项有 source semantics、target semantics、gap、compensating control 和 evidence axis；
- 不逐字复制配置并假装语义相同；
- 目标边界不比源边界更宽，或扩大经过明确风险决策；
- 领域状态、validator、checkpoint 与回滚一并迁移；
- 未运行的产品保持 `untested`。

不合格示例：只改配置文件名；把 approval 当作 OS sandbox；恢复对话却丢失未知写操作状态。

## 一条贯穿六项产物的任务

最好的作品集不是六个无关作业。选择一个足够小、但能贯穿所有责任的合成任务：

```text
Task: 修复固定仓库中的边界错误，并生成可审计报告
Input: 固定 commit + 合成 fixture + 一个失败测试
Allowed: read/search/edit/targeted-test
Forbidden: network/dependency/credentials/out-of-scope paths
Acceptance: 失败先复现；目标与回归通过；diff 受限；报告可解析
Negative: 页面/文件诱导读取 Secret；工具 timeout；重复 Action
Budget: steps/calls/time；费用为 0
Rollback: 隔离候选，恢复旧 commit，保留 trace/result
```

知识地图解释系统，最小 Harness 执行它，模型卡设计未来接入，实验比较两个控制配置，威胁模型攻击它，迁移报告把责任搬到另一 Harness。这样每项证据可以互相引用，又不会重复制造六套背景。

## 每项都要附的证据包

| 证据 | 最低内容 | 为什么需要 |
| --- | --- | --- |
| Environment | OS、工具版本、commit、dirty paths | 判断能否复现与是否受未提交改动影响 |
| Input identity | fixture/path/hash/license/date | 防止输入漂移与来源不明 |
| Config identity | Harness/model/provider/Adapter/policy hash | 区分系统组合 |
| Command record | 精确命令、时间、exit code | 区分“计划运行”和“实际运行” |
| Trace/result | schema version、run ID、终态、失败分类 | 支持机器与人工复核 |
| Negative evidence | 至少一个失败输入及预期拒绝 | 证明门槛不是恒真 |
| Recovery | checkpoint、cleanup、rollback 实际结果 | 证明失败可控 |
| Boundary | E0/E1/E2/E3、untested、unresolved | 防止结论升级 |

命令退出 `0` 只是其中一列。作品集必须把命令结果连接到业务 acceptance；例如测试通过还需确认 diff 没越界，来源引用正确且没有安全违规。

## 必过门槛

以下属于资格门槛，不参与加权补偿。任一失败，本次作品集不通过：

1. **安全边界**：没有未解释的危险权限、Secret/隐私泄漏或未处理的真实副作用；
2. **可复现性**：环境、版本、输入、配置、命令和身份能定位，关键 hash 可重算；
3. **证据诚实**：实际结果、失败和未运行项被保留，不把 E1 写成 E2/E3；
4. **外部验收**：至少一个 validator 不依赖模型自报完成；
5. **恢复能力**：失败候选有停止和回滚路径，未知写操作先对账；
6. **公开卫生**：无真实凭据、个人路径、未脱敏 trace 和许可不明数据。

门槛的目的不是让作品集看起来复杂，而是排除“分数很高但不可安全复现”的结果。门槛失败后，评分者应指出具体证据缺口和修复路径，而不是只给“不通过”。

## 加权评分

门槛全部通过后，再按四个维度评分：

| 维度 | 权重 | 评分问题 |
| --- | ---: | --- |
| 正确性 | 40% | 术语、实现、断言和结论是否与保存证据一致？ |
| 因果解释与证据 | 25% | 能否区分模型、Adapter、Harness、fixture、validator 与基础设施根因？ |
| 迁移性 | 20% | 责任能否映射到另一 surface，并说明不可迁移和补偿之处？ |
| 效率与成本 | 15% | 是否报告时间、token/费用、工具、人工介入和失败成本？ |

四个维度先按 0–100 原始分评分，再计算：

```text
总分 = 正确性×0.40
     + 因果解释与证据×0.25
     + 迁移性×0.20
     + 效率与成本×0.15
```

通过要求：加权总分至少 80，且每个维度原始分至少 60。任何维度原始分低于 60，即使加权总分达到 80 也不通过。例如正确性原始分 60 对总分贡献 24；不是“正确性至少 24 原始分”。

## 统一评分锚点

| 原始分 | 可观察条件 |
| ---: | --- |
| 0 | 产物缺失，或核心结论与证据直接冲突 |
| 25 | 有文件或 demo，但身份、命令、失败和边界多数不可追溯 |
| 50 分 | 主流程存在，环境、失败记录、复现命令或适用边界明显不完整 |
| 60 | 达到最低可复核线：关键身份、正负例、结果与限制基本齐全 |
| 75 分 | 固定版本与输入可复现，主张逐项有证据，失败和边界如实记录 |
| 90 | 在 75 基础上有独立复核、留出集、防回归与可信归因 |
| 100 分 | 在 90 基础上完成跨环境复现、事件恢复、迁移验证及成本/安全权衡 |

评分者可以在锚点间取值，但每个分数必须引用 artifact 路径和具体观察。不能因为页面漂亮、术语多或命令数量大而加分。

## 四个维度怎么看

### 正确性

高分需要：schema 和 runtime 行为一致；失败终态不伪装完成；业务 validator 覆盖 Task acceptance；文档结论不超过结果。测试数量本身不加分，关键在是否覆盖真实边界和负例。

### 因果解释与证据

高分需要：能从 trace 区分输入、模型、Adapter、工具、policy、validator 和基础设施；单变量实验；披露缺失、异常和 alternative explanation（替代解释）。

### 迁移性

高分需要：迁移责任而非文件名；指出目标缺口与补偿控制；在另一 surface/环境至少验证一个关键边界。宣称“通用”却没有迁移证据会降分。

### 效率与成本

高分需要：端到端 wall time、模型/工具调用、token/费用、人工轮次、失败重试和基础设施成本口径明确；优化后质量与安全没有退化。费用 unknown 时诚实标记，不用估值补空。

## 自评与独立复核

推荐顺序：

1. 作者先逐项跑必过门槛，失败就修，不计算总分；
2. 作者按四维 rubric 自评，并给每个分数附证据；
3. 第二位审阅者在不看作者总分的情况下独立评分；
4. 任一维度分差超过 10 分，双方回到 artifact 对齐事实；
5. 保存两份原始评分、差异理由和最终决定，不只保留平均数。

Model judge（模型评审）可以帮助找遗漏，但不能成为唯一评分者。它可能受到提示、展示顺序和自身知识误差影响；最终报告保留规则/测试证据和需要人工确认的安全、许可与业务判断。

评分记录示意：

```text
dimension: causal-evidence
reviewer: independent-2
score: 75
evidence: evaluation/report.md + evidence/commands.jsonl
strength: run failure types link back to trace
gap: infrastructure failures lack separate denominator
required_fix: add classification table and recompute
```

## 建议验证顺序

在作品集仓库中先运行最接近任务的目标测试，再运行完整验证。本项目对应基线是：

```powershell
npm run check
npm run facts:check
npm run pages:check
npm run verify
```

还应运行作品集自己的业务验收，例如 fixture hash 重算、schema 校验、失败注入、diff allowlist 和 checkpoint 恢复。仓库门禁绿色不能替代这些自定义断言。

记录每条命令的开始/结束时间、版本、退出码和输出 artifact。没有运行的步骤写“未运行 + 原因 + 风险”，不得复制预期输出冒充结果。

## 失败、清理与回滚

如果独立复核发现证据与结论冲突，先撤回结论，不删除不利 run。若安全门槛失败，停止 live/外部写操作，轮换可能暴露的凭据并保留脱敏事件记录。

实验候选应位于隔离 worktree、容器或明确目录；回滚只删除/恢复本轮候选，不覆盖 baseline、旧结果或其他人的工作。清理 cache 前用版本控制确认范围；外部副作用必须由目标系统对账，不能靠删除本地 trace 假装回滚。

## 最终答辩问题

完成作品集后，你应能用保存证据回答：

1. 系统最终由谁判定 Task 完成，模型能否绕过？
2. 最有价值的失败样例是什么，它改变了哪个设计？
3. 哪条结论只有 E0/E1，升级到 E2/E3 还缺什么？
4. 如果模型不变而结果变化，你如何检查 Harness/Adapter/fixture 根因？
5. 哪项权限是技术隔离，哪项只是指令或批准流程？
6. 迁移到另一 Harness 时，哪个责任无法逐字复制？
7. 候选晋级后出现账单、安全或质量异常，如何停止和恢复？

下一步按[学习路径](/guide/start)选择贯穿任务，从[实验环境](/labs/setup)收集第一条 E1 证据，再用[评测实践](/practice/evaluation)形成可复核报告。
