# 问题诊断：找到第一处分歧

调试 Agent 任务的目标不是尽快找到一个“看起来合理”的解释，而是定位 expected（预期）与 observed（实际）第一次分开的边界。错误可能来自 Task（任务）、上下文、模型、Adapter（适配器）、策略、工具、验证器或基础设施；最终答案出错只是症状，不能直接证明模型是根因。

<span id="本页产出"></span>
<span id="前置条件与版本"></span>
<span id="第一步-运行正例"></span>
<span id="第一步运行正例"></span>
<span id="第三步-回到独立测试锚点"></span>
<span id="第三步回到独立测试锚点"></span>
<span id="清理与回滚"></span>
<span id="检查题"></span>

## 先保全现场

修配置、重跑或开启更详细日志之前，先保存最小诊断快照：

- 任务 文本或 hash、验收条件、run ID、起始 commit 与工作树状态；
- harness、model、供应方、适配器 的精确身份和关键参数；
- 实际加载的项目指令、工具名称及 schema 版本；
- 关键事件顺序、原始错误、退出码、重试次数与最终 stop reason；
- 外部副作用是否发生，以及可以安全重试还是必须先对账。

日志、session 和工具返回可能含 credential（凭据）、个人路径或私有内容。保留现场不等于原样公开：先限制访问，再制作脱敏副本；不要在尚未确认部分写入时盲目重跑写操作。

### 现场快照分三层

| 层 | 保存什么 | 为什么不能互相替代 |
| --- | --- | --- |
| Identity（身份） | task/config/instruction/tool schema/commit/environment hash | 同名任务可能已经换了输入或实现 |
| Event（事件） | Action、policy decision、handler result、retry、stop | 最终结果不能重建中间因果 |
| Artifact（产物） | 文件、测试、业务回执、截图或查询结果 | 日志写“成功”不等于对象真的改变 |

外部写操作结果不明时，先记录 intent（意图）、idempotency key（幂等键）和目标系统 receipt（回执），再查询事实来源。Checkpoint（检查点） 没有结果不表示动作未发生；超时也不表示远端一定取消。

<span id="动手工作坊-三个诊断案例、三条责任边界"></span>
<span id="动手工作坊三个诊断案例三条责任边界"></span>

## 快速诊断树

```text
任务失败
├─ Oracle 是否能明确判定失败？
│  ├─ 否 → 先补断言、测试、截图规则或人工 rubric
│  └─ 是
├─ Agent 是否收到正确目标、上下文和错误？
│  ├─ 否 → cwd、指令加载、检索、裁剪、压缩、消息映射
│  └─ 是
├─ 模型是否提出结构合法且符合任务的 Action？
│  ├─ 否 → Task、提示、模型适配、推理或工具描述
│  └─ 是
├─ Action 是否获权并由正确 handler 执行？
│  ├─ 否 → schema、policy、approval、registry、adapter
│  └─ 是
├─ ToolResult 是否完整回到下一轮状态？
│  ├─ 否 → 序列化、call ID、截断、重试、checkpoint
│  └─ 是
└─ Validator 是否根据真实产物判定？
   ├─ 否 → 修 oracle、产物采集或终态顺序
   └─ 是 → 再研究模型判断、任务难度与路由
```

Oracle（判定标准）可以是测试、schema、业务对账、视觉基线或人工评分规则。没有 oracle 时，“我觉得答案不对”只能形成调查线索，不能支持根因或修复完成结论。

## 十五分钟分层流程

<span id="1-证明症状存在"></span>

### 1. 证明症状存在

在固定起点运行最小命令，记录输入、输出和退出码。确认失败来自当前版本，而不是旧日志、缓存、另一个目录或已经关闭的 incident（事故）。若无法稳定复现，先报告复现频率和共同条件，不要把第一次成功重跑称为已修复。

<span id="2-沿事件流找第一处分歧"></span>

### 2. 沿事件流找第一处分歧

按 `Task → context → model response → Action → policy → handler → ToolResult → validator` 比较预期与实际。越靠前的分歧越可能解释后续所有异常。例如工具参数在模型输出中已经错误，就不应把 工具处理函数 的参数拒绝诊断成执行器故障；Action（动作提议） 正确但 call ID 在 适配器 中丢失，也不应计为模型不会用工具。

<span id="3-写可证伪假设"></span>

### 3. 写可证伪假设

每个假设使用相同格式：

```text
假设：压缩摘要漏掉了禁止修改 generated/ 的规则。
预测：禁区规则在压缩前可见、压缩后不可见；不压缩时任务通过。
区分性测试：固定模型和任务，只替换压缩后的上下文快照。
反证：两份快照都包含规则，且模型收到的消息相同。
```

一次测试应尽量只区分一个原因。“升级模型、改提示、加重试并放宽权限”即使成功，也无法知道哪项改变有效，还可能掩盖安全故障。

<span id="4-用替身隔离责任层"></span>

### 4. 用替身隔离责任层

用固定模型响应测试 parser（解析器）与 policy；用 FakeAdapter 测 控制器 与工具；直接调用 工具处理函数 测业务逻辑；用固定 ToolResult（工具结果） 测下一轮状态。替身不是为了证明真实系统可用，而是排除不在本次路径上的变量。真实 供应方 故障仍需真实 surface 的独立证据。

