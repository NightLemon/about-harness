# 多 Agent 编排

Multi-agent（多 Agent）编排的价值来自上下文隔离、专长、独立复核和真正可并行的工作，不来自角色数量。一个边界清晰、工具充分的单 Agent loop，往往比多个角色反复转述同一上下文更便宜、更快，也更容易归因。

本页讨论稳定机制和实验方法，不绑定某个产品。本仓库当前没有可执行的多 Agent runner，也没有 live（真实环境）委派记录，因此内容属于 E0 设计知识；任何拓扑图都不能被当成“本项目已实现”。

## 学习目标

完成本页后，你应该能够：

- 先定位单 Agent 的真实瓶颈，再判断是否值得拆分；
- 把任务画成 dependency graph（依赖图），识别关键路径和可并行分支；
- 为每个子任务定义输入、权限、预算、输出和停止条件；
- 设计不会被重复、迟到、乱序和取消结果破坏的交接协议；
- 区分“第二个 Agent 同意”与真正独立验证；
- 用相同任务和验收比较单/多 Agent，而不是按角色数量评价系统。

## 先看结论

| 问题 | 单 Agent 更合适 | 多 Agent 可能更合适 |
| --- | --- | --- |
| 工作依赖 | 步骤严格串行、共享同一小上下文 | 子问题能独立输入、独立验收 |
| 写入资源 | 修改集中在一个文件或一个业务对象 | writer 有不重叠所有权，或统一单点集成 |
| 上下文 | 所有材料都相互依赖 | 不同资料域可隔离，合并只需结构化摘要 |
| 验证 | 确定性测试已足够 | 需要与实现上下文隔离的审查或多来源调查 |
| 延迟 | 协调成本接近任务成本 | 分支耗时明显大于 dispatch/merge 成本 |
| 权限 | 所有步骤需要同一最小权限 | 不同角色可以实质收窄工具或数据范围 |

多 Agent 不是能力升级开关。它引入新的失败面：路由错误、上下文复制、消息丢失、预算超支、重复副作用、语义冲突和终止检测。只有新增收益能在目标 workload（工作负载）上被测量，才值得保留。

## 先诊断瓶颈，再拆角色

不要从“我要几个 Agent”开始，而要从“单 Agent 为什么失败或太慢”开始：

| 观察到的瓶颈 | 先尝试的低成本修复 | 仍可能需要多 Agent 的条件 |
| --- | --- | --- |
| 上下文过长 | 检索、分段加载、结构化中间产物 | 材料域互不依赖且可独立总结 |
| 工具调用串行 | 批量 API、并发 executor | 调用无共享写入且失败可独立处理 |
| 模型频繁偏题 | 收紧 Task、schema 和 validator | 不同子问题确需不同上下文/工具 |
| 质量审查不足 | 确定性测试、rubric、人工 review | 需要盲审或不同证据来源 |
| 一个步骤阻塞全局 | timeout、缓存、异步队列 | 其他分支在等待期间仍有独立价值 |
| 单点权限过宽 | 拆分工具、最小 capability | 各子任务能使用严格不同权限集合 |

若问题来自坏 Task、错误工具 schema 或缺失 validator，复制更多 Agent 会复制同一缺陷。若一个简单批量接口就能并发读取 100 个对象，也不必创建 100 个自治角色。

## 把工作画成依赖图

Dependency graph（依赖图）中的 node（节点）是可独立验收的工作单，edge（边）表示必须等待的输入关系。只有没有依赖边、且不竞争同一可变资源的节点才适合并行。

```text
freeze baseline
      |
      +--------+-----------+
      |        |           |
  inspect A  inspect B   inspect C
      |        |           |
      +--------+-----------+
               |
         resolve conflicts
               |
          single integrator
               |
        verify merged state
```

关键路径是从开始到完成耗时最长的依赖链。理论墙钟下限不是所有分支时间之和，而近似为：

```text
parallel wall time
  >= dispatch + max(branch durations) + merge + final validation

total compute
  ~= sum(branch work) + orchestration + duplicated context/retries
```

因此两条各 10 秒的独立调查有并行价值；两个各 2 秒、但需要 5 秒交接和 5 秒合并的角色通常没有。并行减少墙钟不代表减少 token、费用或工具调用。

### 切分节点的五项测试

一个候选子任务同时满足越多条件，拆分越合理：

