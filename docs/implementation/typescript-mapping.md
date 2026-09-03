# TypeScript 关键接口映射：从静态类型到运行时边界

## 学习目标与证据边界

本页把 Python 主线中的 task、action、adapter、loop 与 result 映射到 TypeScript，并解释哪些语义能够共用、哪些能力仍然只是最小子集。完成后你应能回答三个问题：

1. 为什么 `TaskSpec` interface 编译通过，仍不能信任网络、文件或 adapter 返回的数据；
2. 为什么 Action 要用 Discriminated union（判别联合）表达互斥分支；
3. 为什么预算计费、trace 和工具执行都必须排在运行时校验之后。

预计 35–45 分钟。当前练习固定 Node.js 22+ 与 TypeScript 5.9.3，版本来自 `package.json` 和 lockfile；输入只使用仓库内置对象，不联网、不读取凭据、不调用真实模型。证据等级为 E1：命令能证明当前离线实现满足固定断言，不能证明 Python 与 TypeScript 完全等价，也不能证明生产环境可靠性或模型质量。

## 先区分三层契约

TypeScript 的类型在编译后会被擦除。外部 JSON 即使被写成 `as TaskSpec`，运行时也不会自动检查字段、有限数字或重复工具名。因此这里有三层不同责任：

| 层 | 当前载体 | 解决的问题 | 不能证明什么 |
| --- | --- | --- | --- |
| Wire contract（线协议） | `lab/schemas/task.json` | 跨语言 JSON 的字段、类型与上下限 | 某个调用方真的执行了校验 |
| 语言内类型 | `lab/ts/contracts.ts` 的 interface / union | 编译期组合是否合法、分支是否穷尽 | 外部值在运行时可信 |
| 运行时边界 | `validateTask`、`validateAction` | 把 `unknown` 收窄为内部可信对象 | loop 的所有业务语义都正确 |

正确的数据流是：

```text
文件 / HTTP / adapter 返回值（unknown）
                 │
                 ▼
      validateTask / validateAction
                 │ 失败：立即分类并停止
                 ▼
        TaskSpec / Action（可信子集）
                 │
                 ▼
      policy → tool → metrics → result
```

不要把 `JSON.parse(raw) as TaskSpec` 当成校验。`as` 是给编译器的断言，不会为生成的 JavaScript 添加任何检查。外部入口应写成：

```ts
const task = validateTask(JSON.parse(raw))
const result = loop.run(task)
```

## 源码地图与能力边界

| 文件 | 当前职责 | 关键边界 |
| --- | --- | --- |
| `lab/schemas/task.json` | 公共 Task JSON Schema | 跨语言输入基线 |
| `lab/ts/contracts.ts` | TS 类型与运行时 Validator（校验器） | 拒绝未知字段、非法数字和非 JSON 值 |
| `lab/ts/minimal-loop.ts` | 最小 controller、policy 与工具调用 | 只演示离线控制流 |
| `lab/ts/runtime-test.ts` | 正例、负例和预算绕过回归 | 坏 action 不能进入 metrics/trace |
| `lab/src/about_harness/contracts.py` | Python dataclass 及运行时约束 | 对照共有字段与语言差异 |
| `lab/src/about_harness/loop.py` | Python 完整教学主线 | checkpoint、retry 等能力以此为准 |

TS 目录不是 Python 实现的逐行移植。它当前重点验证 Task/Action 边界和最小状态机，不能因为名称相同就推断能力相同。

## Task：wire schema 与内部对象

`TaskSpec` 描述验证之后的内部对象：

```ts
export interface TaskSpec {
  schema_version: '1.0'
  task_id: string
  goal: string
  input: Record<string, JsonValue>
  allowed_tools: string[]
  budgets: Budgets
  acceptance: Record<string, JsonValue>
  metadata: Record<string, JsonValue>
}
```

公共 schema 允许省略 `input`、`acceptance`、`metadata` 和 `max_cost_usd`；`validateTask` 会把这些可选 wire 字段归一化为 `{}` 或 `0`，所以内部 `TaskSpec` 可以把它们设为必有字段。这是“外部输入宽、内部状态窄”的边界，不是 schema 与 interface 冲突。

