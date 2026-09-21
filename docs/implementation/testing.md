# Harness 测试策略：验证控制流，而不只验证答案

<span id="学习目标与证据边界"></span>
<span id="当前-python-测试矩阵"></span>
<span id="python-之外还有哪些测试"></span>
<span id="check、pages-check-与-verify"></span>
<span id="checkpagescheck-与-verify"></span>
<span id="npm-run-check"></span>
<span id="npm-run-pages-check"></span>
<span id="npm-run-pagescheck"></span>
<span id="npm-run-verify"></span>
<span id="动手验证"></span>
<span id="前置条件"></span>
<span id="快速-runtime-回归"></span>
<span id="完整本地入口"></span>
<span id="失败时的停止、清理与回滚"></span>
<span id="失败时的停止清理与回滚"></span>
<span id="当前测试体系的限制"></span>
<span id="检查题"></span>

## 先定义测试在证明什么

一项高质量测试至少写清：

```text
subject：被测责任层
input：固定输入、版本和起始状态
action：执行哪个调用或事件序列
oracle：什么证据判定对错
side effects：允许发生什么、必须为零什么
failure class：失败属于哪一层
cleanup：产生哪些临时状态，如何安全清理
evidence boundary：通过后仍不能推出什么
```

只写“运行成功”很弱。对于未授权工具，正确结果是 `stopped / permission_denied` 且 工具处理函数 调用次数为 0；对于 timeout，正确结果不是最终文本看起来完整，而是迟到 completion 不能覆盖 timeout 终态。

<span id="oracle谁来判定正确"></span>

## Oracle：谁来判定正确

Oracle（判定依据）应尽可能独立于生成结果的路径。

| Oracle 类型 | 适合判断 | 常见误用 |
| --- | --- | --- |
| Exact value（精确值） | ID、计数、枚举、确定性转换 | 对开放文本做脆弱全文快照 |
| Schema | 字段、类型、必需项、未知字段 | 把结构合法当成业务正确 |
| Invariant（不变量） | 预算单调、终态一致、无重复副作用 | 只断言最后 status |
| State transition（状态转换） | cancel、retry、approval、restore | 不检查中间状态和迟到事件 |
| Artifact comparison | 补丁、文件、报告、hash | 只看文件存在 |
| Differential（差分） | 两实现/配置对同一输入的一致性 | 未冻结版本却归因模型 |
| Metamorphic（变形关系） | 改写输入后应保持/改变的性质 | 把一个样例推广为普遍能力 |
| Rubric / Judge | 主观质量、覆盖与表达 | 让被测模型给自己打分 |
| Human review | 高影响、模糊或不可逆结果 | 用人工代替所有可自动断言 |

同一测试常需要多个 oracle。一个文件写入案例至少检查退出码、最终字节、schema、允许路径、diff 范围和副作用次数；只检查 assistant 回答中的“已完成”不构成验收。

## 测试层次不是只看数量

```text
静态类型 / lint
        ↓
wire schema + runtime contract
        ↓
组件单元测试
        ↓
controller + adapter + policy + tool 集成
        ↓
固定领域 fixture / replay
        ↓
构建、站点和发布候选验证
        ↓
真实 provider smoke（E2，需独立授权）
        ↓
代表任务、重复与 holdout（E3）
```

上层不能替代下层。Live smoke 可以成功，但错误 Action（动作提议） 仍可能未被运行时 验证器 拒绝；单元测试全绿，也不能证明真实 API 字段未漂移。失败先落到最窄责任层，再决定需要哪一层回归。

<span id="契约测试静态类型不够"></span>

## 契约测试：静态类型不够

外部 JSON、适配器 返回值和 检查点 都是运行时信任边界。至少覆盖：

- 必需字段缺失、未知字段、错类型、空值与长度边界；
- `NaN`、`Infinity`、负数、bool-as-int 等语言边缘值；
- tool/complete 互斥、call ID、幂等键和参数对象；
- schema version、Task（任务）/config/fixture identity；
- 检查点 计数一致、适配器 state 精确字段和 cursor 上下限；
- Python 与 TypeScript 对共享 wire contract 的同一正负 fixture。

