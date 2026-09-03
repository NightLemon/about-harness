# 问题诊断：找到第一处分歧

调试 Agent 任务的目标不是尽快找到一个“看起来合理”的解释，而是定位 expected（预期）与 observed（实际）第一次分开的边界。错误可能来自 Task、上下文、模型、Adapter、策略、工具、验证器或基础设施；最终答案出错只是症状，不能直接证明模型是根因。

## 本页产出

完成一次诊断后，你应能交付四项内容：可重复的症状、第一处分歧、被证据排除的替代假设，以及一个通过回归与负例验证的最小修复。还不能定位时，应明确缺少哪段证据，而不是用“偶发”“模型不稳定”结束调查。

具体来说，你应该能够：

- 区分 symptom（症状）、first divergence（第一处分歧）和 root cause（根因）；
- 证明一个 Action 是模型提出、policy 拒绝，还是 handler 真正执行；
- 用固定 Adapter、内存 Tool 和确定性 oracle 隔离责任层；
- 为重试、幂等、预算、取消和 timeout 保存可反驳的证据；
- 在修复前定义停止条件，在修复后同时验证原失败、相邻正例和安全负例；
- 把结论限制在当前 E1 fake 案例，不外推真实 provider 或生产副作用。

## 先保全现场

修配置、重跑或开启更详细日志之前，先保存最小诊断快照：

- Task 文本或 hash、验收条件、run ID、起始 commit 与工作树状态；
- harness、model、provider、adapter 的精确身份和关键参数；
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

外部写操作结果不明时，先记录 intent（意图）、idempotency key（幂等键）和目标系统 receipt（回执），再查询事实来源。Checkpoint 没有结果不表示动作未发生；超时也不表示远端一定取消。

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

### 1. 证明症状存在

在固定起点运行最小命令，记录输入、输出和退出码。确认失败来自当前版本，而不是旧日志、缓存、另一个目录或已经关闭的 incident（事故）。若无法稳定复现，先报告复现频率和共同条件，不要把第一次成功重跑称为已修复。

### 2. 沿事件流找第一处分歧

按 `Task → context → model response → Action → policy → handler → ToolResult → validator` 比较预期与实际。越靠前的分歧越可能解释后续所有异常。例如工具参数在模型输出中已经错误，就不应把 handler 的参数拒绝诊断成执行器故障；Action 正确但 call ID 在 Adapter 中丢失，也不应计为模型不会用工具。

### 3. 写可证伪假设

每个假设使用相同格式：

```text
假设：压缩摘要漏掉了禁止修改 generated/ 的规则。
预测：禁区规则在压缩前可见、压缩后不可见；不压缩时任务通过。
区分性测试：固定模型和任务，只替换压缩后的上下文快照。
反证：两份快照都包含规则，且模型收到的消息相同。
```

一次测试应尽量只区分一个原因。“升级模型、改提示、加重试并放宽权限”即使成功，也无法知道哪项改变有效，还可能掩盖安全故障。

### 4. 用替身隔离责任层

用固定模型响应测试 parser（解析器）与 policy；用 FakeAdapter 测 controller 与工具；直接调用 handler 测业务逻辑；用固定 ToolResult 测下一轮状态。替身不是为了证明真实系统可用，而是排除不在本次路径上的变量。真实 provider 故障仍需真实 surface 的独立证据。

### 5. 修复并防回归

最小修复至少通过三种验证：原失败现在通过；相邻正常路径没有退化；一个负例仍被正确拒绝。安全或副作用相关修复还要断言 handler 调用次数、资源版本或外部对账结果，而不只看最终文本。

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

一旦找到第一处分歧，仍要验证它是否足以解释后续症状。例如 policy 正确拒绝了未授权工具，这是预期保护，不是 policy bug；更早的问题可能是 Task 没有允许本应需要的工具，或模型提出了任务外动作。

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

同一症状可以有多个根因。表格用于选择下一项检查，不是自动诊断器。更完整的层级故障表见[Harness 问题诊断](/optimization/debugging)。

## 工作例：测试“通过”但 CI 失败

