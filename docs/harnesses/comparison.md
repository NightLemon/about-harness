# Codex、Pi 与 Claude Code：职责对照

## 比较目标与证据边界

这不是“哪个产品绝对最好”的排行榜，而是一套 responsibility comparison（责任对照）方法：对同一个工作负载，确认每个 Harness 如何承担指令、工具、权限、状态、验证与恢复。

产品行为会随版本、surface（使用界面/执行表面）和配置变化。来源、核对日期与证据轴以各专题、[事实注册表](/references/fact-registry)和[兼容矩阵](/references/compatibility)为准。当前仓库对三者只有：

- 官方来源或固定仓库的 E0 产品事实；
- 脱敏静态配置的 E0 校验；
- 跨 Harness 责任映射的 E1 离线 fixture；
- 没有三套产品的 live E2 或代表性 E3 运行。

因此本页可以帮助设计选择和迁移实验，不能证明某个产品在你的代码、模型、账号与网络环境中更好。

## 先冻结比较单元

“同一个 prompt”不是公平比较。Harness 会改变上下文、工具、权限、恢复和人工交互。每个候选至少记录：

```text
product + exact version / surface / OS
model + provider + resolved identity
cwd / repository commit / dirty state
project instruction files + effective hash
skills/plugins/extensions + versions
tool schema / executor / allowed resources
sandbox / approval / network policy
session / memory / compaction / checkpoint
Task acceptance / validator / test commands
max steps / calls / time / token / cost
human interventions / retry / stop reason
```

如果其中一项无法观察，写 `unknown` 或 `untested`，不要用另一个产品里的同名设置推断。模型、provider 或 Harness 任一变化都创建新 config ID。

## 责任矩阵

下表描述迁移时要寻找的责任，不承诺所有版本都存在完全相同的功能：

| 责任 | Codex | Pi | Claude Code | 迁移时保留 |
| --- | --- | --- | --- | --- |
| 项目指导 | 分层 `AGENTS.md` | context files / AGENTS | `CLAUDE.md` / rules | 意图、作用域、优先级、冲突规则 |
| 重用流程 | skills / plugins | skills / templates / packages | skills / plugins | 触发、输入、来源、版本、卸载 |
| 程序化扩展 | MCP / tools / plugins | TypeScript extensions | tools / hooks / plugins | schema、身份、权限、timeout、错误 |
| 技术隔离 | sandbox / permission profile | 运行环境或容器补偿 | sandbox，按目标版本核验 | 模型技术上不可触达的边界 |
| 询问授权 / 人工批准 | approval policy | project trust 与自建 policy | permission rules / hooks | 何时暂停、谁批准、拒绝终态 |
| 网络 | 独立开关与策略 | 运行环境 / extension | settings / sandbox | 默认行为、allowlist、实际出口 |
| 状态恢复 | 因 surface 而异 | session / tree / fork / import | conversation / context，按版本核验 | checkpoint、幂等、未决项、重放语义 |
| 委派 | subagents | 由扩展或流程实现 | subagents | 子任务契约、隔离、父级验收 |
| 可观测性 | task/tool/terminal 等 surface | session/event/extension 自建记录 | conversation/tool/hook 等记录 | canonical trace、时间、身份与脱敏 |
| 验证闭环 | 指令、工具与 CI 组合 | extension/命令/外部 CI | hooks/tools/外部 CI | acceptance 由模型外部判定 |
| 回滚 | Git/worktree/checkpoint 组合 | session tree + 外部版本控制 | conversation/context + 外部版本控制 | 候选隔离、旧状态与恢复步骤 |

矩阵中“有某功能”仍不足以判断边界。要继续问：默认是否开启、由谁配置、技术上能否绕过、失败如何表示、是否可审计、目标版本是否实际验证。

## 五组最容易混淆的概念

### 指令不等于 Policy

项目指令告诉模型应该怎么做，属于上下文；policy（策略）由控制器、工具或执行环境强制。把“不要访问网络”写进 Markdown，不等于进程没有网络能力。

