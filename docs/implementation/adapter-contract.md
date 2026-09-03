# Adapter 契约：隔离协议，而不是接管控制

## 学习目标与证据边界

Adapter（适配器）是 provider 协议与 harness 内部契约之间的 Anti-corruption layer（反腐层）。它负责翻译消息、Action、状态与错误，但不拥有任务权限、预算、审批或工具执行权。

完成本页后，你应能：

1. 区分协议映射、运行控制和工具执行三种责任；
2. 解释 `call_id`、`idempotency_key` 与 checkpoint cursor 的不同用途；
3. 为 `next_action`、`snapshot` 和 `restore` 定义失败关闭的不变量；
4. 判断 fake/replay 通过究竟证明了什么，以及真实 provider 仍缺哪些证据。

预计 40–50 分钟。动手部分固定使用 Python 3.11+、uv 0.11.x、内存 Action 与本地 replay，不联网、不读取凭据、不调用真实模型。当前证据为 E1，只证明固定协议接缝和负例；不能证明任何真实 model/provider/SDK 组合兼容、稳定或安全。

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

模型或 provider 只能提出 Action。Adapter 把提议转换成内部对象；controller 决定是否继续，policy 决定是否允许，registry 才能执行工具。即使 provider 原生支持“自动工具执行”，本项目的 adapter 也不能绕过本地 policy 直接开启它。

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

路由、费用上限、deadline、取消、审批与终态属于 harness/controller。把这些规则塞进某个 provider adapter，会导致同一 Task 换 provider 后获得不同权限或停止语义。

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

Python 的 Protocol 用于静态结构检查，不会自动验证运行时对象。`HarnessRunner` 仍会检查 `next_action` 返回值确实是 `Action`；但 `name` 的稳定性、snapshot 的完整性和 provider 字段映射，需要 adapter 自身测试与 artifact 证明。

当前接口也只是教学最小面：没有显式 adapter version、capability manifest、typed usage 或分层错误类型。真实实现要扩展时，应先定义向后兼容的内部契约，不要把某家 provider 的 response class 直接传播到 controller。

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

Adapter 至少要保证：

- `kind`、字段组合和 JSON 数据满足内部 Action 契约；
- provider 给出 `cost_usd` 时，它必须是有限、非负数字；当前内部契约没有 unknown/provisional 状态，真实 adapter 遇到缺失费用时应先扩展 usage 契约，不能伪造 0；
- tool name、参数、顺序与关联 ID 不被静默改写；
- 完成、工具请求、截断、拒绝、timeout 和协议错误不会混成同一状态；
- stream 只有在结构完整并通过校验后才提交 Action；
- 不能从 provider 文本猜一个 shell 命令并直接执行。

当前 `action-v1` schema、Python `Action.from_dict` 与 TypeScript `validateAction` 会共同拒绝非法 kind、tool/complete 混合形态、坏 tool call、非 JSON 参数和非有限成本；runner 还会拒绝 adapter 直接返回未解析 dict。这个公共 wire validator 仍不是 provider adapter：真实接入还要验证原始响应字段、消息连续性、stream 装配、usage 和工具参数的业务 schema。

## 三种 ID 解决三种问题

| ID | 生成/作用域 | 解决的问题 | 不能替代 |
| --- | --- | --- | --- |
| `call_id` | provider 的一次 tool call | 将 tool result 关联回请求 | 业务副作用去重 |
| `idempotency_key` | harness/业务操作 | 重试或恢复时复用同一逻辑结果 | provider 消息连续性 |
| checkpoint cursor/state | adapter + 当前 run | 恢复 response/session/action 位置 | 外部系统执行回执 |

同一业务写入重试时可能产生新 `call_id`，但仍应使用同一幂等键；反过来，复用幂等键也不能省略 provider 要求的 call/result 关联。Checkpoint 表示本地认为处理到哪里，不证明外部副作用一定未发生或已完成。

## `snapshot` / `restore`：保存协议连续性

Snapshot（快照）应只包含恢复 adapter 所需的最小 JSON 状态，例如 action cursor、response/session ID、已确认 stream sequence 和协议版本。不要把凭据、完整私密 prompt 或可从权威源重算的数据复制进去。