假设 Agent 最终回复称测试通过，随后 CI 在另一个测试集失败。先不要得出“模型撒谎”或“CI 不稳定”：

1. 从 trace 确认 Agent 实际请求了哪条命令；
2. 从 ToolResult 确认执行目录、退出码和输出是否完整返回；
3. 比较 Task 要求、Agent 所跑测试与 CI job 的命令；
4. 在相同 commit 和运行时重放差异命令；
5. 将遗漏测试加入完成 validator，并添加“只跑目标测试不得 completed”的负例。

如果模型从未收到“必须运行完整检查”，第一处分歧在 Task；如果 Action 是完整命令但 Adapter 截断参数，根因在协议映射；如果完整测试失败却仍进入 `completed`，根因在 validator/终态顺序。三种情况的表面回复相同，修复位置完全不同。

## 动手工作坊：三个诊断案例、三条责任边界

仓库提供 `npm run debug:workshop`，用固定 Adapter、内存 Tool 和可控 retry 生成三个结构化诊断案例。它不调用模型、不联网、不读取凭据，也不写外部系统；目标是练习读 expected/observed、事件顺序和执行次数。

### 固定输入与预期

| case | 固定输入 | 预期第一处分歧 | 决定性断言 |
| --- | --- | --- | --- |
| `adapter-contract` | Adapter 返回普通对象而非 `Action` | `adapter_return` | `failed/invalid_action`，没有 handler 执行 |
| `permission-boundary` | 已注册但 Task 未 allowlist 的 `dangerous` Tool | `policy_decision` | `stopped/permission_denied`，handler 次数为 0 |
| `retry-idempotency` | 前两次暂时失败、第三次成功，再重复同一 key | `tool_attempt` | 2 retry、1 次副作用、1 tool call、1 次复用 |

这里“第一处分歧”描述预设诊断案例，不表示所有同名 stop reason 都有同一根因。真实问题仍要沿自己的事件链验证。

### 前置条件与版本

- Node.js 22+，用于运行 npm 入口；
- Python 3.11+，项目静态类型基线为 3.11；
- `uv 0.11.16`；依赖按 `uv.lock` 冻结，其中当前 pytest 为 8.4.2；
- 从仓库根目录执行，锁定依赖已经在本地 cache。

脚本是 `scripts/debugging-workshop.py`，实现复用 `lab/src/about_harness/`，不需要 API key、真实 provider、网络、浏览器或费用授权。运行前无需修改任何 fixture。

### 第一步：运行正例

PowerShell、bash 和 zsh 都可使用：

```bash
npm run debug:workshop
```

预期退出码为 0，顶层至少满足：

```json
{
  "evidence": "E1",
  "offline": true,
  "injected_failure": false,
  "passed": true
}
```

不要只看 `passed=true`。逐项核对：

1. `adapter-contract` 的 trace 只有 `run_started → run_stopped`；坏对象在记录 `model_action` 前被 runtime contract 拒绝。
2. `permission-boundary` 包含 `model_action → policy_denied → run_stopped`，没有 `tool_result`，`handler_executions=0`。
3. `retry-idempotency` 有两个连续 `retry`，退避为 `0.01/0.02` 秒；两个 `tool_result` 的 `reused_flags` 为 `[false, true]`，所以第二次相同 key 复用缓存，副作用仍为 1。
4. 三个 case 的 `expected_stop_reason` 与 `observed_stop_reason` 相同。

这些事件回答“在哪一层停止”和“handler 是否执行”。它们没有保存原始 prompt 或真实工具返回，也不能证明分布式 worker、进程重启后的幂等或外部 API 取消。

### 第二步：让 oracle 故意失败

```bash
npm run debug:workshop -- --inject-failure
```

这个参数不破坏实现，而是把 `adapter-contract.expected_stop_reason` 从 `invalid_action` 故意换成 `completed`。预期退出码为 1，顶层 `injected_failure=true`、`passed=false`，该 case 同时保留：

```json
{
  "expected_stop_reason": "completed",
  "observed_stop_reason": "invalid_action",
  "passed": false
}
```

