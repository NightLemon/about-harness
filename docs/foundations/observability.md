# 可观测性与故障归因

Observability（可观测性）让外部人员根据系统留下的信号，重建“收到什么任务、模型建议什么、harness 允许并执行什么、结果怎样验证、为何停止”。它不是把所有原始对话永久保存，也不是仪表盘数量；关键是证据能否回答一次具体运行发生了什么。

Telemetry（遥测）是系统输出的 trace、metric、log 和 artifact 元数据；可观测性是利用这些信号回答未知问题的能力。采集很多字段不等于可观测：若缺少身份、因果边或验收结果，日志再多也无法定位第一处分歧。

## 学习目标

完成本页后，你应该能够：

- 为 `Task → model → Action → policy → Tool → validator → terminal` 每个边界设计事件；
- 区分事件发生时间、采集时间、单调耗时和因果顺序；
- 用 run/attempt/call/span（追踪片段）/idempotency（幂等）身份连接并发与恢复路径；
- 从事件推导指标，同时校验丢失、重复、孤儿和未知 schema；
- 为采样、脱敏、保留和可观测系统自身故障定义规则；
- 说明当前 lab 的 E1 能证明什么，以及离生产级分布式观测还缺什么。

## 先确定观察问题与信任边界

先写需要回答的问题，再决定字段：

| 问题 | 最小证据 | 单一信号的陷阱 |
| --- | --- | --- |
| 模型是否提出了危险动作？ | 冻结 Action + model call identity | policy deny 不能证明模型原始参数 |
| Harness 是否执行了动作？ | policy decision + handler start/result | 模型文本“已完成”不是执行证据 |
| 外部副作用是否发生？ | 幂等键 + 目标系统 receipt（回执） | 本地 timeout 不等于远端取消 |
| 为什么任务失败？ | 首处分歧前后的输入/输出身份 | 最终 stop reason 可能只是末端症状 |
| 恢复是否重复写入？ | checkpoint lineage + 工具台账 + receipt | 新 run 成功不能覆盖旧 attempt |
| 结果是否满足目标？ | 独立 validator + artifact identity | `completed` 只表示循环终止 |

观测字段跨越信任边界时同时记录“边界前”和“边界后”：provider 原始响应的受控 hash、Adapter 生成的 Action、policy 实际判断、Tool handler 收到的规范化参数和目标系统回执。只记录其中一侧，无法区分上游提出错误还是中间映射错误。

## Trace、Metric 与 Artifact 各负其责

| 信号 | 回答的问题 | 适合内容 | 不适合替代 |
| --- | --- | --- | --- |
| Trace（轨迹） | 一次 run 按什么因果链执行？ | 有序事件、调用关系、错误与状态转换 | 跨大量 run 的趋势 |
| Metric（指标） | 系统整体是否变化或越过阈值？ | 计数、分布、比例、资源用量 | 单次失败的完整上下文 |
| Log（日志） | 组件在某时刻补充了什么诊断？ | 结构化错误、运行环境、调试字段 | 无关联 ID 的自由文本历史 |
| Artifact（产物） | 哪个输入或输出可被再次检查？ | task、配置、补丁、结果、hash、测试报告 | 动态执行顺序 |

最终答案只是一个产物。若缺少轨迹与验收 artifact，无法判断“结果错误”来自模型决策、adapter 映射、权限策略、工具执行还是验证器。

### 权威事实与派生视图

Source of truth（事实来源）决定冲突时信谁：

| 内容 | 常见权威来源 | 可重建的派生值 |
| --- | --- | --- |
| 外部对象是否创建 | 目标系统 receipt/版本 | “工具成功率”指标 |
| Policy 是否允许 | 版本化 decision event | allow/deny 比例 |
| Run 怎样终止 | controller terminal transition | status dashboard |
| 费用实际发生 | provider/tool 账单或受控 usage | 每成功任务成本 |
| 产物是否合格 | 锁定 validator 对锁定 artifact 的结果 | 通过率、失败分布 |

日志文本、模型回答和 dashboard 都可能是派生视图。视图与权威来源冲突时暂停结论，保存冲突并修复数据链；不要手工改图表让它与预期一致。

## 先设计关联身份

最小关联链通常包含：

