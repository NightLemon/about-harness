# Framework 选型工作表：先证明它减少了哪种复杂度

## 页面性质与学习目标

Framework（框架）选型不是比较功能清单，也不是寻找一个“最强 Agent 框架”。它要回答一个更窄的问题：在固定 Task、模型、工具、权限、状态与部署条件下，候选 Framework 是否比更简单的 baseline（基线）更可靠地承担了当前瓶颈，而且没有把控制责任藏进默认值。

本页是一份可填写的工程工作表。方法属于稳定的项目分析；提到 LangGraph、OpenAI Agents SDK、Google ADK 与 AutoGen 时，只把它们当作待核验候选，不增加新的产品事实。当前仓库验证只有 E1 离线职责映射，不安装或运行这些上游 Framework，也不调用真实模型。

完成本页后，你应该能：

- 从任务形状判断是否真的需要 Framework；
- 建立无 Framework 或更简单 runtime 的可运行基线；
- 把候选能力映射到项目自己的 Harness 责任；
- 先运行资格探针，再比较质量、时间与成本；
- 将结果写成 adopt、reject 或 defer，而不是模糊偏好；
- 保存卸载、状态迁移和外部副作用回退路径。

## 最终要交付什么

建议把一次选型保存为以下 evidence pack（证据包）。目录名可以变化，职责不能缺失：

```text
framework-decision/
  question.md                 # 决策问题、范围与截止时间
  task.json                   # Task、输入、权限、预算、acceptance
  task-shape.md               # 状态、并发、恢复与所有权形状
  baseline.md                 # 更简单方案及实测结果
  responsibility-matrix.md    # Framework 与应用责任映射
  candidates/
    candidate-a.md            # 版本、抽象层、假设与来源
    candidate-b.md
  probes.jsonl                # 资格探针定义与结果
  runs.jsonl                  # 同条件 workload 运行
  decision.md                 # adopt / reject / defer
  rollback.md                 # 卸载、状态迁移、流量与副作用恢复
  unresolved.md               # 未测试项和会改变决定的证据
```

不要保存真实 Secret、个人绝对路径、未脱敏业务数据或未获许可的 trace。没有 live 授权时，`probes.jsonl` 可以只包含设计和 E0/E1 结果；不要为了填满目录伪造 E2。

## 第一步：把“想用框架”改写为决策问题

先填下面七项：

```text
Decision ID:
Target workload:
Current baseline:
Observed bottleneck:
Required decision date:
Hard constraints:
Evidence currently available:
```

不合格问题：

> LangGraph 和 AutoGen 哪个更好？

可检验问题：

> 对固定的长运行研究 Task，在相同 model/provider、工具、policy、预算与 validator 下，候选 graph runtime 是否相对当前显式状态机减少恢复错误，且不增加重复外部写入、P90 时长超过 25% 或不可解释终态？

后一个问题仍没有预设候选一定胜出。它写明 workload、处理变量、主要收益、硬风险和代价边界。真实阈值由自己的业务风险决定，示例数字不是本站的通用建议。

## 第二步：画出 Task 形状

Framework 的抽象中心应接近任务难点。先描述形状，不写产品名：

| 维度 | 要记录什么 | 可能改变的选择 |
| --- | --- | --- |
| 控制拓扑 | 固定顺序、条件分支、循环、动态路由 | 普通函数、状态机、graph、agent loop |
| 状态寿命 | 单请求、数分钟、跨日、跨部署 | 内存、Session、durable checkpoint |
| 外部副作用 | 只读、可逆写、不可逆写、unknown outcome | Policy、approval、幂等与对账强度 |
| 并行 | 无、独立 fan-out、共享写入、竞争合并 | 顺序、reducer、owner、版本条件 |
| 人工控制 | 无、动作批准、冲突裁决、长时暂停 | Interrupt、approval record、resume |
| 多 Agent | 无、工具型 specialist、所有权 handoff、广播 | 单 Agent、agent-as-tool、team/event runtime |
| 部署 | 单进程、队列 worker、容器、托管服务 | State store、identity、network、SLO |
| 验收 | 确定性、rubric、人工、混合 | Validator、Judge、审计与晋级 |

### 四种常见形状

```text
固定步骤少、状态短
  → 先用普通函数或最小 loop

显式状态、条件边、暂停/恢复
  → 评估 graph/state runtime

模型—工具反复交互、结果类型与 handoff
  → 评估 code-first agent runtime

多个 owner 通过消息或事件协作
  → 评估 conversation/event runtime
```

这是候选路由，不是结论。一个任务同时具有多种形状时，先找造成事故、维护成本或恢复困难的主瓶颈。不要为了使用某 Framework，把确定性业务步骤改写成角色对话。

