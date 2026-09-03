# Harness 测试策略：验证控制流，而不只验证答案

## 学习目标与证据边界

Harness testing（Harness 测试）不只问“最后答案对不对”，还要证明非法输入被拒绝、权限在副作用前生效、预算和取消会停止循环、恢复不会重复动作，并且结果能追溯到固定 Task、配置与 fixture。

完成本页后，你应能：

1. 为契约、controller、adapter、policy、tool、memory、trace 与 evaluator 选择合适的 oracle；
2. 区分 `npm run check`、`pages:check` 与 `verify` 的实际覆盖；
3. 设计一个先失败、修复后通过、且不会靠放宽断言变绿的回归；
4. 正确解释 E0–E3，不把静态门禁或离线 replay 当成真实模型质量。

预计 45–60 分钟。动手部分固定使用 Node.js 22+、Python 3.11+、uv 0.11.x、Fake/Replay 与合成 fixture，不访问网络、凭据或真实模型。当前测试提供 E1 工程证据；即使全部通过，也不证明生产分布式可靠性、真实 provider 兼容或任务质量。

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

只写“运行成功”很弱。对于未授权工具，正确结果是 `stopped / permission_denied` 且 handler 调用次数为 0；对于 timeout，正确结果不是最终文本看起来完整，而是迟到 completion 不能覆盖 timeout 终态。

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

上层不能替代下层。Live smoke 可以成功，但错误 Action 仍可能未被运行时 validator 拒绝；单元测试全绿，也不能证明真实 API 字段未漂移。失败先落到最窄责任层，再决定需要哪一层回归。

## 当前 Python 测试矩阵

当前基线由 `pytest --collect-only -q` 得到 57 项：

| 文件 | 数量 | 主要责任 |
| --- | ---: | --- |
| `test_contracts_and_schema.py` | 17 | Task/Action/budget/checkpoint 与 JSON Schema |
| `test_loop.py` | 9 | completion、预算、step、权限、retry、幂等、恢复、取消、timeout |
| `test_m5_labs.py` | 22 | 六类 fixture、hash、领域负例、公开摘要一致性 |
| `test_memory_context_trace.py` | 4 | 上下文选择、记忆污染/过期/删除、trace 脱敏 |
| `test_replay_and_live.py` | 5 | Replay 精确字段、Fake state、Live 硬禁用 |

数字只描述覆盖面，不代表质量分数。一个参数化测试可以计为多项，十个相似 happy path 也可能没有一个关键负例。新增能力时先补责任层和故障路径，而不是追求总数。

## Python 之外还有哪些测试

| 层 | 当前入口 | 证明范围 |
| --- | --- | --- |
| TypeScript 静态映射 | `npm run lab:typecheck` | strict/noEmit 下源码可编译 |
| TypeScript 运行时 | `npm run lab:ts-runtime-test` | 坏 Task/Action 在 metrics 前失败关闭 |
| 六类领域 Lab | `npm run labs:all` | 固定 hash fixture 的 E1 接缝 |
| 内容/导航/模型/教程 checkers | 多个 `*:check` | Markdown 契约、链接和结构规则 |
| Checker self-tests | 多个 `*:self-test` | 门禁会拒绝故意损坏的 canary |
| Eval validation | `eval:validate` / `eval:self-test` | lineage、矩阵、promotion 与公开结果负例 |
| Site build / visual | `docs:project-base` / `docs:visual:run` | 路由、base path 和三个 viewport 的有限检查 |
| CI | `.github/workflows/ci.yml` | Ubuntu、Node 22、Python 3.12 上执行 `verify` |

Static check（静态检查）、build 和 visual smoke 都是必要证据，但不能证明页面内容事实正确或所有交互可访问。Checker 自测也很重要：没有负例的门禁可能一直输出绿色，却从未证明会拦住问题。

## `check`、`pages:check` 与 `verify`

### `npm run check`