```text
task_id
  └─ run_id + attempt
       ├─ step / model_call_id
       ├─ tool_call_id + idempotency_key
       ├─ approval_id
       └─ checkpoint_id / result_id
```

`task_id` 表示稳定任务定义，`run_id` 表示一次实际执行，`attempt` 区分基础设施重跑。工具调用 ID 用于协议关联，幂等键用于识别同一业务副作用，两者不能混用。多 Agent 场景还需要 `parent_run_id` 或 span 关系，才能沿委派树聚合预算和取消。

身份字段必须从 controller 生成并逐层传递，不能让模型自由改写。配置、指令、fixture、工具 schema 和代码版本用独立 ID/hash 绑定；只有 run ID 而没有输入版本，仍无法复现。

### 不要混淆四种“同一次”

| 标识 | 表示什么 | 重试/恢复时是否复用 |
| --- | --- | --- |
| `run_id` | 一次控制循环或持久运行身份 | 按状态协议决定，不能随意新建掩盖历史 |
| `attempt_id` | 基础设施或执行尝试 | 每次尝试新建，并指向原 attempt/run |
| `call_id` | 一次协议请求/响应关联 | 每次调用唯一，响应必须回到同一 ID |
| `idempotency_key` | 同一业务意图的去重身份 | 安全重试时复用，并绑定参数 hash/作用域 |

`call_id` 相同不能自动证明业务动作相同，`idempotency_key` 相同也不能替代请求/响应关联。多租户或多环境下，幂等键至少绑定主体、工具、规范化参数和目标环境；否则相同短 key 可能错误复用别人的结果。

恢复路径还要有 `checkpoint_id`、checkpoint version、resume generation 和前一事件 high-water mark（最高已提交序号）。新 worker 只能在预期 revision 上继续，迟到的旧 worker 事件要标为 rejected/stale，不能进入当前终态。

## 事件信封与当前 Schema

Event envelope（事件信封）负责公共元数据，`data` 只保存该事件特有字段。当前 `lab/schemas/trace.json` 的结构是：顶层 `schema_version`、`run_id` 和 `events`；每个事件含 `sequence`、`kind`、相对 `timestamp_ms` 与脱敏 `data`。

这意味着当前事件并非每条都有独立 run/task ID：`run_id` 位于 trace 顶层，`task_id` 只由 `run_started.data` 记录。生产级跨服务采集通常还需显式补充 event ID、task ID、component、attempt、span/parent、配置版本、状态和输入/输出 hash，不能假设进程内对象关系会跨队列自动保留。

当前 schema 允许七类事件：

| 事件 | 最低诊断字段 | 能证明什么 |
| --- | --- | --- |
| `run_started` | task、adapter、是否恢复、运行模式 | run 使用了哪个入口和基线 |
| `model_action` | action kind、累计调用与费用 | adapter 返回了什么动作类型 |
| `policy_denied` | tool、原因、是否需批准 | 工具为何没有执行 |
| `retry` | attempt、实际 `delay_ms`、错误分类 | 哪次可恢复失败触发了退避 |
| `tool_result` | call ID、tool、reused、attempts、脱敏结果 | 工具执行或幂等复用的结果 |
| `checkpoint` | step、计数器、adapter state | 可从哪个位置恢复 |
| `run_stopped` | status、reason、error | controller 为何进入终态 |

当前 lab 没有单独的 `policy_allowed`、`validator_result`、approval 或子任务事件。文档设计需要这些能力时，应明确它们是下一步 schema，而不能从已有七类事件推断已实现。

### 生产事件信封应回答什么

一个更完整的概念信封可以是：

```json
{
  "schema_version": "event-v2",
  "event_id": "evt-unique",
  "task_id": "task-17",
  "run_id": "run-42",
  "attempt_id": "attempt-2",
  "sequence": 8,
  "kind": "tool_result",
  "component": "tool-executor",
  "span_id": "span-tool-3",
  "parent_span_id": "span-loop-1",
  "causation_id": "evt-tool-request",
  "occurred_at": "<UTC ISO-8601>",
  "elapsed_ms": 128.4,
  "run_revision": 5,
  "identity": {"config": "sha256:...", "tool_schema": "sha256:..."},
  "data": {"call_id": "call-3", "result_hash": "sha256:...", "reused": false},
  "redaction": {"policy_version": "redact-v3", "status": "applied"}
}
```

