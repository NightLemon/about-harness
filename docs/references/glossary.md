# 术语表

| 术语 | 本项目中的含义 |
| --- | --- |
| Agent | 围绕目标进行多步观察、决策、行动和反馈的系统行为体 |
| Harness | 承载并约束 agent 循环的运行环境，包含上下文、工具、权限、状态和反馈 |
| Agentic loop | 观察—决策—行动—读取结果—继续/完成的循环 |
| Task | 一次运行要解决的问题及其输入、权限、预算、验收和停止条件；不等同于一段 prompt |
| Action | 模型或控制器提出的结构化候选动作；只有通过契约与策略并由 handler 执行后才产生副作用 |
| Observation | 工具、环境或用户返回给循环的结构化观察；它是后续输入，不因来自工具就自动可信 |
| ToolCall / ToolResult | 工具调用意图与执行结果的配对记录；ToolCall 出现不表示动作已执行 |
| Context window | 模型单次推理可接收的有限 token 空间；不等于长期记忆 |
| Token | 模型处理文本/代码的计量片段，不等同于字或字符；计费与上下文常以它计量 |
| Context engineering | 选择、组织、检索、压缩和隔离模型当前所见信息的工程 |
| Compaction | 将较早会话有损摘要以释放上下文的过程 |
| Tool calling | 模型输出结构化调用意图，由 harness 校验与执行 |
| Schema | 对工具参数或数据字段的结构、类型与约束定义 |
| MCP | Model Context Protocol，连接 host/client 与外部 server 的开放协议 |
| Skill | 可按需发现和加载的工作流/领域知识包，通常以 `SKILL.md` 为核心 |
| Hook | 在生命周期事件上确定性执行的程序化规则 |
| Extension/Plugin | 扩展工具、循环、UI、外部接入或可分发能力的代码/资源包；各产品含义有差别 |
| Subagent | 在独立上下文、角色或工具权限中承担边界任务的 agent |
| Sandbox | 在操作系统或执行层限制文件、网络、进程等能力的隔离环境 |
| Approval | 在有副作用动作执行前由用户或策略授权 |
| Policy | 在模型之外根据身份、动作、资源和状态做 allow/ask/deny 决定的规则与执行点 |
| Allowlist | 只允许预先列出的命令、工具、路径或域；未列出的默认拒绝/审批 |
| Dry-run | 只预览计划或校验输入，不提交真实副作用的运行方式 |
| Provider | 实际提供模型 API/推理服务的供应方或适配层 |
| Adapter | 把某 provider 的消息、工具调用、流式事件和错误映射为 harness 内部格式的适配层 |
| Surface | 同一产品的 CLI、IDE、桌面、Web、云端等交互或执行表面；默认值与能力可能不同 |
| Host | 承载 MCP client、模型调用和工具策略的 agent 应用，例如 Codex 或 Claude Code |
| Runtime/controller | 维护循环状态并决定继续、重试、压缩、暂停或结束的 harness 组件 |
| Reasoning effort | Harness/API 给模型分配的推理深度/预算档位；不同模型不可直接等量比较 |
| Task contract | 目标、上下文入口、边界与完成条件组成的可执行任务描述 |
| Fixture | 可重复测试/评测的固定起始仓库、数据和环境 |
| Fixture lineage | 用不可变 commit、path 和 hash 把 Task、fixture 与 Run 连接起来的来源链 |
| Replay | 用保存的固定输入或事件重放执行路径；能提高可重复性，但不等同于 live 环境 |
| Live adapter | 默认关闭、显式获准后才连接真实 Provider 或外部系统的适配路径 |
| Run | 某一任务在某一配置下的一次独立执行；同一任务的多个 run 不是多个不同任务 |
| Config identity | Model、Provider、Adapter、Harness、参数、指令、工具与策略共同构成的可复核配置身份 |
| Rubric | 把主观质量拆为具体维度和分值/判定标准的评分规程 |
| Holdout set | 调优时不可见、只用于最终检验泛化的保留任务集 |
| Evaluator | 检查输出或轨迹的程序、规则、模型或人工评审者 |
| Validator | 根据 Task acceptance 独立判定业务结果的检查器；不应只采信执行 Agent 的完成声明 |
| Oracle | 测试中用于判断正确答案或合法行为的依据；错误 oracle 会让绿色测试产生错误结论 |
| Acceptance | 任务成功必须满足的可观察条件；可包含结果、过程和安全否决项 |
| Artifact | 可保存和引用的运行产物，如日志、截图、diff、构建包或结果 JSON |
| Trajectory/trace | 一次 agent 运行中的消息、工具调用、结果、状态与决策轨迹 |
| Checkpoint | 支持暂停或恢复的结构化状态快照；必须区分已知状态与尚未对账的外部副作用 |
| Idempotency key | 让外部系统识别同一逻辑操作、防止重试重复提交的稳定标识 |
| Unknown outcome | 调用超时或连接中断后无法确认副作用是否发生的状态；应先对账，不自动重试 |
| Stop reason | 运行结束、暂停或失败的结构化原因，例如 completed、budget_exhausted、denied 或 invalid_action |
| Failure classification | 把失败归入 contract、context、protocol、policy、tool、state、validator、model 或 infrastructure 等责任层 |
| Worktree | Git 提供的独立工作目录，可让并行任务避免写同一 checkout |
| P50 / P90 | 分位数；P50 是中位数，P90 表示 90% 样本不超过该值，需同时报告样本量 |
| pass@k / best-of-k | 运行/采样 k 次至少一次成功的指标，不等同于单次成功率 |
| Wilson interval | 二元成功率的小样本区间估计方法；区间宽说明不确定性大 |
| Prompt injection | 不可信内容试图被当作高优先级指令，诱导越权或偏离目标 |
| E0 | 没有仓库实验记录；它只描述实验强度，不表示来源是否已核验 |
| E1 | 固定 fixture、fake、replay 或本地路径提供的确定性离线证据，只证明流程与约束 |
| E2 | 锁定模型 ID、provider、adapter、harness、配置和日期的真实环境有限烟测 |
| E3 | 达到任务量、重复、holdout、预注册、安全与成本门槛的正式比较证据 |
| Evidence level | 对实验强度的 E0–E3 标记；它与来源状态独立，级别高低也不替代适用范围说明 |
| Source status | 对引用事实来源状态的标记，如 verified、pending、conflict、retired；不等于实验等级 |
| Evidence boundary | 一条证据能够支持和明确不能支持的结论范围，包括 workload、版本、surface、配置与时间 |
| Promotion gate | 配置进入下一阶段前预先规定的资格、安全、质量与成本条件；不是为了让所有历史结果看起来成功 |
| Result commit | 某次里程碑或 review 修正并验证后的不可变 Git commit |
| Annotated tag | 含 tagger、日期和说明对象的 Git tag；本项目用它绑定 baseline/result 与证据 |

产品可能对同一词使用更窄或不同定义。引用产品行为时以对应官方文档为准。

需要学习顺序时回到[知识地图](/guide/roadmap)；遇到同名产品能力时用[兼容性矩阵](/references/compatibility)核对责任。