1. **输入闭合**：不依赖未传递的聊天历史或隐含决定；
2. **输出可验**：有 schema、断言、来源或清晰 rubric；
3. **写入独占**：资源 owner 唯一，或任务只读；
4. **失败局部化**：子任务失败不污染其他分支的副作用；
5. **合并确定**：父级知道怎样排序、解决冲突和拒绝过期结果。

如果输出只能是“我看了一下，没问题”，它还不是可委派节点。

## 常见拓扑及适用边界

| 拓扑 | 控制者 | 适用问题 | 合并方式 | 主要风险 |
| --- | --- | --- | --- | --- |
| Router（路由器）→ specialist（专门执行者） | Router | 请求类型明确、责任互斥 | 选择一个结果 | 路由错误、标签过时 |
| Planner（规划者）→ workers → verifier（验证者） | Planner/父级 | 可分解的多文件、多来源任务 | 依赖顺序集成后验证 | 计划脱离现场、合并成本高 |
| Supervisor loop（监督循环） | Supervisor | 子问题在执行中动态出现 | 每轮更新共享计划 | 循环委派、预算失控 |
| Map-reduce（分片汇总） | Coordinator | 大量独立文档、记录或案例 | schema 化聚合 | 分片遗漏、摘要丢失例外 |
| Pipeline（流水线） | Stage controller | 输出类型稳定的串行转换 | 上一步产物成为下一步输入 | 错误逐层放大、无真正并行 |
| Debate/jury（辩论或评审团） | Moderator | 主观方案比较、风险枚举 | rubric 或证据裁决 | 多数票制造虚假确定性 |

Debate 可以暴露假设，却不能代替测试、来源和业务负责人。多个 Agent 给出相同结论也不自动构成独立证据；它们可能共享模型、提示、检索结果和同一错误前提。

Pipeline 常被误称为多 Agent，但若每个阶段只是确定性转换，普通函数或队列 worker 更简单。角色只有在需要自治判断、不同上下文或不同 capability 时才增加价值。

## 角色是责任，不是人设

“你是世界级专家”不会创建新的知识、权限或独立性。角色应该由责任边界定义：

| 角色 | 必须拥有 | 默认不拥有 |
| --- | --- | --- |
| Researcher | 固定来源范围、引用输出、冲突保留 | 仓库写权限、发布权限 |
| Implementer | 明确文件所有权、接口版本、目标测试 | 改验收标准、扩大 scope |
| Integrator | 依赖图、所有候选 artifact、冲突裁决规则 | 静默丢弃失败或未决项 |
| Verifier | 原 Task、合并后真实状态、独立验收 | 直接相信 implementer 摘要 |
| Supervisor | 全局预算、终止、取消和授权升级 | 绕过父 Task 权限 |

同一个 Agent 可以在不同阶段承担不同责任，但切换时要明确输入与权限变化。不同 Agent 也可能承担同一责任；数量不等于职责完整。

## 委派契约

父 Agent 应把每个子任务变成可验证工作单，而不是一句“帮我看看”：

```text
task_id / parent_id / attempt
goal / acceptance / non_goals
input_refs + baseline revision
dependencies / interface versions
allowed_tools / read_scope / write_scope
side_effect policy / approval boundary
step / token / cost / time budgets
output_schema + required evidence
progress / attention / final channels
stop / cancel / escalation conditions
whether further delegation is allowed
```

一个可读示例：

```yaml
task_id: docs-links-a
goal: 找出 docs/a/ 内失效的站内链接
acceptance: 每条结果含 source、target、reason；无结果时返回扫描范围
input_ref: commit abc123 + docs/a/**
allowed_tools: [read_file, search]
write_scope: none
budget: {max_steps: 20, deadline_s: 60}
output: {findings: [], scanned_files: [], unresolved: []}
stop: [scope_conflict, missing_input, cancelled, deadline]
```

这是设计格式，不是本仓库已实现的 schema。生产系统应对它做运行时校验，并由 controller 注入不可由模型改写的 identity、权限和预算字段。

子 Agent 不自动继承父级全部上下文、凭据或工具。父级也不能把自己没有的权限转授给子级。若允许再委派，契约必须限制最大深度、总并发和剩余预算，否则 Supervisor 可能通过不断创建子任务逃逸终止条件。

## Context package：够用，但不复制整个会话

Context package（上下文包）是子任务启动时的最小、带来源输入：

