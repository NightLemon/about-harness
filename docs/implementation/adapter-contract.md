# Adapter 契约：隔离协议，而不是接管控制

<span id="学习目标与证据边界"></span>
<span id="动手验证当前接缝"></span>
<span id="前置条件与固定输入"></span>
<span id="验证-fake、replay-与-live"></span>
<span id="验证-fakereplay-与-live"></span>
<span id="验证-runner-边界和-checkpoint"></span>
<span id="验证-stream-只在结构完成后提交"></span>
<span id="清理、回滚与已知限制"></span>
<span id="清理回滚与已知限制"></span>
<span id="检查题"></span>

## Adapter 位于哪条边界

```text
Task / messages / tool schema / provider state
                      │
                      ▼
        Adapter：编码请求、解析响应、保存协议状态
                      │
                      ▼
             canonical Action / error / usage
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
  Harness controller         Policy engine
  budget/state/stop          permission/approval
           │                     │
           └──────────┬──────────┘
                      ▼
                Tool registry
                      │
                      ▼
      Tool result + call_id + side-effect state
                      │
                      └────► Adapter 映射回 provider
```

模型或 供应方 只能提出 Action（动作提议）。Adapter（适配器） 把提议转换成内部对象；控制器 决定是否继续，policy 决定是否允许，registry 才能执行工具。即使 供应方 原生支持“自动工具执行”，本项目的 适配器 也不能绕过本地 policy 直接开启它。

<span id="职责清单做什么不做什么"></span>

## 职责清单：做什么、不做什么

| Adapter 应负责 | Adapter 不应负责 |
| --- | --- |
| 编码 provider 请求和解析响应 | 修改 Task 目标或验收条件 |
| 映射 role、content part、tool call/result | 决定工具是否获授权 |
| 保存 response/session/cursor 等协议状态 | 代表用户批准副作用 |
| 组装完整 stream 后产生 Action | 在 partial 参数上执行工具 |
| 保留 provider 原始关联 ID 与错误类别 | 无限重试或拥有独立预算 |
| 映射 usage，并保留缺失/暂定状态 | 缺失值填 0 后声称精确成本 |
| 对无法无损表示的能力明确拒绝 | 猜字段、静默降级或自动扩大权限 |

路由、费用上限、截止时间、取消、审批与终态属于 harness/控制器。把这些规则塞进某个 供应方 适配器，会导致同一 Task（任务） 换 供应方 后获得不同权限或停止语义。

## 当前 Python Protocol

`lab/src/about_harness/adapters/base.py` 定义的是结构化 Protocol（协议类型）：

```python
class Adapter(Protocol):
    name: str

    def next_action(
        self,
        task: TaskSpec,
        trace: tuple[TraceEvent, ...],
    ) -> Action: ...

    def snapshot(self) -> dict[str, JsonValue]: ...

    def restore(self, state: dict[str, JsonValue]) -> None: ...
```

Python 的 Protocol 用于静态结构检查，不会自动验证运行时对象。`HarnessRunner` 仍会检查 `next_action` 返回值确实是 `Action`；但 `name` 的稳定性、snapshot 的完整性和 供应方 字段映射，需要 适配器 自身测试与 artifact 证明。

基础 适配器 接口保持最小；可选 ResponsesAdapter 另提供稳定错误码与 UsageObservation，用 ToolResultReceiver 显式接收工具结果。真实实现要扩展时，应先定义向后兼容的内部契约，不要把某家 供应方 的 response class 直接传播到 控制器。

<span id="nextaction-的不变量"></span>

## `next_action` 的不变量

每次调用只产生一个内部决策结果：工具提议或完成提议。

```python
Action.tool(
    ToolCall(
        call_id="provider-call-1",
        name="sum",
        arguments={"values": [1, 2, 3]},
        idempotency_key="task-7:sum:v1",
    ),
    cost_usd=0.0,
)
```

适配器 至少要保证：

