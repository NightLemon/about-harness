# 模型协议兼容性

Protocol compatibility（协议兼容性）不是“endpoint 能返回一段文字”，而是目标 model、provider、adapter 与 harness 能在消息、工具、状态、流式事件、错误和用量上保持运行语义。只有先通过协议资格测试，后续质量评测才有意义。

```text
provider wire format
        ↓ adapter 解析与映射
harness canonical contract
        ↓ policy / tool / state controller
可归因的 action、result、stop 与 metrics
```

任一箭头发生静默丢失，都可能制造“能聊天但不能可靠运行 agent”的假阳性。

## 本页边界

本页给出跨 provider 的测试方法和项目建议，不声明某个模型家族永久支持哪些字段。具体 API 字段、枚举、限制和默认值属于易变产品事实，必须冻结精确 model/provider/surface/adapter 版本并核对来源。

协议通过也只说明消息能按约定传递，不证明模型会正确规划、工具可靠、权限安全或任务质量较高。后续决策分别进入[指定模型适配](/models/adaptation)和[模型—Harness 匹配](/optimization/model-fit)。

## 从三层扩展为八个检查面

| 检查面 | 要保持的语义 | 常见假阳性 |
| --- | --- | --- |
| Transport（传输） | endpoint、认证、连接、timeout、streaming | HTTP 200 就称兼容 |
| Identity（身份） | model ID/alias、provider、surface、adapter 版本 | 同名模型合并结果 |
| Message/content（消息与内容） | role、content part、顺序、编码、模态 | 压成纯文本后忽略丢失 |
| Instruction（指令） | system/developer/user 的映射、作用域与优先级 | 不支持的 role 被静默拼接 |
| Tool（工具） | schema、call/result ID、并行/连续调用、错误 | 只测一次 happy path |
| State（状态） | 历史、response/session ID、typed/opaque item | 只保留可见 assistant 文本 |
| Lifecycle（生命周期） | stop、截断、取消、重试、恢复、late result | timeout 后盲目重发 |
| Usage/error（用量与错误） | token/cache/cost 字段、错误分类与缺失 | 缺失值填 0，所有错误都重试 |

前三项解决“能否通信”，后五项决定 harness 能否维持 agent loop。权限、sandbox 和 Secret 控制仍是独立安全层；协议能够表达一个危险工具，不等于允许执行它。

## 先冻结探针身份

每次 compatibility probe（兼容探针）必须保存：

```text
model requested / model observed / alias resolution
provider / region / endpoint family / API version
SDK or raw HTTP version / adapter name and commit
harness name / version / surface
request schema version / tool schema hash
state strategy / streaming mode
timeout / retry / context / output / reasoning settings
permissions / network / credential source class
checked_at / source references / evidence level
```

不要把 credential 内容写入 artifact；只记录凭据来源类型和是否存在。Rolling alias（滚动别名）无法解析时写明 `rolling`，并保存响应中可观察的 identity。请求的 model 名称与实际响应 identity 冲突时，本轮结果不能归入原候选。

探针输入、adapter、重试策略或状态路径任一变化，都建立新 config ID。否则差异可能来自控制层而不是 provider。

## 定义四态结论

每个能力单独判定，不能只给整个组合一个 `compatible=true`：

| 状态 | 含义 | 最低证据 |
| --- | --- | --- |
| `supported` | 目标组合原生保持该语义 | 正例、对应负例、精确身份和 artifact |
| `emulated` | Harness/adapter 通过补偿实现 | 补偿实现、限制、正负例和责任方 |
| `rejected` | 无法无损表示，或项目决定拒绝 | 可复现拒绝、错误分类和替代路径 |
| `untested` | 尚无目标组合实测 | 缺口与下一探针，不用来源声明填充 |

`supported` 不是“文档说支持”，也不是一次请求成功。来源核验属于 E0；离线 fake/replay 通常是 E1；在目标环境对精确组合运行才可能形成 E2；代表任务上的重复比较才可能形成 E3。

## 探针一：Transport 与响应包络

先用无副作用最小请求验证：