## 第三步：建立更简单的 baseline

Baseline 必须可运行、可失败、可测量。它可以是纯函数、显式状态机、当前生产流程或本站的最小 Harness，但不能只是一段“现状很差”的描述。

至少记录：

```text
Source commit / config identity
Task set + fixture identity
State representation
Tool and policy boundary
Checkpoint / resume behavior
Validator and terminal states
Run count / pass / failure classes
Wall time / model and tool calls / cost
Known incidents and maintenance burden
```

“Framework 版本少写 100 行代码”不是充分收益。更有意义的 baseline 指标包括：

- 恢复后重复副作用次数；
- 状态迁移失败率与人工修复时间；
- 无法归因的终态比例；
- 新增一条分支所需改动与测试范围；
- 取消传播时间和迟到结果数量；
- Trace 能否重建 owner、Action、ToolResult 与 validator；
- 任务成功、安全违规、P90 时长与总费用。

如果 baseline 连一个失败输入都无法稳定复现，先修观测和 Task，不要让 Framework 迁移同时承担诊断工作。

## 第四步：建立责任矩阵

不要把项目类型直接替换为 Framework 类型。先固定内部 `Task → Action → Event → Result`，再逐项映射：

| Harness 责任 | 当前 owner | 候选机制 | 应用仍保留什么 | 资格证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| Task/acceptance |  |  |  |  | pass/fail/untested |
| Controller/budget |  |  |  |  |  |
| Model Adapter |  |  |  |  |  |
| Tool/schema/error |  |  |  |  |  |
| Policy/approval |  |  |  |  |  |
| Sandbox/network |  |  |  |  |  |
| State/checkpoint |  |  |  |  |  |
| Retry/idempotency |  |  |  |  |  |
| Multi-agent owner |  |  |  |  |  |
| Trace/redaction |  |  |  |  |  |
| Validator/result |  |  |  |  |  |
| Deployment/rollback |  |  |  |  |  |

同名不表示同语义。例如候选提供 `checkpoint`，仍要验证它保存哪些状态、何时提交、怎样版本化，以及外部 Tool 已写入但 checkpoint 未落盘时如何对账。候选提供 `approval`，仍要验证批准是否绑定规范化参数、资源版本、主体和有效期。

`untested` 是合法状态。把未知项写成 pass 会污染选型；把所有项都写成“应用负责”则说明候选尚未证明减少复杂度。

## 第五步：先做硬资格探针

Qualification probe（资格探针）回答“候选是否具备进入 workload 比较的最低条件”。它不同于能力评分；关键资格失败时，后续漂亮答案没有决策意义。

### 探针记录模板

```text
probe_id:
hypothesis:
framework/version/language:
provider/model/adapter:
starting state:
input and fixture hash:
allowed capabilities:
expected events/result:
forbidden outcome:
command and timeout:
cleanup / rollback:
observed exit code and artifact:
status: pass | fail | untested
evidence: E0 | E1 | E2
```

### 最小资格矩阵

| Probe | 正例 | 必须失败的邻近例 | 失败后动作 |
| --- | --- | --- | --- |
| Identity | 精确版本与 Adapter 可定位 | alias/版本未知 | 停止比较，冻结身份 |
| Message/tool protocol | 单次与连续 ToolCall/Result 完整 | 未知字段、丢 call ID、坏参数 | 修 Adapter，不计模型失败 |
| Policy placement | 允许动作到达 handler | 范围外 Action 在 handler 前拒绝 | 修执行边界 |
| Budget/cancel | 达到阈值产生唯一终态 | 子任务继续运行、迟到结果覆盖终态 | 修 controller |
| Checkpoint/resume | 已对账状态可恢复 | 损坏/旧版本 checkpoint 被接受 | 加版本与迁移策略 |
| Unknown outcome | 幂等写可查询回执 | Timeout 后自动重复写入 | 停止写入，先对账 |
| Multi-agent owner | Handoff 后唯一 owner | 两个角色并发写同一产物 | 修 route/ownership |
| Trace/redaction | 事件可关联且最小披露 | Secret/个人路径进入公开 trace | 隔离 artifact、修采集 |
| Validator | 错误业务结果为 failed | Framework completed 绕过 acceptance | 修终态所有权 |
| Deployment | 身份、网络、store 可定位 | 环境改变却沿用本地授权 | 重新资格化目标 |

真实 Framework 安装、Provider 调用、费用和部署都需要单独授权。没有这些授权时先完成 probe 设计、固定 fake/replay 输入和应用侧 invariant；不要把 import 检查冒充 runtime 资格。