- `kind`、字段组合和 JSON 数据满足内部 动作提议 契约；
- 供应方 给出 `cost_usd` 时，它必须是有限、非负数字；动作提议 保留已知费用小计；独立 usage-v1 记录 unknown，真实适配器遇到缺失用量时停止，不能把小计当完整账单；
- tool name、参数、顺序与关联 ID 不被静默改写；
- 完成、工具请求、截断、拒绝、timeout 和协议错误不会混成同一状态；
- stream 只有在结构完整并通过校验后才提交 动作提议；
- 不能从 供应方 文本猜一个 shell 命令并直接执行。

当前 `action-v1` schema、Python `Action.from_dict` 与 TypeScript `validateAction` 会共同拒绝非法 kind、tool/complete 混合形态、坏 tool call、非 JSON 参数和非有限成本；runner 还会拒绝 适配器 直接返回未解析 dict。这个公共 wire 验证器 仍不是 供应方 适配器：真实接入还要验证原始响应字段、消息连续性、stream 装配、usage 和工具参数的业务 schema。

## 三种 ID 解决三种问题

| ID | 生成/作用域 | 解决的问题 | 不能替代 |
| --- | --- | --- | --- |
| `call_id` | provider 的一次 tool call | 将 tool result 关联回请求 | 业务副作用去重 |
| `idempotency_key` | harness/业务操作 | 重试或恢复时复用同一逻辑结果 | provider 消息连续性 |
| checkpoint cursor/state | adapter + 当前 run | 恢复 response/session/action 位置 | 外部系统执行回执 |

同一业务写入重试时可能产生新 `call_id`，但仍应使用同一幂等键；反过来，复用幂等键也不能省略 供应方 要求的 call/result 关联。Checkpoint（检查点） 表示本地认为处理到哪里，不证明外部副作用一定未发生或已完成。

<span id="snapshot-restore保存协议连续性"></span>

## `snapshot` / `restore`：保存协议连续性

Snapshot（快照）应只包含恢复 适配器 所需的最小 JSON 状态，例如 action cursor、response/session ID、已确认 stream sequence 和协议版本。不要把凭据、完整私密 prompt 或可从权威源重算的数据复制进去。

Restore（恢复）要验证：

1. state 的 schema/version 与当前 适配器 匹配；
2. 必需字段存在、未知字段被明确处理；
3. cursor/sequence 没有倒退或越过已有记录；
4. 供应方 identity、任务/config 和 tool schema 没有漂移；
5. 已提交 动作提议 和外部副作用不会重复执行。

当前 `FakeAdapter` 的快照只有 `{"index": n}`。恢复只接受精确 `index` 字段，拒绝 bool、负数和超出 action 序列的值；`index == len(actions)` 仍是合法的“已消费完”位置，下一次请求会明确报告序列耗尽。

真实 适配器 的状态通常还要带版本。破坏性 state 变化应发布新 适配器/schema version，并为旧 检查点 提供显式迁移或拒绝；不要把字段缺失静默解释为“从头开始”。

### 当前恢复边界

`HarnessRunner` 在记录 `run_started` 前调用 `restore`，而且当前没有把 restore 异常转换为结构化 `RunResult`。因此损坏 检查点 会直接抛出异常。这是已知最小实现边界：调用方必须把恢复失败当作 fail closed（失败关闭），不能捕获后无 检查点 重跑有副作用的任务。

<span id="fakereplay-与-live-的区别"></span>

## Fake、Replay 与 Live 的区别

| 类型 | 输入 | 适合验证 | 不能证明 |
| --- | --- | --- | --- |
| Fake adapter | 代码内构造的 `Action` 序列 | controller 分支、预算、取消、checkpoint | 任何 wire parsing 或 provider 行为 |
| Replay adapter | 固定记录转换成 `Action` | record shape、确定性回放、工具闭环 | live transport、stream、SDK 或模型质量 |
| Live adapter | 真实 provider client | 精确目标组合的有限可用性 | 自动获得任务质量或生产安全 |

当前 `LiveAdapter` 是 hard-disabled（硬禁用）外壳：没有 供应方 client，也没有凭据读取器；`next_action` 必定抛出 `LiveAdapterDisabled`。这不是缺少配置，而是默认安全基线。接入真实 API、费用、凭据和网络必须是另一项明确授权的工作，并产生新的 E2 证据。

Fake/replay 不是较便宜的 live 替代证据。它们能证明 harness 在我们写定的输入上如何处理，不能证明 供应方 真会返回同样字段、错误和顺序。