```text
Task contract
immutable input references
relevant project instructions
interface/schema versions
known facts and rejected hypotheses
parent decisions that constrain this task
artifact destination and reporting protocol
```

每个字段标记 producer、revision 和 freshness。父级在子任务运行期间改变基线时，不能假设 worker 自动知道；应取消旧任务、发送显式 revision，或把旧结果标为 stale（过期）。

不要把完整父会话复制给所有 worker。这样既增加 token，也会把无关 Secret、已否定方案和提示注入一起扇出。上下文隔离只有在输入真正裁剪、来源仍可追溯时才成立。

摘要不是权威输入。涉及代码、来源或验收时，子任务应拿到固定文件/commit/artifact ref；摘要只解释为什么读取这些对象。

## 权限树与预算树

权限只能沿委派树收窄：

```text
child capability ⊆ parent capability ⊆ user/task grant
```

子任务的工具、路径、数据域和外部副作用权限必须是父任务权限的子集。处理公开资料的 researcher 不需要写仓库；只运行测试的 verifier 不需要发布权限；implementer 也不应顺便读取私人数据。

预算采用 reserve-consume-return（预留—消费—归还）模型：

1. 父级从全局预算为 child 预留上限；
2. child 的每次 model/tool/action 消费同时计入自身和全局；
3. 未使用预算在终态归还；
4. 超支请求回到父级，child 不能自行扩大；
5. 父级 cancel、费用耗尽或 deadline 到期时，所有后代停止新工作。

并行分支共享墙钟 deadline，但 token、费用、工具调用与外部配额仍然求和。把每个 child 都给完整父预算，会让最坏总成本按 fan-out（扇出数）增长。

预算还要覆盖协调动作：dispatch、轮询、重试、合并、冲突解决和最终验证。只记录 worker 的模型 token 会低估多 Agent 成本。

## 消息与结果交付语义

跨进程或队列的消息通常可能重复、延迟、乱序或丢失。每条任务、进度和结果至少携带：

```text
task_id / parent_id / attempt
message_id / sequence / revision
input and config identities
producer / timestamp / status
idempotency key / artifact digest
```

接收方先去重，再检查结果是否仍对应当前 baseline 和 Task revision。相同 task 的 retry attempt 不能覆盖旧证据；它应有独立 attempt identity，并说明是否复用先前 artifact。

父级等待多个 worker 时，要区分：

- **Progress（进度）**：仍在运行，提供可丢弃的中间信息；
- **Needs attention（需关注）**：权限、歧义或失败需要父级处理；
- **Completed（完成）**：终态和输出 schema 已提交；
- **Observation timeout（观察超时）**：当前等待没有新事件，不等于 worker 已失败；
- **Terminal missing（终止/句柄失效）**：权威系统确认运行结束或不存在。

不能因为一次轮询超时就启动相同 writer，否则两个实例可能同时产生副作用。重新派发前先查权威状态和幂等台账。

## Join 与终止条件

Join（汇合）决定父级何时停止等待：

| 策略 | 适合场景 | 风险与要求 |
| --- | --- | --- |
| All | 每个分片都必需 | 一个慢分支拖住全局；需要 per-child deadline |
| First valid | 多个等价候选，只需一个合格 | 验收必须独立；取消其余分支 |
| Quorum | 冗余读取或容错 | 多数结果可能共享同一系统性错误 |
| Best by rubric | 候选质量比较 | rubric 预先固定，不能边看边改 |
| Partial with gaps | 允许不完整报告 | 明确保留缺失分片和结论降级 |

终止检测不能只数“收到几条消息”。重复消息、旧 attempt 和无效 schema 都不算新完成；被取消 child 的迟到输出默认只保留为证据，不能触发写操作。

Supervisor loop 还要防止 livelock（活锁）：角色持续互相退回任务却没有状态进展。每轮记录减少了哪个未决项；连续无进展达到阈值时停止或升级人工，不通过新增角色延长循环。

## 用 Artifact 交接，而不是共享长对话

Artifact（产物）可以是固定 commit、patch、测试输出、结构化 JSON、来源清单或带 hash 的摘要。它应包含版本、生产者、输入引用、证据边界和缺失项。父级根据 artifact 组合结果，而不是要求每个 Agent 重放完整聊天记录。

共享可变计划会产生 lost update（更新丢失）：两个 worker 同时改写同一段状态，后写者覆盖前写者。更安全的默认流程是：

