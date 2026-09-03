# 推理预算与模型路由优化

Reasoning routing（推理路由）是在任务执行前或出现新证据后，选择模型、推理档位和运行预算的策略。它的目标不是把所有困难任务都交给“更强模型”，而是在质量、安全、延迟和费用约束内，把可验证的任务送到合适配置，并在证据不足时停止或交给人。

本页讨论稳定的设计与评测方法，不提供通用模型排名。具体模型、参数和价格会随 provider、版本与 API surface 变化；落地时必须记录实际 model ID、adapter 版本、参数、日期和来源。

## 先拆开五个不同决定

| 决定 | 回答的问题 | 示例 | 不应混淆为 |
| --- | --- | --- | --- |
| 模型选择 | 哪个模型/版本处理本次请求 | 固定的 provider + model ID | “整体更聪明”的排名 |
| 推理档位 | 单次模型调用允许多少内部推理计算 | provider 暴露的 reasoning 参数 | agent 的总步骤数 |
| 调用预算 | 一次 run 最多调用多少次模型、工具或 Judge | `max_model_calls`、`max_steps` | token 或费用已经受控 |
| 资源预算 | 整个任务最多消耗多少 token、费用和时间 | token/cost/deadline ledger | 每个子任务各拿一份新预算 |
| 权限与安全 | 这个 run 可以访问或修改什么 | tool allowlist、审批、schema | 可以用更高预算绕过的限制 |

提高推理档位不会修复错误的 tool schema、缺少权限、过期事实或不可达服务。增加 `max_steps` 也不等于给单次调用更多 reasoning。先判断失败属于哪一层，再决定是否路由。

## 路由器只能看到“当时已知”的特征

路由特征应在做决定时可观察、可记录和可重放。常见输入包括：

- task 类型、输入规模、语言和模态；
- 上下文长度、文件数量、依赖范围和预计工具种类；
- 是否涉及不可逆写入、外部系统、敏感数据或高影响建议；
- 输出是否有确定性 schema、测试、编译器或人工 rubric；
- 剩余 deadline、费用、model calls、steps 和人工等待预算；
- 当前 run 已出现的结构化失败、重试次数和新获得的证据；
- 目标配置在同类 development tasks 上预注册的结果。

任务最终是否成功、Judge 分数、真实答案、完成后的 trace 长度和事后人工标签都不能回填为本次决策特征。否则会产生 label leakage（标签泄漏）：离线看似精准，在线却无法获得同样输入。

“过去失败类型”也要有时间边界。路由器可以使用升级前已发生的 `invalid_schema`，不能使用升级后才知道的“强模型修好了”。训练数据保存 feature snapshot、decision timestamp 和 policy version，避免从完整 trace 重新抽取出未来信息。

## 先做可审计的静态策略

三档策略可以作为起点，但它只是项目约定，不是 provider 的自然分类：

| 档位 | 适合的可观察条件 | 默认动作 | 必须保留的边界 |
| --- | --- | --- | --- |
| Fast path | 局部、低风险、确定性验证充分 | 低延迟配置，较小调用预算 | schema、测试和权限不降低 |
| Standard | 常规多文件、多步骤、可回滚 | 标准配置和完整验证 | 共享任务总预算 |
| Escalation | 跨系统、高歧义、高影响或出现可恢复的不确定性 | 更高推理档位、替代模型或人工接管 | 不自动扩大权限和费用上限 |

配置必须解析为精确 manifest，而不是只记录 `fast`：

```json
{
  "policy_version": "routing-policy-v1",
  "route": "standard",
  "provider": "example-provider",
  "model": "pinned-model-id",
  "adapter_version": "pinned-adapter-version",
  "reasoning": {"surface": "provider-specific", "value": "configured-level"},
  "budgets": {
    "max_steps": 12,
    "max_model_calls": 12,
    "timeout_ms": 30000,
    "max_cost_usd": 0
  },
  "permissions_profile": "read-only",
  "feature_snapshot_ref": "routing-input.json"
}
```

这是 E0 设计示例，不对应本项目已经接入的真实 provider。`max_cost_usd: 0` 在当前最小 runner 中是零费用上限，不是“无限预算”。真实系统还应记录 token 上限、输入/输出计费版本、缓存口径和总 deadline。