- endpoint、API version、认证头和请求 content type；
- 非流式与流式连接能否明确结束；
- client timeout、server timeout 和连接中断能否区分；
- request/response ID、model identity 和时间字段能否保存；
- 认证失败、限流、server error 与坏请求是否稳定分类；
- 响应 body 非 JSON、空 body 或未知 content type 是否 fail closed（失败关闭）。

正例只证明传输层。负例应使用本地 stub 或 provider 明确允许的无副作用输入，不用真实 Secret 故意触发泄漏。Adapter 不应把无法解析的错误页面转成空 assistant message。

### Transport 通过条件

- 成功响应与每类失败有不同、稳定的内部分类；
- 原始 status、request ID 和经过脱敏的错误摘要可追踪；
- timeout/取消不会被包装成正常 completion；
- 默认重试只覆盖明确的暂态错误，并受总预算限制。

## 探针二：Message、content 与指令 role

协议表面常把消息表示为字符串、content part 数组或 typed item。逐项测试：

1. 空文本、Unicode、换行和边界长度；
2. 单轮 user message 与多轮交替历史；
3. system/developer/user role 的支持、映射和顺序；
4. 文本以外 content part 的原生、拒绝或降级行为；
5. 未知 item type、未知字段和额外字段；
6. Assistant 历史中 tool call 与普通文本的相对顺序。

Round trip（往返）测试把 provider item 解析成 canonical item，再序列化回 provider shape，比较所有语义字段。允许格式化差异，但不允许 role、type、ID、顺序或二进制引用静默丢失。

Provider 不支持 developer role 时，可以明确映射为 system 内容并标 `emulated`，但要记录分隔方式、冲突优先级和注入风险。把所有 role 简单拼成一段 user 文本不能标 `supported`。

## 探针三：Tool schema 与调用闭环

工具兼容要覆盖声明、模型请求、应用执行和结果回传四个不同事件：

```text
tool schema sent
  → tool call requested(call_id, name, arguments)
  → policy/schema/idempotency checks
  → application executes or rejects
  → tool result returned with the same call_id
  → model continues, calls another tool, or stops
```

模型请求工具不等于工具已经执行；schema 合法也不授予权限。Adapter 必须保存 `call_id`、工具名、原始参数、解析结果、顺序和 provider item type。

### Schema 探针

至少覆盖：

- 必填字段、enum、嵌套对象、数组、nullable 和额外字段；
- 非法 JSON、缺字段、错类型、超大参数和未知 tool；
- 工具名冲突、重复 schema 与 provider 名称限制；
- Strict schema 不支持时是明确拒绝还是 adapter 侧校验；
- Tool description 与参数中可能出现的非可信指令。

Adapter 侧修复坏参数会改变可观察行为。若确有自动修复，保存原始值、修复规则和修复后值，并标 `emulated`；不能悄悄纠正后声称模型原生满足 schema。

### 调用序列探针

按复杂度递增：

1. 一个工具、一次调用、一次结果；
2. 同一工具连续两次，参数不同；
3. 两个独立工具并行调用，结果乱序返回；
4. 第一个工具报可恢复错误，模型修正一次；
5. 重复 `call_id`、缺失 result、未知 result ID；
6. Tool timeout、取消和副作用未知；
7. 多轮工具后生成最终文本或 typed output。

并行结果可以按 provider 规则排序，但每个 result 必须关联原 call ID。没有稳定 ID 的协议只能在不存在歧义的窄场景标 `emulated`，不能靠数组位置推断后宣称完全兼容。

## 探针四：状态载体与连续运行

状态载体是 provider 要求 harness 在下一轮保留的协议状态。它可能是完整消息历史、response/session ID、typed output item、opaque reasoning item，或几种方式的组合。

Opaque（不透明）表示 harness 需要原样保存和回传，但不应解释、展示或当作普通文本。把 typed/opaque item 压成可见 assistant 文本可能仍能聊天，却会破坏连续 tool calling、缓存或 provider 内部状态。

建立两条可比较路径：

- **ID continuation（ID 续接）**：使用 response/session ID 继续；
- **Explicit replay（显式回放）**：按协议带回完整历史和必需 output items。

