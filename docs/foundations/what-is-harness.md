# 什么是 Agent Harness

## 一句话定义

**Agent Harness 是让模型能够在约束下持续观察、决策、行动和验证的运行与控制系统。** 它连接用户目标、模型、上下文、工具和外部环境，并管理权限、状态、预算、反馈与恢复。

Harness 原意是“挽具”：它让能力可以被利用，也限定力量如何作用。不同社区没有唯一严格定义；本项目采用工程上的广义定义，并在涉及具体产品时写明产品名与 surface（使用界面/执行表面）。

最重要的判断不是“它是否自称 Agent”，而是：**谁在做概率性决策，谁在承载、约束并验证这些决策？**

## 本项目讨论的范围

本项目以软件工作 Agent 为主：coding、文档、研究、浏览器操作、数据处理与工程自动化。原理可迁移到其他数字任务，但不试图覆盖：

- 模型训练、微调与权重优化框架；
- GPU 推理服务器和模型托管平台的全部内部实现；
- 机器人运动控制与物理安全系统；
- 只有流水线编排、但没有模型决策循环的普通 CI/CD；
- 名称中恰好包含 Harness 的无关商业产品。

普通概念在英文句中写作小写 `harness` / `agent`；页面标题、句首和产品名称可大写。`surface` 指同一产品的 CLI、IDE、桌面、Web 或云端等入口，不等同于 provider（模型供应方）。

## 模型、Agent、Harness 与环境

| 层 | 主要职责 | 典型输入输出 | 不天然负责 |
| --- | --- | --- | --- |
| Model（模型） | 根据当前输入生成文本或 Action 提议 | messages → tokens/tool request | 文件、网络、长期状态、真实执行权 |
| Agent（智能体） | 围绕目标进行多步决策，根据 observation 调整下一步 | Task/trace → Action | OS 隔离、凭据托管、UI 和可靠持久化 |
| Harness | 组装循环、上下文、Adapter、工具、policy、state 与 validator | Task + Action + ToolResult → RunResult | 凭空补足模型基础能力或业务知识 |
| Execution environment（执行环境） | 提供进程、文件、网络、身份和资源边界 | 受控调用 → 外部副作用 | 判断自然语言目标是否完成 |
| Human/organization（人和组织） | 定义目标、风险偏好、批准与业务验收 | Intent/approval/review | 自动保证每个动作正确 |

口语里常把整个 coding 产品称作 Agent，也会把其中的模型循环叫 Harness。沟通时不必争论词义；画出责任与信任边界更有用。

## 从一次动作看 Harness

假设用户要求“修改配置并运行测试”。一个受控系统不是把整句话直接交给 shell，而是经过：

```text
用户目标
  → Task ingress：冻结输入、范围、验收与预算
  → Context builder：选择项目规则、代码和历史状态
  → Adapter：把规范消息映射到目标模型协议
  → Model：提出 edit_file Action
  → Runtime validation：校验结构、字段和值域
  → Policy：检查路径、工具、身份与是否需要批准
  → Tool executor：执行编辑并返回 ToolResult
  → State/trace：记录结果、checkpoint 与未决副作用
  → Model：提出运行测试或完成
  → Validator：独立检查测试、diff 和 Task acceptance
  → Controller：继续、暂停、失败、回滚或完成
```

其中模型只负责提出下一步。路径是否允许、命令是否执行、测试是否真的通过、结果是否发布，都由 Harness 与执行环境中的确定性组件决定。

## Harness 的九项核心责任

### 1. Task ingress：把目标写成契约

把自然语言意图转换为 task ID、输入、允许工具/资源、acceptance（验收条件）、预算、停止和回滚条件。没有这层，系统很难区分“有帮助的额外工作”和“越界”。

### 2. Context construction：选择模型实际看到的内容

加载 system/project/user instruction、代码、文档、memory 和工具结果，处理优先级、来源、token 预算、冲突与压缩。仓库里存在文件不等于模型看到了它。

### 3. Model Adapter：隔离 Provider 协议

