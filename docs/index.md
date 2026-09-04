---
layout: home

hero:
  name: About Harness
  text: 为指定模型设计并验证工作环境
  tagline: 系统学习 agent loop、上下文、指令、工具、权限、记忆、可靠执行和评测；在明确工作负载中验证 Codex、Pi、Claude Code 等 harness 的配置。
  image:
    src: /logo.svg
    alt: About Harness
  actions:
    - theme: brand
      text: 开始学习
      link: /guide/start
    - theme: alt
      text: 查看作品集
      link: /guide/portfolio

features:
  - icon: 🧭
    title: 建立完整心智模型
    details: 区分 model、provider、adapter、agent、framework、runtime、protocol、surface 与 harness，定位真正的责任边界。
  - icon: 🧪
    title: 用实验替代排行榜
    details: 固定任务、版本、fixture、预算和评分标准，分清 E0 假设、E1 离线证据、E2 烟测与 E3 正式比较。
  - icon: 🧰
    title: 跨 Harness 迁移
    details: 理解 AGENTS.md、CLAUDE.md、skills、hooks、MCP、extensions 等机制的等价关系与真实差异。
  - icon: 🛡️
    title: 把安全做进工作流
    details: 用最小权限、隔离、审批、验证和回滚控制 agent 风险，而不是把所有责任交给模型自律。
---

## 学完后你能交付什么

你不会得到一个永远正确的“最佳模型”答案。你会获得一套能够反复回答这类问题的方法：

> 给定模型 M、任务集 W、harness H 与资源约束 B，哪组指令、工具、上下文、权限和推理设置能在可接受成本内稳定达到验收标准？

这套方法把“感觉某模型更聪明”改写为可检查的工程问题。你将完成知识地图、最小 harness、模型适配卡、配对实验、安全边界和跨 harness 迁移报告六项作品。

先读[学习路径](/guide/start)，核对[前置知识](/guide/prerequisites)与[知识地图](/guide/roadmap)，再按[作品集 rubric](/guide/portfolio)收集证据。

## 按你眼前的问题进入

不必从侧栏第一篇顺序读到最后一篇。先选择一个真实问题，完成最短闭环，再回到知识地图补齐依赖。

| 你现在想解决什么 | 第一站 | 接着做什么 | 应得到的产物 |
| --- | --- | --- | --- |
| 看懂 Agent 为什么会行动或停止 | [Agent 循环](/foundations/agent-loop) | 跟读[Python 最小 Harness](/implementation/minimal-harness-python) | 一张 observe–decide–act–verify 状态图 |
| 从零设计自己的 Harness | [系统架构](/foundations/architecture) | 填写[Harness 设计工作表](/practice/harness-design) | Task、责任图、Action 生命周期与验证计划 |
| 判断失败来自模型还是工作环境 | [问题诊断](/optimization/debugging) | 用[可观测性](/foundations/observability)补证据 | 最小失败 fixture、根因与回归用例 |
| 为指定模型选择配置 | [模型适配方法](/models/adaptation) | 完成[模型适配卡](/practice/model-playbook) | 固定身份、协议探针、路由与回退规则 |
| 判断是否值得引入 Framework | [Framework 对照](/frameworks/comparison) | 填写[选型工作表](/practice/framework-selection) | Task 形状、基线、资格矩阵与采用决定 |
| 比较 Codex、Pi、Claude Code | [Harness 对照](/harnesses/comparison) | 运行[迁移实验](/labs/migration) | 六类责任表、gap 与补偿控制 |
| 设计可靠的 Tool | [工具设计](/foundations/tools) | 对照[Adapter 契约](/implementation/adapter-contract) | 输入 schema、policy、错误与幂等契约 |
| 开始做可复现评测 | [评测方法](/evaluation/method) | 运行[评测实验室](/practice/evaluation) | Task、Study、Run、Result 与限定结论 |
| 先亲手跑通一次 | [实验环境](/labs/setup) | 选择下方一个离线案例 | 命令、fixture hash、结果与证据边界 |

## 六个离线案例怎样选

