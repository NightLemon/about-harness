# 学习路径：从理解 Harness 到交付可复核证据

## 这套站点怎样使用

这套文档面向具备 Git、CLI、基础编程和基本 LLM 概念的工程师。这里的 Agent Harness 指围绕模型、把目标转成受控执行循环的工作环境，不是名为 Harness 的持续交付产品。

你不需要从侧栏第一页读到最后一页。先选一个要交付的 artifact（产物），沿对应路线完成一次小闭环，再回到[知识地图](/guide/roadmap)补缺。环境还没准备好时先做[前置知识自检](/guide/prerequisites)。

## 先建立一个核心判断

实际结果不是模型单独产生的：

```text
结果质量 ≈ 模型能力 × Task 定义 × Context 选择 × Tool 反馈
         × Policy/隔离 × State/恢复 × Validator × 运行预算
```

这不是可计算公式，而是故障定位框架。任何一项接近零，换更强模型也可能没有用；同一模型在不同 Harness 中表现不同，也不自动说明其中一个产品“更聪明”。

每次遇到失败先问：

1. 输入和模型/Provider 身份是否确定？
2. 模型实际看到了哪些 instruction/context？
3. ToolCall 与 ToolResult 是否完整映射？
4. Policy、sandbox、network 是否让必要路径不可达？
5. State、retry、checkpoint 是否导致重复或丢失？
6. Validator 是否真的覆盖业务 acceptance？

## 第一次进入项目：30 分钟基线

时间只是学习节奏参考，不是性能承诺。先在仓库根目录执行：

```powershell
node --version
python --version
uv --version
git status --short --branch
uv run --frozen --offline python scripts/lab-smoke.py
```

前置条件是 Node.js 22+、Python 3.11+、`uv 0.11.16`，且锁定依赖已进入 cache。预期 smoke 为 `status=completed`、`offline=true`、一个 ToolCall，并产生结构化 trace。

这条 E1 只证明最小 fake loop 可运行，不证明真实模型。命令需要网络/凭据、工作树中 Lab 改动来源不明或输出泄露私人路径时立即停止，先处理环境边界。

## 按交付物选择路线

| 当前目标 | 先交付什么 | 最小证据 | 何时停止 |
| --- | --- | --- | --- |
| 系统理解 | 一张责任图 + 一条成功/失败 trace | E1 fake/replay | 不能指出 validator 与 policy 所有者 |
| 指定模型适配 | Model/Harness 配置卡 + 协议 probe 设计 | E0 设计，获准后 E2 | 身份、协议或费用边界未知 |
| 配置优化 | Study + 配对 run + 路由规则 | E3 才支持代表性结论 | 矩阵缺失、安全违规或混杂变量 |
| Harness 迁移 | 六类责任 mapping + gap/补偿 | E1 seam，目标 E2 | 边界扩大或 state 无法对账 |
| 事故诊断 | 最小失败 fixture + 根因/回归 | 与原问题匹配 | 只能写“模型不聪明” |

路线可以交叉，但不要越级：协议未合格时不做模型排名；离线 seam 通过时不声称真实产品可用。

## 路线 A：第一次系统学习

### 第一阶段：建立语言和边界

1. [什么是 Harness](/foundations/what-is-harness)：分清 model、Agent、Harness、执行环境和人；
2. [系统架构](/foundations/architecture)：把组件放入 data/control/evidence plane；
3. [Agent 循环](/foundations/agent-loop)：跟踪 Action 从提议到执行、验证与停止。

阶段产物：画一张你正在使用的 Agent 系统图，标出 Task ingress、Adapter、controller、policy、tool、state、validator 和 trace。未知项写 `unknown`。

### 第二阶段：理解最常见的质量杠杆

1. [上下文工程](/foundations/context)：实际发送什么，而不是仓库里有什么；
2. [工具与协议](/foundations/tools)：ToolCall、授权、幂等和 ToolResult；
3. [指令与扩展层](/foundations/instructions)：要求应该放进 Task、项目指令、Skill、Hook 还是门禁；
4. [状态与可靠执行](/foundations/state-reliability)：checkpoint、retry、cancel 与副作用对账。

