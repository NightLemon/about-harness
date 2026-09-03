# 模型与工具协议

Protocol（协议）定义不同组件怎样表达身份、消息、动作、结果、错误、状态和终止。Agent 能发出 HTTP 请求或显示对话，只能证明 transport（传输）的一小部分；可靠兼容还要求 provider、adapter、harness、policy 和 tool 对同一事件保持一致语义。

```text
Task / instructions / tools
            ↓
Harness controller → Adapter → Provider/model
       │                           │
       │       action/stream       │
       └───────────←───────────────┘
       ↓ schema + policy
Tool registry → Tool/runtime/external system
       │
       └→ result/error/side-effect state → Adapter → model
```

任何边界丢字段、重排事件或改变错误含义，都可能出现“能聊天但不能可靠做事”的假兼容。

## 五层协议分别负责什么

| 层 | 主要对象 | 必须保持的语义 | 典型假阳性 |
| --- | --- | --- | --- |
| Transport | endpoint、认证、连接、stream | request identity、timeout、断连、status | HTTP 200 就称兼容 |
| Model message | role、content part、history、state | 指令优先级、多模态、连续状态 | 只保留可见文本 |
| Action/tool | schema、call/result ID、arguments | 完整参数、顺序、关联、副作用 | JSON 能 parse 就执行 |
| Harness control | policy、budget、retry、cancel、stop | 权限、计数、终态与恢复 | Adapter 自行批准工具 |
| Evidence/artifact | trace、usage、result、checkpoint | 身份、顺序、脱敏、可复算 | 日志存在就称可审计 |

兼容结论必须说明通过了哪一层、哪个版本和哪个探针。Transport 通过不能推出 tool calling、reasoning state 或费用计量通过。

## 一次工具循环的完整协议

最小闭环不是“模型返回函数名”：

1. Harness 冻结 Task、config、tool registry 与预算身份；
2. Adapter 把指令、消息历史、工具 schema 和 provider state 映射为请求；
3. Provider 返回 text、tool call、typed item、usage、stop/error 或 stream events；
4. Adapter 在消息完整后生成内部 `Action`，保留原始关联字段；
5. Runtime validator 拒绝非法 kind、坏参数和非有限数值；
6. Policy 按主体、Task allowlist、权限与审批决定是否允许；
7. Tool registry 执行、限次重试并按幂等键记录副作用；
8. Tool result 带原 call ID、状态、截断/分页和错误分类返回；
9. Adapter 按 provider 要求回传结果和必须续传的 state carrier；
10. Controller 根据 completion、错误、取消和预算生成明确终态。

模型“请求调用”与工具“实际执行”是两个事件。Schema 合法不等于已授权；tool result 已生成也不等于模型已成功接收。Trace 要能逐段关联。

## 身份与关联 ID 不能混用

至少区分：

- `task_id`：稳定任务定义；
- `run_id`：一次执行尝试；
- `request_id`：一次 provider/transport 请求；
- `message/item_id`：协议中的消息或 typed item；
- `call_id`：模型 tool call 与对应 result 的关联；
- `idempotency_key`：同一业务副作用的去重身份；
- `attempt` / `parent_run_id` / span：重试与父子因果。

`call_id` 不能替代幂等键：同一业务写入在重试时可能得到新 call ID，却仍应只执行一次。反过来，一个幂等键也不能代替 provider 要求的 call/result 关联。

ID 的作用域和生成方要明确。不同租户、工具或操作错误复用幂等键，会返回别人的缓存结果；stream 断线后重复使用 request ID 的语义也应由 adapter 明确，而不是猜测。

## 消息协议不只是 role + text

Model input 可能包含 system/developer/user/assistant/tool role、text/image/audio、tool definitions、typed outputs 和 provider 自有状态。Adapter 应保存信息类型、顺序和来源，不把所有内容拼成一段字符串。

重点测试：