1. 并行调查只读同一 baseline，各自写独立结果；
2. 并行实现使用独立 worktree、目录或明确不重叠的文件所有权；
3. 单一 integrator（集成者）按 dependency graph 顺序合并；
4. verifier 针对合并后的真实状态运行，不验证各自分支摘要；
5. 父级保存 rejected/obsolete artifact，避免只留下成功叙事。

“文件不重叠”也不保证语义不冲突。一个 worker 修改 schema，另一个编写旧 schema 的 consumer，即使 Git 没冲突也会失败。契约还要声明接口版本、依赖边和兼容范围。

### 合并前的 Artifact 握手

Integrator 至少核对：

```text
artifact task/revision == current expected revision
producer actually reached terminal success
input commit/hash == merge baseline or has explicit rebase
declared write scope == actual diff/resources
dependencies are merged in valid order
tests were run on the candidate state
unresolved and rejected evidence are preserved
```

分支测试通过不等于合并状态通过。最终 validator 必须在实际组合后的 tree、配置和权限下重跑。

## 独立验证怎样才算独立

Verifier 不应只阅读 implementer 的最终摘要。它至少读取原 Task、实际 diff/产物、执行环境和验收命令，并能访问失败输出。

独立性有多个维度：

| 维度 | 更独立的做法 | 仍然相关的做法 |
| --- | --- | --- |
| 输入 | 从原始 artifact/来源重新读取 | 只读 implementer 摘要 |
| 模型 | 不同模型或人工/确定性 oracle | 相同 model snapshot |
| Prompt | 独立 rubric 和问题表述 | 复制原推理链 |
| 工具 | 重新执行测试、查询目标状态 | 复述旧 ToolResult |
| 环境 | 干净 checkout/隔离 runner | 同一脏工作树和 cache |
| 所有者 | 不承担实现奖励或 deadline 压力 | 同一角色自我批准 |

完全独立通常很昂贵，也未必必要；关键是报告相关性。两个共享模型、共享检索和共享摘要的 Agent 同意，不能按两份独立证据计数。

确定性 oracle 仍优先：build、测试、schema、资源状态和 content hash。主观质量可以由第二 Agent 或人工 rubric 复核，但争议要回到具体标准和证据，不能用多数票抹平。父级负责最终判断，“所有 child 都说完成”不是完成条件。

## 安全与信任边界

多 Agent 会扩大不可信输入的传播面。一个 researcher 读取恶意网页后，如果原样把命令式文本发送给所有 writer，单点 Prompt Injection 会变成全局污染。

安全设计至少包括：

- 外部正文始终标记为 data，不因 worker 摘要升级为项目指令；
- child 只收到任务所需数据，不复制父级凭据和私人上下文；
- result schema 分离 claim、source、instruction 和 proposed action；
- researcher 默认只读，writer 的每个副作用仍过自身 policy；
- 父级重新验证来源、scope 和授权，不执行 child 文本中的隐藏命令；
- Secret、个人数据和原始 trace 不因 fan-out 进入更多存储；
- 一个分支发现注入或泄漏时，取消相关后代并审计已传播 artifact。

权限隔离必须由 tool/policy/sandbox 实现，不能仅让 child 承诺“我不会写”。更完整的来源边界见[上下文工程](/foundations/context)，授权语义见[人在循环中](/foundations/human-control)。

## 工作例：并行调查、单点写入

假设站点 build 和 Python 测试同时失败：

1. 父 Agent 冻结同一 commit、Task 和环境身份；
2. 派两个只读 worker，一个定位前端 build，一个定位 Python 测试；
3. 两者返回复现命令、退出码、相关文件、第一处分歧、根因假设和未决项，不修改共享 checkout；
4. 父级判断两个根因是否独立；都涉及同一配置时只保留一个 writer；
5. Implementer 在明确 scope 内修改，Integrator 按依赖顺序合并；
6. Verifier 在合并后的 tree 运行目标测试与完整验收，并检查实际 diff；
7. 任一 child 需要网络、费用或新权限时，只暂停该子任务，父级继续权限内工作。

这个拓扑并行的是独立信息收集，不是让多个 Agent 抢写同一状态。若两个失败都来自同一个 runtime 配置，最初 fan-out 仍可能帮助快速归因，但实现阶段应收敛为单 writer。