## 预算必须是一份共享账本

父任务拆出子任务、子任务重试、fallback 换模型或 Judge 复核时，都应从同一 task-level ledger（任务级账本）扣减。若每层都重新获得“最多 12 次调用”，总消耗会随分支和重试成倍增长。

```text
任务总预算
  ├─ planning 调用
  ├─ worker A 调用 + tools
  ├─ worker B 调用 + tools
  ├─ retry / fallback
  └─ verification / Judge
```

账本至少区分 reserved、spent、remaining 和不可回收的外部费用，并用幂等 event ID 防止重放重复扣款。并发子任务需要原子 reservation；无法拿到额度时不应先调用再补记。超时使用单调时钟计算 run deadline，传给子调用的 deadline 不能晚于父任务。

预算耗尽的停止原因也要具体：`max_steps`、`max_model_calls`、`timeout`、`max_cost`、token limit 和 provider rate limit 不是同一种失败。把它们都记成 `failed` 会让路由器学不到该增加什么，也可能把权限错误误判为计算不足。

当前 lab 只实现 `max_steps`、`max_model_calls`、`timeout_ms` 和 `max_cost_usd`。它没有真实 token ledger、reasoning token、父子 reservation 或 provider reasoning 档位；本节其余内容是项目设计建议，不是实现声明。

## 升级前先做失败分诊

Escalation（升级）应由新证据触发，而不是“失败就加预算”：

| 观察到的失败 | 优先动作 | 通常不应做 |
| --- | --- | --- |
| 信息缺失或需求歧义 | 检索权威源、请求澄清或 abstain | 让模型在相同输入上继续猜 |
| schema/parse 错误 | 修正 adapter、约束输出、保存失败 fixture | 自动扩大权限或无限重试 |
| tool/网络暂时失败 | 按错误类别限次退避，遵守 deadline | 用更高 reasoning 掩盖不可达服务 |
| 权限不足或安全拒绝 | 停止并请求明确授权 | 切换模型绕过拒绝 |
| 确定性验证失败 | 把具体错误作为新输入，限次反思 | 不加入新信号地重复同一 prompt |
| 知识可能过期 | 查权威、带日期的来源 | 只提高推理档位 |
| 预算耗尽 | 返回结构化 stop reason，交给策略/人决定 | 在子任务内重置计数 |
| 高影响且无法可靠验证 | 人工复核或拒绝自动执行 | 以多数模型投票代替责任人 |

重试只有在输入、状态、模型配置或外部可用性发生了有意义变化时才可能提供新信息。相同 prompt、相同状态和相同配置的连续重试通常只是增加费用与尾延迟。

## Fallback 是有上限的状态机

把 fallback（回退/替代路径）写成有限状态机，而不是散落的 `try/catch`：

```text
classify → choose route → run → verify
     ↑                    │       │
     │              recoverable  ├─ pass → complete
     │                    │       └─ unsafe/ambiguous → human_or_stop
     └──── one bounded retry / alternate route
```

每个转移记录 `from`、`to`、reason、evidence、attempt、policy version 和剩余预算。预先限定总 attempts、每类错误次数和可访问路线；检测 `(state, input hash, config)` 重复时停止循环。

降级模型或切换 provider 时不能关闭 JSON Schema、tool allowlist、Secret 过滤、人工审批或输出验证。协议不兼容应失败关闭（fail closed），不能把原始模型文本直接解释为 tool call。所有路线不可用时返回 `unavailable`；证据不足时返回 `abstained`，不要把它们伪装成任务失败或成功。

## 评测要把路由收益与模型能力分开

至少区分三类实验：

1. **Oracle/full matrix**：每个锁定 task 都运行每个候选配置，估计各配置在相同工作负载上的结果；“oracle”只表示事后可选出的上界，不是可部署策略。
2. **Static policy**：只用预注册规则选择路线，与固定 Standard baseline 配对比较。
3. **Adaptive router**：使用决策时特征动态选择；先 shadow routing（影子路由），只记录它会怎么选，不改变真实执行。