`validateTask` 目前维护以下不变量：

- `schema_version` 必须等于 `1.0`；
- `task_id` 必须符合公开 schema 的字符和长度规则；
- `goal` 去除首尾空白后不能为空，长度不超过 4000；
- `allowed_tools` 只能包含非空且不重复的字符串；
- step、model call 和 timeout 必须是受上限约束的正整数；
- `max_cost_usd` 必须是有限、非负数字；
- `input`、`acceptance`、`metadata` 必须是 JSON object；
- 顶层和 budgets 的未知字段一律拒绝，避免拼错字段后悄悄使用默认值。

### `JsonValue` 不只是一个方便类型

```ts
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }
```

静态类型仍允许调用者通过断言绕过它，所以 `requireJsonValue` 会递归拒绝 `undefined`、function、`bigint`、symbol 以及 `NaN` / `Infinity`。这样进入 trace 与 result 的数据不会在 `JSON.stringify` 时丢字段或改变语义。

当前校验器假定输入来自合法 JSON 树；循环引用的 JavaScript object 不是受支持输入。真实服务还应限制对象深度与总字节数，防止极深对象消耗堆栈或内存。

## Action：用判别联合表达状态机输入

Python 使用一个 dataclass 加运行时不变量；TypeScript 更适合用 `kind` 作为判别字段：

```ts
export type Action =
  | { kind: 'tool'; tool_call: ToolCall; cost_usd: number }
  | { kind: 'complete'; output: JsonValue; cost_usd: number }
```

这带来两个编译期收益：

- `kind === 'tool'` 后，编译器知道 `tool_call` 一定存在；
- 新增 action 分支时，可以用 `never` 检查 switch 是否穷尽。

但 adapter 是一个外部信任边界，所以它的返回类型故意是 `unknown`：

```ts
export interface Adapter {
  readonly name: string
  nextAction(task: TaskSpec, trace: readonly TraceEvent[]): unknown
}
```

如果把它声明为 `Action`，只代表 adapter 作者做出了承诺，不能阻止第三方 SDK、反序列化数据或错误 JavaScript 在运行时返回坏值。`validateAction` 负责验证精确字段集合、`kind`、tool call 标识、参数 JSON 以及有限非负的 `cost_usd`。

### 为什么 `NaN` 是预算绕过案例

JavaScript 中 `NaN` 的类型仍是 `number`，而且所有大小比较都返回 false：

```ts
Number.NaN > 0 // false
Number.NaN <= 0 // false
```

如果先做 `cost += action.cost_usd`，再检查 `cost > max_cost_usd`，一个 `NaN` 会污染累计值并绕过上限。当前顺序是：

1. adapter 返回 `unknown`；
2. `validateAction` 拒绝非有限成本；
3. 只有验证成功才增加 `modelCalls` 和 `cost`；
4. 然后写入 `model_action` trace；
5. 最后比较预算并决定是否继续。

因此非法 action 的结果必须是 `failed / invalid_action`，并且 `model_calls`、`cost_usd` 和 `model_action` trace 都保持未污染状态。这里验证的不只是“会报错”，而是错误发生在副作用之前。

## Loop：控制权属于 harness

`MinimalLoop` 的主循环按以下优先级做决定：

1. 检查取消、总 timeout 与 model-call budget；
2. 请求 adapter 产生下一 action；
3. 验证 action 并累计模型调用与费用；
4. `complete` 分支产生终态；
5. `tool` 分支检查 allowlist 与敏感参数名；
6. 先查询幂等缓存，再查找并执行 handler；
7. 达到 step 上限时返回 `stopped / max_steps`。

Adapter 只能提出动作，不能直接执行工具或写入 `completed`。工具 handler 也只能返回值，不能修改 run 状态。这与[状态与可靠执行](/foundations/state-reliability)中的 controller 所有权一致。

### `ReadonlyMap` 的真实含义

