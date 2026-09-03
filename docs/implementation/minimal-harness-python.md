# Python 最小 Harness：从契约到可恢复循环

## 学习目标与证据边界

本教程沿当前仓库的真实 Python 实现，跟踪 Task → Action → policy → tool → trace → checkpoint → result。完成后你应能：

- 解释公共契约如何拒绝坏输入；
- 区分 Adapter 提议与 Harness 授权；
- 读懂预算、取消、timeout、retry 和 idempotency 的停止顺序；
- 从 trace 判断动作是否执行、重试或复用；
- 恢复一个 checkpoint，并指出当前恢复能力的边界；
- 跟踪 completion proposal（完成提议）被验收、退回修正或受预算停止，并说明内置验收器的边界。

整个教程不联网、不读取凭据，使用预定 Action 的 FakeAdapter。证据等级是 E1，只证明当前 commit 下的控制流和负例，不证明任何厂商模型、Provider 或 Framework 的性能。

## 前置条件与固定环境

- 已完成[环境自检](/guide/prerequisites)；
- Python 3.11+；项目基线 `uv 0.11.16`；
- 从仓库根目录执行；
- Python 依赖按 `uv.lock` 固定并已进入本地 cache；
- 工作树中的 `lab/` 和 `scripts/lab-smoke.py` 没有来源不明的修改。

记录环境：

```powershell
python --version
uv --version
git rev-parse --short HEAD
git status --short --branch
```

准备离线环境：

```powershell
uv sync --frozen --offline
```

若 cache 不完整，命令应失败。回到受控依赖准备阶段执行 `uv sync --frozen`，记录联网边界；不要移除 `--offline` 后仍把后续运行写成离线证据。

## 代码地图

| 文件 | 唯一责任 | 关键边界 |
| --- | --- | --- |
| `contracts.py` | Task、Action、ToolCall、Checkpoint、Result 与 budget | 结构和值域不合法时 fail closed |
| `acceptance.py` | `TaskSpec.acceptance` 与完成输出的确定性子集比对 | 只判断 JSON，不执行外部业务检查 |
| `adapters/base.py` | Adapter Protocol | Provider 输出不能绕过 canonical Action |
| `adapters/fake.py` | 按序返回预定 Action，保存/恢复索引 | 只用于确定性 E1 |
| `loop.py` | 状态机、预算、取消、checkpoint 与终态 | Controller 是终态唯一作者 |
| `policies.py` | Task allowlist、敏感参数与人工批准 | Handler 前拒绝 |
| `tools.py` | 注册、执行、retry 与进程内幂等 cache | 未注册或最终失败停止 |
| `retry.py` | 可重试错误和指数 backoff | 只重试显式 `RetryableError` |
| `trace.py` | 有序 event 与递归脱敏 | Pattern 脱敏不是完整 DLP |
| `context.py` | required/trusted/priority 的 token 选择 | 必需内容超预算时失败 |
| `memory.py` | 工作记忆、过期、可信过滤和删除 | 不可信记录默认不检索 |

没有任何一个文件单独构成 Harness。可靠性来自它们的调用顺序和共同不变量。

## 第一步：运行最小 Smoke

```powershell
uv run --frozen --offline python scripts/lab-smoke.py
```

脚本构造：

```python
task = TaskSpec(
    "offline-smoke",
    "prove deterministic offline execution",
    ("echo",),
    Budgets(max_steps=3, max_model_calls=3, timeout_ms=1000),
    acceptance={"accepted": True},
    metadata={"evidence": "E1", "network": "disabled"},
)
adapter = FakeAdapter(
    (
        Action.tool(ToolCall("echo-1", "echo", {"value": "offline"}, "echo-once")),
        Action.complete({"accepted": True}),
    )
)
result = HarnessRunner(adapter, ToolRegistry.with_safe_defaults()).run(
    task, run_id="run-offline-smoke"
)
```

预期 stdout 是一行 JSON，至少断言：

```text
schema_version=1.0
run_id=run-offline-smoke
task_id=offline-smoke
status=completed
stop_reason=completed
metrics.model_calls=2
metrics.tool_calls=1
metrics.reused_tool_calls=0
trace[0].kind=run_started
trace[0].data.adapter=fake
trace[0].data.offline=true
```

不要复制预期文本冒充运行记录。保存实际命令、commit、退出码和完整 JSON hash。

## 第二步：沿 Trace 还原控制流

正常 smoke 的 event 顺序应表达：