- system/developer/project/task 指令的有效优先级；
- 多段 content 的类型、顺序、MIME/大小与缺失处理；
- assistant tool call 与 tool result 是否原样关联；
- 历史裁剪/压缩后是否保留目标、禁区与未决 action；
- 非可信网页/邮件/tool output 是否仍标为数据；
- provider 要求的 response/session ID、typed item 或 opaque state 是否续传。

Opaque state（不透明状态）是协议连续性数据，不等于可展示的思维过程。只回放可见 assistant 文本，可能丢失后续 tool calling 所需状态；无法无损表示时 adapter 应拒绝该模式或明确标为 emulated。

## 流式响应必须先组装，再提交动作

Streaming（流式传输）可能把文本、tool arguments、usage 和终止事件拆成多段。Assembler（组装器）应是显式状态机：

```text
started → accumulating → structurally_complete → validated → committed
    └──────── disconnect / malformed / cancelled ───────→ aborted
```

只有收到结构完整、顺序有效且通过 schema 的 action 才能交给 policy。以下情况 fail closed（失败关闭）：

- JSON 参数仍是 partial delta；
- tool name/call ID 在分片间冲突；
- 相同 sequence 重复但内容不同；
- stop event 先于必需参数完成；
- 断线后无法判断 action 是否已经提交；
- cancellation 到达但后续分片仍试图触发副作用。

不要用字符串拼接后“尽量修 JSON”掩盖协议错误。修复出来的字段可能改变工具或目标。若 provider 支持恢复，保存 cursor/response ID 与已确认 sequence；否则把本次请求标为中止并从已知安全点重试。

当前仓库提供一个 provider-neutral（供应方无关）的 E1 组装器，用合成事件演示这条状态机。事件必须共享 `response_id`，新事件的 `sequence` 从 0 连续；同一 `event_id` 与完全相同内容可以作为重放被忽略，同 ID 不同内容则是冲突。`tool_arguments_delta` 只进入缓冲区，直到 `tool_call_completed` 后才解析完整 JSON、要求 object，并再次经过公共 Action validator。

`StreamAssembler` 区分 `response_completed`、`response_error`、`response_cancelled` 和 transport 在无终态时结束。只有第一种能由 `finish()` 返回；pending tool、空响应、序号缺口、response ID 漂移、终态后的新事件都会失败关闭。当前 v1 明确拒绝第二个 tool call，而不是假装支持并行调用。它输出 canonical text/tool action/usage，不执行 handler，也不对应任何真实 Provider 的事件名。

## Schema 是信任边界，不是文档提示

工具 schema 应表达必填、类型、enum、范围、长度、互斥和未知字段策略。Provider 可能只支持 JSON Schema 的子集，必须用目标 model/provider/adapter 逐项探测；不要看到 schema 被接受就假设约束生效。

Runtime validation（运行时校验）仍必需，因为：

- 静态 TypeScript interface 不会自动校验收到的 JSON；
- JSON Schema 的 `number` 与语言中的 `NaN/Infinity` 边界不同；
- Provider 可能忽略不支持的关键字；
- 多字段语义不变量常需额外 validator；
- Tool handler 不应依赖模型“通常会填对”。

无效 action 在预算、metrics 和 handler 前拒绝，并返回稳定错误分类。Adapter 不能猜缺失 tool name、补默认高权限目标或把任意文本当 shell 命令。

## 工具发现与执行授权是两件事

Tool discovery（工具发现）只说明某项能力和 schema 可见；执行还需 Task allowlist、当前主体、scope、policy 与审批。MCP 描述 host/client/server 的能力发现和消息交换，但 host 仍负责授权；“可发现”不等于“允许执行”。[FACT:mcp-spec]

工具契约至少包含：

- 稳定名称、版本和输入/输出 schema；
- 读取/写入对象、数据分类和所需权限；
- 是否有费用、不可逆或外部副作用；
- timeout、取消、并发与结果上限；
- 幂等/对账/补偿语义；
- validation、permission、transient、conflict、partial、unsafe 错误；
- 截断、分页、artifact reference 与来源版本。