当前 `runtime-contract-v1.json` 固定任务与动作正反例；`run-result-v1.json` 固定 Result（结果）正反例。公共 JSON Schema、Python `from_dict` 和 TypeScript `validate*` 读取相同值。结果 案例分别声明 schema/runtime 预期，显式展示 JSON Schema 能检查字段与终态组合，却不能独自证明 steps 求和、轨迹 连续或 检查点 不超前。`acceptance-v1.json` 另以共享纯 JSON 案例核对两边完整的 `accepted`、`feedback` 和 `evidence`。

公共 结果 把 `steps` 固定为成功工具步骤，所以必须等于 `tool_calls + reused_tool_calls`；completion/验收只增加 model call。Python 能产出 检查点，TypeScript 当前总是写 `checkpoint: null`，但两边序列化字段、终态组合和 reader 接受边界相同。Wire contract 对齐不等于恢复、retry 或工具实现能力相同。

## Controller 必测停止路径

| 路径 | 关键断言 | 只看最终状态会漏掉什么 |
| --- | --- | --- |
| completed | Action 合法、声明的 acceptance 通过、trace/metrics 一致 | 条件是否充分、是否读取真实 artifact |
| max steps | adapter 不再被多调用 | 额外副作用或 off-by-one |
| model/cost budget | 越界前后计数清楚 | `NaN` 绕过或多一次请求 |
| timeout | 迟到 completion 不覆盖终态 | 调用其实仍在消耗资源 |
| cancellation | 请求、观察和线程结束可区分 | 在途工具是否被抢占 |
| permission denied | handler 调用数为 0 | 先执行后拒绝 |
| tool error | 错误分类、retry 次数、无错误 cache | 原失败被成功重试抹掉 |
| idempotency conflict | 同 key 改 tool/参数时第二个 handler 为零 | 错误复用旧结果 |
| invalid action | metrics/trace 未被坏值污染 | 只捕获异常但已记账 |
| checkpoint restore | cursor、计数、幂等结果保持 | 恢复后重复工具 |

当前 `test_loop.py` 覆盖以上固定路径，并额外断言 Adapter（适配器） 返回的 dataclass 会在记账前经过深拷贝和完整 动作提议 解析，嵌套 `NaN` / `Infinity` 不会污染 metrics、轨迹 或触发 工具处理函数；同一幂等键改变 tool/参数会在第二个 工具处理函数 前失败；验收拒绝可修正；反复拒绝受 model budget 停止；验证器 异常不能成为完成；验证器 超时不能覆盖终态。`runtime-test.ts` 对 TS 最小 loop 重放相邻验收负例，并断言拒绝不消耗 tool step、坏 验证器 不释放输出。它们尚未覆盖异步 approval wait、真正硬 timeout、分布式 worker 和外部业务对账。

## Retry 测试要断言真实等待和副作用

只断言“第三次成功”不够。当前 retry/幂等测试同时检查：

- 工具处理函数 总尝试次数是 3；
- sleeper 实际收到 `[0.01, 0.02]`；
- 轨迹 中有两条 retry；
- 同一幂等键、tool 和 canonical arguments 的第二次调用复用结果，即使 call ID 与 object key 顺序不同；
- 同一 key 改 tool name 或 canonical arguments 时稳定失败，第二个 工具处理函数 不执行；
- `tool_calls=1`、`reused_tool_calls=1`，逻辑副作用没有重复。

测试通过使用注入 sleeper，而不是实际等待长退避；这让结果快速、确定。真实系统还需验证 供应方 `retry-after`、总 截止时间、进程重启后的持久幂等和 unknown outcome 对账。

<span id="时间取消和并发要可控制"></span>

## 时间、取消和并发要可控制

时间测试优先注入单调 clock，不依赖墙上时间或长 `sleep`。当前 timeout 测试用 `MutableClock` 推进时间；取消测试用线程 Event 控制 适配器 进入与释放。

