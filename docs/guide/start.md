# 学习路径

这套文档面向具备 Git、CLI、基础编程和基本 LLM 概念的工程师。这里的 **agent harness** 指围绕模型、负责把目标转成可执行循环的工作环境，不是名为 Harness 的持续交付产品。若不确定起点，先做[前置知识自检](/guide/prerequisites)。

## 先建立一个核心判断

实际结果不是模型单独产生的：

```text
结果质量 ≈ 模型能力 × 任务定义 × 可用上下文 × 工具反馈
         × 权限与隔离 × 验证闭环 × 运行预算
```

这不是可计算公式，而是故障定位框架。任何一项接近零，换更强模型也可能没有用。

## 推荐路线

先按你要交付的产物选入口：

| 现在的目标 | 建议投入 | 结束时应有的产物 |
| --- | --- | --- |
| 从零理解 agent harness | 2–3 小时阅读 + 1 个复盘 | 一张当前工作环境的七层图与失败复盘 |
| 优化一个指定模型 | 1 小时准备 + 至少 36 次小型 A/B run | 一张模型适配卡、原始运行记录与路由规则 |
| 从一个 harness 迁移到另一个 | 1–2 小时盘点 + 回归时间 | 职责映射表、目标配置与回归结果 |

时间只是首次实践的量级提示；仓库规模和任务成本会显著改变它。

### 路线 A：第一次系统学习

1. [什么是 Harness](/foundations/what-is-harness)：先分清模型、agent 与 harness。
2. [Agent 循环](/foundations/agent-loop)：理解一次工作如何从观察走到验证。
3. [上下文工程](/foundations/context)与[工具](/foundations/tools)：理解最常见的性能瓶颈。
4. [指令与扩展层](/foundations/instructions)：学会把一次要求放进正确的持久层。
5. [安全与权限](/foundations/security)：建立不能省略的边界。
6. [模型适配方法](/models/adaptation)与[协议兼容](/models/protocol-compatibility)：把知识转成指定模型的配置决策。
7. [实验方法](/optimization/experiment)与[评测方法](/evaluation/method)：理解变量、重复、指标与结论边界。
8. 从[实验环境](/labs/setup)和[离线 Runner](/labs/runner)开始，选择一个领域案例，产出可验证 artifact。

[知识地图](/guide/roadmap)是完整覆盖入口；`foundations/`、`implementation/`、`models/`、`evaluation/` 和 `labs/` 均为当前正式结构。

### 路线 B：我要优化一个指定模型

1. 按[模型适配方法](/models/adaptation)填写适配卡，记录身份、provider、adapter、能力假设、限制与任务分布。
2. 用[协议兼容](/models/protocol-compatibility)排除消息、工具、流式事件与错误语义不匹配。
3. 在[Harness 横向比较](/harnesses/comparison)中确认目标环境能控制哪些变量。
4. 用[提示与任务契约](/optimization/prompting)写出可验证任务。
5. 按[实验方法](/optimization/experiment)每次只改一个主要变量，并用[评测指标](/evaluation/metrics)记录成功、安全、成本与人工介入。
6. 失败时用[问题诊断](/optimization/debugging)区分模型、adapter、harness、fixture 与基础设施根因。
7. 用[跨 Harness 迁移实验](/labs/migration)核对配置职责和结论边界。

### 路线 C：我要迁移工作流

先阅读[横向比较](/harnesses/comparison)，再进入对应的 [Codex](/harnesses/codex)、[Pi](/harnesses/pi) 或 [Claude Code](/harnesses/claude-code) 页面，最后运行[迁移案例](/labs/migration)。迁移时先映射“职责”，不要逐字翻译配置文件。

## 阅读标记

- “原理”页面描述跨产品的稳定机制，可顺序阅读。
- “Harness 实战”页面包含易变产品事实，操作前看页面核对日期与官方来源。
- “实践手册”页面应复制到你自己的实验仓库中使用，而不是只读。
- 页面底部的上一页/下一页按侧栏顺序推进；术语不清时跳到[术语表](/references/glossary)。

本文保留配置和官方界面中的英文（如 provider、schema、run），避免翻译后无法搜索；首次系统阅读时可把[术语表](/references/glossary)保持打开。P50 是中位数，P90 表示 90% 样本不超过该值；它们都必须和样本量一起解释。

## 学习完成标准

完成一次学习不等于读完所有页面。你应该能：

- 画出当前 agent 的观察—决策—行动—验证循环；
- 说出当前任务真正缺的是模型能力、上下文、工具还是验证信号；
- 为项目写一份短而有效的持久指令；
- 在不扩大无关权限的前提下让 agent 完成任务；
- 设计一个至少重复三次、能比较配置的评测；
- 用证据说明某配置在某任务集上更好，而不是泛称某模型“最强”。

最终完成条件以[六项作品集与评分规则](/guide/portfolio)为准。三个安全/复现/证据门禁必须全部通过，总分至少 80%，且任何维度不低于该维度满分的 60%。

<div class="learning-check">
学习检查：任选一个过去失败的 agent 任务，用上述六项复盘。若只能写“模型不够聪明”，先读 Agent 循环与问题诊断。
</div>
