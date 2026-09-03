# 可观测性与故障归因

Observability（可观测性）让外部人员根据系统留下的信号，重建“收到什么任务、模型建议什么、harness 允许并执行什么、结果怎样验证、为何停止”。它不是把所有原始对话永久保存，也不是仪表盘数量；关键是证据能否回答一次具体运行发生了什么。

## Trace、Metric 与 Artifact 各负其责

| 信号 | 回答的问题 | 适合内容 | 不适合替代 |
| --- | --- | --- | --- |
| Trace（轨迹） | 一次 run 按什么因果链执行？ | 有序事件、调用关系、错误与状态转换 | 跨大量 run 的趋势 |
| Metric（指标） | 系统整体是否变化或越过阈值？ | 计数、分布、比例、资源用量 | 单次失败的完整上下文 |
| Log（日志） | 组件在某时刻补充了什么诊断？ | 结构化错误、运行环境、调试字段 | 无关联 ID 的自由文本历史 |
| Artifact（产物） | 哪个输入或输出可被再次检查？ | task、配置、补丁、结果、hash、测试报告 | 动态执行顺序 |

最终答案只是一个产物。若缺少轨迹与验收 artifact，无法判断“结果错误”来自模型决策、adapter 映射、权限策略、工具执行还是验证器。

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

## 指标如何从事件推导

指标先写清分子、分母、单位和缺失语义：

- **结果**：任务成功数/有效任务数、安全违规、验收分数；
- **过程**：step、model/tool call、重试、批准和取消；
- **资源**：各阶段延迟分布、token、费用、缓存命中；
- **可靠性**：timeout、恢复成功、重复副作用、迟到结果；
- **数据质量**：schema 拒绝、缺失事件、未知版本、fixture/config hash 缺失。

平均值会隐藏尾部延迟，应报告样本量与 P50/P90；成功率给出分子、分母和区间。`cost_usd=0` 在离线 E1 中表示没有真实费用，在 live run 中也可能表示采集缺失，必须由运行模式或 `usage_status` 区分，不能自动解释为免费。

Metric label（指标标签）保持低基数，例如 workload、status、failure class 和版本；不要把 run ID、原始 prompt、文件路径或错误全文放进时序指标标签。高基数身份留在 trace/artifact 中，通过 exemplar 或查询关联。

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

## Schema 演进与采集故障

事件 schema 必须版本化。新增可选字段通常可向后兼容；改名、语义变化或枚举删除需要迁移器或新版本。读取器遇到未知版本应隔离并告警，不能静默丢字段后继续计算指标。

观测系统本身也会失败：队列阻塞、导出超时、时钟异常、重复事件和 redaction 异常都要有计数与降级策略。安全原则是“业务动作不能依赖成功上传敏感 trace 才能停止”，但关键审计写入失败时，也不能假装运行拥有完整证据。

## 用当前 Lab 验证

前置条件是 Python 3.11+ 且依赖已由 lockfile 安装。下面使用 fake adapter，不联网、不读取凭据：

```bash
uv run --frozen --offline pytest -q lab/tests/test_loop.py::test_normal_completion_and_structured_trace lab/tests/test_memory_context_trace.py::test_trace_redacts_secret_values_paths_and_tool_results
```

预期两个测试通过。第一个断言 sequence 连续和结构化终态，第二个断言 token、Authorization 值和示例个人路径不会进入序列化结果。失败时保留输出，分别检查 `TraceRecorder.record` 的顺序/单调时钟和 `redact` 的键/值递归；不要用删除断言或隐藏异常恢复绿色。

本命令只创建测试缓存，无业务数据清理；需要清理时仅删除可重建的 `.pytest_cache/`。若为了练习修改实现，先查看精确 diff，只还原自己改动的文件。完整回归使用 `uv run --frozen --offline pytest`。

这些测试提供 E1：证明固定输入下的事件顺序和有限脱敏规则，不证明 live provider trace 完整、所有秘密都可识别、分布式因果正确或线上指标可用。

## 自检与下一步

第三方能否仅凭 task/config、trace 和产物重建一次失败，并区分模型、adapter、policy、tool 与 validator？哪些字段对归因必需，哪些原始内容没有必要保存？到[评测报告](/evaluation/reporting)学习聚合，在[测试策略](/implementation/testing)加入采集失败与脱敏负例，并用[多 Agent 编排](/foundations/multi-agent)扩展跨 run 因果链。