并发测试至少设置最大等待并断言线程/任务确实结束，避免失败时测试套件永久挂起。一次线程测试通过不证明无竞态；生产级状态还需 revision、锁/lease、重复投递和乱序事件测试。

Flaky test（不稳定测试）不能直接自动重跑到绿色。保留第一次失败，先分类：测试自身时序、runner 基础设施、外部 供应方、共享状态、资源不足还是产品行为。只有明确暂时性基础设施失败才有限重试，并报告首次失败率。

<span id="证明高价值门禁会拒绝坏输入"></span>

<span id="fixture固定输入还要固定来源"></span>

## Fixture：固定输入还要固定来源

六类 Lab 的每个 fixture bundle 包含 `manifest.json`、`input.json`、`expected.json` 与 `negative.json`。Loader 核对 hash；测试还会把 bundle 复制到临时目录、篡改 input，并要求 CLI 非零退出且 stderr 包含 hash mismatch。

这证明当前 canonical JSON（规范化 JSON）身份与 manifest 一致：解析后排序对象键并紧凑编码，缩进、换行或对象键顺序变化不改变身份。新增 `sources-v2` 与 `study-coding` 则按原始文件字节计算 hash，两种算法不能混用；详见[输入身份](/labs/runner)。两者都不证明 fixture 代表真实世界分布。Fixture 还要记录来源许可、版本、生成方法、预期责任层和证据等级。修改 input 时应产生新 hash 并解释语义变化，不能只更新 expected 让测试继续通过。

Eval 还把 task、immutable fixture ref 和 run 的 hash 串成 lineage（来源链）。`eval:self-test` 故意制造 task/ref/run 不一致、重复 run/matrix cell、config drift 和不安全公开 artifact；任一坏样例被接受，门禁自身就失败。

## 负例和 checker 自测

Negative test（负例测试）有两层：

1. 产品负例：系统接收坏 动作提议、污染 memory 或未授权工具，内部结果应为拒绝/停止；
2. 门禁自测：测试程序构造一份坏文档/fixture，再要求 checker 以非零退出拒绝它。

门禁自测的外层命令应退出 0，因为“坏输入确实被拒绝”就是成功。例如 `eval:self-test` 检查多类 lineage 与脱敏 canary，`repo:self-test` 检查 Secret、许可、workflow 权限和事实时效。字数、固定章节名和关键词出现与否没有可靠 oracle，不应伪装成内容质量负例。

如果外层只看 checker 非零，却不核对错误标记，checker 可能因语法崩溃而被误判为正确拒绝。Self-test 应同时断言 exit code 和预期错误类别。

## 安全测试要看副作用是否为零

安全回归不能只断言模型说“拒绝”。至少记录：

- 越权 动作提议 是否被提出；
- policy 是否在 工具处理函数 前拒绝；
- 实际工具调用、网络外发、文件写入和费用是否为 0；
- 轨迹 是否保留拒绝原因但不泄漏 Secret；
- retry、fallback、restore 或子 Agent 是否绕过同一拒绝。

当前测试覆盖固定敏感参数键、未授权工具、memory 污染、轨迹 中合成 token/个人路径、外域浏览 fixture 和 Live 适配器 硬禁用。它不证明所有 Prompt Injection、编码 Secret、路径逃逸或工具组合攻击都被阻止。

## 从缺陷到回归的标准过程

1. 保存最小复现输入、起始版本和观察到的错误；
2. 判断责任层：contract、控制器、适配器、policy、tool、state、验证器 或 checker；
3. 写最窄的失败断言，并先确认它在修复前确实失败；
4. 同时断言状态、计数、轨迹 和不允许副作用，而非只断言异常字符串；
5. 做最小语义修复，不改变 fixture/expected 来迎合实现；
6. 跑目标测试，再跑邻近模块、完整语言套件和 repository verify；
7. 审查测试是否只记住一个字符串，补边界或邻近变体；
8. 记录命令、版本、退出码、fixture/config hash 与剩余限制。