两条路径应在相同输入下满足相同任务级断言，但不要求字节级生成一致。分别运行以下负例：删除一个状态 item、调换 tool/result 顺序、复用过期 ID、跨 config 使用 ID、只回放可见文本。错误应归到 adapter/state，而不是模型推理。

对 OpenAI Responses reasoning model，探针要保存 `call_id`，并验证 `previous_response_id` 与完整 output items 回放两条路径；连续多个 function calls 时不能只保留最后一个可见消息。[FACT:openai-reasoning-items]

### 状态不变量

- State ID 绑定 provider、model、config 和会话范围；
- Checkpoint 包含已完成 tool call、幂等键、预算和未决调用；
- Resume 不重复已确认副作用，也不重置共享预算；
- Compaction 不删除协议要求的 typed/opaque items；
- State 缺失或冲突时明确停止，不猜测一个“差不多”的历史。

## 探针五：Streaming 与事件拼装

Streaming（流式传输）不是把字符串片段连接起来。事件可能同时承载文本、tool arguments、usage、reasoning state、错误和完成状态。Adapter 需要显式状态机：

```text
opened → item_started → zero-or-more deltas → item_completed
       → response_completed | response_failed | cancelled
```

测试事件拆分在任意 UTF-8/JSON 边界、空 delta、多个 item 交错、重复 delta、完成前断线、完成后 late event 和客户端取消。Tool arguments 只有在 provider 标记完成并通过 JSON/schema 校验后才能交给 policy；不能执行半截参数。

非流式与流式路径应产生等价 canonical result：相同 item 类型、call ID、stop class 和完整参数。若 usage 只在最终事件出现，中途断线必须记录为 missing，而不是 0。

### Streaming 通过条件

- 事件顺序错误、重复 completion 和未知 item 能被拒绝或明确降级；
- 取消后不再把 late completion 标为成功；
- 已显示的部分文本与最终持久化内容有清晰语义；
- 部分 tool call 不触发 handler；
- 原始 event trace 可脱敏重放。

## 探针六：Stop、错误、重试与 usage

Provider 的 stop reason、HTTP status 和 SDK exception 应映射到稳定的内部分类，而不是直接把易变字符串散布到业务逻辑。

建议最少区分：

| 内部分类 | 示例来源 | 默认动作 |
| --- | --- | --- |
| `completed` | 正常结束 | 进入结果验证 |
| `tool_requested` | 完整工具调用 | 进入 policy/schema 检查 |
| `output_limited` | 输出或上下文截断 | 保留部分结果，按规则停止/续接 |
| `invalid_request` | schema、字段或模型不支持 | 不重试，修配置 |
| `auth_or_policy` | 认证、区域、权限拒绝 | 停止并请求责任人处理 |
| `rate_limited` | 明确限流 | 有界退避并计入总预算 |
| `provider_transient` | 可确认的临时服务错误 | 有界重试 |
| `timeout_unknown` | timeout 后远端状态未知 | 对账后决定，不盲重发 |
| `cancelled` | 用户或 controller 取消 | 停止，处理 late result |
| `adapter_protocol` | 未知 item、ID/状态丢失 | Fail closed 并修 adapter |

重试决策依赖幂等性和副作用状态，不只看 status code。所有重试、fallback 和子调用共享 task budget；换 model/provider 也不能重新获得完整预算。

Usage（用量）字段按 provider 原样保存，再映射到 canonical schema，并保留 `missing/unknown`。Input、output、reasoning、cache token 的口径可能不同；未核对时不能相加做精确跨 provider 价格比较。Cost 应记录价格版本和计算方，不能把缺失 usage 当零成本。

## 用正例、负例和差分构成探针

每个 required 能力至少包含：

1. **Positive case（正例）**：最小合法输入能保持语义；
2. **Negative case（负例）**：一个字段或事件故意损坏，系统在正确边界失败；
3. **Round-trip case（往返例）**：provider shape 与 canonical shape 双向映射不丢字段；
4. **Differential case（差分例）**：stream/non-stream 或 ID/replay 两条合法路径满足同一断言；
5. **Recovery case（恢复例）**：retry/resume 不重复副作用或重置预算。

