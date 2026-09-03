# 上下文与工具调优

Context and tool optimization（上下文与工具调优）不是给 prompt 叠加更多人格或技巧，而是控制 agent 在每一步看到什么、相信什么、能调用什么，以及失败如何返回。模型只有拿到正确证据和可用动作，推理能力才有发挥空间。

本页把上下文选择与工具设计放在一起，因为二者共享同一有限预算：每个 tool schema 会占上下文，工具结果会进入后续步骤，错误结果还可能触发更多调用。优化其中一端时，必须观察另一端是否退化。

## 先画出真实的数据路径

不要从“模型表现不好”直接跳到改 prompt。先记录当前 harness 实际组装和执行的路径：

```text
项目/系统指令 ─┐
任务与验收 ────┼─→ 选择、排序、截断/压缩 ─→ 模型上下文
检索/记忆 ─────┤                              │
历史与工具结果 ─┘                              ↓
                                          tool call
                                              │
允许列表/权限 → 参数校验 → 执行/重试/幂等 → 结果过滤/分页
                                              │
                                              └─→ 下一步上下文
```

一次失败至少要能回答：哪条信息被加载、来源与版本是什么、哪些候选被丢弃、当时 token 预算是多少、暴露了哪些工具与 schema、模型生成了什么结构化调用、策略为何允许或拒绝、工具是否产生副作用、返回内容如何进入下一步。

没有这条 trace（轨迹），就无法区分“模型没看到”“看到了但相互冲突”“工具不可用”和“模型能力不足”。

## 上下文先做清单，再做压缩

对一个固定 task，列出每类候选及其实际 token，而不是只看字符数：

| 类别 | 典型内容 | 默认处理 | 主要风险 |
| --- | --- | --- | --- |
| 不可省规则 | 安全边界、权限、输出契约 | 短而完整地常驻 | 被截断或冲突覆盖 |
| 当前任务 | 目标、输入、禁区、完成条件 | 靠近当前决策 | 压缩后丢精确条件 |
| 权威证据 | 当前代码、测试错误、官方来源 | 按需检索并保留定位 | 版本过期、范围过大 |
| 运行状态 | 已完成、未决、改动与验证 | 结构化 checkpoint | 与真实文件不一致 |
| 工具 schema | 名称、参数、权限和结果契约 | 只暴露本任务需要的 | 工具过多、描述重叠 |
| 工具输出 | 数据、错误、artifact reference | 过滤、分页、结构化 | 日志淹没关键错误 |
| 派生记忆/摘要 | 历史结论和压缩文本 | 带来源、scope、有效期 | 被误当权威指令 |
| 非可信内容 | 网页、邮件、issue、文档正文 | 标成数据，隔离其指令 | Prompt Injection |

“required”应表示缺少它就必须失败，不是“我希望模型多看看”。所有 required 项合计超过预算时应停止并请求缩小任务或提高明确的上下文上限，不能静默丢弃其中一项。

Token 估算要用实际目标模型/adapter 的 tokenizer 或 provider usage；同一文本在不同模型上的数量可能不同。还要预留系统内容、tool schema、输出、重试和 provider 包装开销，不能把名义窗口全部分配给文件正文。

## 每项内容只有五种主要去向

1. **Preload（预加载）**：每一步都必须遵守、内容短且稳定的规则。
2. **Retrieve（检索）**：只在相关任务需要，且可以按 source/version/scope 定位的材料。
3. **Summarize（摘要）**：必须保留但原文过长的历史；摘要是派生数据，要能回到原文。
4. **Reference（引用）**：模型只需知道 artifact ID、路径或分页句柄，后续按需读取。
5. **Drop（丢弃）**：重复、过期、已被否定、与当前决定无关且可重建的内容。

预加载不是可信度标记，检索也不是正确性证明。网页可以被检索到但仍是不可信数据；项目指令即使可信，也可能因版本不适用而被排除。选择前先按权限、scope、版本和可信度过滤，再按相关性、优先级和 token 预算排序。

不要用“把所有文档放进长窗口”替代路由。长上下文仍会增加费用、延迟、冲突和注意力竞争，也更容易把旧文件与当前文件混在一起。大型仓库提供入口、搜索顺序和排除目录，模型发现证据缺口后再取下一批。

## 顺序、冲突和重复同样消耗质量