<span id="5-修复并防回归"></span>

### 5. 修复并防回归

最小修复至少通过三种验证：原失败现在通过；相邻正常路径没有退化；一个负例仍被正确拒绝。安全或副作用相关修复还要断言 工具处理函数 调用次数、资源版本或外部对账结果，而不只看最终文本。

### 用一张边界表防止跳步

每个边界只写观察到的事实，不提前写根因：

| 边界 | Expected | Observed | 证据引用 | 是否第一处分歧 |
| --- | --- | --- | --- | --- |
| Task → context | 目标、禁区、输入版本完整 | … | context hash/selected IDs | … |
| Model → Action | schema 合法、参数符合任务 | … | raw response hash/Action | … |
| Action → policy | 按 task 能力和参数判定 | … | policy decision/reason | … |
| Policy → handler | 只执行 allowed action | … | handler count/call ID | … |
| Handler → ToolResult | 结果、错误和回执完整 | … | result/receipt/attempt | … |
| Result → validator | 根据真实产物验收 | … | assertion/exit code | … |
| Validator → terminal | 只有验收通过才 completed | … | stop reason/final state | … |

一旦找到第一处分歧，仍要验证它是否足以解释后续症状。例如 policy 正确拒绝了未授权工具，这是预期保护，不是 policy bug；更早的问题可能是 任务 没有允许本应需要的工具，或模型提出了任务外动作。

### 假设台账要保留被否定方案

```text
hypothesis_id / owner / created_at
prediction if true
one-variable discriminating test
supporting evidence / counterevidence
result: supported | weakened | rejected | pending
next action / stop condition
```

“改完能跑”不是区分性测试。修 prompt 后成功，可能来自随机性、缓存或更高预算；要回到原 fixture，固定其他身份并验证预言。被否定的假设也保留，避免下一人重复同一路径。

## 症状只是入口

| 症状 | 候选层 | 第一项检查 | 不要先做 |
| --- | --- | --- | --- |
| 修改错误目录 | context/controller | 当前目录、Git root、指令作用域 | 换更强模型 |
| 一直重读同一文件 | state/tool result | 轨迹中是否保存位置与已读摘要 | 增大上下文后继续塞日志 |
| 声称测试通过但没运行 | Task/validator | 完成条件是否要求命令证据 | 只在提示里加“务必” |
| tool 参数始终不合法 | schema/adapter/model | 原始 Action 与 provider 映射前后 diff | 反复重试相同参数 |
| 权限提示过多 | policy/tool design | 读写是否分离、授权粒度和 sandbox | 全部改成自动允许 |
| 恢复后重复写入 | checkpoint/executor | 幂等键、确认回执与保存时机 | 删除 trace 再跑 |
| 长会话突然违约 | context | 压缩前后规则与任务状态 | 假设模型永久“忘记” |
| 快模型总成本更高 | retry/loop | 总调用、纠正轮次和工具重复量 | 只比较每 token 单价 |
| 网页内容触发外发 | trust/policy | 数据来源、授权对象与实际调用 | 只改 system prompt |

同一症状可以有多个根因。表格用于选择下一项检查，不是自动诊断器。更完整的层级故障表见[Harness 问题诊断](/practice/debugging)。

<span id="第二步-让-oracle-故意失败"></span>
<span id="第二步让-oracle-故意失败"></span>
<span id="失败、停止、清理与回滚"></span>
<span id="失败停止清理与回滚"></span>

<span id="工作例测试通过但-ci-失败"></span>

## 工作例：测试“通过”但 CI 失败

假设 Agent 最终回复称测试通过，随后 CI 在另一个测试集失败。先不要得出“模型撒谎”或“CI 不稳定”：

1. 从 轨迹 确认 Agent 实际请求了哪条命令；
2. 从 工具结果 确认执行目录、退出码和输出是否完整返回；
3. 比较 任务 要求、Agent 所跑测试与 CI job 的命令；
4. 在相同 commit 和运行时重放差异命令；
5. 将遗漏测试加入完成 验证器，并添加“只跑目标测试不得 completed”的负例。

如果模型从未收到“必须运行完整检查”，第一处分歧在 任务；如果 动作提议 是完整命令但 适配器 截断参数，根因在协议映射；如果完整测试失败却仍进入 `completed`，根因在 验证器/终态顺序。三种情况的表面回复相同，修复位置完全不同。

## 从第一处分歧到修复位置

| 第一处分歧 | 优先修复 | 必须增加的验证 | 不应顺手改变 |
| --- | --- | --- | --- |
| Task/fixture | 目标、输入、验收或版本 | 好/坏 fixture、旧版本兼容 | 模型、预算、policy |
| Context | 选择、排序、压缩或来源 | 固定 selected IDs、截断负例 | Tool handler |
| Adapter | parser、字段映射、stream 状态 | 原始响应 replay、未知字段/坏类型 | 放宽 Action schema |
| Policy | capability、参数约束、approval | allow/deny/needs-approval 三路 | 关闭 sandbox |
| Tool/retry | error taxonomy、幂等、回执 | 暂时/永久错误、重复 key、副作用次数 | 增加模型重试 |
| Checkpoint | 游标、预算、pending intent | 崩溃窗口、恢复、迟到结果 | 覆盖历史事件 |
| Validator | oracle、产物读取、终态顺序 | 已知好/坏产物、旧 report 重放 | 候选生成逻辑 |