```text
run_started
  → model_action(kind=tool)
  → tool_result(call_id=echo-1, reused=false)
  → checkpoint(adapter index=1)
  → model_action(kind=complete)
  → acceptance_result(accepted=true, validator=json-subset-v1)
  → run_stopped(status=completed)
```

关键观察：

1. FakeAdapter 只提出 `echo`；
2. `PermissionPolicy` 检查它是否在 `TaskSpec.allowed_tools`；
3. `ToolRegistry` 根据 `name` 找 handler，以 `idempotency_key` 管理复用；
4. ToolResult 写入 trace 后才创建 checkpoint；
5. 第二个 Action 提出 complete；
6. `JsonSubsetAcceptanceValidator` 检查输出包含 `accepted=true`；
7. Controller 只在验收通过后生成唯一 `RunResult`。

模型/Adapter 不直接持有 handler，也不能把 ToolCall 的名字当作已执行证据。

## 第三步：理解公共契约

### TaskSpec

Task ID 必须匹配公共 pattern；goal 为 1–4000 字符；`allowed_tools` 不能含空名或重复名。预算要求正整数 step/model-call/timeout，step 和 model-call 不超过 10,000，timeout 不超过 86,400,000 ms，cost 必须有限且非负。

`TaskSpec.from_dict` 还拒绝未知顶层/预算字段以及非有限或循环的 JSON 输入，避免拼写错误和不可序列化值被静默带入运行。`Action.from_dict` / `ToolCall.from_dict` 对 `action-v1` 线协议做同样的运行时收窄；直接构造 dataclass 适合内部可信测试对象，不应代替外部解析。

### Action 与 ToolCall

Action 只有 `tool` 或 `complete`：tool 必须携带 ToolCall，complete 不能携带 ToolCall；action cost 拒绝负数、`NaN` 与 `Infinity`。ToolCall 要求非空 call ID、name 和 idempotency key。

### Checkpoint

计数器必须是非负整数，`tool_calls + reused_tool_calls == step`，model call 不能少于已完成 step，cost 必须有限。Adapter state 只能是 JSON object。

运行契约测试：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_contracts_and_schema.py
```

预期退出 0，并覆盖 JSON Schema 与 Python dataclass 的正例对齐、坏 Task、未知字段、非有限成本和不一致 checkpoint。

这些检查证明结构一致，不证明 goal 合理、工具安全或 acceptance 充分。

## 第四步：预算与终态

`HarnessRunner` 在每次 Adapter 调用前检查 cancellation、总 deadline 和 model-call budget；收到 Action 后累计 cost，再检查 cancellation、deadline 和 cost budget；成功工具执行后推进 step。

| Stop reason | Status | 典型触发 | 是否执行当前工具 |
| --- | --- | --- | --- |
| `completed` | completed | 合法 complete 且声明的 JSON 子集验收通过 | 不适用 |
| `model_budget` | stopped | 调用次数或 cost 超限 | 取决于停止发生位置；超 cost 在工具前 |
| `max_steps` | stopped | 成功工具 step 达上限 | 最后一个允许 step 已完成 |
| `timeout` | stopped | 边界检查发现 deadline 到达 | 不抢占正在阻塞的 callable |
| `cancelled` | stopped | CancellationToken 已设置 | 在下一控制边界生效 |
| `permission_denied` | stopped | Policy 拒绝 ToolCall | 否 |
| `tool_error` | failed | 未注册/执行/最终 retry 失败 | 可能已有部分外部状态，需工具声明 |
| `invalid_action` | failed | Adapter 返回无效值，或当前 validator 契约/执行失败 | 否 |

这里把 stopped 与 failed 分开：预算、取消和拒权是受控停止；协议/工具错误是执行失败。两者都不能伪装成 completed。

## 第五步：Policy 在 Handler 前生效

默认 `PermissionPolicy` 检查：

- 工具是否在当前 Task allowlist；
- arguments 任意嵌套层是否含 `api_key/password/secret/token` 等敏感键；
- 该工具是否要求批准，是否配置 approver，批准是否通过。

对应负例：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_loop.py -k permission_denial
```

测试注册一个 `dangerous` handler，但 Task 只允许 `echo`。断言 stop reason 为 `permission_denied` 且 handler 标志仍为 false。这比“错误消息写着拒绝”更强，因为它证明副作用前停止。