### Approval 不等于 Sandbox

Approval（批准）决定何时暂停询问；sandbox（沙箱）决定技术上能触达什么。一个系统可能经常询问但仍有广泛权限，也可能在严格隔离内无需逐步询问。

### Network enabled 不等于允许所有出口

网络开关、DNS/proxy、origin allowlist、身份和目标系统权限是不同层。比较时保存实际出口证据，不只复制 `network=true/false`。

### Memory 不等于 Durable state

Memory（记忆）可能只是加入上下文的摘要；durable state（持久状态）需要 checkpoint 身份、恢复点、幂等键和未决副作用。能继续对话不证明能安全恢复一次工具写操作。

### Tool success 不等于 Task success

工具退出 0 只说明该调用成功。Task 是否完成仍由测试、schema、diff、来源或业务 validator 判定，不能让模型自己的完成文字成为唯一证据。

## 三条证据轴分开记录

每个责任项都应标明证据来自哪里：

| 证据轴 | 回答的问题 | 本项目合法表述 |
| --- | --- | --- |
| Source fact | 官方文档/维护仓库声明什么 | 注册表状态 + 日期/版本 |
| Local static | 配置或文档是否符合预期结构 | E0 静态校验，不声称已启动产品 |
| Offline seam | 责任映射能否在 fixture 中执行 | E1，可证明项目控制契约 |
| Live probe | 目标版本在真实 surface 是否可用 | E2，需运行记录与授权 |
| Workload study | 代表性任务是否重复优于基线 | E3，需完整矩阵与不确定性 |

Source fact、E1 seam 和 E2 live 不能互相替代。官方说支持 sandbox，不证明你的配置生效；离线迁移通过，也不证明产品安装可用。

## 选择流程：先约束，再体验

### 1. 写 Task，而不是写偏好

固定输入、允许路径/工具、副作用、acceptance、失败类型、预算和回滚。例如：

```text
Workload: 中型 TypeScript bug fix
Input: 固定 commit + 一个失败测试
Allowed: read/search/edit/targeted tests
Forbidden: network/dependency/generated files
Acceptance: 失败先复现；目标与回归通过；diff 只在允许路径
Budget: 20 min / 12 tool calls / 1 human clarification
Stop: 权限扩大、基线不可复现、未知写操作
```

### 2. 用硬约束淘汰组合

如果任务要求无网络、受限路径或可审计恢复，就先验证这些边界。无法满足的候选应记录为结构缺口或需补偿控制，不进入质量打分。

### 3. 建立每个候选的合理基线

先测默认体验，再做一次有依据的配置。不要只给喜欢的候选调好指令、工具和预算，而让其他候选保持错误模板。

### 4. 一次改变一个主要变量

先固定模型/provider，再比较 Harness；或固定 Harness，再比较模型。若同时更换模型、指令、工具和权限，只能评价整个 bundle（组合），不能定位优势来源。

### 5. 报告任务结果和代价

至少报告 task acceptance、安全违规、tool error、人工轮次、wall time、token/费用和失败分类。不要用聊天流畅度、单次 demo 或总工具调用数代替质量。

### 6. 保存不采用原因与回滚

选择记录应包含被淘汰组合、失败证据、未测项、适用范围和上一个可用配置。结论可以是“只在这类只读任务采用”，不必强行产生全局赢家。

## 三个迁移场景

### 项目指令迁移

源环境存在分层项目指令。目标不是把文件改名，而是确认目标发现顺序、作用域、覆盖规则、冲突处理和实际加载内容。静态文件存在但运行时未加载，应判迁移未完成。

### 权限迁移

源环境是只写工作区、危险动作询问、禁网。迁到 Pi 时，若目标固定版本没有被本项目证明存在等价 OS sandbox，就使用无网络容器或受限用户作为补偿，而不是写一句自然语言规则。迁到 Claude Code 时分别核对 settings、permission rule、hook 和 sandbox，不能把其中一项当作全部边界。