读取工具的返回仍可能是非可信内容，不能因“由工具提供”就升级为系统指令。写工具最好与 read/preview/verify 分开，使 policy 能授予最小能力。

## Tool result 要表达副作用状态

成功/失败二元值不足以处理真实工具：

| 状态 | 含义 | 合适动作 |
| --- | --- | --- |
| success | 已完成且可验证 | 返回结果与版本 |
| rejected | schema/policy 拒绝，未执行 | 修参数或请求授权 |
| transient_failure | 已知未完成，可重试 | 在预算内退避 |
| partial | 一部分完成 | 对账逐项补偿 |
| conflict | 目标版本已变化 | 刷新状态后决定 |
| unknown_outcome | timeout/断连，是否执行未知 | 先按幂等键查询 |
| unsafe | 安全策略拒绝 | 停止，不切模型绕过 |

Tool result 回传 call ID、attempt、retryable、side_effect state、observed version、redaction、truncated/next cursor。错误消息面向模型时保持最小必要信息，不回显 Secret、完整 stack 或个人路径。

Timeout 不证明远端未执行。写请求 timeout 后直接重放，是最常见的重复副作用来源之一。协议必须提供幂等键、状态查询或补偿路径；没有这些能力就降低自动化范围。

## 错误分类决定恢复策略

不要把所有异常变成 `model_error`：

| 层 | 示例 | 是否重试 |
| --- | --- | --- |
| Transport | DNS、连接重置、明确 5xx | 只对声明为暂时的错误限次重试 |
| Authentication | key 无效、身份过期 | 停止，修认证 |
| Rate limit | quota、retry-after | 按 provider 指示和 deadline |
| Protocol | 缺 ID、坏 event 顺序、无法映射 item | 停止或修 adapter |
| Validation | action/tool 参数非法 | 加字段级错误后重新决策 |
| Permission | policy/approval 拒绝 | 停止或请求授权 |
| Tool/runtime | handler 错误、partial/unknown | 按副作用状态处理 |
| Model decision | 证据齐全但 action 不合适 | 新验证信号后有限反思 |
| Evaluator | 测试/Judge/汇总错误 | 修评分器，不评价候选 |

重试复用 task/run 关系和业务幂等，但通常产生新的 request/attempt identity。原错误保留在 trace，不能因后续成功而删除。Retry budget 与总 deadline/cost 一起扣减。

## 停止、取消与完成语义要统一

Provider stop reason、adapter action、tool state 和 harness result 不是同一枚举，需要显式映射。至少区分：completed、tool requested、length/budget、timeout、cancelled、permission denied、content/safety refusal、protocol invalid、tool error 与 unavailable。

映射有歧义时不要标 completed。例如输出因 length 截断但 JSON 恰好可 parse，仍可能缺少语义；deadline 后到达的 completion 不能覆盖 timeout。`cancel()` 也不一定强制终止在途请求、子进程或远端工具，应记录 cancellation requested、observed 和 side effects settled 三个阶段。

终态组合需语义校验：`status=completed` 与 `stop_reason=timeout` 即使分别满足 enum，整体仍矛盾。Trace 最后一条、Result、metrics 和 checkpoint 要一致。

## Usage 与费用需要统一口径

Provider 可能返回 input/output/cache/reasoning token、工具用量或估算费用，也可能缺失部分字段。Adapter 保存原始字段与计费版本，再映射到内部 usage；不能把缺失自动填 0 后精确比较。

区分：

- request-level 与 task-level；
- billed、cached、reasoning 与 visible output；
- provider estimate、账单事实与本地估算；
- 成功、失败、retry、Judge 与 tool API 成本。

总预算聚合父子任务和重试。Usage 到达晚于请求终态时，用关联 ID 补记并保留 provisional（暂定）状态；不能让迟到字段把已停止任务重新变成成功。

## Adapter 是反腐层，不是第二个控制器

Adapter（适配器）隔离外部协议变化，职责是：