### 一个反例：三人接力改同一文件

Planner 先给出改法，Implementer 修改一个小配置，Reviewer 再重写同一段，Supervisor 最后格式化。所有角色读取相同上下文、串行等待、写同一资源，且最终只跑一次测试。这个流程没有并行或权限收窄，却增加四次上下文传递和归因困难；普通单 Agent 加最终测试更合适。

## 失败模式与恢复

| 现象 | 可能根因 | 恢复动作 |
| --- | --- | --- |
| worker 重复相同搜索 | 分工输入不互斥 | 按目录、问题或证据类型重新切分 |
| child 互相继续委派 | 无深度/并发/全局终止 | 取消后代，收回剩余预算 |
| 结论冲突被投票抹平 | 输出缺证据和适用边界 | 回到原始 artifact，设计判别测试 |
| child 使用额外工具 | capability 继承过宽 | 在执行层收窄，不只补提示词 |
| 合并无 Git 冲突却测试失败 | 接口或 baseline 语义冲突 | 按依赖顺序重放，重新验证 consumer |
| worker 超时后双重写入 | 把观察超时误判为终止 | 查询权威状态，按幂等键对账 |
| 旧结果覆盖新决策 | 缺 revision/fencing | 拒绝 stale artifact，记录迟到结果 |
| 一个输入污染全部结果 | 来源和上下文未隔离 | 停止 fan-out，撤销副作用，重建可信输入 |
| verifier 总是同意 | 共享摘要/rubric 或无 oracle | 改为读取原 artifact，加入区分性负例 |
| 成本远高于预期 | 预算按 child 重复发放 | 采用全局 reservation，限制 fan-out |

恢复时保留每个 child 的 Task、attempt、输出和终态。不要删除失败分支只留下集成后的成功 commit，否则无法评估重复工作和路由质量。

## 怎样证明多 Agent 值得

比较时保留相同 Task、模型/设置、工具、权限、预算口径和验收的单 Agent baseline。至少报告：

- 任务成功、验收分数和安全事件；
- end-to-end wall time、关键路径与尾部延迟；
- 总 token、费用、model/tool calls 和 retry；
- dispatch、等待、merge、冲突解决与验证成本；
- 重复工作、无效/迟到 result、stale artifact；
- 人工介入、批准次数和无法自动归并的争议；
- 每类路由的样本量、失败分布和置信区间。

一个实用分解是：

```text
multi-agent value
  = quality/safety gain + wall-time gain
    - orchestration cost
    - duplicated work
    - merge/conflict cost
    - new reliability/security risk
```

不要把不同总预算的系统直接比较。多 Agent 使用更多总 token 才成功，可能仍值得，但结论应写成“用多少额外资源换来多少收益”，不是无条件更强。

### 实验设计

1. 预注册哪些任务理论上可并行，哪些应保持单 Agent；
2. 冻结模型、Harness、工具、权限、Task 和 evaluator；
3. 为单 Agent 与多 Agent 设置可比较的总费用/调用上限；
4. 对相同 task 做 paired run（配对运行），包含未见 holdout；
5. 保存委派树、消息、artifact、取消和 merge 事件；
6. 分别报告适合拆分与不适合拆分的任务，不只看总平均；
7. 只有质量/安全/时间收益稳定超过成本才设为默认路由。

角色数量、消息数量或“讨论很充分”都不是结果指标。

## E0 设计练习：先写调度方案，不启动 Agent

这个练习只产出设计，不调用模型、Provider 或真实多 Agent runtime。

### 前置条件与固定输入

- Git 和 `rg` 可用，从仓库根目录运行；不需要 API key、网络或费用。
- 输入固定为当前 commit 与 `docs/` 文件清单。
- 目标是假设“复核 foundations、models、labs 三个区域的内容边界”，不是实际修改它们。

```powershell
git rev-parse HEAD
rg --files docs/foundations docs/models docs/labs
```

记录输出 commit，并为三个只读 investigation node（调查节点）各写一份委派契约。然后画出：

```text
freeze commit
  ├─ review foundations (read-only)
  ├─ review models (read-only, fact registry required)
  └─ review labs (read-only, fixture/runtime evidence required)
          ↓
normalize findings schema
          ↓
resolve cross-section conflicts
          ↓
one writer per selected fix
          ↓
verify merged tree
```

### 预期产物与断言

设计至少包含：