## Replay 记录必须失败关闭

当前 replay 接受两种顶层形态：

```json
{"kind":"complete","output":{"answer":6},"cost_usd":0}
```

```json
{
  "kind": "tool",
  "cost_usd": 0,
  "tool_call": {
    "call_id": "sum-1",
    "name": "sum",
    "arguments": {"values": [1, 2, 3]},
    "idempotency_key": "sum-stable"
  }
}
```

顶层 动作提议 和嵌套 `tool_call` 都执行精确字段检查。这样 `argments` 拼错或混入未知字段不会被静默忽略。Tool action 必须有完整 tool call；complete 的 `output` 和两类 动作提议 的 `cost_usd` 可以省略，分别归一化为 `None` 与 `0.0`。

Python 适配器 的类型注解返回 `Action`，但这不构成运行时信任。`HarnessRunner` 收到对象后先深拷贝其 wire 形态，再用 `Action.from_dict` 重建可信 动作提议；因此直接构造 dataclass 时藏在 `output` 或 `arguments` 中的 `NaN`、`Infinity`、循环或非 JSON 值，也会在 metrics、轨迹、policy 与 工具处理函数 之前以 `failed / invalid_action` 关闭。深拷贝还避免 适配器 在返回后继续修改共享的嵌套容器。

这仍不是完整 replay artifact 契约。当前 适配器 没有验证 fixture hash、适配器/config identity、record sequence、文件大小或参数的业务 schema；Python 类型注解也不会在运行时递归证明任意 object 都是 `JsonValue`。生产 replay 应先通过版本化 JSON Schema、来源 hash 和大小限制，再进入 `from_records`。

## 一次工具调用怎样往返

假设 供应方 返回工具名、JSON 参数和 call ID：

1. 适配器 验证 response identity、item type、完整性和 stop reason；
2. 把 供应方 tool call 映射为内部 `ToolCall`，保留原 call ID 与顺序；
3. Controller 在信任边界重建并验证 canonical 动作提议，适配器-specific 验证器 再验证参数 schema；
4. Policy（策略） 检查 任务 allowlist、主体、资源、数据来源和审批；
5. Tool registry 以幂等键执行或复用结果；
6. Result（结果） 记录实际 side-effect state、错误、截断与 artifact reference；
7. 适配器 使用同一 call ID，把结构化 tool result 映射回 供应方；
8. 下一轮继续、修正 动作提议 或产生完成提议。

适配器 不能在第 1 步看到 JSON 无效后“猜一个大概参数”，也不能在第 2 步直接执行工具。策略 拒绝是 harness 决策；供应方 返回“tool accepted”也不代表本地 工具处理函数 已执行。

<span id="stream-必须先组装再提交"></span>

## Stream 必须先组装，再提交

Streaming（流式传输）会把 tool name、arguments、usage 和终止事件拆成多段。安全组装器应有显式状态：

```text
started → accumulating → structurally_complete → validated → committed
    └──── malformed / disconnect / cancelled / conflict ────→ aborted
```

Partial arguments（不完整参数）不能进入 policy 或 工具处理函数。分片重复但内容不同、call ID 变化、stop 早于参数完成、取消后的迟到分片，都应中止并保留错误分类。若 供应方 无法从 cursor 恢复，不能靠字符串拼接“修复”JSON 后执行。

当前项目已有一个不绑定 Provider（供应方） 的离线 `StreamAssembler`：它以 response/event/sequence/call ID 对事件去重和排序，缓冲 tool argument delta，只在 tool 完成、JSON object 与公共 动作提议 契约都有效后产出 canonical 动作提议。它还区分 completed/error/cancelled/无终态断流，并明确拒绝第二个 tool call。这个 E1 状态机没有 transport 或 工具处理函数，不能冒充真实 供应方 适配器；目标流式格式仍需冻结 model/供应方/surface/SDK/适配器 版本并用实际探针验证。

## 错误分类决定能否重试

完整 适配器 应区分：