覆盖：基础文档/内容/示例检查、普通 VitePress build、事实注册、内容与示例 checker 自测、六类离线 Lab、TypeScript 运行时、eval validate/summary/self-test 和公开结果扫描。

它不运行完整 pytest、Ruff、Pyright、TypeScript 静态 typecheck，也不包含 tutorial/repository 等高价值 checker self-tests。因此 `check` 通过不能替代 `verify`。

### `npm run pages:check`

覆盖：GitHub Pages base build、roadmap/learning/model/compat/tutorial/content/examples、事实新鲜度、外链结构、许可证、Secret、workflow 与有限视觉检查。

它不运行 Python 单元/集成测试、TypeScript runtime 或 eval 全链。它回答“站点与发布相关门禁是否满足”，不回答 harness runtime 是否正确。

### `npm run verify`

先运行 `check`，再补 roadmap/learning/model/compat/tutorial 的正负检查、Pages base build、完整 pytest、Ruff、Pyright、TypeScript typecheck、事实新鲜度、链接、许可证、Secret、workflow、视觉和 repository checker self-test。CI 的 PR 与 `main` push 都运行这一入口。

`verify` 是当前最完整的本地/CI 聚合入口，但仍不访问真实 provider，不运行付费 API，不做生产部署或真实用户数据测试。聚合命令通过只能继承各子检查的证据边界。

## 契约测试：静态类型不够

外部 JSON、adapter 返回值和 checkpoint 都是运行时信任边界。至少覆盖：

- 必需字段缺失、未知字段、错类型、空值与长度边界；
- `NaN`、`Infinity`、负数、bool-as-int 等语言边缘值；
- tool/complete 互斥、call ID、幂等键和参数对象；
- schema version、Task/config/fixture identity；
- checkpoint 计数一致、adapter state 精确字段和 cursor 上下限；
- Python 与 TypeScript 对共享 wire contract 的同一正负 fixture。

当前 Python 和 TypeScript 分别覆盖主要 Task/Action 边界，但还没有自动生成的跨语言差分集，也没有共同 Action/RunResult wire schema。不能因为两边各自通过就声称完全等价。

## Controller 必测停止路径

| 路径 | 关键断言 | 只看最终状态会漏掉什么 |
| --- | --- | --- |
| completed | Action 合法、trace/metrics 一致 | 是否真正满足 acceptance |
| max steps | adapter 不再被多调用 | 额外副作用或 off-by-one |
| model/cost budget | 越界前后计数清楚 | `NaN` 绕过或多一次请求 |
| timeout | 迟到 completion 不覆盖终态 | 调用其实仍在消耗资源 |
| cancellation | 请求、观察和线程结束可区分 | 在途工具是否被抢占 |
| permission denied | handler 调用数为 0 | 先执行后拒绝 |
| tool error | 错误分类、retry 次数、无错误 cache | 原失败被成功重试抹掉 |
| invalid action | metrics/trace 未被坏值污染 | 只捕获异常但已记账 |
| checkpoint restore | cursor、计数、幂等结果保持 | 恢复后重复工具 |

当前 `test_loop.py` 覆盖以上固定路径。它尚未覆盖异步 approval wait、真正硬 timeout、分布式 worker、外部业务对账和 acceptance validator，因为这些能力尚未实现。

## Retry 测试要断言真实等待和副作用

只断言“第三次成功”不够。当前 retry/幂等测试同时检查：

- handler 总尝试次数是 3；
- sleeper 实际收到 `[0.01, 0.02]`；
- trace 中有两条 retry；
- 同一幂等键第二次调用复用结果；
- `tool_calls=1`、`reused_tool_calls=1`，逻辑副作用没有重复。

测试通过使用注入 sleeper，而不是实际等待长退避；这让结果快速、确定。真实系统还需验证 provider `retry-after`、总 deadline、进程重启后的持久幂等和 unknown outcome 对账。

## 时间、取消和并发要可控制

时间测试优先注入单调 clock，不依赖墙上时间或长 `sleep`。当前 timeout 测试用 `MutableClock` 推进时间；取消测试用线程 Event 控制 adapter 进入与释放。