Restore（恢复）要验证：

1. state 的 schema/version 与当前 adapter 匹配；
2. 必需字段存在、未知字段被明确处理；
3. cursor/sequence 没有倒退或越过已有记录；
4. provider identity、Task/config 和 tool schema 没有漂移；
5. 已提交 Action 和外部副作用不会重复执行。

当前 `FakeAdapter` 的快照只有 `{"index": n}`。恢复只接受精确 `index` 字段，拒绝 bool、负数和超出 action 序列的值；`index == len(actions)` 仍是合法的“已消费完”位置，下一次请求会明确报告序列耗尽。

真实 adapter 的状态通常还要带版本。破坏性 state 变化应发布新 adapter/schema version，并为旧 checkpoint 提供显式迁移或拒绝；不要把字段缺失静默解释为“从头开始”。

### 当前恢复边界

`HarnessRunner` 在记录 `run_started` 前调用 `restore`，而且当前没有把 restore 异常转换为结构化 `RunResult`。因此损坏 checkpoint 会直接抛出异常。这是已知最小实现边界：调用方必须把恢复失败当作 fail closed（失败关闭），不能捕获后无 checkpoint 重跑有副作用的任务。

## Fake、Replay 与 Live 的区别

| 类型 | 输入 | 适合验证 | 不能证明 |
| --- | --- | --- | --- |
| Fake adapter | 代码内构造的 `Action` 序列 | controller 分支、预算、取消、checkpoint | 任何 wire parsing 或 provider 行为 |
| Replay adapter | 固定记录转换成 `Action` | record shape、确定性回放、工具闭环 | live transport、stream、SDK 或模型质量 |
| Live adapter | 真实 provider client | 精确目标组合的有限可用性 | 自动获得任务质量或生产安全 |

当前 `LiveAdapter` 是 hard-disabled（硬禁用）外壳：没有 provider client，也没有凭据读取器；`next_action` 必定抛出 `LiveAdapterDisabled`。这不是缺少配置，而是默认安全基线。接入真实 API、费用、凭据和网络必须是另一项明确授权的工作，并产生新的 E2 证据。

Fake/replay 不是较便宜的 live 替代证据。它们能证明 harness 在我们写定的输入上如何处理，不能证明 provider 真会返回同样字段、错误和顺序。

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

顶层 Action 和嵌套 `tool_call` 都执行精确字段检查。这样 `argments` 拼错或混入未知字段不会被静默忽略。Tool action 必须有完整 tool call；complete 的 `output` 和两类 Action 的 `cost_usd` 可以省略，分别归一化为 `None` 与 `0.0`。

Python Adapter 的类型注解返回 `Action`，但这不构成运行时信任。`HarnessRunner` 收到对象后先深拷贝其 wire 形态，再用 `Action.from_dict` 重建可信 Action；因此直接构造 dataclass 时藏在 `output` 或 `arguments` 中的 `NaN`、`Infinity`、循环或非 JSON 值，也会在 metrics、trace、policy 与 handler 之前以 `failed / invalid_action` 关闭。深拷贝还避免 Adapter 在返回后继续修改共享的嵌套容器。

这仍不是完整 replay artifact 契约。当前 adapter 没有验证 fixture hash、adapter/config identity、record sequence、文件大小或参数的业务 schema；Python 类型注解也不会在运行时递归证明任意 object 都是 `JsonValue`。生产 replay 应先通过版本化 JSON Schema、来源 hash 和大小限制，再进入 `from_records`。

## 一次工具调用怎样往返

假设 provider 返回工具名、JSON 参数和 call ID：

1. Adapter 验证 response identity、item type、完整性和 stop reason；
2. 把 provider tool call 映射为内部 `ToolCall`，保留原 call ID 与顺序；
3. Controller 在信任边界重建并验证 canonical Action，adapter-specific validator 再验证参数 schema；
4. Policy 检查 Task allowlist、主体、资源、数据来源和审批；
5. Tool registry 以幂等键执行或复用结果；
6. Result 记录实际 side-effect state、错误、截断与 artifact reference；
7. Adapter 使用同一 call ID，把结构化 tool result 映射回 provider；
8. 下一轮继续、修正 Action 或产生完成提议。