## 第六步：资格通过后再比较效用

固定以下控制变量：

```text
Task / fixture / starting commit
model / provider / adapter / generation settings
instruction and context construction
tool implementation / policy / sandbox / network
validator / timeout / total budget
machine / deployment / concurrency
```

合理的两类实验应分开：

1. **同条件实验**：尽量固定外围条件，观察 Framework 编排本身的差异；
2. **合理最佳配置实验**：允许候选采用原生强项，但把额外工具、权限、预算和人工配置作为系统差异报告。

每个候选至少报告：

| 类别 | 指标 |
| --- | --- |
| 结果 | Task acceptance、关键任务退步、失败类型 |
| 安全 | Policy violation、数据越界、重复/未知副作用 |
| 恢复 | Resume success、恢复时间、人工对账、状态迁移 |
| 资源 | Model/tool calls、token/费用、P50/P90、checkpoint 大小 |
| 复杂度 | 隐式默认、callback/edge 数、调试时间、升级与卸载成本 |
| 可解释性 | 可归因失败、Trace 覆盖、owner 与终态一致性 |

不要把不同 Task 的重复 run 当作独立任务数量，也不要删除安装失败、timeout 或恢复错误后只计算成功样本。资格失败与 workload 失败可以分开统计，但都应保留。

## 第七步：写出 adopt、reject 或 defer

### 决策模板

```text
Decision: adopt | reject | defer
Scope: 哪些 workload / surface / deployment
Candidate identity:
Baseline identity:
Hard qualification result:
Observed benefit:
Observed cost and regressions:
Uncertainty / untested:
Why alternatives were not chosen:
Rollout stages:
Rollback triggers and target:
Re-evaluation date or trigger:
Evidence links:
```

- `adopt` 表示在限定范围内证据超过预注册门槛，不表示全局优胜；
- `reject` 应记录是哪项硬约束或净效用失败，避免下次重复实验；
- `defer` 表示关键证据尚缺、资格未完成或迁移成本暂不可接受，不是含糊的“以后再看”。

可以形成路由：状态图任务采用候选 A，简单请求保留 baseline，多 owner 任务暂缓。路由必须绑定候选版本与证据；Framework 升级、Provider/Adapter 改变、Task 形状变化或生产事故都会触发重测。

## 回退不是重新安装旧版本

回退包至少回答：

| 对象 | 必须保留或迁移什么 |
| --- | --- |
| Source/config | 上一可用 commit、锁文件、配置与构建 artifact |
| State | Schema 版本、checkpoint、Session、未决 approval |
| External effects | 幂等键、业务回执、unknown outcome 对账 |
| Traffic/worker | 停止入口、队列 drain、迟到事件处理 |
| Data | 新旧存储、保留、删除与访问边界 |
| Observability | Trace 关联、事件保留与 incident 时间线 |
| Validation | 旧 validator、兼容策略与回归集 |

Framework 类型从代码中删除，不会自动撤销已发送消息、写入数据库、产生费用或升级过的 checkpoint。状态不可逆迁移前先演练 downgrade 或导出；做不到时把它写成 adoption cost（采用成本）。

## 工作例：研究流程是否需要 graph runtime

下面是合成纸面案例，不表示任何 Framework 的真实结果。

### Task 形状

```text
固定来源 → 并行提取 claim → 保留冲突 → 人工裁决 → 生成报告
```

- 来源与引用是结构化状态；
- 提取可以并行，但同一 claim 的不同值不得被最后写入覆盖；
- 冲突时需暂停数小时等待人工；
- 没有外部业务写入，只有最终 artifact；
- Validator 可确定性检查 citation 与 source snapshot。

### Baseline

纯 Python 状态机已经能顺序执行，E1 fixture 会保留冲突。缺口是跨进程暂停/恢复尚未实现；当前不能证明 graph runtime 会改善它。

### 候选判断

| 候选形状 | 当前判断 | 理由 |
| --- | --- | --- |
| 保留显式状态机 | baseline | 逻辑可测、依赖少，但缺 durable resume |
| Graph/state runtime | defer pending E2 | 抽象与状态形状匹配，仍需 checkpoint/reducer/interrupt 探针 |
| Conversation team | reject for this scope | 没有独立 owner 或互斥权限需求，角色对话不解决主缺口 |

这份决定可以在 graph 候选完成 E2 resume/损坏快照/冲突 reducer 探针后重开。当前不会因为官方文档出现 `checkpoint` 或 `interrupt` 名称就直接 adopt。

## 在当前仓库运行一次工作表验证

### 前置条件与固定输入