稳定规则放在可预测位置，任务与验收靠近当前请求，工具结果紧邻它对应的 call。不要每轮无意义重排大段静态前缀；但是否产生 prompt cache（提示缓存）命中只关系到对应 provider 的成本/延迟机制，不证明上下文更正确。

同一规则同时出现在 system、项目文件、会话提醒和自动记忆，会浪费 token 并放大其权重。先去重，再保留最高权限、可版本化的来源引用。两条有效规则冲突时显式停止或按优先级处理，并在 trace 记录冲突；不能靠“把重要规则再重复三遍”解决。

对大日志按错误类别、时间窗和关键字段过滤，同时保存完整 artifact reference。简单保留开头或结尾都可能丢错误根因。代码检索返回文件、行号、symbol、commit/hash 和截断状态；结果不完整时让模型知道还有下一页，而不是把截断片段当完整仓库。

## 压缩要有保真断言

Compaction（上下文压缩）是有损变换。至少保护：当前目标、用户禁区、精确数值、已改文件、未决项、失败原因、验证结果、回退路径和被否定方案。压缩前后运行结构化断言，而不是只看摘要读起来是否流畅：

- 每个未完成 acceptance item 仍可定位；
- 禁止修改/调用的对象没有消失；
- commit、版本、hash、金额和 deadline 没有被模糊化；
- “未验证”“失败”“pending”等否定状态没有变成肯定；
- tool call 与结果、错误和副作用状态仍能配对；
- 不可信数据没有升级为指令或事实。

长任务用 checkpoint 保存可恢复状态，但它不是第二套真相。恢复时重新核对文件、Git 和外部状态；checkpoint 只记录上次观察，不代表当前仍成立。压缩后先跑一个负面探针，例如询问“是否可以改动禁区文件”，确认边界仍有效，再继续高风险步骤。

## 工具的第一目标是边界清楚

一个工具应代表一个清晰 capability（能力），而不是把 shell、SQL 或 HTTP 作为任意字符串透传。名称写动作和对象，例如 `read_issue`、`comment_issue`、`close_issue`；读取与写入、预览与执行、创建与删除分开，便于权限和审计。

工具描述至少说明：

- 它读取或改变什么，以及明确不做什么；
- 何时使用、何时使用相邻工具；
- 参数单位、格式、范围、枚举和互斥条件；
- 默认值、分页、排序、一致性与最大结果；
- 是否可能产生费用或不可逆副作用；
- 成功、部分成功、拒绝、可重试和不可重试的返回结构；
- 幂等键、超时、重试和取消语义；
- 所需权限、审批与数据分类。

若 `search`、`find`、`lookup` 的数据域和返回相同，优先合并；若不能合并，就在名称/schema 中表达差异。模型选错工具可能是工具集合本身不可辨识，不一定是 reasoning 不够。

## Schema 要缩小无效动作空间

用带约束的对象代替自然语言命令：必填字段明确，字符串有格式与长度，数字有单位和上下界，有限选择用 enum，互斥模式用 tagged union。拒绝未知字段，避免拼错参数被静默忽略。

安全默认值应降低副作用，例如 `dry_run: true`、限定 page size、显式目标 ID。不能只靠描述写“请勿删除”；策略层还要核对 Task allowlist、当前主体、scope 和审批。Secret、权限和安全门禁独立于模型输出，即使调用结构合法也可能被拒绝。

输入校验失败时返回稳定的错误码、字段路径、可修复说明和 `retryable: false`，让模型能改参数而不猜。不要回显 Secret 或把原始 stack trace 全塞回上下文。

## 工具结果是下一轮的非可信输入

成功结果只返回完成下一决策需要的字段，并附 source/version、截断、分页和副作用状态。大正文使用 artifact ID；表格使用稳定 schema。空结果要区分“确实没有”“无权限”“超时”“结果被过滤”。

错误至少区分：

| 类别 | 建议字段 | 路由动作 |
| --- | --- | --- |
| validation | code、field、expected | 修参数，通常不重试原调用 |
| permission | required authority、request path | 停止并请求授权 |
| transient | retryable、retry-after、attempt | 在共享预算内限次退避 |
| conflict | observed version、current version | 刷新状态后重新决策 |
| partial | completed/failed items、side effects | 先对账，不能整批盲重试 |
| unsafe | policy rule、redacted context | 停止，不切模型绕过 |