### 状态迁移

源任务有一个未确认写操作。目标环境即使能导入对话，也必须恢复 checkpoint、工具幂等键、观察到的副作用和 unresolved。若只能恢复文字而不能判断写操作是否发生，先对账，不自动重试。

## 迁移报告模板

每条责任使用同一结构：

```text
Responsibility: network
Source semantics: 默认无网络，目标域 allowlist 为空
Target mechanism: 受限容器 + 运行时配置
Observed gap: 产品设置本身未被证明构成 OS 隔离
Compensating control: network_mode none
Evidence axis: source verified + offline seam E1 + live untested
Verification: 容器内受控连接负例失败
Rollback: 停止候选，恢复源环境与 checkpoint
```

`source semantics → target semantics → gap → compensating control → evidence` 缺一项，就无法判断迁移是否保留边界。

## 运行离线迁移案例

前置条件是 Python 3.11+、`uv 0.11.16`、依赖已缓存，且从仓库根目录执行：

```powershell
uv run --frozen --offline python scripts/run-labs.py migration
```

预期：

```text
paths_checked=2
mapped_responsibilities=12
domains_checked=5
control_boundaries_preserved=true
config_copied_verbatim=false
missing=[]
uncompensated_gaps=[]
boundary_violations=[]
verbatim_targets=[]
```

负例会拒绝整条路径逐字复制，以及把网络扩大为 unrestricted 且无补偿控制。该 E1 结果只证明迁移契约可执行，没有启动三个 Harness。

若结果失败，先查看是哪一类责任缺失、目标语义为空、gap 无补偿、边界扩大或逐字复制；不要删除该责任或改 expected 让其通过。

## 比较常见的失真

| 失真 | 为什么错误 | 修正方式 |
| --- | --- | --- |
| 只给三个产品同一句 prompt | 实际上下文和工具不同 | 固定完整 config 并报告有效输入 |
| 一边允许网络，另一边禁网 | 可用信息与风险不等价 | 对齐 policy 或明确结构差异 |
| 只统计一次是否完成 | 随机性和失败分布不可见 | 重复运行并报告区间/失败类型 |
| 把人工修正藏起来 | 人工成本影响系统质量 | 记录每次 intervention |
| 把工具多视为能力强 | 可能只是循环、错误或低效 | 看 acceptance、错误与代价 |
| 忽略默认体验 | 只展示专家调优上限 | 同时报默认与合理调优 |
| 用同名 model 当身份 | Provider/alias 可能不同 | 保存 resolved model 与 surface |
| 用 E1 声称 live 优胜 | 离线接缝没有真实产品 | 保持 `untested`，设计 E2 探针 |

## 停止、回退与已知限制

发现权限比源环境更宽、输入/config 漂移、真实模型身份不明、写操作状态未知或安全负例失败时，停止比较。不要为了“公平”关闭必要控制；结构能力不同本身就是结果。

真实迁移先保留 source 配置与 checkpoint，在隔离 worktree/目录生成 target 候选；失败时停用候选并恢复旧组合。外部写操作先对账，不能只回滚本地文本。

当前页面没有三产品 live 数据、性能样本、费用或模型质量证据。所有选择结论必须回到读者自己的版本、surface、workload 和约束。

## 检查题与下一步

1. 为什么同一句 prompt 不能构成公平 Harness 比较？
2. Approval、sandbox 与 network 分别控制什么？
3. 对话可以恢复时，为什么写操作仍可能不能安全恢复？
4. Source、static、E1 seam 与 E2 live 为什么不能互相升级？
5. 没有全局赢家时，怎样写一个仍然有用的选择结论？

先完成[跨 Harness 迁移案例](/labs/migration)，再用[模型适配卡](/practice/model-playbook)冻结模型/provider 变量，并按[实验方法](/optimization/experiment)建立自己的配对比较。