这是目标设计，不是当前 `trace.json` 已实现字段。`event_id` 用于去重，`sequence` 用于单 run 缺口检测，span（跨度）表示一段操作，`parent_span_id` 表示嵌套，`causation_id` 指向直接触发事件；四者职责不同。

正文和大型 ToolResult 不必直接放进事件。事件保存受控摘要、大小、MIME/type、content hash 和访问受限的 artifact reference；公开层再按许可提供派生副本。Hash 能证明字节身份，不能自动隐藏低熵个人信息。

### 每个边界至少有请求、决定与结果

| 边界 | 发起/输入事件 | 决定/结果事件 | 必需诊断字段 |
| --- | --- | --- | --- |
| Model | `model_request` | `model_response/action_parsed` | model/config、request/response ID、token/费用状态、parser version |
| Policy | `policy_requested` | `policy_allowed/denied/needs_approval` | policy hash、主体、能力、参数摘要、理由 |
| Approval | `approval_requested` | `approved/denied/expired/cancelled` | approver role、scope、revision、deadline |
| Tool | `tool_requested/started` | `tool_result/error/unknown` | call/idempotency key、参数 hash、attempt、receipt |
| Validator | `validation_started` | `validation_passed/failed/invalid` | validator/version、artifact hash、assertions、exit code |
| Controller | `transition_requested` | `run_stopped` | from/to revision、reason、terminal evidence refs |

不是每个系统都需要这些名字，但必须覆盖语义。只记录成功结果会丢失排队、拒绝和未知结果；只记录请求又无法证明执行或验收。

## 顺序、时间与因果

`sequence` 应在单个 run 内连续且单调，用于检测缺失和乱序；相对 `timestamp_ms` 用于计算该 run 内耗时。跨机器墙上时间可能漂移，不能只按 timestamp 推断因果。分布式调用要同时保存 parent/span 或明确的 request/result 引用。

并发事件没有天然的唯一全序。正确做法是保留各分支局部顺序和因果边，而不是让日志接收时间伪装成执行顺序。迟到结果要记录原 call ID、目标 run revision 和是否被接受；已取消 run 收到成功工具响应，也不能悄悄改写为 completed。

时间至少区分：

- queue wait：等待 worker 或配额；
- model latency：provider/adapter 调用；
- policy/approval wait：本地策略与人工等待；
- tool latency：实际执行与重试退避；
- validation latency：测试、judge 或业务验收；
- end-to-end：从 run 接受到终态。

只报告总时长无法定位瓶颈；把并行子任务时长相加也不等于墙钟延迟。

### 并发只有偏序，不一定有全序

Partial order（偏序）表示某些事件存在先后因果，互不依赖的分支则没有唯一顺序：

```text
root model_action
├─ child-A tool_request → tool_result ─┐
└─ child-B tool_request → retry → result ─┤
                                          └─ join → validator → terminal
```

接收器先看到 child-B，不表示 B 先发生；墙上时间更早也可能来自时钟漂移。每个分支保留局部 `sequence`，跨分支用 span/parent、causation ID、join input IDs 和 revision 建因果图。Join 事件列出实际消费了哪些子结果、哪些缺失或被取消，不能只写“合并完成”。

`occurred_at` 是组件记录的墙上时间，便于跨系统查询；`observed_at` 是采集器收到时间，能诊断传输延迟；`elapsed_ms` 来自单调时钟，适合进程内耗时。三者不能互换。跨进程关键路径由因果图计算，不按 timestamp 简单排序。

Streaming（流式）响应还需 chunk index、response ID、累计 usage 和完成/中断原因。网络断开后收到部分文本不等于完整 Action；parser 必须记录使用了哪些 chunk 和为何接受终态。

## 指标如何从事件推导

指标先写清分子、分母、单位和缺失语义：

- **结果**：任务成功数/有效任务数、安全违规、验收分数；
- **过程**：step、model/tool call、重试、批准和取消；
- **资源**：各阶段延迟分布、token、费用、缓存命中；
- **可靠性**：timeout、恢复成功、重复副作用、迟到结果；
- **数据质量**：schema 拒绝、缺失事件、未知版本、fixture/config hash 缺失。