最小修复只改变拥有根因的层。若必须跨层修改，分别说明每一项如何恢复同一个不变量，并为交界处增加契约测试；不要把一次“大升级”包装成已定位根因。

## 最小复现包

提交 bug 或比较配置时，使用合成数据制作独立复现包：

```md
## Symptom / expected
## Exact identities and starting commit
## Minimal Task and fixture hash
## Tools, permissions and relevant config
## Ordered events and first divergence
## Command, exit code and repeat rate
## Side effects / safe retry condition
## Redactions, known limits and cleanup
```

复现包应小到另一人能在干净环境执行，又要保留触发根因的变量。删除一个字段后故障消失，不一定说明字段“多余”，它可能正是触发条件。公开前扫描 Secret、私有 URL、个人数据和绝对个人路径。

<span id="何时开新会话换模型或停止"></span>

## 何时开新会话、换模型或停止

任务已经改变、上下文混入多个失败方案、相同纠正出现两次，或压缩摘要丢失关键边界时，先保存确认事实、当前 diff、被否定假设和剩余步骤，再开干净会话。权限、工具或服务不可用时，新会话不会修复环境。

只有在目标、上下文、工具、协议、权限和 验证器 都有证据正确，而相同推理任务仍反复失败时，才把模型适配列为主要变量。换模型后固定其他条件做 A/B（对照实验）；单次成功不能证明根因。

发现 Secret 泄漏、未授权副作用、重复写入无法对账、取消失效或证据正在被覆盖时，停止普通调试并进入相应事故流程。不要为了复现而扩大损害。

## 缩小与证伪

<span id="固定输入与预期"></span>

<span id="第三步最小化输入与路径"></span>

### 第三步：最小化输入与路径

Delta debugging（差分最小化）是逐步删除输入、工具、上下文和步骤，每次验证失败是否仍存在。最终保留“再删一项就不复现”的最小案例。

按风险从外围缩小：

1. 复制到隔离 fixture，替换 Secret、个人数据和真实端点；
2. 删除无关文件、历史消息、工具和子任务；
3. 固定模型 action 或使用 replay，判断是否仍失败；
4. 将真实 tool 换成记录请求的 fake，判断执行环境是否必要；
5. 将复杂 验证器 换成一个确定性断言；
6. 保留触发条件、错误证据和安全边界。

最小化时一次只删一类因素，并记录结果。删掉攻击文本后失败消失，只说明触发条件被移除，不证明安全漏洞已修复。


### 二分版本与配置

若已知某个旧版本正常、新版本失败，按 commit、依赖版本或 config revision 二分。每个点使用同一最小 fixture 和验证命令，记录 good/bad/invalid：环境无法构建属于 invalid，不能随意当 bad。

配置二分从工程基线开始逐项恢复 context、instructions、tools、memory、budget、适配器/model。顺序根据第一处分歧选择，不必永远从模型开始。若每个单项都正常、组合失败，设计二因子测试查交互，而不是认定观察有误。

版本二分只能定位首次出现差异的 change，仍需理解机制。附近可能同时有测试变化、依赖漂移或隐藏服务端变化。


### 间歇性失败怎样诊断

先确认每次 run 的身份真的相同，再按 task 配对重复。保存 seed/采样设置、执行顺序、worker、region、缓存冷热、并发、rate limit、时间和资源水位。将失败按这些特征切片，寻找相关但不立即宣称因果。

常用故障注入：固定前几次 供应方/tool 返回暂时错误；延迟响应越过 截止时间；在 检查点 前后中断；并发恢复同一 run；返回部分成功；制造缓存过期。每次同时断言停止、重试上限、幂等、副作用和 轨迹。

不要只重跑到成功、只保存最后一次或把所有偶发失败标成 infrastructure。预注册重跑规则，原尝试保留；产品随机性、race 与基础设施失败分别分类。


## 可运行诊断工作坊

按[统一环境](/guide/prerequisites)准备 Python 3.12、uv 0.11.16 和锁定依赖。固定任务、替身和断言位于 `scripts/debugging-workshop.py`：

```bash
npm run debug:workshop
```

读取三个案例的第一处分歧：适配器返回值违反契约，应为 invalid_action；权限拒绝后 工具处理函数 不应执行；可重试错误按上限重试，相同幂等请求复用结果。总 passed=true 只表示这些断言成立。

故意替换一个预期值验证工作坊会失败：

```bash
npm run debug:workshop -- --inject-failure
```

预期命令退出 1，适配器案例 passed=false；如果退出 0，停止使用诊断结果，先修复断言。案例只有进程内工具，无真实模型和外部副作用。退出进程即清理临时状态；保留用于定位的摘要。回退自己改过的预期值后重跑正常命令，不放宽运行契约。