外部网页、issue、文档和工具返回都可能包含 Prompt Injection（提示注入）。即使它们来自“读取工具”，也应作为数据包裹并标注来源，不能允许正文改变工具权限、忽略项目规则或自行写入长期记忆。

## 重试、幂等和副作用必须一起设计

Retry（重试）只适合明确的暂时错误，并受次数、deadline 和费用总预算约束。写工具需要 idempotency key（幂等键）或等价去重机制；相同逻辑操作重放时返回已完成结果，不能再次产生副作用。

幂等缓存键要包含主体、目标、操作语义和必要版本，不能只用模型随手生成的短字符串跨用户复用。缓存结果还要保留副作用与权限边界；权限撤销或目标版本变化时，旧结果不应伪装成当前执行成功。

超时并不证明远端未执行。遇到 unknown outcome（结果未知）先用查询/对账工具检查，再决定补偿或重试。批量工具返回逐项状态；若 8/10 成功，盲重试全部会重复前 8 项。

## 按任务最小化工具集合

不要为每个 session 挂载全部 MCP server 和管理动作。先由可信 task classifier 或人工配置选择 capability bundle，再把该集合交给模型。只读 reviewer、代码实现 agent、数据迁移和发布 agent 应有不同工具/权限；高风险工具默认不出现，而不是只在调用时弹警告。

工具数量减少后仍要覆盖任务所需动作和恢复路径。只给写工具不给读取/预览/验证工具，会迫使模型盲改。理想 bundle 包含：观察、计划所需的只读能力；最小写能力；验证；必要时的回退或停止路径。

动态加载工具时记录 registry/version/hash 和选择理由。否则同一 prompt 在不同 run 看到的工具集合变化，实验不可复现。

## 诊断顺序：先可见性，再能力

| 观察 | 首查 | 合适调整 | 不要立即做 |
| --- | --- | --- | --- |
| 答案遗漏关键约束 | 约束是否加载/被压缩/冲突 | 去重、靠近任务、加压缩断言 | 换更贵模型 |
| 读取大量无关文件 | 入口、搜索顺序、排除目录 | 分阶段检索、分页、返回定位 | 把完整文件树预载 |
| 总选错相邻工具 | 名称/描述/schema 是否重叠 | 合并或明确数据域和动作 | 反复提示“仔细选” |
| 参数校验失败 | 字段、单位、默认和错误反馈 | enum/range/example、稳定错误码 | 放宽为任意字符串 |
| 重复写入 | 幂等键、timeout 后状态、partial result | 对账、去重、补偿 | 无条件重试 |
| 工具拒绝权限 | Task allowlist、主体和审批 | 请求正确授权或停止 | 增加 reasoning |
| 大输出后忘记目标 | tool result 是否挤占上下文 | 摘要 + artifact reference | 继续追加纠错文本 |
| 网页改变执行计划 | trust label 和指令/数据隔离 | 拒绝注入、保留来源 | 把网页存为项目规则 |

只有确认信息已加载、工具可用、schema 清楚、权限正确、验证充分后，仍在证据综合或多约束规划上稳定失败，才进入[推理预算与路由](/optimization/reasoning-routing)实验。

## 用单变量、配对任务评测

先固定 task/fixture、模型与版本、reasoning、seed/temperature、工具实现、权限、预算和评分，只改变一个主要因素：检索 top-k、排序、压缩模板、工具说明、schema 或返回格式。多项一起变化只能评价整个 bundle。

至少比较：

- 当前 baseline；
- 删除明显噪声后的简单 baseline；
- 单变量候选；
- 必要时一个“完整证据但无工具改动”的诊断配置。

同一 task 运行各配置，报告任务成功/质量、约束违反、无效调用、schema error、重复副作用、context/tool tokens、调用数、费用、端到端延迟和人工介入。还要按失败类型切片；总成功率相同但候选把“查不到信息”变成“重复写入”，风险并未等价。

调优集与 holdout 分开，Prompt Injection、超长日志、冲突规则、分页遗漏、部分成功和 timeout 后未知结果作为固定负例。不要把只在一个模型/adapter/workload 上得到的收益写成所有模型通用规律。

## 在本项目验证最小上下文与工具边界

### 前置条件与固定输入

