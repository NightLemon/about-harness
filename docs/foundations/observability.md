# 可观测性与故障归因

Observability（可观测性）让外部人员根据系统留下的信号，重建“收到什么任务、模型建议什么、harness 允许并执行什么、结果怎样验证、为何停止”。它不是把所有原始对话永久保存，也不是仪表盘数量；关键是证据能否回答一次具体运行发生了什么。

Telemetry（遥测）是系统输出的 轨迹、metric、log 和 artifact 元数据；可观测性是利用这些信号回答未知问题的能力。采集很多字段不等于可观测：若缺少身份、因果边或验收结果，日志再多也无法定位第一处分歧。

<span id="学习目标"></span>
<span id="事件信封与当前-schema"></span>
<span id="生产事件信封应回答什么"></span>
<span id="每个边界至少有请求、决定与结果"></span>
<span id="每个边界至少有请求决定与结果"></span>
<span id="可观测设计复核清单"></span>
<span id="用当前-lab-验证"></span>
<span id="自检与下一步"></span>

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

观测字段跨越信任边界时同时记录“边界前”和“边界后”：供应方 原始响应的受控 hash、Adapter（适配器） 生成的 Action（动作提议）、policy 实际判断、Tool 工具处理函数 收到的规范化参数和目标系统回执。只记录其中一侧，无法区分上游提出错误还是中间映射错误。

<span id="tracemetric-与-artifact-各负其责"></span>

## Trace、Metric 与 Artifact 各负其责

| 信号 | 回答的问题 | 适合内容 | 不适合替代 |
| --- | --- | --- | --- |
| Trace（轨迹） | 一次 run 按什么因果链执行？ | 有序事件、调用关系、错误与状态转换 | 跨大量 run 的趋势 |
| Metric（指标） | 系统整体是否变化或越过阈值？ | 计数、分布、比例、资源用量 | 单次失败的完整上下文 |
| Log（日志） | 组件在某时刻补充了什么诊断？ | 结构化错误、运行环境、调试字段 | 无关联 ID 的自由文本历史 |
| Artifact（产物） | 哪个输入或输出可被再次检查？ | task、配置、补丁、结果、hash、测试报告 | 动态执行顺序 |

最终答案只是一个产物。若缺少轨迹与验收 artifact，无法判断“结果错误”来自模型决策、适配器 映射、权限策略、工具执行还是验证器。

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

身份字段必须从 控制器 生成并逐层传递，不能让模型自由改写。配置、指令、fixture、工具 schema 和代码版本用独立 ID/hash 绑定；只有 run ID 而没有输入版本，仍无法复现。

<span id="不要混淆四种同一次"></span>

### 不要混淆四种“同一次”

| 标识 | 表示什么 | 重试/恢复时是否复用 |
| --- | --- | --- |
| `run_id` | 一次控制循环或持久运行身份 | 按状态协议决定，不能随意新建掩盖历史 |
| `attempt_id` | 基础设施或执行尝试 | 每次尝试新建，并指向原 attempt/run |
| `call_id` | 一次协议请求/响应关联 | 每次调用唯一，响应必须回到同一 ID |
| `idempotency_key` | 同一业务意图的去重身份 | 安全重试时复用，并绑定参数 hash/作用域 |

`call_id` 相同不能自动证明业务动作相同，`idempotency_key` 相同也不能替代请求/响应关联。多租户或多环境下，幂等键至少绑定主体、工具、规范化参数和目标环境；否则相同短 key 可能错误复用别人的结果。

恢复路径还要有 `checkpoint_id`、检查点 version、resume generation 和前一事件 high-water mark（最高已提交序号）。新 worker 只能在预期 revision 上继续，迟到的旧 worker 事件要标为 rejected/stale，不能进入当前终态。

<span id="顺序时间与因果"></span>

## 顺序、时间与因果

`sequence` 应在单个 run 内连续且单调，用于检测缺失和乱序；相对 `timestamp_ms` 用于计算该 run 内耗时。跨机器墙上时间可能漂移，不能只按 timestamp 推断因果。分布式调用要同时保存 parent/span 或明确的 request/result 引用。

并发事件没有天然的唯一全序。正确做法是保留各分支局部顺序和因果边，而不是让日志接收时间伪装成执行顺序。迟到结果要记录原 call ID、目标 run revision 和是否被接受；已取消 run 收到成功工具响应，也不能悄悄改写为 completed。