平均值会隐藏尾部延迟，应报告样本量与 P50/P90；成功率给出分子、分母和区间。`cost_usd=0` 在离线 E1 中表示没有真实费用，在 live run 中也可能表示采集缺失，必须由运行模式或 `usage_status` 区分，不能自动解释为免费。

Metric label（指标标签）保持低基数，例如 workload、status、failure class 和版本；不要把 run ID、原始 prompt、文件路径或错误全文放进时序指标标签。高基数身份留在 trace/artifact 中，通过 exemplar 或查询关联。

### 指标必须能回到事件不变量

推荐为每个派生指标保存查询/聚合版本、源事件范围和数据质量状态。可检查的不变量包括：

```text
每个 terminal run 恰有一个被接受的终态
每个 tool_result 能解析到同 run 的 tool_request/call_id
每个 policy_denied 后没有同 revision 的 handler start
每个 completed 终态能解析到 validator evidence
每个 retry 属于声明可重试错误且 attempt 不超过上限
每个 reused result 的 idempotency key 与参数 hash 相同
每个计划矩阵 = analyzed + excluded + invalid + missing
```

当前最小 lab 尚不满足全部不变量，例如没有 `tool_requested`、独立 `validator_result`、run revision 和跨进程 attempt。报告当前 checker 真正验证的子集，不要用目标不变量描述现有能力。

Metrics pipeline（指标管道）自身也要版本化。Failure taxonomy（失败分类）、timeout 是否计失败、P90 算法或成本换算变化后，新建聚合版本并重算受影响历史；旧 dashboard 留下版本边界，不能拼成一条无断点趋势。

### 单独度量遥测质量

业务指标绿色而观测数据缺失，不能说明系统健康。至少记录：

| 数据质量指标 | 含义 | 处理 |
| --- | --- | --- |
| dropped events | 缓冲/出口明确丢弃 | 标记受影响 run 不完整并告警 |
| duplicate event IDs | 重投或写入重复 | 幂等去重，保留重复计数 |
| sequence gaps | 单 run 事件缺口 | 不做完整因果结论 |
| orphan results | 结果找不到请求/父 span | 隔离并检查路由身份 |
| export lag | occurred 到 observed/persisted 延迟 | 不能把未到达当不存在 |
| unknown schema | reader 不理解版本 | 隔离，禁止静默删字段 |
| redaction failures | 脱敏未执行或异常 | 停止外发，限制访问 |
| identity missing | config/task/tool hash 缺失 | 降级或阻断可比较结论 |

为这些指标定义 SLO（服务级目标）时，说明适用事件和风险。安全拒绝、费用、批准和外部副作用事件通常要求比普通调试日志更强的完整性；“总体采集 99%”可能仍漏掉全部关键 1%。

## 从症状走到责任层

归因先区分责任层，再回到具体事件：

1. **Task/fixture**：目标、输入或验收是否自相矛盾？
2. **Context/instruction**：必要信息是否被选择、排序或截断？
3. **Model/provider**：动作是否错误，服务是否限流或超时？
4. **Adapter/protocol**：tool call、reasoning state、stream 或错误是否映射错误？
5. **Policy/approval**：允许、拒绝和授权目标是否正确？
6. **Tool/infrastructure**：工具、文件、网络、队列或依赖是否失败？
7. **Validator/reporting**：产物是否正确却被错判，或错误结果被放行？

总成功率下降只是症状。先按 failure class 分组，再抽取代表 trace 与基线对比。不要把 provider 5xx、fixture 缺失或 adapter bug 计入“模型不会做任务”，也不要因为最终结果正确就忽略中途越权尝试。

### 从聚合异常回到第一处分歧

一个可重复调查流程是：

1. 确认指标公式、分母、evaluator version 和 data freshness（数据新鲜度）；
2. 按 config/workload/failure class 切片，找变化首次出现的最小范围；
3. 从异常点的 exemplar（示例引用）进入具体 run，而不是随机翻日志；
4. 校验 task/config/fixture/environment identity，再按因果边重建事件；
5. 找 expected 与 observed 的第一处分歧，列出至少一个替代假设；
6. 用固定 replay 或替身隔离 Adapter、policy、Tool、validator；
7. 修复后重跑原失败、相邻正例和遥测丢失负例；
8. 重新生成受影响指标，并检查旧/新差异只来自预期修复。