- 映射请求、stream、action、tool result、usage 与 error；
- 保留无法从内部字段重建的 provider state；
- 提供稳定 name/version/capability identity；
- 对无法无损表示的功能明确拒绝；
- 支持 checkpoint 所需 snapshot/restore 或声明不支持。

它不拥有 Task 权限、不批准副作用、不擅自放宽 schema、不无限重试，也不根据成本自行换模型。Policy、budget 和 routing 属于 harness/controller。把控制塞进 adapter 会让同一 Task 因 provider 不同获得不同权限。

## 用四态记录兼容，不用布尔值

| 状态 | 含义 | 所需证据 |
| --- | --- | --- |
| `supported` | 目标版本原生语义通过 | 实际探针 + artifact + 证据等级 |
| `emulated` | Harness/adapter 补偿实现 | 补偿路径、限制与负例 |
| `rejected` | 无法安全/无损表示 | 明确失败和回退 |
| `untested` | 尚无足够运行证据 | 不作可用性声明 |

每一行绑定 model/provider/adapter/harness/surface、日期、request shape、state carrier、错误映射和 artifact。一个组合的 `supported` 不自动继承给同家族其他模型或另一个 surface。

兼容性是资格门槛，不是任务质量。探针通过最多支持目标版本的窄 E2 可用性；目标 workload 表现仍需任务级 E3。Offline fake/replay 只能达到 E1 接缝证据。

## 协议探针矩阵

先使用无副作用 fixture：

1. 单轮文本、多轮历史与角色优先级；
2. content parts 的顺序、类型和大小边界；
3. schema 正例、缺字段、额外字段、错误类型与非有限数；
4. 单 tool、多 tool、连续/并行、重复/缺失 call ID；
5. 参数分片、断连、重放和取消后的 late event；
6. tool error、partial、unknown outcome 与幂等重试；
7. response/session ID、typed/opaque state 的续接与缺失负例；
8. completed/length/refusal/error/timeout 的终态映射；
9. usage、cache、reasoning token 与费用缺失/迟到；
10. checkpoint 恢复、版本漂移与不兼容 state。

每个探针保存脱敏 request/response/event 摘要、配置身份、预期、断言、exit code 和失败分类。原始敏感 payload 放受控存储，公开 artifact 只保留必要字段与 hash。

## 漂移与协议演进

Provider alias、默认模型、schema 子集、event shape、错误字段和工具语义都会变化。固定 model ID/adapter 版本；无法固定的 rolling alias 保存解析时间和响应 identity。

破坏性变化发布新 adapter/config/schema version，不原地“兼容”旧 artifact。迁移步骤：旧 reader 保留；新增新 reader；用正负 fixture 比较；转换保存 source/target hash；无法映射的记录 quarantine（隔离）；消费者切换并回归后再停止旧写入。

版本变化触发协议核心集，不必先跑完整质量矩阵。核心失败就停止任务评测；否则后续失败归因会被污染。网页、`--help`、SDK type 和真实探针冲突时并列保存，来源事实与运行证据分别标状态。

## 在本项目观察最低协议边界

### 前置条件与固定输入

需要 Python 3.11+、uv 0.11、Node.js 22+，依赖由 `uv.lock` 和 `package-lock.json` 固定。从仓库根目录离线执行；不配置真实 provider、credential、网络或费用。