时间至少区分：

- queue wait：等待 worker 或配额；
- model latency：供应方/适配器 调用；
- policy/approval wait：本地策略与人工等待；
- tool latency：实际执行与重试退避；
- validation latency：测试、judge 或业务验收；
- end-to-end：从 run 接受到终态。

只报告总时长无法定位瓶颈；把并行子任务时长相加也不等于墙钟延迟。

<span id="并发只有偏序不一定有全序"></span>

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

Streaming（流式）响应还需 chunk index、response ID、累计 usage 和完成/中断原因。网络断开后收到部分文本不等于完整 动作提议；parser 必须记录使用了哪些 chunk 和为何接受终态。

## 指标如何从事件推导

指标先写清分子、分母、单位和缺失语义：

- **结果**：任务成功数/有效任务数、安全违规、验收分数；
- **过程**：step、model/tool call、重试、批准和取消；
- **资源**：各阶段延迟分布、token、费用、缓存命中；
- **可靠性**：timeout、恢复成功、重复副作用、迟到结果；
- **数据质量**：schema 拒绝、缺失事件、未知版本、fixture/config hash 缺失。

平均值会隐藏尾部延迟，应报告样本量与 P50/P90；成功率给出分子、分母和区间。`cost_usd=0` 在离线 E1 中表示没有真实费用，在 live run 中也可能表示采集缺失，必须由运行模式或 `usage_status` 区分，不能自动解释为免费。

Metric label（指标标签）保持低基数，例如 工作负载、status、failure class 和版本；不要把 run ID、原始 prompt、文件路径或错误全文放进时序指标标签。高基数身份留在 轨迹/artifact 中，通过 exemplar 或查询关联。

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

当前最小 lab 尚不满足全部不变量，例如没有 `tool_requested`、artifact/业务 验证器 事件、run revision 和跨进程 attempt。报告当前 checker 真正验证的子集，不要用目标不变量描述现有能力。

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

1. **Task（任务）/fixture**：目标、输入或验收是否自相矛盾？
2. **Context（上下文）/instruction**：必要信息是否被选择、排序或截断？
3. **Model/供应方**：动作是否错误，服务是否限流或超时？
4. **适配器/protocol**：tool call、reasoning state、stream 或错误是否映射错误？
5. **Policy（策略）/approval**：允许、拒绝和授权目标是否正确？
6. **Tool/infrastructure**：工具、文件、网络、队列或依赖是否失败？
7. **Validator（验证器）/reporting**：产物是否正确却被错判，或错误结果被放行？

总成功率下降只是症状。先按 failure class 分组，再抽取代表 轨迹 与基线对比。不要把 供应方 5xx、fixture 缺失或 适配器 bug 计入“模型不会做任务”，也不要因为最终结果正确就忽略中途越权尝试。

### 从聚合异常回到第一处分歧

一个可重复调查流程是：

1. 确认指标公式、分母、evaluator version 和 data freshness（数据新鲜度）；
2. 按 config/工作负载/failure class 切片，找变化首次出现的最小范围；
3. 从异常点的 exemplar（示例引用）进入具体 run，而不是随机翻日志；
4. 校验 task/config/fixture/environment identity，再按因果边重建事件；
5. 找 expected 与 observed 的第一处分歧，列出至少一个替代假设；
6. 用固定 replay 或替身隔离 适配器、policy、Tool、验证器；
7. 修复后重跑原失败、相邻正例和遥测丢失负例；
8. 重新生成受影响指标，并检查旧/新差异只来自预期修复。

Dashboard alert（仪表盘告警）只能定位症状和时间窗。Root cause（根因）必须由边界证据和区分性测试支持；“换了模型后恢复”最多说明新组合不同，不能证明原模型是唯一原因。

<span id="工作例readfile-失败"></span>

## 工作例：`read_file` 失败

一次 run 在第 4 步请求 `read_file`，policy 允许，工具返回路径不存在。仅保存最终回答只能看到任务失败；结构化轨迹则允许逐层判断：

1. `model_action` 证明模型选择了读取动作，但当前最小 轨迹 不保存完整参数；
2. 若 适配器 改写了路径，需要 适配器 边界的请求/规范化参数 hash 才能区分；
3. `tool_result` 或 `run_stopped` 保存工具错误分类和 call ID；
4. 与冻结文件清单对照，才能判断路径本就不存在还是工作区版本漂移。

