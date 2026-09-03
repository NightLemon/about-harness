# LangGraph：用显式状态图约束长运行 Agent

官方来源：[LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)，核对日期：2026-08-20。

官方 overview（核对 2026-08-20）将 LangGraph 描述为构建长运行、有状态 Agent 的 low-level orchestration framework/runtime（低层编排框架/运行时），强调 durable execution（可恢复执行）、streaming（流式事件）、human-in-the-loop（人在回路），以及确定性步骤与 LLM（大语言模型）步骤混合。[FACT:langgraph-overview] 这是 E0 产品事实；具体 API 与目标版本仍需安装后验证。

## 学习目标与选择问题

读完本页，你应能从业务状态机设计 Graph（图）、node（节点）和 edge（边），区分模型判断与确定性控制，设计 checkpoint（检查点）、interrupt（中断）和并行合并的责任，并解释为什么“可恢复执行”仍不等于外部副作用恰好一次。

先判断任务是否真的需要图：若流程只有一次模型调用或线性两三步，普通函数更易读；若状态转换、分支、循环、暂停/恢复和人工关口是问题核心，显式图才可能降低隐式控制复杂度。不要为了展示节点图把一个函数机械拆成十个节点。

## 从状态 schema 开始，而不是先画箭头

State（状态）是节点之间的公共契约。先定义字段，再决定 Graph：

```text
identity   task_id / run_id / config_version / subject
input      normalized request / fixture_ref
progress   current_phase / attempts / completed_items
evidence   claims / source_ids / tool_receipts / artifacts
control    budgets / cancel / approval / stop_reason
result     candidate_output / validation / residual_errors
```

每个字段注明 type、owner、默认值、可空性、来源、敏感级别和合并规则。模型节点不能改预算、批准结果或身份；工具节点不能直接宣告业务完成；validator 节点不应补造缺失证据。

State schema 要版本化。恢复旧 checkpoint 时显式迁移或拒绝，不能让新代码把未知字段静默当默认值。大正文、二进制和完整 trace 使用 artifact reference（产物引用），不要在每个 state snapshot 中复制。

## Node 是责任边界

Node（节点）应有窄输入、结构化输出和明确副作用：

| 节点类型 | 适合职责 | 主要断言 |
| --- | --- | --- |
| 确定性 pure node | 规范化、schema、排序、计算、路由条件 | 相同输入得到相同输出，无副作用 |
| Model node | 提取、综合、候选计划、语言生成 | model/config 身份固定，输出先校验 |
| Tool node | 文件/API/数据库动作 | policy 在前，timeout/幂等/回执完整 |
| Validator node | 测试、引用、业务验收 | 独立于生成，失败不会写 completed |
| Human gate | 高风险决定或主观评审 | 批准绑定 state/action hash 与身份 |

“一个节点做所有事”难以测试和恢复；“每行代码一个节点”则制造序列化与迁移负担。边界应围绕故障分类、权限、可重试性和状态所有权划分。

## Edge 必须说明为什么继续

Edge（边）表达状态转换，不只是执行顺序。每条条件边应互斥或有显式优先级，并覆盖 default/failure 路径：

```text
collect
  ├─ sources_valid=false ─► refuse
  └─ sources_valid=true  ─► extract
extract
  ├─ evidence_gap & budget_left ─► collect_more
  ├─ evidence_gap & no_budget    ─► insufficient
  └─ claims_ready                ─► validate
validate
  ├─ passed ─► complete
  └─ failed ─► revise 或 failed（有限次数）
```

循环同时需要业务条件与全局 `max_steps/deadline/cost`。只写“未完成就继续”会在证据永远不足时无限搜索。路由决策应进入 trace，包含被评估字段、选择的 edge 和剩余预算。

## 确定性与模型步骤混合

把能机械判断的内容留给代码：URL/ID 格式、schema、版本排序、金额、引用可解析性、预算和权限。模型适合处理开放文本的提取与综合，但输出仍通过 typed schema（类型化契约）进入 state。