并发测试至少设置最大等待并断言线程/任务确实结束，避免失败时测试套件永久挂起。一次线程测试通过不证明无竞态；生产级状态还需 revision、锁/lease、重复投递和乱序事件测试。

Flaky test（不稳定测试）不能直接自动重跑到绿色。保留第一次失败，先分类：测试自身时序、runner 基础设施、外部 provider、共享状态、资源不足还是产品行为。只有明确暂时性基础设施失败才有限重试，并报告首次失败率。

## Fixture：固定输入还要固定来源

六类 Lab 的每个 fixture bundle 包含 `manifest.json`、`input.json`、`expected.json` 与 `negative.json`。Loader 核对 hash；测试还会把 bundle 复制到临时目录、篡改 input，并要求 CLI 非零退出且 stderr 包含 hash mismatch。

这证明当前字节与 manifest 一致，不证明 fixture 代表真实世界分布。Fixture 还要记录来源许可、版本、生成方法、预期责任层和证据等级。修改 input 时应产生新 hash 并解释语义变化，不能只更新 expected 让测试继续通过。

Eval 还把 task、immutable fixture ref 和 run 的 hash 串成 lineage（来源链）。`eval:self-test` 故意制造 task/ref/run 不一致、重复 run/matrix cell、config drift 和不安全公开 artifact；任一坏样例被接受，门禁自身就失败。

## 负例和 checker 自测

Negative test（负例测试）有两层：

1. 产品负例：系统接收坏 Action、污染 memory 或未授权工具，内部结果应为拒绝/停止；
2. 门禁自测：测试程序构造一份坏文档/fixture，再要求 checker 以非零退出拒绝它。

门禁自测的外层命令应退出 0，因为“坏输入确实被拒绝”就是成功。例如 `eval:self-test` 检查多类 lineage 与脱敏 canary，`repo:self-test` 检查 Secret、许可、workflow 权限和事实时效。字数、固定章节名和关键词出现与否没有可靠 oracle，不应伪装成内容质量负例。

如果外层只看 checker 非零，却不核对错误标记，checker 可能因语法崩溃而被误判为正确拒绝。Self-test 应同时断言 exit code 和预期错误类别。

## 安全测试要看副作用是否为零

安全回归不能只断言模型说“拒绝”。至少记录：

- 越权 Action 是否被提出；
- policy 是否在 handler 前拒绝；
- 实际工具调用、网络外发、文件写入和费用是否为 0；
- trace 是否保留拒绝原因但不泄漏 Secret；
- retry、fallback、restore 或子 Agent 是否绕过同一拒绝。

当前测试覆盖固定敏感参数键、未授权工具、memory 污染、trace 中合成 token/个人路径、外域浏览 fixture 和 Live adapter 硬禁用。它不证明所有 Prompt Injection、编码 Secret、路径逃逸或工具组合攻击都被阻止。

## 从缺陷到回归的标准过程

1. 保存最小复现输入、起始版本和观察到的错误；
2. 判断责任层：contract、controller、adapter、policy、tool、state、validator 或 checker；
3. 写最窄的失败断言，并先确认它在修复前确实失败；
4. 同时断言状态、计数、trace 和不允许副作用，而非只断言异常字符串；
5. 做最小语义修复，不改变 fixture/expected 来迎合实现；
6. 跑目标测试，再跑邻近模块、完整语言套件和 repository verify；
7. 审查测试是否只记住一个字符串，补边界或邻近变体；
8. 记录命令、版本、退出码、fixture/config hash 与剩余限制。

若修复需要改变既有正确语义，先更新契约并解释迁移。不要把失败测试标 skip、扩大容差或无限重试来消除红色。

## Acceptance gap：绿色不等于任务完成

当前 `TaskSpec` 有 `acceptance` 字段，但 `HarnessRunner` 不读取它；合法 complete Action 会直接得到 completed。因此现有 loop 测试证明的是状态机按当前契约运行，不是业务验收自动完成。