工具表接收 `ReadonlyMap<string, ToolHandler>`，表示 loop 不通过该引用增删 handler。它是 TypeScript 的浅层只读视图，不会把原始 `Map` 冻结；若调用方保留可写引用并在运行中修改它，loop 仍能观察到变化。生产实现应在构造时复制注册表、冻结注册过程，或使用拥有明确生命周期的 registry。

### 取消与 timeout 的真实含义

`CancellationToken` 是进程内 boolean，loop 只在每次迭代开始时检查。`timeout_ms` 也只在调用边界检查。它们都不能抢占一个永久阻塞的同步 adapter 或 tool handler。因此当前实现证明的是 cooperative cancellation（协作式取消）和软 deadline，不是硬超时。

## Python 与 TypeScript 对照

| 概念 | Python 主线 | TypeScript 最小实现 | 当前结论 |
| --- | --- | --- | --- |
| Task 线协议 | `TaskSpec.from_dict` | `validateTask` | 共有字段和主要约束对齐 |
| Action | dataclass + `__post_init__` | union + `validateAction` | 都拒绝非法 kind 与非有限成本 |
| Adapter | Protocol，可保存/恢复状态 | `nextAction` interface | TS 没有 snapshot / restore |
| Tool registry | policy、retry、幂等 | `ReadonlyMap` + 内存 cache | TS 只覆盖最小 allowlist 与复用 |
| Run result | run ID、checkpoint、error、trace | status、reason、metrics、trace | TS 是结果子集，不可互换序列化 |
| Deadline | 调用边界检查，可配合 sleeper/retry | 同步调用前检查 | 都不提供任意 callable 的硬抢占 |
| Memory / context | 有独立实现与污染测试 | 未实现 | 不应宣称能力对等 |

跨语言真正共用的是公开 Task schema 和若干控制不变量，不是所有 class 或返回字段。若要交换 RunResult，应先定义共同 JSON Schema、版本迁移和双向 fixtures，不能直接把两个语言的对象当作同一种 wire format。

## 动手验证

### 前置、版本与输入

前置条件：已在仓库根目录安装 lockfile 固定的 Node 依赖；Node.js 为 22 或更高版本。验证版本：

```bash
node --version
node node_modules/typescript/bin/tsc --version
```

预期第一条输出 `v22` 或更高主版本，第二条输出 `Version 5.9.3`。如果版本或依赖不符，先停止，不要让 `npx` 临时下载另一个 TypeScript 版本来掩盖环境差异。

本练习的输入是 `lab/ts/runtime-test.ts` 中的固定 Task、若干非法 Task/Action，以及一个 unsafe adapter（故意返回非法值的适配器）。它返回 `NaN` 成本，但不读取环境变量、用户文件或网络。

### 第一步：只验证静态类型

```bash
npm run lab:typecheck
```

预期 `tsc --noEmit` 退出码为 0，不生成 JavaScript。当前 `tsconfig.json` 开启：

- `strict`：启用严格类型检查；
- `noUncheckedIndexedAccess`：索引读取包含 `undefined` 风险；
- `exactOptionalPropertyTypes`：区分“字段不存在”和“字段值为 undefined”；
- `noEmit`：教学 typecheck 不写编译产物。

这个结果只证明受检查源码满足静态类型，不证明运行时输入安全。

### 第二步：执行运行时正反例

```bash
npm run lab:ts-runtime-test
```

预期退出码为 0，并输出：

```text
TypeScript runtime contract test passed: invalid Task/Action values fail closed before metrics.
```

脚本会临时编译到操作系统临时目录、执行生成的 JavaScript，并在 `finally` 中删除目录。它至少断言：

- 合法 Task 能被归一化；
- 重复/空工具名与未知字段被拒绝；
- Task budget 和 Action cost 的 `NaN` / `Infinity` 被拒绝；
- 空 action tool name 被拒绝；
- unsafe adapter 使 run 返回 `failed / invalid_action`；
- 非法 action 不增加 model call，不污染 cost，也不产生 `model_action` trace。

### 第三步：核对 Python 公共边界