阶段产物：选一次失败 run，分别写出 context、tool、state 三种替代解释，并指出需要哪条证据排除。

### 第三阶段：建立控制与安全

1. [安全与权限](/foundations/security)：资产、信任边界、最小能力和事件响应；
2. [人在循环中](/foundations/human-control)：区分范围确认、动作授权、歧义裁决和结果验收；
3. [可观测性](/foundations/observability)：定义足够复盘而不过度收集的事件。

阶段产物：为同一任务列出自动执行、ask、deny 三类动作，并为一个拒绝设计无副作用负例。

### 第四阶段：运行参考实现

1. [实验环境](/labs/setup)：理解 fixture、runner、result、eval；
2. [离线 Runner](/labs/runner)：运行 hash 失败和负例；
3. [Python 最小 Harness](/implementation/minimal-harness-python)：阅读真实 contract/loop/policy/tool/trace；
4. 选择一个领域 Lab，保存命令、fixture hash、结果与限制。

完成标志：能从 trace 说明哪个组件提出动作、哪个组件允许执行、哪个组件判定通过，并准确写出 E1 不能证明什么。

## 路线 B：适配一个指定模型

### B1. 冻结身份

按[模型适配方法](/models/adaptation)填写：精确 model/provider、surface、Adapter、Harness、配置、context、tools、预算和来源日期。Alias 与 resolved identity 分开。

### B2. 做协议资格测试

用[协议兼容](/models/protocol-compatibility)覆盖 messages、tool/result、stream、stop/error、usage、cancel/retry。任一关键 probe 失败，先修 Adapter，不进入能力评测。

### B3. 固定 Harness

在[Harness 横向比较](/harnesses/comparison)中确认 instruction、tool、sandbox、approval、network、state 与 validator。比较模型时这些变量保持一致。

### B4. 写 Task 与研究设计

用[提示与任务契约](/optimization/prompting)写输入、允许范围、acceptance、budget、stop 和 rollback；按[实验方法](/optimization/experiment)建立 development/holdout、重复与预注册阈值。

### B5. 选择指标并诊断

按[评测方法](/evaluation/method)和[评测指标](/evaluation/metrics)报告 task acceptance、安全、失败分布、时长、token/费用与人工介入。失败时用[问题诊断](/optimization/debugging)区分模型、Adapter、Harness、fixture、validator 与基础设施。

阶段产物：不是“模型 A 最强”，而是“在固定组合和任务范围内，配置 A/B 的差异、证据等级、未决项和路由规则”。

## 路线 C：迁移工作流

1. 先读[Harness 横向比较](/harnesses/comparison)，按责任而不是功能名称对照；
2. 阅读目标 [Codex](/harnesses/codex)、[Pi](/harnesses/pi) 或 [Claude Code](/harnesses/claude-code) 专题，记录来源/版本；
3. 在[跨 Harness 迁移实验](/labs/migration)中填写 instructions、tools、sandbox、approval、network、state；
4. 为每项写 source semantics、target semantics、gap、compensating control 和 evidence axis；
5. 在目标环境先做 read-only/deny/ask/network/resume E2 probe，再做 workload shadow；
6. 保存 source checkpoint、cutover threshold 和 rollback trigger。

阶段产物：一张 2×6 责任表、领域状态清单、目标资格结果和回退包。配置逐字复制、权限扩大或未知写操作无法对账时停止迁移。

## 路线 D：修复一个失败的 Agent 任务

1. 固定失败输入、commit、config、model/provider 和完整 trace；
2. 在[问题诊断](/optimization/debugging)中先分类为 contract、context、protocol、policy、tool、state、validator、model 或 infrastructure；
3. 缩小为最小可重复 fixture，保留原失败；
4. 一次只改一个主要变量；
5. 重跑原失败、相邻正例和安全负例；
6. 将最小案例加入 regression，不把事故原文或 Secret 写进公开 fixture。

如果“修复”只是提高预算、无限重试或放宽权限，先证明根因确实在预算/权限，而不是用更大影响面掩盖问题。