Dashboard alert（仪表盘告警）只能定位症状和时间窗。Root cause（根因）必须由边界证据和区分性测试支持；“换了模型后恢复”最多说明新组合不同，不能证明原模型是唯一原因。

## 工作例：`read_file` 失败

一次 run 在第 4 步请求 `read_file`，policy 允许，工具返回路径不存在。仅保存最终回答只能看到任务失败；结构化轨迹则允许逐层判断：

1. `model_action` 证明模型选择了读取动作，但当前最小 trace 不保存完整参数；
2. 若 adapter 改写了路径，需要 adapter 边界的请求/规范化参数 hash 才能区分；
3. `tool_result` 或 `run_stopped` 保存工具错误分类和 call ID；
4. 与冻结文件清单对照，才能判断路径本就不存在还是工作区版本漂移。

因此“多记一段错误文本”不一定解决归因；缺失的是正确边界上的身份、版本和结构化字段。

## 隐私、脱敏与保留

默认记录完成归因所需的最少字段。Secret、个人路径、私人输入、原始 live trace 和完整工具输出不进入公开结果。脱敏要覆盖键名、值模式、嵌套对象、异常文本、stdout/stderr 和文件名；机器扫描后仍需人工抽查可逆标识。

Hash 不是匿名化。低熵邮箱、路径或账号可被字典反推；若只需关联，可使用受控密钥的 HMAC、短期映射 ID 或聚合类别。公开前还要检查多个“无害”字段组合后是否能重新识别个人或客户。

保留策略按用途分层：安全事件和失败 trace 可保留更完整但访问更严；成功 run 可采样或只保留聚合；调试日志设置短 TTL。影响审计、费用或业务副作用的事件不能因采样被全部丢弃。删除请求还要覆盖对象存储、索引、缓存、导出和备份生命周期。

### 采样不是随意丢弃

全量保存所有成功 run 可能成本过高，也扩大敏感数据面。先按证据义务分层：

- 安全、批准、费用、外部写入、未知结果和事故相关事件默认完整保留；
- 失败、timeout、重试、恢复和高延迟 run 保留可诊断 trace；
- 常规成功 run 可按 workload/config 分层抽样，同时保留聚合计数；
- 原始 prompt/ToolResult 即使被抽中，也先经过许可、最小化和脱敏。

Head sampling（头部采样）在 run 开始时决定，成本可控但可能错过后来失败；tail sampling（尾部采样）在观察到终态/高延迟后决定，诊断价值高但需要短期缓冲。两者都记录 sampling policy/version 和 inclusion probability（纳入概率）；否则样本不能正确还原总体。

采样器不能让 candidate 与 baseline 获得不同保留概率后直接比较。若只保留失败 trace，不能从 trace 文件行数计算失败率；分母必须来自未采样的稳定计数或带权记录。

Retention（保留）与 sampling 分开：采样决定是否纳入，保留决定保存多久。Legal hold（法务保留）、用户删除、密钥轮换和事故取证可能覆盖常规 TTL，但都要记录范围与权限，不能由调试人员随意延长所有数据寿命。

## Schema 演进与采集故障

事件 schema 必须版本化。新增可选字段通常可向后兼容；改名、语义变化或枚举删除需要迁移器或新版本。读取器遇到未知版本应隔离并告警，不能静默丢字段后继续计算指标。

观测系统本身也会失败：队列阻塞、导出超时、时钟异常、重复事件和 redaction 异常都要有计数与降级策略。安全原则是“业务动作不能依赖成功上传敏感 trace 才能停止”，但关键审计写入失败时，也不能假装运行拥有完整证据。

### 采集失败时怎样降级

Backpressure（背压）出现时按事件等级处理：低价值 debug log 可限速或采样；关键 policy/approval/tool receipt 写入失败时，外部高风险动作应失败关闭或进入人工，而不是先执行再希望日志稍后补上。具体策略由业务风险决定，但必须预先声明。