后续应增加 `completion_proposed → validator → completed/continue` 接口，并测试：

- 确定性 acceptance 通过才完成；
- validation 失败会返回结构化证据，而不是重试同一答案；
- validator 自身错误与候选失败分开；
- 预算耗尽时不会把未验证产物标 completed；
- 生成者与 Judge 共用偏差时有独立 oracle 或人工复核。

在此能力实现前，任何 E1 smoke 的 `completed` 只能解释为“adapter 提出了合法完成 Action 且 controller 接受”，不能解释为目标质量已被验证。

## 动手验证

### 前置条件

在仓库根目录执行；要求 Node.js 22+、Python 3.11+、uv 0.11.x，依赖已按 `package-lock.json` 和 `uv.lock` 安装。所有输入为仓库内合成 fixture；不配置 API key、网络或真实模型。

```bash
node --version
uv --version
uv run --frozen --offline python --version
```

### 快速 runtime 回归

```bash
uv run --frozen --offline pytest -q lab/tests/test_loop.py
npm run lab:typecheck
npm run lab:ts-runtime-test
```

预期 Python 有 9 项通过，TypeScript typecheck 退出 0，runtime test 输出坏 Task/Action 在 metrics 前失败关闭。这里没有运行全部领域 fixture、站点或 checker self-tests。

### 证明高价值门禁会拒绝坏输入

```bash
npm run eval:self-test
npm run repo:self-test
```

两条外层命令都应退出 0。输出应说明 fixture lineage、matrix integrity、promotion、JSON/JSONL redaction、unsupported format、Secret、许可、workflow 权限与事实引用 canary 被检查。若坏输入被接受，self-test 本身必须非零退出。

### 完整本地入口

```bash
npm run verify
```

当前基线应包含 57 项 pytest 全通过，以及 Ruff、Pyright、TypeScript typecheck、文档/事实/站点/安全/工作流/视觉和 checker self-tests 通过。不要只看最后一行；保留首个失败子命令和退出码。

## 失败时的停止、清理与回滚

测试失败后先保留原 stdout/stderr 和命令，不立即重跑覆盖证据。按责任层运行最窄复现；如果涉及 Secret、越权副作用或真实费用，先停止相关 adapter/工具并隔离结果。

当前测试只创建进程内状态、VitePress build、Playwright 临时截图和系统临时目录；self-tests 使用 `finally` 删除临时 fixture。通常无需手工清理。Python 可能留下 `.pytest_cache/`，VitePress 可重建 `docs/.vitepress/dist`；只有确认目标是这些生成物时才清理，不能递归删除仓库或用户目录。

若为了失败练习修改源码或 fixture，先运行限定路径的 `git diff`，只用编辑器 undo 或精确反向修改恢复自己的行；不要 `reset --hard`，也不要覆盖未知未提交文件。回滚实现后仍保留能复现原缺陷的测试。

## 当前测试体系的限制

当前没有：通用 acceptance validator、coverage threshold、mutation testing、property-based contracts、自动跨语言差分、真实 provider/stream/usage、持久数据库和队列故障、跨进程幂等、真实浏览器 Agent、完整 accessibility audit、性能/负载基线或生产数据删除演练。

这些缺口不能通过增加门禁名称来解决。优先补能改变错误结论的 oracle 和真实故障路径；低风险格式规则只有在持续阻止实际问题时才值得保留。

下一步用[离线 Runner](/labs/runner)观察六类 fixture，再到[回归集](/evaluation/regression)设计长期样本；若要衡量配置或模型差异，按[评测方法](/evaluation/method)冻结 workload、重复与 holdout。

## 检查题

1. 为什么 schema 通过不能证明业务结果正确？
2. `check` 与 `verify` 的覆盖差异是什么？
3. Checker self-test 为什么要同时检查非零退出和错误类别？
4. Retry 测试只断言最终成功，会漏掉哪些副作用？
5. 当前 Result 为 completed 时，为什么仍不能声称 acceptance 已验证？