每个 Lab（实验）都使用项目内固定 fixture 和确定性 runner，默认不访问真实模型或外部服务。它们练的是不同的责任边界，不是六个 framework 的性能展示。

| 案例 | 核心练习 | 关键失败例 | 当前 E1 不证明什么 |
| --- | --- | --- | --- |
| [Coding](/labs/coding) | 固定 workspace、应用 diff、再跑断言 | 路径、base、hunk 或 AST 越界 | 模型能修真实仓库 |
| [Browser](/labs/browser) | Observation 绑定与只读提取 | 外域、旧 observation、字段扩权 | 真实浏览器或注入检测有效 |
| [Research](/labs/research) | Claim–citation 与冲突保留 | 无引用主张、伪引用 | 搜索覆盖完整或事实为真 |
| [Data](/labs/data) | Dataset lineage、单位、missing/null 与脱敏 | Schema、范围、隐私越界 | 生产数据管线正确 |
| [Document](/labs/document) | 版本、权限、块级引用与拒答 | 过期版本、越权文档、解析失败 | 真实 RAG 召回质量 |
| [Migration](/labs/migration) | 按责任迁移 Harness 控制 | 逐字复制、边界扩大 | 目标产品已通过 live probe |

运行任一案例时，至少保存四样东西：仓库 commit、fixture hash、命令与退出码、对结果“不证明什么”的说明。只保存 `passed=true` 无法复核输入身份，也容易把流程成功误写成能力成功。

## 一次完整运行里有哪些所有者

```text
Task ──→ Harness/controller ──→ Model/Adapter
  │              │                    │
  │              ├── Policy ──允许/拒绝 Action
  │              ├── Tool ────产生 Observation
  │              └── State/Trace 保存可恢复事实
  │
  └──────────────→ Validator ──判定业务 acceptance
```

- Model 提议 Action，不拥有工具权限，也不拥有最终验收；
- Policy 决定动作能否执行，不判断任务是否完成；
- ToolResult/Observation 是下一轮输入，不因来自工具就自动可信；
- Validator 检查 Task 的 acceptance，不能只复用模型的自我声明；
- Trace 保存“发生了什么”，Result 保存终态；二者都要引用同一 Task、配置和输入身份。

如果一份系统图无法标出这五类所有者，先不要优化 prompt 或更换模型。多数不可归因的失败，来自责任被揉成了一个聊天框。

## 怎样读本站的证据标记

本站同时使用两条互不替代的轴：

| 轴 | 回答的问题 | 常见值 |
| --- | --- | --- |
| Source status | 引用的产品事实是否实际核对过？ | `verified`、`pending`、`conflict`、`retired` |
| Evidence level | 当前主张经过了多强的实验？ | E0 设计、E1 离线、E2 live probe、E3 正式比较 |

官方文档已经核对，只能让产品事实成为 `verified`；它不会把没有运行过的示例升级为 E2。反过来，一次真实调用成功也不代表来源描述完整，更不代表达到 E3 的代表性比较。

::: warning 证据边界
本站实验与样例当前只提供 E1 离线证据。当前未获真实 API 或费用授权；未注明 E2/E3 的性能主张不得解释为真实模型比较结果。
:::

## 建议的第一个 90 分钟闭环

时间只是学习节奏，不是运行性能承诺。

1. 用 15 分钟读[什么是 Harness](/foundations/what-is-harness)和[Agent 循环](/foundations/agent-loop)，画出一张组件图；
2. 用 15 分钟完成[前置知识自检](/guide/prerequisites)，确认 Node.js、Python、uv 与 Git 状态；
3. 用 30 分钟运行一个领域 Lab，记录 hash、关键断言和负例；
4. 用 15 分钟阅读对应领域页，把 fixture 中省略的真实风险列出来；
5. 用 15 分钟按[作品集评分](/guide/portfolio)写一页复盘，明确下一条回归或实验。

完成标志不是“看完很多页”，而是你能把一个结果连接回 Task、输入、权限、运行轨迹和独立验收，并准确指出证据边界。