探针不追求自然语言答案完全相同。断言应针对协议不变量，例如 ID、类型、顺序、参数、stop class、状态和执行次数。

先用本地 fake/stub 和脱敏 replay 验证 adapter 逻辑，再在单独授权下运行真实 provider 探针。离线通过只说明测试夹具覆盖的映射逻辑，不证明真实 surface 与夹具一致。

## Adapter 映射表必须显式

为每个 provider 维护 mapping spec（映射规范）：

| Provider 字段/事件 | Canonical 字段/事件 | 方向 | 丢失策略 | 测试 ID |
| --- | --- | --- | --- | --- |
| 原始 model identity | `response.model` | 入站 | 缺失标 unknown | identity-01 |
| Tool call item | `action.tool_call` | 入站 | ID 缺失即拒绝 | tool-03 |
| Tool result | provider result item | 出站 | 未知 ID 即拒绝 | tool-05 |
| Opaque state item | `state.opaque_items[]` | 双向 | 原样保存，不展示 | state-04 |
| Stop/usage event | `result.stop/usage` | 入站 | 未知枚举保留 raw | life-02 |

映射表中的每一个 `drop`、`synthesize` 或 `merge` 都是兼容性风险，必须说明原因。无法映射的 required 字段应让 adapter 在调用前拒绝，而不是运行到一半才静默丢弃。

## 证据包与 Compatibility card

Compatibility card（兼容卡）至少记录：

```text
combination_id / config_hash / checked_at
exact identities and source references
capability_id / required-or-optional
status: supported | emulated | rejected | untested
request shape / response shape / state carrier
positive / negative / differential probe IDs
raw artifact digest / redaction report
error and usage mapping
known loss / workaround / owner
evidence: E0 | E1 | E2 | E3
retest triggers
```

Raw artifact（原始证据）与公开 artifact 分开保存。公开前移除 credential、个人路径、prompt 中的个人数据和未脱敏 tool output；同时保存 hash、redaction 规则和退出码。只保存最终截图或最终文本不足以复核 tool/state 闭环。

建议将探针矩阵写为逐能力表，而不是一个总分。模型家族页面不能假设同一家族、不同 region 或第三方兼容 endpoint 共享协议能力。

## 常见失败与正确归因

| 观察 | 首查层 | 不能直接推出 |
| --- | --- | --- |
| 能返回文本但第二个工具失败 | State/tool mapping | 模型不会多步推理 |
| Tool arguments 是坏 JSON | Raw item、stream 拼装、模型 action | 一定是模型问题 |
| Timeout 后工具执行两次 | Retry/idempotency/controller | Provider 不稳定就是唯一原因 |
| 多轮后 system 规则失效 | Role 映射、compaction、上下文 | 模型故意不听指令 |
| Usage 为 0 | 字段缺失、映射、价格计算 | 请求免费 |
| ID continuation 成功、手工回放失败 | Output item/state 保存 | 两条路径等价 |
| HTTP 200 但请求字段被忽略 | Adapter/provider effective state | 参数已经生效 |
| 静态 checker 通过 | 文档标记存在 | 真实 API 兼容 |

修复 adapter 后建立新版本并重跑受影响探针。旧失败 trace 保留为历史证据，但不要继续计入修复后组合的失败率。

## 在本项目验证离线协议边界

本教程只验证最小 canonical contract、replay/live-disabled 接缝和文档门禁，不请求真实 provider。

### 前置条件与固定输入

需要 Python 3.11+、uv 0.11、Node.js 22+；依赖分别由 `uv.lock` 与 `package-lock.json` 固定。从仓库根目录离线执行，不设置 provider credential，不授予网络或费用。

固定输入是：