```bash
uv run --frozen --offline pytest -q lab/tests/test_contracts_and_schema.py
```

预期测试全部通过。这里的 assertion（断言）证明 Python dataclass 拒绝固定非法 Task、预算与 Action，同时证明公共 JSON Schema 本身有效且与正例兼容。当前测试没有逐条对同一负例执行 TS、Python 和 schema 三方差分；两边 RunResult 的能力差异也应保留为显式边界。

## 失败练习：证明类型断言会破坏防线

只在自己的临时学习改动中进行：把 `lab/ts/minimal-loop.ts` 中这一行：

```ts
action = validateAction(this.adapter.nextAction(task, trace))
```

临时改为：

```ts
action = this.adapter.nextAction(task, trace) as Action
```

重新运行：

```bash
npm run lab:typecheck
npm run lab:ts-runtime-test
```

预期 typecheck 仍通过，而 runtime test 必须失败，并指出坏 action 没有按预期使 run 失败。这正是“静态声明不等于运行时验证”的可复现实例。若第二条也通过，立即停止：说明负例或执行路径没有覆盖预算绕过，不应继续扩展功能。

练习后只撤销自己改动的那一行，先检查范围，再重跑两条命令：

```bash
git diff -- lab/ts/minimal-loop.ts
npm run lab:typecheck
npm run lab:ts-runtime-test
```

不要用覆盖整个工作树的命令回滚，因为仓库中可能有别人的未提交修改。最终 `git diff -- lab/ts/minimal-loop.ts` 应为空。

## 常见错误定位

| 现象 | 先检查 | 正确修复方向 |
| --- | --- | --- |
| typecheck 通过，线上仍收到坏字段 | 外部值是否先经过 validator | 入口保持 `unknown`，统一运行时校验 |
| `cost_usd` 变成 `NaN` | 校验是否早于累计和 trace | 用 `Number.isFinite`，失败关闭 |
| complete action 同时携带 tool call | 是否使用精确分支字段 | union 与 validator 同时拒绝混合形态 |
| JSON 序列化后字段消失 | 数据里是否含 `undefined` / function | 进入 trace/result 前递归限制为 `JsonValue` |
| 工具运行中无法取消 | handler 是否同步阻塞 | 传递 AbortSignal、客户端 timeout 或进程隔离 |
| 重复 action 重复写外部系统 | cache 是否仅在进程内 | 稳定幂等键、持久台账与目标系统对账 |
| TS 与 Python 输出不能互读 | 是否误把内部 interface 当 wire schema | 先定义共同 result schema 和版本迁移 |

## 清理、回滚与已知限制

正常验证无需清理：typecheck 使用 `noEmit`，runtime test 自动删除临时输出。如果命令中断，可在确认路径确实属于该测试的临时目录后再删除，不要递归清理仓库或用户目录。

若学习练习修改了源码，使用编辑器 undo 或精确反向修改恢复该行；先看限定路径的 `git diff`，不要 `reset --hard`，也不要覆盖未知改动。恢复后以 runtime test 重新证明防线有效。

当前 TS 最小实现还有明确限制：

- `run` 接收的是已验证 `TaskSpec`，调用方必须在外部入口执行 `validateTask`；
- 没有 checkpoint、adapter restore、retry、持久幂等台账或 memory；
- tool handler 是同步函数，没有 per-call timeout、AbortSignal 或隔离；
- allowlist 只比较名称，参数策略只是敏感键示例，不是通用授权系统；
- cache 没有把参数 hash 与幂等键绑定，不能防止同键异参；
- 没有共同 Action/RunResult schema，也没有自动 TS/Python 差分生成；
- E1 负例覆盖已知边界，不证明所有 JavaScript object、并发和资源耗尽攻击均安全。

这些限制不是让类型变得更复杂就能自动解决。下一步先阅读[Adapter 契约](/implementation/adapter-contract)和[测试策略](/implementation/testing)，再对照[Python 最小 Harness](/implementation/minimal-harness-python)决定哪些能力需要进入共同 wire contract，哪些只属于某个实现。