Adapter 不能在第 1 步看到 JSON 无效后“猜一个大概参数”，也不能在第 2 步直接执行工具。Policy 拒绝是 harness 决策；provider 返回“tool accepted”也不代表本地 handler 已执行。

## Stream 必须先组装，再提交

Streaming（流式传输）会把 tool name、arguments、usage 和终止事件拆成多段。安全组装器应有显式状态：

```text
started → accumulating → structurally_complete → validated → committed
    └──── malformed / disconnect / cancelled / conflict ────→ aborted
```

Partial arguments（不完整参数）不能进入 policy 或 handler。分片重复但内容不同、call ID 变化、stop 早于参数完成、取消后的迟到分片，都应中止并保留错误分类。若 provider 无法从 cursor 恢复，不能靠字符串拼接“修复”JSON 后执行。

当前项目已有一个不绑定 Provider 的离线 `StreamAssembler`：它以 response/event/sequence/call ID 对事件去重和排序，缓冲 tool argument delta，只在 tool 完成、JSON object 与公共 Action 契约都有效后产出 canonical Action。它还区分 completed/error/cancelled/无终态断流，并明确拒绝第二个 tool call。这个 E1 状态机没有 transport 或 handler，不能冒充真实 Provider adapter；目标流式格式仍需冻结 model/provider/surface/SDK/adapter 版本并用实际探针验证。

## 错误分类决定能否重试

完整 adapter 应区分：

| 类别 | 示例 | 默认处理 |
| --- | --- | --- |
| Transport | 连接重置、明确暂时性 5xx | 在总预算内有限重试 |
| Authentication | 凭据无效或身份过期 | 停止，修复身份 |
| Rate limit | quota / retry-after | 遵守 provider 指示与 deadline |
| Protocol | 缺 call ID、事件乱序、无法映射 item | 停止或修 adapter |
| Validation | Action/参数 schema 非法 | 返回字段错误，重新决策或停止 |
| Cancellation/timeout | 主动取消、调用超时、迟到结果 | 保持终态并核对副作用 |
| Provider refusal | 安全/内容拒绝 | 明确记录，不伪装为完成 |

当前最小 `Adapter` Protocol 没有 typed error，`HarnessRunner` 会把 `next_action` 抛出的所有异常统一映射为 `failed / invalid_action`。因此旧页面所说的“已经明确分类认证、限流、timeout”并不成立；表中的细分类是后续真实 adapter 的接口要求。没有先扩展错误契约前，不应实现自动 provider 重试。

Retry（重试）还必须共享 run 的 model-call、费用与 deadline 预算，并产生新的 request/attempt ID。认证、schema 和权限失败不能原样重试；写请求 timeout 结果未知时先按幂等键对账，不能假设“抛异常就是没执行”。

## 身份与可复现实验

真实 adapter 不能只有 `name="openai"` 之类宽泛标签。每次探针至少冻结：

```text
adapter name/version/commit
provider/region/endpoint/API version/SDK version
model requested/model observed/alias resolution
request schema/tool schema hash/state strategy/stream mode
timeout/retry/reasoning/output settings
credential source class/network policy/checked_at
```

凭据只记录来源类别和是否可用，不记录真实值。请求的 model 与响应 identity 冲突时，本轮结果不能归入原候选。任何 adapter、state strategy 或 tool schema 变化都产生新 config ID，避免把控制层变化误算成模型变化。

## 动手验证当前接缝

### 前置条件与固定输入

在仓库根目录执行；要求 Python 3.11+、uv 0.11.x，依赖已按 `uv.lock` 安装。输入包括：固定 `sum` replay、额外字段负例、非法 checkpoint state、内存工具和 hard-disabled live adapter。没有网络、真实 Secret 或费用。

先检查环境：

```bash
uv --version
uv run --frozen --offline python --version
```

### 验证 Fake、Replay 与 Live

```bash
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py
```

预期退出码为 0，5 项测试通过。断言证明：

- Replay 把固定 tool call 映射为 Action，并通过安全默认工具得到 `sum=6`；
- complete Action 与嵌套 tool call 的未知字段都会被拒绝；
- Fake restore 拒绝未知 state 字段和越界 cursor；
- Live adapter 在任何 provider action 前硬拒绝。