当前 policy 仍很小：它不解析文件 canonical path、不检查网络 origin、OS identity 或业务资源 ownership。生产系统必须在目标工具和执行环境补足。

## 第六步：Retry 与 Idempotency

测试中的 `flaky` handler 前两次抛 `RetryableError`，第三次成功；相同 ToolCall 再出现一次：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_loop.py -k retry_and_idempotency
```

预期断言：

```text
handler attempts=3
retry events=2
sleep schedule=[0.01, 0.02]
metrics.tool_calls=1
metrics.reused_tool_calls=1
```

`ToolRegistry` 只对显式 `RetryableError` 做有界 retry；确定性 ToolError 不重试。相同 idempotency key 在当前进程 cache 命中后复用结果。

重要限制：cache 只以 key 索引，没有校验“同 key 但参数不同”；也没有持久化到 checkpoint 或跨进程存储。生产实现必须绑定 tool + canonical arguments + target identity，并由目标系统或持久 store 支持幂等。

## 第七步：Checkpoint 恢复

```powershell
uv run --frozen --offline pytest -q lab/tests/test_loop.py -k checkpoint_restores
```

第一次 runner 只允许一个 tool step，执行 `echo` 后因 `max_steps` 停止并留下 checkpoint。第二个 FakeAdapter 从保存的 `index=1` 恢复，直接消费后续 complete Action。

Checkpoint 当前保存：

```text
step / model_calls / tool_calls / reused_tool_calls
cost_usd / adapter_state
```

它没有保存 ToolRegistry cache、Task/config hash、trace lineage、外部资源状态或持久数据库事务。因此这个 E1 测试只证明 Adapter 位置与计数器能恢复；不能证明任意写工具可以 exactly-once（恰好一次）恢复。

真实恢复应在继续前核对 Task、config、tool schema、checkpoint lineage 和未决副作用。身份不一致时停止，不强行加载。

## 第八步：取消与 Deadline

```powershell
uv run --frozen --offline pytest -q lab/tests/test_loop.py -k "cancellation or timeout"
```

取消测试让 Adapter 阻塞，另一线程设置 token，再释放 Adapter。Runner 在 Adapter 返回后的控制边界把终态设为 `cancelled`，不会接受迟到 complete。Timeout 测试用可控 clock 让 Action 返回时已超 deadline，最终为 `timeout`。

这不是强制抢占：任意阻塞 Python callable 如果永不返回，当前总 deadline 不能杀掉它。真实 Adapter/handler 需要单调用 timeout、可取消 I/O、子进程/worker 隔离和迟到结果处理。

## 第九步：Completion proposal 与验收

默认 `JsonSubsetAcceptanceValidator` 把 `TaskSpec.acceptance` 解释为完成输出必须包含的 JSON 子集：object 可有额外字段，嵌套 object 递归比对，array 必须长度和值一致，布尔值不会与整数 `1/0` 混淆，非有限数不通过。失败路径使用 JSON Pointer（JSON 指针）表达，例如 `/details/count`。

```powershell
uv run --frozen --offline pytest -q lab/tests/test_acceptance.py lab/tests/test_loop.py -k "acceptance or validator"
```

关键路径是：

```text
complete proposal
  → acceptance_result=false + failed_paths
  → checkpoint Adapter 游标与已消费 model budget
  → 下一次 Action 可以修正
  → acceptance_result=true
  → completed