- Node.js 22+、Python 3.11+、`uv 0.11.16`；依赖已按 `package-lock.json` 与 `uv.lock` 缓存；
- 从仓库根目录运行，先用 `git status --short --branch` 识别已有改动；
- 输入固定为 `lab/fixtures/migration/`，不安装第三方 Framework、不需要 API key；
- 当前命令只验证 Codex、Pi、Claude Code 的合成责任映射，不验证 LangGraph、Agents SDK、ADK 或 AutoGen runtime。

### 命令

下面三条在 Windows PowerShell 与 macOS/Linux POSIX shell 均可逐行执行：

```powershell
uv run --frozen --offline python scripts/run-labs.py migration
uv run --frozen --offline pytest -q lab/tests/test_m5_labs.py::test_migration_covers_all_harness_paths_domains_and_control_boundaries lab/tests/test_m5_labs.py::test_migration_rejects_unknown_empty_and_broader_control_mappings
npm run facts:check
```

### 预期输出与人工断言

第一条应退出 0，并包含：

```text
evidence=E1
offline=true
passed=true
negative_rejected=true
paths_checked=2
mapped_responsibilities=12
domains_checked=5
uncompensated_gaps=[]
boundary_violations=[]
verbatim_targets=[]
```

Pytest 应显示 `2 passed`。第二个测试是可执行失败演练：它要求未知 Harness、空字段、逐字复制和扩大 network boundary 的 proposal 被 evaluator 拒绝。`facts:check` 应报告已登记的 Framework 来源状态，但不会把任何产品升级为 E1/live。

人工再断言：migration fixture 的 `source_semantics`、`target_semantics`、`gap`、`compensating_control`、`evidence_axis` 与 `preserves_boundary` 都能映射到本页责任矩阵；结果中没有模型响应、Provider usage 或真实产品版本。

### 失败、停止、清理与回滚

若命令尝试联网、索要凭据、导入第三方 Framework、接受边界扩大、把逐字复制判为成功，或事实检查把 `untested` 写成 live，立即停止。不要安装 quickstart 依赖或修改 expected 来获得绿色输出。

正常运行只读 fixture 并输出终端结果，可能产生可忽略的测试 cache。发送 `Ctrl+C` 可停止；清理前先运行 `git status --short`，只处理本轮明确生成的临时文件。若误改工作表或 fixture，先审核：

```powershell
git diff -- docs/practice/framework-selection.md lab/fixtures/migration lab/src/about_harness/labs.py lab/tests/test_m5_labs.py
```

只恢复自己的改动，不覆盖其他未提交文件。候选 Framework 资格失败时回到“无新依赖、E0/E1-only”的 baseline，保留失败 probe 和 `defer/reject` 决定。

### 已知限制与证据边界

当前验证只证明固定 migration evaluator 能检查 2 条 Harness 路径、12 项责任和若干结构化负例。它不执行 Framework runtime，不测试 checkpoint、event、handoff、deployment 或真实模型，也不比较质量、延迟和成本。

所以本页可帮助写出 E0 研究设计和 E1 责任映射；只有另行授权、锁定目标版本并实际运行资格探针，才可能形成 E2。完整代表性 workload、重复、holdout、安全和成本实验达到预注册门槛后，才可能形成 E3 采用证据。

## 最终复核清单

- [ ] 决策问题绑定 workload、基线、收益、风险与代价；
- [ ] Task 形状在候选产品之前完成；
- [ ] Baseline 可运行、可失败并有真实测量；
- [ ] Framework 与应用责任逐项映射，没有用同名能力跳过语义；
- [ ] 关键资格项有正例、邻近负例、停止与清理；
- [ ] 资格失败没有被计入模型能力或用更大预算绕过；
- [ ] 同条件实验与候选最佳配置实验分开；
- [ ] 结果写成限定的 adopt/reject/defer，并保留 untested；
- [ ] 升级、状态迁移、卸载和外部副作用回退已说明；
- [ ] 来源状态与 E0–E3 实验等级没有混写。

## 检查题与下一步

1. 为什么功能清单不能替代 Task 形状？
2. 候选减少代码行数时，还应测量哪些长期复杂度？
3. Checkpoint probe 为什么必须包含 unknown outcome 和损坏快照？
4. 什么时候应写 `defer`，而不是用 E0 来源推断资格通过？
5. Conversation runtime 为什么不适合没有独立 owner 的串行步骤？
6. Framework 回退为什么还要处理状态、worker 和外部回执？

先用[Framework 对照](/frameworks/comparison)选择与任务形状匹配的候选，再阅读对应 Framework 专题。需要比较结果时进入[评测实验室](/practice/evaluation)；需要把控制责任迁移到另一 Harness 时运行[迁移实验](/labs/migration)。