处理消息 role、tool call、streaming、reasoning、stop/error、usage、cancel 与重试映射。Adapter 错误可能看起来像模型失误，因此必须单独测试。

### 4. Controller：拥有状态机

决定何时请求模型、执行工具、等待批准、重试、checkpoint、停止和产出终态。模型不能自己决定绕过预算或把失败改成完成。

### 5. Tool runtime：将提议变成受控调用

执行文件、shell、浏览器或业务 API，提供 schema、timeout、idempotency（幂等）、错误和结果。工具越多不等于系统越强。

### 6. Policy 与 isolation：控制能力

Policy 决定动作是否允许以及何时询问；sandbox、容器、账户和网络边界决定技术上能触达什么。自然语言规则不能替代强制隔离。

### 7. State 与 recovery：保存可继续的事实

区分对话、工作状态、checkpoint、外部副作用和长期 memory。能恢复聊天不等于能判断一次写操作是否已经发生。

### 8. Validator：判定业务完成

独立运行测试、schema、diff、引用或目标系统查询。模型输出 `completed` 只是一项 Action，不是完成事实。

### 9. Evidence 与 interface：让过程可观察

保存 trace、配置身份、退出码、错误、成本和人工介入，并通过 CLI/UI 把关键状态展示给人。不可观察的自动化很难调试，也无法形成可信证据。

## 三个平面

理解 Harness 时可以把组件放进三个 plane（平面）：

| 平面 | 回答的问题 | 典型内容 |
| --- | --- | --- |
| Data plane（数据面） | 模型和工具实际处理什么 | messages、context、Action、ToolResult |
| Control plane（控制面） | 谁允许、调度和停止 | policy、budget、approval、sandbox、controller |
| Evidence plane（证据面） | 如何知道发生了什么 | trace、checkpoint、result、validator、metrics |

一个字段可以跨平面关联，但不应混为一谈。例如 ToolResult 属于数据面；“该工具是否可执行”属于控制面；“这次执行的资源 ID 和退出码”属于证据面。

## 为什么同一个模型表现不同

同一个模型在两个 Harness 中结果不同，常见原因包括：

- system/project instruction 的内容、顺序、作用域不同；
- 工具名称、描述、参数 schema 和返回格式不同；
- 一个 Harness 自动搜索，另一个等待模型显式请求；
- 上下文裁剪、检索、压缩与 memory 策略不同；
- sandbox、批准或网络限制让某条路径不可用；
- 错误是否原样反馈、是否自动重试、最大回合数不同；
- validator 覆盖不同，一个过早接受“完成”；
- 实际 provider、model snapshot、reasoning 或采样并不相同。

因此比较模型时必须记录 Harness；比较 Harness 时也必须固定模型、任务、工具、预算和证据口径。只写“同一个 prompt”不足以控制变量。

## Harness 怎样改变能力、可靠性与风险

### 能力

搜索、编辑、浏览器和业务工具让模型能影响外部世界；项目索引、context builder 和 memory 让它获取任务所需信息。能力来自“模型 × 上下文 × 工具 × 循环”，不是模型单独属性。

### 可靠性

Schema、类型校验、失败反馈、重试、checkpoint 和 validator 将一次生成变成可恢复流程。但错误的自动重试、污染 memory 或宽松 validator 也会稳定地放大错误。

### 风险

工具权限、网络、凭据、长时运行和外部写操作扩大影响范围。高质量 Harness 不是让模型“更自由”，而是让每项能力有最小 scope、可观察终态和明确停止点。

## Harness 不是什么

- **不是单个 system prompt**：提示只是 context 的一部分；
- **不是工具数量竞赛**：相似工具会增加选择歧义和攻击面；
- **不是全自动的同义词**：关键步骤交给人批准可能更可靠；
- **不是模型微调**：它在推理时组织环境，不改变权重；
- **不等于 API server**：只托管模型推理不一定拥有 Agent 循环；
- **不等于 UI**：界面展示状态，但控制责任可能在其他进程；
- **不等于安全承诺**：写了 policy 仍需验证强制边界实际生效；
- **不保证任务正确**：Harness 能改善控制和反馈，却不能凭空提供缺失知识。