本地缓冲需要大小/时间上限、加密、进程崩溃恢复和磁盘耗尽行为。无限缓冲会把观测故障变成业务故障；静默覆盖旧关键事件又会破坏审计。Exporter（导出器）重试使用独立预算和幂等 event ID，不能与业务 Tool 重试共用同一个“成功”状态。

Redaction（脱敏）失败属于数据出口故障。未脱敏事件不应自动退回“原样发送以免丢日志”；应留在受控隔离区，发出不含敏感正文的错误计数。观测系统的错误日志也要避免再次打印原 payload（载荷）。

Reconciliation（对账）定期比较 controller 状态、事件高水位、目标系统 receipt 和聚合分母。发现 `completed` 无 validator、tool result 无请求、外部对象存在但本地未知时，生成明确的修复事件或新派生状态，不篡改原事件。

## 可观测设计复核清单

在实现前逐项回答：

- 谁生成 task/run/attempt/call/span/idempotency 身份，能否被模型改写？
- 每个信任边界是否同时保存输入身份、决定和结果/未知状态？
- 并发、join、取消、恢复和迟到结果怎样表达因果与 revision？
- 哪些字段是权威事实，哪些能从事件重算？冲突时如何停止传播？
- 指标的分子、分母、缺失、采样权重和聚合版本是否公开？
- 哪些事件永不抽样，哪些内容默认不采集，保留/删除怎样传播？
- Export、redaction、时钟、队列和 schema 失败时系统如何降级？
- 第三方能否只凭脱敏 artifact 定位第一处分歧，又不获得不必要数据？

清单通过只说明设计问题有答案；仍需要 schema 负例、故障注入、干净环境重放和真实 surface 的独立证据。

## 用当前 Lab 验证

前置条件是 Node.js 22+、Python 3.11+、`uv 0.11.16`，依赖已由 `package-lock.json` 和 `uv.lock` 安装并进入本地 cache。下面使用 fake adapter 与内存工具，不联网、不读取凭据：

```bash
uv run --frozen --offline pytest -q lab/tests/test_loop.py::test_normal_completion_and_structured_trace lab/tests/test_memory_context_trace.py::test_trace_redacts_secret_values_paths_and_tool_results
```

预期两个测试通过。第一个断言 sequence 连续和结构化终态，第二个断言 token、Authorization 值和示例个人路径不会进入序列化结果。失败时保留输出，分别检查 `TraceRecorder.record` 的顺序/单调时钟和 `redact` 的键/值递归；不要用删除断言或隐藏异常恢复绿色。

再运行刚才诊断章节使用的结构化事件练习：

```bash
npm run debug:workshop
```

预期退出码为 0、`offline=true`、`passed=true`。三个 case 的 trace 应分别显示：

```text
adapter:    run_started → run_stopped
permission: run_started → model_action → policy_denied → run_stopped
retry:       run_started → model_action → retry → retry → tool_result
             → checkpoint → model_action → tool_result → checkpoint
             → model_action → run_stopped
```

关键断言不是事件越多越好：Adapter 坏值在 `model_action` 前失败；policy 拒绝后没有 `tool_result` 且 handler 次数为 0；retry 路径为两个暂时错误、一次真实 tool call、一次幂等复用和一次副作用。完整 expected/observed 与失败 canary 见[问题诊断工作坊](/practice/debugging)。

这些命令只向终端输出并可能创建被忽略的测试缓存，没有业务数据需要清理；缓存可保留复用，不应清理工作区其他文件。若为了练习修改实现，先查看精确 diff，只还原自己改动的文件。完整回归使用 `uv run --frozen --offline pytest`。

这些测试和工作坊提供 E1：证明固定输入下的事件顺序、三条责任边界和有限脱敏规则，不证明 live provider trace 完整、所有秘密都可识别、分布式因果正确、采样可还原总体或线上指标可用。

## 自检与下一步

第三方能否仅凭 task/config、trace 和产物重建一次失败，并区分模型、adapter、policy、tool 与 validator？哪些字段对归因必需，哪些原始内容没有必要保存？到[评测报告](/evaluation/reporting)学习聚合，在[测试策略](/implementation/testing)加入采集失败与脱敏负例，并用[多 Agent 编排](/foundations/multi-agent)扩展跨 run 因果链。