因此“多记一段错误文本”不一定解决归因；缺失的是正确边界上的身份、版本和结构化字段。

<span id="隐私脱敏与保留"></span>

## 隐私、脱敏与保留

默认记录完成归因所需的最少字段。Secret、个人路径、私人输入、原始 live 轨迹 和完整工具输出不进入公开结果。脱敏要覆盖键名、值模式、嵌套对象、异常文本、stdout/stderr 和文件名；机器扫描后仍需人工抽查可逆标识。

Hash 不是匿名化。低熵邮箱、路径或账号可被字典反推；若只需关联，可使用受控密钥的 HMAC、短期映射 ID 或聚合类别。公开前还要检查多个“无害”字段组合后是否能重新识别个人或客户。

保留策略按用途分层：安全事件和失败 轨迹 可保留更完整但访问更严；成功 run 可采样或只保留聚合；调试日志设置短 TTL。影响审计、费用或业务副作用的事件不能因采样被全部丢弃。删除请求还要覆盖对象存储、索引、缓存、导出和备份生命周期。

### 采样不是随意丢弃

全量保存所有成功 run 可能成本过高，也扩大敏感数据面。先按证据义务分层：

- 安全、批准、费用、外部写入、未知结果和事故相关事件默认完整保留；
- 失败、timeout、重试、恢复和高延迟 run 保留可诊断 轨迹；
- 常规成功 run 可按 工作负载/config 分层抽样，同时保留聚合计数；
- 原始 prompt/ToolResult（工具结果） 即使被抽中，也先经过许可、最小化和脱敏。

Head sampling（头部采样）在 run 开始时决定，成本可控但可能错过后来失败；tail sampling（尾部采样）在观察到终态/高延迟后决定，诊断价值高但需要短期缓冲。两者都记录 sampling policy/version 和 inclusion probability（纳入概率）；否则样本不能正确还原总体。

采样器不能让 candidate 与 基线 获得不同保留概率后直接比较。若只保留失败 轨迹，不能从 轨迹 文件行数计算失败率；分母必须来自未采样的稳定计数或带权记录。

Retention（保留）与 sampling 分开：采样决定是否纳入，保留决定保存多久。Legal hold（法务保留）、用户删除、密钥轮换和事故取证可能覆盖常规 TTL，但都要记录范围与权限，不能由调试人员随意延长所有数据寿命。

## Schema 演进与采集故障

事件 schema 必须版本化。新增可选字段通常可向后兼容；改名、语义变化或枚举删除需要迁移器或新版本。读取器遇到未知版本应隔离并告警，不能静默丢字段后继续计算指标。

观测系统本身也会失败：队列阻塞、导出超时、时钟异常、重复事件和 redaction 异常都要有计数与降级策略。安全原则是“业务动作不能依赖成功上传敏感 轨迹 才能停止”，但关键审计写入失败时，也不能假装运行拥有完整证据。

### 采集失败时怎样降级

Backpressure（背压）出现时按事件等级处理：低价值 debug log 可限速或采样；关键 policy/approval/tool receipt 写入失败时，外部高风险动作应失败关闭或进入人工，而不是先执行再希望日志稍后补上。具体策略由业务风险决定，但必须预先声明。

本地缓冲需要大小/时间上限、加密、进程崩溃恢复和磁盘耗尽行为。无限缓冲会把观测故障变成业务故障；静默覆盖旧关键事件又会破坏审计。Exporter（导出器）重试使用独立预算和幂等 event ID，不能与业务 Tool 重试共用同一个“成功”状态。

Redaction（脱敏）失败属于数据出口故障。未脱敏事件不应自动退回“原样发送以免丢日志”；应留在受控隔离区，发出不含敏感正文的错误计数。观测系统的错误日志也要避免再次打印原 payload（载荷）。

Reconciliation（对账）定期比较 控制器 状态、事件高水位、目标系统 receipt 和聚合分母。发现 `completed` 无 验证器、tool result 无请求、外部对象存在但本地未知时，生成明确的修复事件或新派生状态，不篡改原事件。


## 实践入口

[从完整离线案例观察这些责任](/practice/end-to-end)。实现范围、命令、预期断言和清理步骤在实验页维护。