## 常见架构误判

| 现象 | 容易误判为 | 更应检查 |
| --- | --- | --- |
| 模型反复调用同一工具 | 模型“不会规划” | ToolResult 是否回送、幂等和 stop 是否正确 |
| 文件没有被修改 | 模型不服从 | 路径 policy、sandbox、cwd 与工具错误 |
| 测试绿色但需求错 | Harness 很可靠 | Task acceptance 与 validator 覆盖 |
| 恢复后重复发送 | 模型记忆差 | checkpoint、外部副作用和幂等键 |
| 长任务漏掉规则 | 模型上下文弱 | 实际 context、裁剪、压缩与冲突 |
| 不询问就执行 | 模型危险 | approval policy 与执行身份配置 |
| 询问很多次 | 系统一定安全 | sandbox/network 是否仍然过宽 |

归因顺序通常是：输入与身份 → Adapter/协议 → Harness 控制 → 工具/环境 → 模型任务判断。不要一看到最终文本就把全部责任交给模型。

## 一个最小可运行观察

当前仓库提供一个完全离线的 Python Harness。前置条件是 Python 3.11+、`uv 0.11.16`、锁定依赖已缓存：

```powershell
uv run --frozen --offline python scripts/lab-smoke.py
```

预期 JSON 中：

```text
status=completed
stop_reason=completed
metrics.tool_calls=1
trace[0].kind=run_started
trace[0].data.offline=true
```

沿 trace 找到 `model_action → tool_result → checkpoint → model_action → acceptance_result → run_stopped`，并确认 ToolCall 由 policy/registry 处理、完成提议由 validator 处理，而不是由模型直接执行或自证。

这只是 E1 控制流证据：FakeAdapter 提供预定 Action，没有调用真实模型、Provider 或外部系统。命令失败时保存退出码和 trace，先检查版本/锁文件，不删除测试或开启 live adapter。

命令只产生终端输出和可再生 cache。发送 `Ctrl+C` 可停止；误改时用 `git diff -- lab scripts/lab-smoke.py` 确认范围，只恢复自己的候选。

## 审核一个现有 Agent 产品

不看营销描述，逐项追问：

1. Task 的输入、范围、预算和 acceptance 存在哪里？
2. 实际加载了哪些 project instruction，优先级是什么？
3. Model/provider/Adapter 身份能否从运行记录确认？
4. 模型能看到哪些工具，谁执行，参数如何校验？
5. Approval、sandbox、network 和目标系统权限分别在哪里强制？
6. Cancel、timeout、retry 和 late result 如何决定唯一终态？
7. Checkpoint 保存了对话还是也保存工具/外部副作用？
8. 完成由模型声明、测试、人工还是业务系统确认？
9. Trace 是否足以区分模型、Adapter、工具和基础设施失败？
10. 出现安全或质量退化时，怎样停用候选并恢复旧配置？

答不出的部分不是自动等于缺陷，但属于 `unknown/untested`，是下一步最值得验证的 Harness 层。

## 证据边界

机制定义可以跨产品稳定复用；具体产品是否拥有某项功能、默认如何配置，则是易变事实，需要来源和日期。一次静态配置检查是 E0，离线 fake/replay 是 E1，真实可用性探针是 E2，代表性重复任务才可能形成 E3。

不要因为 Harness 能运行一次就声称模型质量高，也不要因为官方文档声明某控制就声称本地配置已强制执行。

## 检查题与下一步

1. Model、Agent、Harness 和执行环境分别拥有哪项责任？
2. 为什么模型提出 ToolCall 后不能直接执行？
3. Approval 与 sandbox 为什么必须分开记录？
4. 能恢复对话为什么不等于能安全恢复工具写操作？
5. `completed` Action 与 Task 真正完成之间还差什么？

下一步沿[系统架构](/foundations/architecture)定位 controller、Adapter、tool、policy 和 evidence plane，再读[Agent 循环](/foundations/agent-loop)理解一次迭代的安全顺序。