- `lab/tests/test_replay_and_live.py` 的两步 replay 与 hard-disabled live adapter；
- `lab/tests/test_loop.py` 的预算、权限、幂等、timeout 和 resume 负例；
- `lab/ts/runtime-test.ts` 的 Task/Action 运行时契约负例；
- 本页、OpenAI 模型页、事实注册表与兼容矩阵中的静态标记。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py lab/tests/test_loop.py
npm run lab:ts-runtime-test
npm run model:check
npm run model:self-test
npm run compat:check
npm run compat:self-test
```

### 预期输出与断言

- pytest 全部通过：replay 能按 `call_id` 完成进程内 `sum`，live adapter 在 provider action 前硬拒绝；loop 能区分预算、权限、tool error、幂等复用、timeout 和 resume；
- TypeScript runtime 测试拒绝空/重复工具名、非有限预算与非法 action，并阻止坏值进入 metrics；
- `model:check` 确认 API model/Codex surface、tool flow、状态续接与 reasoning control 的必需标记存在；
- `model:self-test` 能拒绝缺少这些标记的固定 canary；
- `compat:check` 确认 Source fact、Offline seam、Live evidence 与独立控制责任没有混写；
- `compat:self-test` 能拒绝缺少证据轴、责任缺口或含陈旧占位符的固定 canary。

每条命令退出码必须为 0。还要人工确认 trace/输出不含 Secret、未发生网络请求，兼容矩阵中的真实运行仍为 `untested`。

### 失败、停止与回退

若 replay 需要网络/credential、live adapter 未被硬拒绝、重复副作用发生、timeout 被记为完成、非法 action 进入 metrics，或任一负例未被 checker 拒绝，停止协议兼容声明。先修对应 contract、adapter、controller 或 checker，并保留可复现负例；不要接入真实 key、放宽断言或把 `untested` 改成 `supported` 来获得绿色结果。

命令只读固定输入并可能产生 `.pytest_cache/` 等可忽略缓存。若误改实现，使用：

```powershell
git diff -- lab scripts docs/models/protocol-compatibility.md docs/models/openai.md docs/references/compatibility.md
```

精确定位后只恢复自己的修改，不覆盖工作树中其他人的变化。失败时回到当前 replay/live-disabled 基线。

### 当前证据边界

上述测试提供 E1：证明本项目固定 replay 和最小 controller 在这些夹具上保持 action、call ID、预算、权限、幂等与 resume 语义；静态 checker 会检查它定义的标记并拒绝固定负例。

它没有 provider SDK/client、credential reader、真实 streaming event、response/session ID 或 opaque reasoning item 实现，也没有调用任何真实模型。静态 marker checker 不解析整段语义。因此即使全部通过，也不能证明 OpenAI、Anthropic、DeepSeek、Qwen 或任何第三方兼容 endpoint 在目标版本上 `supported`，更不能证明模型质量或生产安全。

## 协议资格检查表

- 是否固定精确 model/provider/endpoint/adapter/harness/surface/config？
- 每个 required 能力是否分别标四态并有正负例？
- Message role、content type、顺序和未知字段是否有无损策略？
- Tool schema、call/result ID、并行、错误和取消是否闭环？
- `previous_response_id` 与完整 output items 等状态路径是否分别验证？
- Opaque item 是否原样保存、禁止展示且不被 compaction 删除？
- Streaming 是否在半截 JSON、断线、取消与 late event 下 fail closed？
- Stop/error 是否映射为稳定分类，重试是否受幂等和共享预算约束？
- Usage 缺失是否保留 unknown，而不是填 0？
- Mapping spec 中每个 drop/emulate/reject 是否可见并有责任人？
- Artifact 是否可回放、已脱敏且能回链 config 与测试 ID？
- 离线 E1、真实 E2 和任务质量 E3 是否没有混写？

下一步：把协议结果写入[模型适配卡](/practice/model-playbook)，对 required 缺口先修 adapter，再进入[推理预算](/models/reasoning-budget)和代表任务评测。

## 检查题

1. 为什么 HTTP 200 和单轮文本成功不足以证明 agent 协议兼容？
2. Tool result 没有稳定 `call_id` 时，为什么不能总按数组位置补偿？
3. Opaque state item 与可见思维过程有什么区别？
4. Streaming 中为什么必须等 tool arguments 完成后再执行 handler？
5. 本项目 E1 离线测试全过后，哪些真实 provider 结论仍必须保持 `untested`？