若修复需要改变既有正确语义，先更新契约并解释迁移。不要把失败测试标 skip、扩大容差或无限重试来消除红色。

<span id="acceptance-validator已实现什么仍缺什么"></span>

## Acceptance validator：已实现什么，仍缺什么

当前 Python `HarnessRunner` 与 TypeScript `MinimalLoop` 都实现 `completion proposal → AcceptanceValidator → completed/continue`。默认 `JsonSubsetAcceptanceValidator` 要求完成输出包含 `TaskSpec.acceptance` 声明的 JSON 子集，失败时记录 `failed_paths` 与已消费预算，再把结果交给下一次 适配器 决策；Python 还保存 检查点，TS 只保存当前进程内 轨迹 和 适配器 状态。

共享 fixture 固定九类可跨 JSON 传输的语义：空条件、嵌套子集与额外字段、boolean/number 区分、array 长度、嵌套缺失、JSON Pointer 转义、多失败顺序、根类型错误和等价 JSON number。Python 的 `NaN/Infinity`、循环对象以及 TS 自定义 验证器 的异常/坏返回仍是语言内负例，因为它们不是标准 JSON 值。共享预期能发现一边悄悄改变路径或反馈的漂移，但不能替代各语言的运行时攻击面测试。

测试同时证明：

- 布尔值不会与整数混为同一个验收值，`NaN/Infinity` 不会通过；
- nested object 允许输出额外字段，array 则要求长度和值一致；
- validation 失败可在预算内修正，反复失败最终以 `model_budget` 停止；
- 验证器 返回后重新检查 timeout，迟到的通过结果不能成为 completed；
- 验证器 抛错时结果为 failed，完成输出不会泄漏到 结果。

这个 oracle 仍不知道 JSON 字段是否真实：模型自己返回 `{"tests_passed": true}` 并不等于测试执行。空 acceptance 也会明确记录零条件后通过。正式任务应注入会读取冻结 artifact、退出码、diff 或目标系统回执的 验证器，并测试 验证器 版本/身份、坏 artifact、异常、超时与脱敏。当前 result-v1.1 把 验证器 契约/执行异常暂映射到 `invalid_action`，还没有独立错误枚举。


## 运行与验收入口

按[统一环境](/guide/prerequisites)准备 Node.js 22+、Python 3.12、uv 0.11.16、Git、锁定依赖及对应 Chromium；完整验证还需提前准备四个框架环境。输入是当前源码、共享契约 fixture、研究材料和故障探针。

```bash
uv run --frozen --offline pytest -q lab/tests/test_acceptance.py lab/tests/test_loop.py lab/tests/test_contracts_and_schema.py
npm run lab:typecheck
npm run lab:ts-runtime-test
npm run eval:self-test
npm run study:check
```

预期全部退出 0。分别断言非法 Action 在记账/handler 前拒绝、验收失败/超时不能 completed、共享契约一致、坏来源链被拒绝、完整研究及错误产物负例成立。测试收集数会随覆盖扩展变化，不作为固定教程输出。

| 聚合入口 | 覆盖范围与边界 |
| --- | --- |
| `npm run check` | 文档、示例、构建、旧路由、事实、领域/原始材料实验、完整研究、模拟协议、产品工作区、生态工作坊与评测扫描；不替代完整语言测试 |
| `npm run pages:check` | Pages base、教程/示例、事实时效、链接、许可、秘密、workflow 与有限视觉；不验收完整 runtime |
| `npm run verify` | `verify:core` 加四框架离线环境；核心另含完整 pytest、Ruff、Pyright、TypeScript 和检查器负例自测 |

共享构建目录的命令顺序执行。门禁自测退出 0 应表示内部坏输入按预期失败；先保存首个失败分类，不能把检查器崩溃误判为成功拒绝。

测试清理自己的临时副本，研究报告保留；回退只撤销本轮配置/实现，再重跑原失败及正常对照。所有默认执行仍是 E1，不证明真实模型质量、生产隔离或部署可用。完整执行链见[最小实现](/implementation/minimal-harness-python)。