| 类别 | 示例 | 默认处理 |
| --- | --- | --- |
| Transport | 连接重置、明确暂时性 5xx | 在总预算内有限重试 |
| Authentication | 凭据无效或身份过期 | 停止，修复身份 |
| Rate limit | quota / retry-after | 遵守 provider 指示与 deadline |
| Protocol | 缺 call ID、事件乱序、无法映射 item | 停止或修 adapter |
| Validation | Action/参数 schema 非法 | 返回字段错误，重新决策或停止 |
| Cancellation/timeout | 主动取消、调用超时、迟到结果 | 保持终态并核对副作用 |
| Provider refusal | 安全/内容拒绝 | 明确记录，不伪装为完成 |

当前最小 `Adapter` Protocol 没有 typed error，`HarnessRunner` 会把 `next_action` 抛出的所有异常统一映射为 `failed / invalid_action`。ResponsesAdapter 在 provider_observations 中保留认证、限流、超时等错误码；核心 结果 仍使用原停止枚举。当前不自动重试真实请求。

Retry（重试）还必须共享 run 的 model-call、费用与 截止时间 预算，并产生新的 request/attempt ID。认证、schema 和权限失败不能原样重试；写请求 timeout 结果未知时先按幂等键对账，不能假设“抛异常就是没执行”。

## 身份与可复现实验

真实 适配器 不能只有 `name="openai"` 之类宽泛标签。每次探针至少冻结：

```text
adapter name/version/commit
provider/region/endpoint/API version/SDK version
model requested/model observed/alias resolution
request schema/tool schema hash/state strategy/stream mode
timeout/retry/reasoning/output settings
credential source class/network policy/checked_at
```

凭据只记录来源类别和是否可用，不记录真实值。请求的 model 与响应 identity 冲突时，本轮结果不能归入原候选。任何 适配器、state strategy 或 tool schema 变化都产生新 config ID，避免把控制层变化误算成模型变化。

<span id="失败练习直接观察-checkpoint-和-replay-拒绝"></span>

## 失败练习：直接观察 checkpoint 和 replay 拒绝

以下命令故意产生非零退出码；它们只创建进程内对象，不修改文件：

```bash
uv run --frozen --offline python -c "import sys; sys.path.insert(0, 'lab/src'); from about_harness.adapters.fake import FakeAdapter; from about_harness.contracts import Action; a=FakeAdapter((Action.complete('done'),)); a.restore({'index': 2})"
uv run --frozen --offline python -c "import sys; sys.path.insert(0, 'lab/src'); from about_harness.adapters.replay import ReplayAdapter; ReplayAdapter.from_records([{'kind': 'complete', 'output': None, 'unexpected': True}])"
```

第一条预期抛出 `ValueError: fake adapter checkpoint index is invalid`；第二条预期抛出包含 `unknown fields` 的 `ContractError`。任一命令退出 0 都应停止：说明损坏状态或未知字段被静默接受，不能依赖 replay 结果。

不要删除未知字段测试、扩大 allowed fields 或把越界 cursor 截断到最后位置来“恢复”。先确认 fixture/state 是否与 适配器 版本匹配；无法证明安全迁移时，保持失败关闭并创建新 run。

## 常见故障定位

| 现象 | 先检查 | 不要怎么修 |
| --- | --- | --- |
| 能聊天但工具回传失败 | call/result ID、role/item 顺序、state carrier | 把所有内容拼成纯文本 |
| Replay 通过，Live 失败 | wire shape、SDK、stream、identity、错误映射 | 宣称 provider 不稳定后忽略 |
| 恢复后重复工具调用 | cursor、checkpoint 提交点、幂等键、外部回执 | 从 index 0 重新执行 |
| timeout 被记为完成 | late result 与 controller 终态优先级 | 让 adapter 覆盖 stop reason |
| 限流不断重试 | typed error、retry-after、总预算 | 在 adapter 内无限退避 |
| 参数字段被悄悄丢弃 | exact keys、schema 版本、原始摘要 | 猜测拼写并继续执行 |
| usage 总是 0 | provider 是否缺失、映射是否失败 | 把 missing 当真实 0 |
| Live 测试意外读到凭据 | adapter/client 初始化路径 | 把真实 key 放进 fixture |


## 实践入口

[从最小实现进入完整工作区实验](/implementation/minimal-harness-python)。实现范围、命令、预期断言和清理步骤在实验页维护。