- 每个节点唯一 task ID、相同 baseline commit 和不重叠 read scope；
- 统一 finding schema：位置、事实、证据、优先级、建议、未决；
- 全局预算和 per-child reservation，而非三份完整预算；
- writer 的文件所有权、接口依赖和单一 Integrator；
- All/partial join 策略、观察超时与权威终态区别；
- 一个迟到 result、一个冲突结论和一个注入输入的负例；
- 合并后验证命令与停止/回滚条件。

反向检查：如果三个 worker 都必须读取全部仓库、都能写所有文件、没有统一 schema，或者只用多数票解决事实冲突，方案不合格，应先改为单 Agent review 或重新切分。

### 停止、清理、回滚与限制

发现 scope 无法独立、共享写资源没有 owner、预算无法聚合、外部事实需要联网或结果没有 oracle 时，停止在 E0，不启动真实 fan-out。命令只读仓库，无额外清理；结束后 `git status --short` 应与开始前一致。自行保存的临时设计文件可删除或作为普通文档提交，回滚时只处理自己的文件。

这个练习只能证明你写出了可审查方案，不能证明任何 Agent 能完成任务，也不能支持并行收益结论。

## 从 E0 升级证据

| 等级 | 需要实际新增 | 可以支持 | 仍不能支持 |
| --- | --- | --- | --- |
| E0 | 依赖图、契约、预算和负例设计 | 讨论方案与风险 | 编排可运行或有效 |
| E1 | fake workers、固定消息、重复/迟到/取消/冲突断言 | dispatcher/merge 协议在固定样例可复现 | live surface 或真实任务质量 |
| E2 | 锁定真实 Harness/model 的有限委派探针 | 精确版本与窄场景可用 | 多 Agent 普遍更优 |
| E3 | 代表任务、重复、holdout、单 Agent baseline 与成本/安全门槛 | 限定 workload 内路由决定 | 跨任务、跨版本通用结论 |

E1 的第一批负例应包括：重复 child result、旧 revision、观察超时、父级取消、预算耗尽、两个 writer 冲突、恶意外部文本和 verifier 拿到错误 baseline。一次 happy path 不能证明编排可靠。

## 当前项目边界

本仓库没有多 Agent Task schema、dispatcher、消息队列、预算树、委派 trace、merge controller 或 E1 fixture。相关页面描述的是设计责任；现有单 Agent Python runner 不能因为有 loop/checkpoint 就被称为多 Agent runtime。

若未来实现，应先从两个 fake 只读 worker 和一个确定性 join 开始，固定单 Agent baseline，再逐步加入 cancel、stale result、权限收窄和 merge 冲突。真实 Provider、费用与外部动作仍需单独授权。

## 完成检查表

- [ ] 单 Agent 瓶颈已有证据，新增 Agent 对应可测假设；
- [ ] 依赖图、关键路径和可并行节点明确；
- [ ] 每个 child 输入闭合、输出可验、失败局部化；
- [ ] 权限沿树收窄，预算按全局 reservation 聚合；
- [ ] Context package 有来源、revision 和最小数据范围；
- [ ] 消息可处理重复、迟到、乱序、retry attempt 和 stale result；
- [ ] Join、终止、观察超时和取消语义明确；
- [ ] 并行 writer 有独立资源或单一 Integrator；
- [ ] Verifier 读取合并后真实状态，相关性被公开；
- [ ] Prompt Injection、Secret 扇出和迟到副作用有负例；
- [ ] 与同条件单 Agent baseline 比较质量、风险、墙钟和总成本；
- [ ] 当前结论严格限制在实际达到的 E0/E1/E2/E3。

## 检查题

1. 哪五个条件说明一个子任务适合独立委派？
2. 为什么并行减少墙钟，却可能增加总 token 和费用？
3. Observation timeout 与权威终态有什么区别？
4. 文件不重叠时，为什么两个 worker 仍可能产生语义冲突？
5. 两个使用相同模型和摘要的 verifier 为什么不是两份独立证据？
6. All、first valid、quorum 和 partial join 分别适合什么场景？
7. 怎样用相同总预算公平比较单 Agent 与多 Agent？

下一步：到[可观测性](/foundations/observability)定义跨 Agent 因果链，在[状态与可靠执行](/foundations/state-reliability)实现取消、迟到结果和 fencing，再看[AutoGen](/frameworks/autogen)的产品抽象边界。