负例的意义是证明工作坊不会只打印漂亮 JSON：oracle 与观察冲突时，进程必须非零退出。若这条命令返回 0，停止使用结果，检查聚合条件和 `main()` 的退出码；不要把预期改回与输出相同来隐藏 checker 故障。

### 第三步：回到独立测试锚点

工作坊和单元测试可能共享实现，因此还要读断言本身。在仓库根目录运行。PowerShell：

```powershell
uv run --frozen --offline pytest -vv `
  lab/tests/test_loop.py::test_wrong_adapter_return_is_classified_as_invalid_action `
  lab/tests/test_loop.py::test_permission_denial_stops_before_tool_execution `
  lab/tests/test_loop.py::test_retry_and_idempotency_prevent_duplicate_side_effects
```

bash/zsh：

```bash
uv run --frozen --offline pytest -vv \
  lab/tests/test_loop.py::test_wrong_adapter_return_is_classified_as_invalid_action \
  lab/tests/test_loop.py::test_permission_denial_stops_before_tool_execution \
  lab/tests/test_loop.py::test_retry_and_idempotency_prevent_duplicate_side_effects
```

也可以把三个 test ID 放在同一行。预期收集 3 项并全部 `PASSED`。断言分别位于 Adapter trust boundary、policy 拒绝前的 handler count，以及 retry/幂等的 attempts、trace 和副作用次数。

如果工作坊通过但对应测试失败，第一处分歧可能在脚本复制的判定条件；如果测试通过但工作坊失败，检查 npm 参数、脚本导入路径和 summary 聚合。两者都通过只提供 E1 固定实现证据，不是独立模型或生产系统验证。

### 失败、停止、清理与回滚

正例非零、负例返回 0、危险 handler 执行、retry 次数无上限、`side_effects` 大于 1，或 trace 缺少终态时立即停止。保留脱敏 stdout 和精确 commit，先检查 `HarnessRunner → PermissionPolicy → ToolRegistry` 的第一处分歧，不增加无限重试、不扩大 Task 工具权限。

工作坊只向终端写 JSON；内存状态随进程结束释放，没有业务数据需要清理。pytest 可能留下被 Git 忽略的 `.pytest_cache/`，可以保留复用，不应清理工作区其他文件。若为了练习修改脚本或实现，先用 `git diff -- scripts/debugging-workshop.py lab/src/about_harness/ lab/tests/test_loop.py` 精确核对，只撤销自己本轮修改；恢复后重新运行正例、失败 canary 和三项测试。

当前证据为 E1：固定 fake 能区分 Adapter、policy 和 tool/retry 三条路径。它不证明真实模型 action 质量、provider 协议、跨进程幂等、外部副作用、生产观测完整性或任何模型排名。

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

## 何时开新会话、换模型或停止

任务已经改变、上下文混入多个失败方案、相同纠正出现两次，或压缩摘要丢失关键边界时，先保存确认事实、当前 diff、被否定假设和剩余步骤，再开干净会话。权限、工具或服务不可用时，新会话不会修复环境。

只有在目标、上下文、工具、协议、权限和 validator 都有证据正确，而相同推理任务仍反复失败时，才把模型适配列为主要变量。换模型后固定其他条件做 A/B（对照实验）；单次成功不能证明根因。

发现 Secret 泄漏、未授权副作用、重复写入无法对账、取消失效或证据正在被覆盖时，停止普通调试并进入相应事故流程。不要为了复现而扩大损害。

## 清理与回滚

诊断命令优先使用只读、离线 fixture 和临时目录。完成后删除自行创建的临时副本，保留脱敏失败样例作为回归；不要删除仍用于取证的原始证据。修复失败时只回滚本次单变量修改，恢复先前配置和起始 commit，再运行原复现确认基线已恢复。

## 检查题

1. 最终答案错误时，为什么不能直接把根因归给模型？
2. 一个修复为何需要原失败、相邻正例和负例三类验证？
3. ToolResult 丢失 call ID 时，模型质量评分应如何处理？
4. 间歇性失败第一次重跑成功后，还缺哪些证据？

下一步：把诊断得到的单变量改动放入[评测实验室](/practice/evaluation)，并按[可观测性](/foundations/observability)保留能定位第一处分歧的事件。