如果只有失败任务进入 Escalation，那么 Fast 与 Escalation 样本难度不同，二者成功率不能直接比较。这是 selection bias（选择偏差）。只记录实际所选路线还会缺少反事实结果，形成 off-policy evaluation（离策略评估）问题。小型学习项目更适合先跑 full matrix；数据量足够后，再研究随机探索、倾向评分等方法，而且安全高风险路线不应为了统计估计而随机放开。

同一 task 的配置结果应配对，固定 task version、fixture、tool state、adapter、重复次数和 Judge 规则。开发集用于定阈值，holdout 用于一次性确认；不能在看过 holdout 后继续改路由规则再报告同一份结果。

## 指标、阈值与拒绝自动选择

主指标应是任务级成功或预注册质量 rubric，同时报告：

- 总费用、model/tool calls、token、端到端延迟及 P90/P95；
- 预算耗尽率、fallback/循环率、abstain 和人工介入率；
- schema、工具、权限、安全和验证失败的分类分布；
- 各 workload、风险层和输入规模切片；
- paired difference、区间与缺失运行，而不只报告均值；
- 路由决策本身的选择率、错误升级和漏升级。

晋级规则同时包含质量非劣阈值、安全硬门槛和资源上限。例如：holdout 的成功差异区间不支持超过预注册幅度的退化，安全/权限违规为零，P90 与费用在预算内。样本不足或区间跨越决策阈值时应 abstain（拒绝自动选择），保持 baseline 或交给人，而不是强行宣布候选胜出。

阈值需要 calibration（校准）。按 development data 选择“不确定性高于多少升级”时，要同时查看可靠性分桶、各 workload 覆盖率和错误成本；模型自报 confidence 不能直接视为概率。冷启动先使用简单规则和人工复核，积累可重放数据后再拟合路由器。

上线后监控 task mix、输入长度、tool error、选择率、成本和结果分布漂移。模型/adapter/tool schema 更新即视为新配置版本；漂移超阈值时回到静态 baseline，重新跑固定 regression 与 holdout，而不是在线静默调阈值。

## 一个可归因的配对实验

从锁定任务集中按 workload、规模和风险分层，对每个 task 运行：

- 配置 A：固定 Standard；
- 配置 B：只改变 provider 的 reasoning 档位；
- 配置 C：保持 A 的模型与档位，只在两种不同、可恢复且带新证据的失败后切换路线；
- 策略 D：shadow router，只保存选择，不影响 A 的执行。

每次只改变一个主要变量。A 与 B 回答 reasoning 档位的增量影响；A 与 C 回答有限升级策略的整体影响；D 与 full matrix 的事后结果对照，评估路由决策。若 B 同时换模型、提高 step/token 上限并改变 prompt，就只能评价整个 bundle，不能声称收益来自 reasoning。

保存 task/run/trace/result、feature snapshot、route、配置 hash、预算 event、fixture hash、exit code、stop reason 和 failure classification。缺失或超时 run 保留在分母并单列，不能删除后只比较成功样本。

## 按症状定位问题

| 症状 | 首查 | 不要用什么掩盖 |
| --- | --- | --- |
| 高档位质量不变、延迟增加 | task 是否由确定性工具/验证主导 | 再增加重试 |
| 低档位在离线数据异常优秀 | 是否使用了完成后特征或答案 | 宣称路由器已学会难度 |
| 强配置成功率反而低 | 是否只有失败/高风险任务被送入 | 直接横比路线均值 |
| fallback 成本失控 | 父子预算、重试计数和循环检测 | 给每个子任务新预算 |
| schema 错误随模型切换变化 | adapter 与协议兼容性 | 关闭验证接收文本 |
| timeout 后仍标成功 | deadline 检查位置与 late result | 只增大 timeout |
| 人工介入率突然上升 | task mix、阈值、provider/tool 漂移 | 静默降低安全门槛 |
| 只在 development 提升 | 阈值过拟合或 holdout 泄漏 | 继续复用同一 holdout 调参 |

修复后用原失败 fixture 和邻近变体回归。若确认是 adapter/schema 问题，就冻结模型路由实验，先修契约；若是预算循环，就保留触发循环的 trace 并验证总账本，而不是只验证某个 worker 的局部计数。