### 验证 runner 边界和 checkpoint

```bash
uv run --frozen --offline pytest -q lab/tests/test_loop.py -k "wrong_adapter_return or adapter_action_is_revalidated or checkpoint_restores"
```

预期 4 项测试通过。第一项让 adapter 返回伪装成 Action 的 dict；两个参数化案例分别把 `NaN` 藏入 completion output、把 `Infinity` 藏入 tool arguments，runner 都必须在记账和 handler 前产生 `failed / invalid_action`；最后一项先在一个 tool step 后停止，再用 checkpoint 恢复 Fake cursor，最终只消费剩余 complete Action。

### 验证 stream 只在结构完成后提交

```bash
uv run --frozen --offline pytest -q lab/tests/test_streaming.py
```

预期 14 项通过。三个正例分别重组中文文本与 usage、跨两个 delta 的 tool arguments、完全重复事件；十一项负例覆盖 sequence/response/event ID 冲突、坏 JSON、无终态断流、tool 未完成、终态后事件、Provider error、取消、未知事件和当前不支持的并行 tool call。测试只比较 assembler 返回或错误码，没有 ToolRegistry/handler，因此 partial stream 不可能产生副作用。

## 失败练习：直接观察 checkpoint 和 replay 拒绝

以下命令故意产生非零退出码；它们只创建进程内对象，不修改文件：

```bash
uv run --frozen --offline python -c "import sys; sys.path.insert(0, 'lab/src'); from about_harness.adapters.fake import FakeAdapter; from about_harness.contracts import Action; a=FakeAdapter((Action.complete('done'),)); a.restore({'index': 2})"
uv run --frozen --offline python -c "import sys; sys.path.insert(0, 'lab/src'); from about_harness.adapters.replay import ReplayAdapter; ReplayAdapter.from_records([{'kind': 'complete', 'output': None, 'unexpected': True}])"
```

第一条预期抛出 `ValueError: fake adapter checkpoint index is invalid`；第二条预期抛出包含 `unknown fields` 的 `ContractError`。任一命令退出 0 都应停止：说明损坏状态或未知字段被静默接受，不能依赖 replay 结果。

不要删除未知字段测试、扩大 allowed fields 或把越界 cursor 截断到最后位置来“恢复”。先确认 fixture/state 是否与 adapter 版本匹配；无法证明安全迁移时，保持失败关闭并创建新 run。

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

## 清理、回滚与已知限制

正常测试和失败练习只创建进程内对象，最多留下可忽略的 `.pytest_cache/`，无需清理外部资源。若误改 adapter，先运行：

```bash
git diff -- lab/src/about_harness/streaming.py lab/src/about_harness/adapters lab/tests/test_streaming.py lab/tests/test_replay_and_live.py
```

只用编辑器 undo 或精确反向修改恢复自己的行，再重跑目标测试。不要 `reset --hard` 或覆盖整个工作树。真实 adapter 探针失败时，回退到 Fake/Replay 与 hard-disabled Live 基线；先撤销新网络/凭据入口，再保留脱敏失败 artifact。

当前实现的已知限制包括：没有 provider client/transport、真实消息映射、typed adapter error、费用 usage 映射、capability/version 字段、并行 tool call 或 schema negotiation；离线 stream assembler 只有合成 JSON 事件，没有 bytes/SSE、backpressure、重连 cursor 或 Provider 恢复；Replay 没有文件 hash/sequence/config 校验；restore 异常还不是结构化 Result；Fake state 只有内存 cursor；幂等 cache 只在进程内。

下一步先读[协议兼容性](/models/protocol-compatibility)设计目标版本探针，再用[测试策略](/implementation/testing)覆盖错误与恢复；准备接入真实模型前，按[模型适配方法](/models/adaptation)冻结身份、成本和数据边界。

## 检查题

1. 为什么 adapter 可以翻译 tool call，却不能决定是否执行？
2. `call_id` 和 `idempotency_key` 分别在哪个边界生效？
3. Replay 通过后，为什么仍不能宣称真实 provider 兼容？
4. Restore 收到未知字段时，为什么不应静默忽略？
5. 当前实现为什么不能正确区分认证失败和限流？