```

如果修正一直失败，下一轮 preflight 会以 `model_budget` 停止，不能把最后一个未通过输出发布为 completed。Validator 返回后还会重新检查 timeout/cancel；一个耗时过长但判断通过的 validator 也不能越过总 deadline。Validator 自身抛错时当前 v1 映射为 `failed/invalid_action`，并只在 trace/error 暴露错误类型，不把完成输出当成功。

`acceptance={}` 为兼容旧的无条件任务，记录 `top_level_criteria=0` 后允许完成；这只说明“没有声明机器条件”，不构成业务验收证据。需要检查文件、测试、外部资源或人工 rubric 时，应注入任务专用 validator，而不是把这些事实复制成模型输出字段。

## 第十步：Context、Memory 与 Trace

```powershell
uv run --frozen --offline pytest -q lab/tests/test_memory_context_trace.py
```

测试证明：

- ContextBudget 优先保留 required、trusted 和高优先级项；
- 必需上下文超预算时失败，不悄悄裁掉；
- LongTermMemory 默认只检索可信且未过期记录；
- WorkingMemory 支持显式删除，包括值为 `None` 的 key；
- Trace 对敏感键、Bearer、模拟 token 和 Windows 用户路径做递归脱敏。

Pattern-based redaction（模式脱敏）不是完整 DLP（数据防泄漏）。未知凭据格式、语义敏感文本、二进制或嵌套编码仍可能泄漏；生产系统应在输入、ToolResult、异常、trace sink 和公开结果多层控制。

## 第十一步：Replay 与 Live 禁用边界

```powershell
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py
```

ReplayAdapter 从固定 records 构造 Action，拒绝未知字段、坏 checkpoint 与无效结构。LiveAdapter 在任何 Provider 动作前抛 `LiveAdapterDisabled`。

这证明默认路径 fail closed，不证明真实 Provider 的 messages、tool、stream、usage、error 或 cancel 兼容。若测试开始请求 API key/网络或 live adapter 可执行，立即停止，不配置凭据继续。

## 完整验证

完成阅读或修改后运行：

```powershell
uv run --frozen --offline pytest
uv run --frozen --offline ruff check
npm run lab:pyright
npm run lab:smoke
```

预期 pytest、Ruff、Pyright 与 smoke 全部退出 0；smoke JSON 满足开头列出的业务断言。测试输出和命令记录是 E1 证据，不能升级成真实模型质量。

## JSON 子集验收不等于完整业务完成

当前 `HarnessRunner` 已把 complete 当作提议，并调用可替换的 `AcceptanceValidator`。默认实现只对内存中的 completion output 做 JSON 子集比对，不读取文件、运行测试、查询目标系统，也不知道某个字段是否由独立证据产生。

真实任务仍可能需要：

```text
completion proposed
  → validate output schema / declared JSON subset
  → run Task-specific tests/checks
  → inspect allowed diff/resources
  → record acceptance result
  → only then publish business completion
```

任务专用 validator 应返回结构化 `AcceptanceResult`，但它仍需固定版本、artifact identity 和失败分类。当前 result-v1 没有独立 `validator_error` stop reason，validator 契约或执行异常暂映射为 `invalid_action`；这项兼容限制必须在消费者中写明，后续新增停止原因时应发布新 schema，而不是改写历史结果。

## 失败排查

| 症状 | 首查 | 不要立即做 |
| --- | --- | --- |
| Contract test 失败 | 输入类型、未知字段、非有限数字 | 放宽 schema |
| `invalid_action` | Adapter 原始返回与异常 | 当成模型任务失败 |
| `permission_denied` | Task allowlist、敏感键、approver | 给所有工具放行 |
| Tool retry 用尽 | 错误分类、attempt 和 backoff event | 无限重试 |
| Resume 重复副作用 | checkpoint 与幂等存储边界 | 假定 cache 已持久化 |
| Cancel 后迟到完成 | 控制边界与终态覆盖 | 接受最后到达事件 |
| Trace 出现敏感值 | 原始字段、redactor、sink | 只在 UI 隐藏 |
| Smoke completed 但业务错误 | acceptance 为空、条件太弱或 validator 读错 artifact | 把 JSON 子集通过当完整验收 |

修复后重跑原失败测试、相邻负例和完整套件。不要删除失败 case、提高预算或关闭 policy 来制造绿色结果。

## 清理、回滚与停止条件

命令只产生终端输出和 `.venv`、`.pytest_cache`、`.ruff_cache`、bytecode 等可再生路径。先用 `git status --short` 区分源码与 cache，再只清理本轮明确生成的内容；不要对未知工作树运行广泛删除。

发送 `Ctrl+C` 可停止当前命令。源码回滚只针对自己的候选文件或精确 commit，不使用 `reset --hard` 覆盖其他修改。保留失败输出和最小复现。

出现真实网络/凭据请求、live adapter 被启用、未授权 handler 执行、非有限 cost 进入 metrics、trace 泄密或 checkpoint 身份不明时立即停止。

## 已知限制与下一步

当前实现故意省略 Provider client、真实 token/usage、artifact/测试/业务系统 validator、分布式队列、持久幂等存储、Durable checkpoint、强制进程抢占和生产 Secret manager。内置 JSON 子集验收适合学习控制回路，不是生产业务 oracle。

下一步阅读[Adapter 契约](/implementation/adapter-contract)理解 Provider 隔离，再读[测试策略](/implementation/testing)为任务专用 validator 设计 artifact、异常和预算负例；最后把自己的 workload 写成固定 fixture。