确定性节点通过不证明模型结论正确；模型产生流畅答案也不证明引用、数值或副作用正确。最终 `complete` 应由业务 validator 读取真实 artifact/ToolResult 判定，而不是由模型文本或“到达末节点”自动推导。

## Reducer 与并行合并

并行分支写同一 state key 时，需要 reducer（归并函数）。“最后写入获胜”只适用于明确可覆盖的字段；证据集合、错误与预算通常需要保留全部来源。

一个安全 claim reducer 至少检查：

- 相同 source ID 是否重复或版本冲突；
- 同一 claim 的不同 value 是否保留为 conflict；
- 输入顺序改变时结果是否仍确定；
- 重放同一分支是否幂等；
- 合并后 provenance（来源）与分支错误是否仍可定位。

并行只是缩短关键路径的候选，不会自动降低总 token/cost。若分支共享可变资源，还需锁、条件更新、隔离 worktree 或业务层并发控制。

## Checkpoint 与 durable execution 的边界

Checkpoint（检查点）保存控制/Adapter 状态，使 run 能从已知位置恢复。至少包含 Graph/state schema 版本、node/edge 位置、累计预算、模型连续状态、待批准 Action、工具幂等键和 artifact/receipt 引用。

它不能单独证明外部动作没发生。最危险窗口是：“Tool 已成功，业务系统保存了写入，本地 checkpoint 尚未提交”。恢复时若只看本地状态，会重复发送。安全顺序是先记录 intent，用稳定幂等键执行，保存外部 receipt（回执），再提交包含 receipt 的 checkpoint；结果未知时先查询外部系统。

Durable execution 表示可设计恢复，不等于 exactly-once（恰好一次）、分布式事务或自动补偿。邮件无法撤回，支付反向操作也可能失败；不可逆动作应在执行前预览和批准。

## Interrupt 与人工关口

Interrupt（中断/暂停）适合等待人工批准、补充输入或外部事件。暂停状态仍受取消和有效期管理；恢复时重新核对 Task、目标资源、参数 hash、批准身份和剩余预算。迟到批准不能复活 cancelled/failed run。

人工反馈要结构化：approve、reject、edit/replace、reason、actor、timestamp、action hash。若 reviewer 修改候选，原 validator 结果与批准都失效，需要重新验证。低风险只读节点不必逐步中断，避免 approval fatigue（审批疲劳）。

## Streaming 与最终状态不同

Streaming event（流式事件）可用于 UI、进度和调试，但中间 token、node start 或 tool proposed 都不是最终事实。消费者要按 run/node/event ID 去重和排序，处理断线重连与迟到事件。

`completed` 事件必须在 validator 和状态提交后发出；若流中先展示候选文本，UI 应标为 draft（草稿）。Trace 保存必要结构和 artifact 引用，不默认公开 prompt、源码和 ToolResult。

## 工作例：有冲突来源的研究任务

项目建议把研究任务设计为：

```text
collect → normalize → extract → compare → validate → decide
   ▲                      │                       │
   └── gap + budget ──────┘                       ├─ answered
                                                  ├─ conflict-review
                                                  └─ insufficient
```

State 保存 query、source ID/version、claims、citations、conflicts、预算和 review decision。模型只在开放文本提取与综合中出现；source ID 唯一性、版本、引用、冲突数量和停止条件由确定性节点处理。证据不足走 `insufficient`，不能循环到“搜出想要答案”。

并行提取的 reducer 保留同一 claim 的不同值。Validator 逐 claim 检查 citation 能解析到允许 source。需要人工裁决冲突时 interrupt 绑定当前 state hash；新来源进入后旧决定不自动沿用。

## 失败归因