需要 Python 3.11+ 与 uv 0.11，依赖由 `uv.lock` 固定。从仓库根目录离线执行；不配置真实 MCP、浏览器、API key 或外部写权限。

测试输入是固定 `ContextItem`、fake adapter 和进程内 `ToolRegistry`：8-token 上下文预算包含 trusted required 项、trusted code 和高优先级不可信网页；工具案例包含未获 allowlist 的危险调用、两次暂时失败后的成功、合法幂等复用、同 key 改 tool/参数的冲突，以及含 Secret/个人路径的结果。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_memory_context_trace.py::test_context_budget_prioritizes_required_and_trusted_sources lab/tests/test_loop.py::test_permission_denial_stops_before_tool_execution lab/tests/test_loop.py::test_retry_and_idempotency_prevent_duplicate_side_effects lab/tests/test_loop.py::test_idempotency_key_conflict_rejects_changed_tool_or_arguments lab/tests/test_memory_context_trace.py::test_trace_redacts_secret_values_paths_and_tool_results
```

### 预期输出与断言

应有 6 项通过：

- 8-token 预算选择 required `AGENTS.md` 与 trusted code，丢弃优先级更高但不可信的网页；
- 未在 Task allowlist 中的 `dangerous` 工具在 handler 执行前停止；
- 暂时失败按 10/20 ms 两次退避后成功，同一幂等键第二次调用复用结果，总副作用 handler 只执行 3 次尝试；
- 同一 key 改 canonical arguments 或 tool name 的两个负例都在第二个 handler 前失败；
- trace 不包含 fixture 中的 Secret 与个人路径片段，并保留 `[REDACTED]` 标记。

### 失败、停止、清理与回退

任一断言失败就停止扩大工具权限或上线候选上下文策略。先检查 selection 顺序、Task allowlist、retry/idempotency 或 trace redaction；不要联网验证、不要换真实模型，也不要删除负例让测试变绿。

命令只创建可忽略 pytest 缓存和进程内对象；需要时只清理 `.pytest_cache/`。误改实现时用 `git diff -- lab/src/about_harness/context.py lab/src/about_harness/tools.py lab/src/about_harness/policies.py lab/src/about_harness/trace.py lab/tests` 精确定位，并只恢复自己的修改。候选失败时回到锁定 baseline，保留失败 fixture 与分类。

### 证据边界

这些测试提供 E1：当前离线 Python 实现按 `required → trusted → priority → item_id` 选择上下文；required 项放不下时会抛错；`ToolRegistry` 支持进程内注册、有限重试、同调用幂等复用与冲突拒绝；策略能在本地 handler 前拒绝未允许工具；trace 会处理固定 Secret/路径样例。

它不实现真实 tokenizer、provider context window、检索器、自动压缩、分页 artifact store、跨进程幂等、并发 reservation、MCP capability negotiation 或生产数据防泄漏。测试通过不能证明真实模型遵循率、Prompt Injection 防护或工具集成可用性。

## 完成一次调优的检查表

- 能否列出模型实际看到的指令、证据、工具 schema 与各自 token？
- required 项超预算时是明确失败，还是被静默截断？
- 来源、版本、scope、可信度和截断状态是否随内容进入 trace？
- 工具名称和 schema 是否让相邻能力可区分，并拒绝未知字段？
- 读取/预览/写入/验证/回退是否按权限拆分？
- 错误是否区分校验、权限、暂时、冲突、部分成功和安全拒绝？
- retry 是否共享预算，写操作是否有可审计幂等与 timeout 对账？
- 大结果是否用过滤、分页和 artifact reference，而非简单尾部截断？
- 实验是否锁定模型与 task，只改变一个上下文或工具变量？
- 结论是否限定 workload、harness、设置和 E0–E3 证据？

下一步先读[上下文工程](/foundations/context)和[工具与环境](/foundations/tools)，再用[实验方法](/optimization/experiment)建立配对 baseline。Prompt 本身的目标与验收写法见[提示与任务契约](/optimization/prompting)。

## 检查题

1. 为什么检索到内容、预加载内容和可信内容是三个不同概念？
2. required 项超过 token 预算时，静默截断会造成什么审计问题？
3. 为什么只读工具返回的网页也必须按非可信输入处理？
4. timeout 后立即重试一个写工具，为什么可能产生重复副作用？
5. 工具总是选错时，怎样证明问题来自工具集合而不是模型推理能力？