## 怎样阅读不同页面

| 页面类型 | 重点看什么 | 不应直接推导 |
| --- | --- | --- |
| Foundations | 稳定机制、因果、反例 | 某产品当前一定这样实现 |
| Harness/Model | 来源、版本、核对日期、surface | 账号可用、质量优胜 |
| Implementation | Contract、状态机、测试、已知限制 | 生产级完整性 |
| Optimization/Evaluation | 变量、样本、指标、不确定性 | 跨 workload 通用排名 |
| Labs | Fixture、命令、断言、负例、E1 边界 | Live framework/model 可用 |
| References | 事实注册、术语和兼容状态 | 自动升级证据等级 |

页面中的 expected output 是验证目标，不是已运行证据。只有保存实际命令、退出码、artifact 和环境，才能形成新的 run。

## E0–E3 阅读标记

```text
E0  设计、来源或待验证主张
E1  离线 fake/replay/确定性 seam
E2  获授权的真实可用性 probe
E3  代表性 workload 的重复实验
```

Source status（verified/pending/conflict）与 experiment level 是两条轴。官方页面已核验只支持产品事实，不会把未运行配置升级为 E2。

## 学习记录模板

每完成一页或一个实验，追加：

```text
Question:
Current hypothesis:
Environment/commit/config:
Input/fixture hash:
Command + exit code:
Observed result:
Failure/alternative explanations:
Evidence level:
What this does not prove:
Next regression or decision:
```

这比收藏链接或复制输出更能形成可迁移能力。

## 常见错误路线

| 错误路线 | 为什么失真 | 修正 |
| --- | --- | --- |
| 先找“最强模型” | Workload/Harness/预算未定义 | 先写 Task 和配置卡 |
| 直接给 Agent 全工具 | 选择歧义与攻击面扩大 | 按阶段暴露最小工具集 |
| 只看最终答案 | 协议、工具和验证错误被隐藏 | 保存 trace/diff/test |
| 静态检查通过就宣布可用 | 没有真实运行 | 明确 E0，设计 E2 |
| 一次成功就晋级 | 随机性和失败分布不可见 | 重复、holdout、区间 |
| 遇错无限重试 | 可能重复副作用并污染分母 | 分类、幂等、预算、对账 |
| 每一步都询问 | 产生审批疲劳 | 只在风险边界设控制点 |
| 为通过门禁删除失败 | 证据失真 | 保留失败并修根因 |

## 每个阶段的停止与回滚

出现以下情况停止扩大范围：模型/Provider 身份不明、fixture 漂移、协议资格失败、Secret/私人路径进入 trace、权限超出 Task、外部写状态未知、安全违规或完整矩阵缺失。

候选修改放在隔离 worktree/分支；保存上一版 config、fixture、checkpoint 和 validator。回滚只处理本轮候选，不能覆盖其他人的工作；外部副作用必须在目标系统对账，Git revert 不能撤回已发送消息或费用。

## 学习完成标准

完成一次学习不等于读完所有页面。你应该能：

- 画出当前 Agent 的观察—决策—行动—验证循环与三个平面；
- 为任务写结构化输入、工具、acceptance、budget、stop 和 rollback；
- 解释模型、Adapter、Harness、工具、fixture 和 validator 的不同失败；
- 在不扩大无关权限的前提下完成一个离线 Task；
- 运行正例与负例，并保存可复现 E1 artifact；
- 设计含重复、holdout、安全门槛和不确定性的评测；
- 用限定 workload 的证据形成路由或迁移结论，而不是全局排名。

最终完成条件以[六项作品集与评分规则](/guide/portfolio)为准：安全、可复现、证据、外部验收、恢复和公开卫生门槛全部通过，加权总分至少 80，且任何维度原始分不低于 60。

<div class="learning-check">
学习检查：任选一个过去失败的 Agent 任务，用身份、Context、Tool、Policy、State、Validator 六项复盘。若只能写“模型不够聪明”，先回到 Agent 循环与问题诊断。
</div>