| 症状 | 首查 | 回退 |
| --- | --- | --- |
| 无限循环 | edge 条件、状态更新、全局预算 | 停止并保存 state/route trace |
| 节点重复执行 | checkpoint 位置、retry 与幂等 | 对账 Tool receipt，不盲重放 |
| 并行结果吞掉冲突 | reducer/默认覆盖 | 回到串行基线，修合并测试 |
| 恢复后 schema 错 | state/checkpoint 版本迁移 | 拒绝旧快照或显式迁移 |
| 取消后仍写入 | cancel 传播与迟到 ToolResult | 标记副作用，执行补偿/人工处理 |
| 到达末节点却答案错 | validator/termination | 不写 completed，保留失败 artifact |
| Interrupt 恢复到旧目标 | approval hash 与资源版本 | 使旧批准失效，重新确认 |

修复应增加 node unit test、edge transition test、reducer 顺序/重复负例和 checkpoint 前后故障注入。不要通过加大 step budget 或吞掉 conflict 让图结束。

## 评测与采用门槛

先建立纯 Python 状态机或单 Agent baseline。固定 Task、model/provider、工具、权限、预算和起点，只比较 LangGraph 编排。除了任务成功率，还记录 node/model/tool calls、state/checkpoint 大小、P50/P90、恢复时间、重复副作用、人工中断和失败归因率。

采用前至少满足：

- Graph/state schema、LangGraph 与依赖版本已固定；
- 每个 node/edge/reducer 有责任、类型、失败和测试；
- terminal state、预算、取消与 interrupt 恢复无死路；
- Tool node 经统一 policy，写操作有幂等/对账；
- Checkpoint 升级、损坏和目标版本冲突会 fail closed；
- Trace 脱敏，state/Session/Artifact 有保留删除策略；
- 业务 validator 独立于 Graph 是否走到结束；
- 更简单 baseline 与 rollback 配置可重建。

## 在本项目运行离线职责接缝

当前仓库不安装 LangGraph，不导入其 runtime，也不调用 provider 模型。`lab/src/about_harness/integrations/langgraph.py` 只是命名为 LangGraph 的确定性职责示例：它校验 query/source，按 claim 汇总 value，保留冲突与 citation，并返回 `mode=offline-contract-seam`。

前置条件是 Python 3.11+、`uv 0.11.16`、Node.js 22+ 和锁定依赖。在仓库根目录离线运行：

```powershell
uv run --frozen --offline python -c "import importlib.util as u; assert u.find_spec('langgraph') is None"
uv run --frozen --offline python scripts/run-labs.py research
npm run facts:check
```

预期全部退出 0：第一条证明锁定环境无 `langgraph` 包；研究案例为 `passed=true`、`offline=true`、`evidence=E1`，保留 `retention_days` 的两个冲突值/来源，`review_required` 为 supported；事实检查验证官方来源登记。随后人工确认兼容矩阵仍把 Offline seam 与 Live evidence 分列，且 live 为 `untested`。

这里的 E1 只证明纯 Python 转换和固定负例，不执行 Graph/node/edge/checkpointer/interrupt/streaming，也不验证目标 LangGraph 版本或模型质量。文件名、输出中的 `integration=LangGraph` 和命令成功都不能升级为“已接入 LangGraph”。

若包意外可导入、研究 fixture 需要网络/credential、冲突被丢弃或事实/人工矩阵核对把 seam 写成 live，停止结论。不要安装包、配置真实 key 或改 expected 迎合输出。命令只读 fixture，并可能产生 cache；误改时检查：

```powershell
git diff -- pyproject.toml uv.lock lab/src/about_harness/integrations/langgraph.py lab/fixtures/research docs/frameworks/langgraph.md docs/references/compatibility.md
```

只恢复自己的变更，保留当前纯 Python、offline/live-disabled baseline。

## 检查题与下一步

1. 为什么应先定义 state schema，再画 node 和 edge？
2. Reducer 用“最后写入获胜”会怎样丢失来源冲突？
3. Checkpoint 成功为什么不能证明外部副作用没有重复？
4. Interrupt 恢复时为什么要重新核对 Action hash 与预算？
5. 当前 research E1 命令能证明什么，不能证明什么？

先运行[研究案例](/labs/research)，再读[状态与可靠执行](/foundations/state-reliability)和[可观测性](/foundations/observability)，最后按[Framework 对照](/frameworks/comparison)与更简单 baseline 比较。