输入包括固定 replay actions、hard-disabled live adapter、进程内工具、权限/重试/timeout 负例、30 个 Task/Action 与 14 个 Result 跨语言 fixture，以及 `stream-events-v1.json` 的 14 个合成 stream 案例。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py lab/tests/test_streaming.py lab/tests/test_loop.py::test_permission_denial_stops_before_tool_execution lab/tests/test_loop.py::test_retry_and_idempotency_prevent_duplicate_side_effects lab/tests/test_loop.py::test_wrong_adapter_return_is_classified_as_invalid_action lab/tests/test_loop.py::test_timeout_stops_before_completing_late_action
npm run lab:ts-runtime-test
```

### 预期输出与断言

pytest 应有 23 项通过：

- Replay 保存 tool call 并完成固定 `sum=6`；
- live adapter 在任何 provider action 前硬拒绝；
- 未获 Task allowlist 的工具在 handler 前停止；
- 暂时错误进行两次有限退避，同一幂等键复用结果而不重复逻辑调用；
- 非 `Action` adapter 返回被分类为 `failed/invalid_action`；
- deadline 后到达的 completion 保持 `timeout`。
- stream 正例重组文本、usage 与跨 delta 的完整 tool JSON；完全重复事件只计一次；
- 序号/ID 冲突、坏 JSON、未完成 tool/transport、迟到事件、Provider error、取消与并行 tool call 均返回稳定失败分类，且没有执行工具。

TypeScript runtime 测试应退出 0，报告 30 个共享 Task/Action 与 14 个 RunResult 案例通过；其中混合 Action、坏 tool call、空/重复工具、错误预算和矛盾终态等被拒绝。`NaN/Infinity` 不是合法 JSON，继续由两种语言各自的运行时负例覆盖。

### 失败、停止、清理与回退

若 live 路径未硬禁用、权限拒绝后 handler 仍执行、坏 action 进入 metrics、timeout 被覆盖为成功、幂等复用失效，或 partial/冲突 stream 产生 Action，停止兼容声明与上层评测。先修对应 assembler/adapter/controller/validator，并保留负例；不要接入真实 key 或放宽 schema。

命令只创建进程内对象和可忽略测试缓存；需要时只清理 `.pytest_cache/`。误改实现时用 `git diff -- lab/src/about_harness/streaming.py lab/src/about_harness/adapters lab/src/about_harness/loop.py lab/src/about_harness/contracts.py lab/ts lab/tests` 精确定位，并只恢复自己的修改。候选失败时保持 replay 与 live-disabled 基线。

### 证据边界

这些测试提供 E1：当前本地 Python/TypeScript 最小契约能执行固定 replay，对共享 Task/Action 案例保持接受边界一致，拒绝 live、未授权工具和部分坏值，验证有限重试、进程内幂等与 timeout 分类，并对 14 组合成事件执行 provider-neutral 状态转换。

当前实现没有真实 transport/Provider stream adapter、message/state carrier、并行 tool call、费用映射、跨进程幂等、partial/unknown 外部副作用对账或 schema negotiation。合成 assembler 不验证 SSE/SDK、UTF-8 bytes、重连 cursor 或目标 Provider 事件语义；测试通过不能证明任何真实 model/provider/harness/MCP 组合兼容或安全。

## 协议审核清单

- 是否分别验证 transport、message、tool、control 和 evidence 五层？
- Task/run/request/call/idempotency/attempt ID 的作用域是否清楚？
- Adapter 是否保留 typed/opaque state，而非只回放可见文本？
- Stream 是否在完整、校验通过后才提交 action？
- Tool discovery、schema 合法和执行授权是否明确分离？
- Tool result 是否表达 partial、unknown outcome、截断和副作用？
- 错误分类是否决定有限重试，原失败是否仍保留？
- Cancel/timeout/late result 是否映射为一致终态？
- Usage 缺失/迟到时是否标不确定，而非填 0？
- 兼容结论是否使用四态、精确身份和 E0–E3 边界？

下一步用[模型协议兼容性](/models/protocol-compatibility)设计目标版本探针，对照[Adapter 契约](/implementation/adapter-contract)实现映射，再按[模型—Harness 匹配](/optimization/model-fit)决定是否进入任务质量评测。

## 检查题

1. HTTP 200 为什么不能证明 tool calling 协议兼容？
2. `call_id` 与 `idempotency_key` 分别解决什么问题？
3. 为什么 partial tool arguments 不能“尽量修复”后直接执行？
4. 写工具 timeout 后，为什么正确动作通常是先对账而非重试？
5. 离线 replay 通过后，还缺哪些真实兼容层？