## 在本项目验证最小预算契约

### 前置条件与固定输入

需要 Python 3.11+、uv 0.11、Node.js 22+，依赖已由 `uv.lock` 和 lockfile 固定。从仓库根目录执行；保持网络关闭，不配置真实 provider、API key 或付费账户。

输入是仓库内固定 fake adapter、fake tool、单调测试时钟与三个 pytest case：一次模型调用上限、三步无限 tool loop、1000 ms deadline。TypeScript runtime 测试使用本地构造的坏 Task/Action。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_loop.py::test_model_budget_stops_before_an_extra_adapter_call lab/tests/test_loop.py::test_max_steps_breaks_infinite_tool_loop lab/tests/test_loop.py::test_timeout_stops_before_completing_late_action
npm run lab:ts-runtime-test
```

### 预期输出与断言

pytest 应有 3 项通过，并证明：

- `max_model_calls=1` 时，在额外 adapter 调用前以对应预算原因停止；
- `max_steps=3` 时，无限工具请求不会进入第四步；
- action 返回晚于 `timeout_ms=1000` 时，late result 不能被标成 `completed`。

TypeScript runtime 测试应退出 0：非有限 budget/action cost、空或重复工具名等坏输入在进入 loop/metrics 前被拒绝。查看输出时以断言和 exit code 为准，不以“命令运行过”代替结果。

### 失败、停止、清理与回退

任一测试失败就停止提高预算或扩展路由策略。先根据失败 case 检查 deadline、计数位置或 Task/Action validator，不要联网、调用真实模型或放宽 schema 让测试变绿。保留失败输入作为 regression。

命令只产生可忽略测试缓存与临时构建输出，不修改任务数据；需要时只清理明确的 `.pytest_cache/` 或脚本记录的临时目录。若误改实现，用 `git diff -- lab/src/about_harness lab/ts lab/tests` 精确检查并只恢复自己的修改。候选路由失败时回到固定 Standard baseline，同时保留结果和失败分类。

### 证据边界

这些测试提供 E1：在离线 fake/replay 条件下，当前 Python loop 会执行已实现的模型调用、步骤和 timeout 边界；TypeScript runtime 会拒绝一组坏契约。它们不运行真实模型，不验证 provider reasoning 参数、token/费用计量、并发父子账本、在线路由质量、P90 服务延迟或生产安全性。

因此不能把“测试通过”写成某模型更好、真实费用受控或自适应路由已可用。新增真实 adapter 时，应另建显式授权的实验，固定版本与 workload，并按[评测方法](/evaluation/method)、[指标与统计](/evaluation/metrics)和[评测报告](/evaluation/reporting)公开配置、缺失和限制。

## 实施检查表

- 三档名称是否解析到精确 provider/model/adapter/reasoning 配置？
- 决策特征是否都在 decision timestamp 前可获得，并保存 snapshot？
- 父任务、子任务、重试、fallback 和 Judge 是否共享总预算？
- schema、权限、Secret 和安全门槛是否独立于模型档位？
- 每类失败是否有有限转移、停止原因和循环上限？
- 是否用 full matrix 或配对任务处理 selection bias，而非横比被选择的样本？
- 阈值是否只在 development data 校准，并保留未反复调参的 holdout？
- 证据不足时是否允许 abstain、保持 baseline 或请求人工？
- 模型、adapter、tool 和 task mix 漂移后是否会触发重新验证？

下一步先读[稳定推理机制](/foundations/reasoning)与[状态和可靠执行](/foundations/state-reliability)，再用[实验方法](/optimization/experiment)设计单变量候选。模型参数是版本敏感事实，应按[模型参数](/models/reasoning-budget)记录来源与日期。

## 检查题

1. 为什么 `max_steps`、provider reasoning 档位和 task token budget 是三个不同控制面？
2. 失败任务才进入强配置时，为什么两条路线的成功率不能直接比较？
3. 哪些失败应该先修 schema、权限或来源，而不是提高推理预算？
4. 父子任务各自维护本地上限，为什么仍可能突破任务总预算？
5. Shadow routing 和 full matrix 分别回答什么问题？
