# 逐页审核覆盖清单

初审为改写前状态；第二轮修复后结论已追加于下文。每行是完整阅读后的页面职责判断，非关键词统计。

| 文件 | 可读性 | 准确性 | 覆盖性 | 问题编号 | 实际阅读要点 |
| --- | --- | --- | --- | --- | --- |
| `AGENTS.md` | pass | pass | pass | — | 工程规则明确来源状态、E0–E3、离线默认与独立外部授权；作为约束保留。 |
| `CONTRIBUTING.md` | pass | pass | fail | R07 | 正确区分人工深度审阅与结构门禁；季度网络探针不足以覆盖30天高易变事实维护节奏。 |
| `README.md` | pass | pass | fail | R01, R09 | 快速开始、学习路径与六类离线案例完整；生态入口尚未建立。 |
| `docs/domains/browser.md` | pass | pass | pass | — | 以观察身份、导航门禁、提交确认、注入防护、profile 隔离和离线 fixture 说明浏览器任务。 |
| `docs/domains/coding.md` | pass | pass | pass | — | 以仓库冻结、最小变更、分层验证、diff 审查和回退覆盖编码 Agent 的完整闭环。 |
| `docs/domains/data.md` | pass | pass | pass | — | 聚焦数据契约、PII、来源、变换验证和离线 PydanticAI 职责接缝的限制。 |
| `docs/domains/document.md` | pass | pass | pass | — | 将文档解析、结构化主张、引用、渲染验证和公开产物脱敏分开处理。 |
| `docs/domains/research.md` | pass | pass | pass | — | 覆盖问题分解、来源分级、冲突保留、引用核验、停止条件与离线研究 case。 |
| `docs/evaluation/judges.md` | pass | fail | fail | A01, A02 | Rubric、校准、盲化和证据边界扎实；不确定性阈值方向错误，且重试与独立随机重采样没有形成可审计的互斥语义。 |
| `docs/evaluation/method.md` | pass | pass | pass | — | 九步研究流程、分母、E0-E3与当前样例限制一致。 |
| `docs/evaluation/metrics.md` | pass | pass | pass | — | 分析单位、区间、配对和样本流失说明准确。 |
| `docs/evaluation/regression.md` | pass | pass | pass | — | holdout污染、flaky规则、晋级和当前E1限制清楚。 |
| `docs/evaluation/reporting.md` | pass | pass | pass | — | 主张账本、公开包、脱敏、更正和复核链条完整。 |
| `docs/evaluation/task-schema.md` | pass | pass | pass | — | 对象所有权、谱系、不变量与演进策略完整。 |
| `docs/foundations/agent-loop.md` | pass | pass | pass | — | 清楚区分 retry、repair、replan，并把当前 E1 与目标设计分开。 |
| `docs/foundations/architecture.md` | pass | pass | pass | — | 责任平面、唯一所有权和离线验证边界相互一致。 |
| `docs/foundations/context.md` | pass | pass | fail | A06 | 基础机制完整，但与调优页重复讲选择、信任、压缩和工具输出，读者难以判断各页职责。 |
| `docs/foundations/human-control.md` | pass | pass | pass | — | 授权范围、过期、取消和人工验收链条完整。 |
| `docs/foundations/instructions.md` | pass | pass | pass | — | 将指令、门禁、证据和回滚分层，示例有停止条件。 |
| `docs/foundations/memory.md` | pass | pass | pass | — | 生命周期、权限过滤、删除与当前 E1 限制清楚。 |
| `docs/foundations/multi-agent.md` | pass | pass | pass | — | 依赖图、委派契约、交接与独立验证覆盖充分。 |
| `docs/foundations/observability.md` | pass | pass | pass | — | 事件身份、因果、遥测质量和隐私边界完整。 |
| `docs/foundations/protocols.md` | pass | pass | pass | — | 协议层、流式组装、授权和兼容性四态说明清楚。 |
| `docs/foundations/reasoning.md` | pass | fail | pass | A08 | 重试与反思的主要边界清楚，但把同一 prompt/context/config 的连续再推理一概判为无新增信息，漏掉可记录并验收的随机重采样。 |
| `docs/foundations/security.md` | pass | pass | pass | — | 威胁、能力、策略、隔离和恢复之间的边界完整。 |
| `docs/foundations/state-reliability.md` | pass | pass | pass | — | unknown outcome、幂等、超时与取消的限制表述准确。 |
| `docs/foundations/tools.md` | pass | pass | pass | — | 工具契约、错误分类、副作用和权限边界覆盖充分。 |
| `docs/foundations/what-is-harness.md` | fail | pass | fail | A05 | 定义直观，但首屏使用 Agent、模型、上下文、工具等术语时未就地定义或链接术语表。 |
| `docs/frameworks/autogen.md` | pass | fail | fail | B01 | 多 Agent 控制责任讲解完整，但将已进入 maintenance mode 的 AutoGen 作为主要新采用路径，与当前官方迁移建议冲突。 |
| `docs/frameworks/comparison.md` | pass | fail | fail | B01, B03 | 选型方法扎实，但候选表仍列 AutoGen，且未覆盖已批准的 Microsoft Agent Framework、DeepAgents、PydanticAI、CrewAI 与互操作生态。 |
| `docs/frameworks/google-adk.md` | pass | pending | pass | B05 | Agent、Session、Tool、Runtime 与 Deployment 的控制责任区分明确；上游事实的登记日期已超过高易变事实 30 天复核窗口。 |
| `docs/frameworks/langgraph.md` | pass | pending | pass | B05 | 状态 schema、reducer、checkpoint 与 interrupt 的工程边界完整；上游 overview 事实已超过高易变复核窗口。 |
| `docs/frameworks/openai-agents-sdk.md` | pass | pass | pass | — | 以 agent、runner、tool、handoff、guardrail、session/trace 契约组织，明确未安装 SDK 的 E0/E1 边界。 |
| `docs/guide/capstone.md` | pass | pass | pass | — | 以 Starter、Coding E1 种子和六项作品产物组织完整闭环，明确区分 E0 模板与运行证据。 |
| `docs/guide/interview-practice.md` | fail | pending | fail | C01, C04 | 五张问答卡把本仓库离线实验指向相邻 Travel 目录；该目录不是独立 Git 仓库，读者无法按文中方式冻结 Travel 身份或获得可移植输入。 |
| `docs/guide/portfolio.md` | pass | pass | pass | — | 按六项可复核产物、硬门槛和评分锚点组织，清楚列出证据包与失败边界。 |
| `docs/guide/prerequisites.md` | pass | pass | pass | — | 按阅读、构建、Lab、贡献分层给出版本、命令、输出、停止、清理和回滚。 |
| `docs/guide/roadmap.md` | pass | pass | pass | C02 | 知识地图的依赖图、七层主题、查漏表和检查点清晰；与 start 的四条路线内容重复。 |
| `docs/guide/start.md` | pass | pass | pass | C02 | 面向首次学习者按交付物分流，包含离线 smoke、证据等级、停止和回滚；四条路线与 roadmap 重复。 |
| `docs/harnesses/claude-code.md` | pass | pending | fail | B05, B06 | 权限、hook、恢复和静态示例边界完整；当前产品已支持 AGENTS.md 的条件化加载，页面未纳入该迁移/共存语义。 |
| `docs/harnesses/codex.md` | pass | pass | pass | — | 将 AGENTS.md、配置、sandbox、approval、network 和恢复分层，并给出受控资格测试顺序。 |
| `docs/harnesses/comparison.md` | pass | pass | fail | B02 | 三产品比较的责任矩阵可读且边界严谨，但用户已批准的 Gemini CLI 尚未纳入比较单元和迁移责任。 |
| `docs/harnesses/pi.md` | pass | pass | pass | — | 固定到 Pi commit，具体讨论 project trust、扩展、compaction、session tree 和外部隔离补偿。 |
| `docs/implementation/adapter-contract.md` | pass | pass | pass | — | Fake、Replay、Live 禁用、stream 组装与 checkpoint 的运行边界和验证命令完整。 |
| `docs/implementation/extensions.md` | pass | pass | pass | — | 以 manifest、权限数据流、Hook/MCP/Plugin 生命周期解释扩展审查，文档门禁示例有边界说明。 |
| `docs/implementation/minimal-harness-python.md` | pass | pass | pass | — | 从源码地图贯穿 contract、policy、recovery、acceptance、trace 和 Live 硬禁用，验证路径完整。 |
| `docs/implementation/testing.md` | pass | pass | pass | — | 当前 172 项 Python 收集基线与逐文件分布同代码一致，并准确限制各层测试结论。 |
| `docs/implementation/typescript-mapping.md` | pass | pass | pass | — | 用 wire schema、JSON 值边界、判别联合和运行时重放说明 TypeScript 与 Python 的契约差异。 |
| `docs/index.md` | fail | pass | fail | R01 | 问题驱动入口和六个Lab边界清楚；首屏术语偏密，缺领域全景入口。 |
| `docs/labs/browser.md` | pass | pass | pass | — | 准确限定为预结构化 observation 的 Browser Use 职责接缝，并给出负例、E1 边界与升级路线。 |
| `docs/labs/coding.md` | pass | pass | pass | — | fixture、内存 patch、基线/候选断言、定向测试和真实 Coding Agent 的证据边界相互对应。 |
| `docs/labs/data.md` | pass | pass | pass | — | 明确字段级 email 替换和精确字符串扫描的范围，未把它表述为通用 PII 检测。 |
| `docs/labs/document.md` | pass | pass | pass | — | 以版本选择、块级引用、拒答和 typed stop 解释离线文档接缝及其限制。 |
| `docs/labs/migration.md` | pass | pass | pass | — | 把六类责任、两条目标 Harness 路径、自动负例和真实迁移阶段对应起来。 |
| `docs/labs/research.md` | pass | pass | pass | — | 区分结构化 ledger 的冲突/引用校验与真实搜索、来源独立性、自然语言综合。 |
| `docs/labs/runner.md` | pass | pass | pass | — | 准确说明 hash-first 生命周期、单/全案例命令、临时篡改演练以及 Runner 不写结果文件。 |
| `docs/labs/setup.md` | pass | pass | fail | C03 | 六例离线环境、矩阵不完整和容器边界清晰；`results:redact` 的动作名容易被读成执行脱敏，而实现仅扫描并拒绝命中。 |
| `docs/models/adaptation.md` | pass | pass | pass | — | 以完整组合身份、资格门禁、单变量适配和回退为主线；稳定方法与产品事实分开。 |
| `docs/models/anthropic.md` | pass | pending | pass | B05 | 区分 Anthropic API、转售 surface 与 Claude Code，协议探针和 coding 评测边界具体；家族页的易变来源尚未进入细粒度事实注册。 |
| `docs/models/deepseek.md` | pass | pending | pass | — | 明确把价格、alias、上下文和可用性保留为 pending，并将官方、兼容 endpoint 与本地权重拆分。 |
| `docs/models/google.md` | pass | pending | pass | B05 | 围绕多模态输入供应链、part 顺序、流式与评测边界展开；易变模型来源未有逐项事实注册。 |
| `docs/models/llama.md` | pass | pending | pass | B05 | 覆盖权重许可、模板、量化、runtime、硬件与部署恢复；上游版本敏感事实尚缺逐项注册。 |
| `docs/models/openai.md` | pass | pass | pass | — | 函数调用、reasoning state、streaming、用量和离线 E1 边界均有对应 FACT 引用与独立验收说明。 |
| `docs/models/protocol-compatibility.md` | pass | fail | pass | B04 | 协议矩阵、状态载体和负例充分，但流式与非流式独立请求的 ID 等价条件写得过强。 |
| `docs/models/qwen.md` | pass | pending | pass | B05 | 将官方、兼容 API 与本地部署拆开，覆盖 reasoning、工具和预算；易变家族事实尚未逐项登记。 |
| `docs/models/reasoning-budget.md` | pass | pass | pass | — | 清楚区分 provider reasoning control、harness task budget 与离线 controller 证据。 |
| `docs/optimization/context-tools.md` | pass | pass | fail | A06 | 调优方法扎实，但与基础上下文页存在大段同主题覆盖，页间职责未收束。 |
| `docs/optimization/debugging.md` | fail | pass | pass | A07 | 诊断步骤和验证链完整；记录模板的连续英文标题破坏中文教程可读性。 |
| `docs/optimization/experiment.md` | pass | fail | fail | A03, A09 | 实验原则正确，但 E1 示例将多控制差异的离线配置与单变量干预教学并置；卡片中以 E1 验证模型工具选择行为的假设也与 fake/replay 证据边界不匹配。 |
| `docs/optimization/memory.md` | pass | pass | pass | — | 优化单位、scope、truth、utility 和关闭路径区分明确。 |
| `docs/optimization/model-fit.md` | pass | pass | pass | — | 资格与效用分层、完整身份和 E1/E2/E3边界准确。 |
| `docs/optimization/prompting.md` | pass | pass | pass | — | 任务契约、验收、风险和停止条件结构完整。 |
| `docs/optimization/reasoning-routing.md` | pass | fail | pass | A08 | 路由可见特征、预算和有限 fallback 清楚，但将同输入、状态、配置的连续重试绝对化为无信息，未区分随机重采样。 |
| `docs/practice/debugging.md` | pass | pass | pass | — | 将现场保全、第一处分歧、可证伪假设、故障注入和最小复现包连成可执行诊断流程。 |
| `docs/practice/end-to-end.md` | pass | pass | pass | — | 以明确的 E0 教学案例和 E1 eval 结构区分身份、资格、配对、晋级、停止与回退。 |
| `docs/practice/evaluation.md` | pass | pass | pass | — | lineage、矩阵、promotion 自测和结果扫描的作用范围与不能替代的真实比较均已标明。 |
| `docs/practice/framework-selection.md` | pass | pass | pass | — | 从决策问题、baseline、资格探针到 adopt/reject/defer，迁移 fixture 仅作 E1 结构验证的边界明确。 |
| `docs/practice/harness-design.md` | pass | pass | pass | — | 按 Task、责任、权限、Action、Tool、State、Validator、证据十一阶段给出完整设计工作表和验证链。 |
| `docs/practice/model-playbook.md` | pass | pass | pass | — | 模型卡将身份、两条证据轴、资格、评测、路由、回退和重测触发分开，离线示例未冒充 live。 |
| `docs/practice/reliability-recovery.md` | pass | pass | pass | — | 写 intent、幂等、receipt、reconciliation 与不安全重试反例组成可观察的恢复练习。 |
| `docs/practice/security-review.md` | pass | pass | pass | — | 数据流、威胁链、auto/ask/deny、事件 Runbook 和离线安全验证形成可审阅证据包。 |
| `docs/references/compatibility.md` | pass | pass | fail | R06 | 五层证据矩阵完整；模型表遗漏Llama，新增产品与协议未有可追溯位置。 |
| `docs/references/fact-registry.md` | pass | pending | pass | R02 | 11列表能独立记录来源和实验；五条高易变事实超期，产品生命周期和新生态未登记。 |
| `docs/references/glossary.md` | pass | fail | pass | R03 | 将pass@k与best-of-k合并成至少一次成功，混淆oracle指标与选择器后的实际交付。 |
| `docs/references/sources.md` | pass | pending | pass | R02 | 有来源分类和冲突策略；日期陈旧且缺新增协议、框架、基准来源。 |
| `docs/security/incident-response.md` | pass | pass | pass | — | 分诊、遏制、取证、恢复与演练边界完整。 |
| `docs/security/prompt-injection.md` | pass | pass | fail | A04 | 权限和外发防护全面，但回归断言只覆盖越权动作及副作用，遗漏无工具时答案完整性遭操纵的攻击。 |
| `docs/security/secrets-privacy.md` | pass | pass | pass | — | 分类、数据流、脱敏、删除和泄漏处置完整。 |
| `docs/security/supply-chain.md` | pass | pass | pass | — | 引入、锁定、脚本、CI、advisory与回退链条完整。 |
| `docs/security/threat-model.md` | pass | pass | pass | — | 资产、威胁、控制、证据和模型失效条件覆盖充分。 |
| `evals/README.md` | pass | pass | pass | — | 20任务120格设计与12条E1合成run明确区分，解释历史fixture哈希不可冒充当前输入。 |
| `examples/harnesses/claude-code/CLAUDE.md` | pass | pass | pass | — | 示例阻断网络/凭据/远程并限定改动范围，保留为规则示范。 |
| `examples/harnesses/claude-code/README.md` | pass | pending | pass | R02 | 区分CLAUDE指导和permission执行控制；字段事实仍需新来源日期同步。 |
| `examples/harnesses/codex/AGENTS.md` | pass | pass | pass | — | 示例授权范围及验证要求清楚；不是当前根仓库的新授权。 |
| `examples/harnesses/codex/README.md` | pass | pending | pass | R02 | 静态命令、输出、断言、反例、回滚齐备；目标surface真实配置加载仍需授权探针。 |
| `examples/harnesses/pi/AGENTS.md` | pass | pass | pass | — | 示例要求固定源码不匹配时停止；工具与外部权限边界明确。 |
| `examples/harnesses/pi/README.md` | pass | fail | pass | R04 | 将隔离worktree列为硬隔离手段，实际上worktree只分离Git目录，不能约束进程权限。 |
| `examples/portfolio-starter/README.md` | pass | pass | pass | — | E0脚手架不伪造run/trace，按任务、失败、安全、迁移形成作品集闭环。 |
| `examples/portfolio-starter/environment.md` | pass | pass | pass | — | 环境、锁文件、输入许可及未知项有位置；不记录个人账号标识。 |
| `examples/portfolio-starter/evaluation/report.md` | pass | fail | pass | R05 | 尚未运行时Safety、Tool errors、Human turns预填0，会让未知观察看似零事故。 |
| `examples/portfolio-starter/evaluation/study.md` | pass | pass | pass | — | 以Task为分析单位，不删除失败，不用E1支持模型质量晋级。 |
| `examples/portfolio-starter/evidence/commands.md` | pass | pass | pass | — | 命令行记录未运行与实际结果分开，提供退出码、产物哈希和敏感信息约束。 |
| `examples/portfolio-starter/evidence/unresolved.md` | pass | pass | pass | — | 未知项有风险、证据、负责人及触发条件；正确保留关闭后的来源。 |
| `examples/portfolio-starter/harness/verification.md` | pass | pass | pass | — | 原失败/邻近正例/安全/取消/恢复矩阵清楚；不预填passed并区分Git与外部回退。 |
| `examples/portfolio-starter/knowledge-map.md` | pass | pass | fail | R08 | 责任图有输入输出owner、成功/失败路径，尚缺纯回答完整性在安全分析中的提醒。 |
| `examples/portfolio-starter/migration/responsibility-map.md` | pass | pass | pass | — | 责任/缺口/补偿/证据逐项分开，未知目标不切换，回退包括外部receipt。 |
| `examples/portfolio-starter/model-card/adaptation.md` | pass | pass | pass | — | 模型身份、官方来源和协议正负例独立，未运行保持untested。 |
| `examples/portfolio-starter/security/threat-model.md` | pass | pass | fail | R08 | 威胁模板覆盖外泄和重复写，缺无工具时被诱导隐瞒反证的回答完整性例。 |

## 第二轮逐页复审（修复后）

全部 120 个内容 Markdown 文件由未负责对应正文改写的审阅者逐页全文复核：principles 34、products 31、learning 55；其中站点页 99。三维分别为可读性、准确性、覆盖性；pass 仅表示限定内容审阅通过，来源 pending 和真实产品未测仍保留。首次复审发现及其原状态保存在 `second-*.json` 的 `first_review` 与 `second-findings.json`；复验依据见 `recheck-*.json`、来源证据和验证报告。

| 页面 / 修订位置 | 审阅者 | 可读性 | 准确性 | 覆盖性 | 复审问题 | 阅读依据 / 修订验收 |
| --- | --- | --- | --- | --- | --- | --- |
| [AGENTS.md](../../../AGENTS.md) | learning | pass | pass | pass | — | 来源、E0–E3、离线与授权规则完整。 |
| [CONTRIBUTING.md](../../../CONTRIBUTING.md) | learning | pass | pass | pass | — | 语义复核与30天时效门槛一致。 |
| [README.md](../../../README.md) | learning | pass | pass | pass | — | 生态与工作坊入口完整，六Lab及发布边界保留。 |
| [docs/domains/browser.md](../../../docs/domains/browser.md) | products | pass | pass | pass | — | 观察、提交与未知副作用清楚，JSON拒绝不冒充浏览器防护。 |
| [docs/domains/coding.md](../../../docs/domains/coding.md) | products | pass | pass | pass | — | 仓库保护、diff与回退完整，内存patch/AST的E1限制清楚。 |
| [docs/domains/data.md](../../../docs/domains/data.md) | products | pass | pass | pass | — | 单位、missing/null及隐私范围明确，邮箱扫描不等于完整PII防护。 |
| [docs/domains/document.md](../../../docs/domains/document.md) | products | pass | pass | pass | — | 解析、版本、ACL、引用及删除分层，整数版本仅属fixture。 |
| [docs/domains/research.md](../../../docs/domains/research.md) | products | pass | pass | pass | — | 主张、原文与冲突分开，字面链校验不等于语义核验。 |
| [docs/ecosystem/evaluation-observability.md](../../../docs/ecosystem/evaluation-observability.md) | principles | pass | pass | pass | S-A04 | 复验通过：trace关联身份与metric低基数标签分开 |
| [docs/ecosystem/knowledge-and-memory.md](../../../docs/ecosystem/knowledge-and-memory.md) | products | pass | pass | pass | S-B06 | RAG、压缩与记忆治理清楚，纸上练习自含输入和判据。 |
| [docs/ecosystem/long-running.md](../../../docs/ecosystem/long-running.md) | products | pass | pass | pass | — | 托管与自管边界明确，队列、审批、取消和回执分开。 |
| [docs/ecosystem/models-and-services.md](../../../docs/ecosystem/models-and-services.md) | products | pass | pass | pass | — | 推理服务与框架分开，缓存及运行时定位有官方支持。 |
| [docs/ecosystem/multimodal.md](../../../docs/ecosystem/multimodal.md) | products | pass | pass | pass | S-B06 | 观察与验收分开，Cloud V4及本地库区分，取消竞态例具体。 |
| [docs/ecosystem/overview.md](../../../docs/ecosystem/overview.md) | learning | pass | pass | pass | — | 九层责任清楚，主路线仍指start，未冒充live。 |
| [docs/ecosystem/protocols-and-skills.md](../../../docs/ecosystem/protocols-and-skills.md) | products | pass | pass | pass | — | MCP核心/扩展、A2A、Skills、PTC能力与权限边界准确。 |
| [docs/ecosystem/research-frontiers.md](../../../docs/ecosystem/research-frontiers.md) | principles | pass | pass | pass | — | 一手来源支持机制，训练、搜索与记忆分开，未外推性能。 |
| [docs/evaluation/judges.md](../../../docs/evaluation/judges.md) | principles | pass | pass | pass | S-A05, S-A06 | 复验通过：同组u/c表、严格比较、覆盖/风险/人工比例与空集合明确；四调用两draw两票的完整记录，位置交换只作诊断 |
| [docs/evaluation/method.md](../../../docs/evaluation/method.md) | principles | pass | pass | pass | — | 研究流程、预注册、分母与留出一致，样例不足公开。 |
| [docs/evaluation/metrics.md](../../../docs/evaluation/metrics.md) | principles | pass | pass | pass | S-A01 | 复验通过：拆分oracle集合成功与实际选择器验收，给出选错b的反例 |
| [docs/evaluation/regression.md](../../../docs/evaluation/regression.md) | principles | pass | pass | pass | — | 集合职责、重跑谱系和污染处理清楚，样例保持blocked。 |
| [docs/evaluation/reporting.md](../../../docs/evaluation/reporting.md) | principles | pass | pass | pass | — | 主张到原始记录可追溯，公开、撤回与复算链完整。 |
| [docs/evaluation/task-schema.md](../../../docs/evaluation/task-schema.md) | principles | pass | pass | pass | — | 对象所有权、四层验证和reader边界清楚，steps定义正确。 |
| [docs/foundations/agent-loop.md](../../../docs/foundations/agent-loop.md) | principles | pass | pass | pass | S-A02, S-A03 | 复验通过：统一工具step计数及验收拒绝checkpoint，逐段对照loop.py；全站相关预期改为业务断言，不以可变总数判通过 |
| [docs/foundations/architecture.md](../../../docs/foundations/architecture.md) | principles | pass | pass | pass | — | 责任平面、唯一所有权和完成验收与E1限制一致。 |
| [docs/foundations/context.md](../../../docs/foundations/context.md) | principles | pass | pass | pass | S-A09 | 复验通过：基础页定义、调优页变量/指标/回退实验表 |
| [docs/foundations/human-control.md](../../../docs/foundations/human-control.md) | principles | pass | pass | pass | — | 授权范围、过期、取消与验收独立，未扩大policy证据。 |
| [docs/foundations/instructions.md](../../../docs/foundations/instructions.md) | principles | pass | pass | pass | — | 指令、能力、门禁与确认责任清楚，构建共享状态有边界。 |
| [docs/foundations/memory.md](../../../docs/foundations/memory.md) | principles | pass | pass | pass | — | 写入、过滤、失效、删除及恢复完整，内存实现限制明确。 |
| [docs/foundations/multi-agent.md](../../../docs/foundations/multi-agent.md) | principles | pass | pass | pass | — | 依赖、所有权、交付、取消完整；设计练习保持E0。 |
| [docs/foundations/observability.md](../../../docs/foundations/observability.md) | principles | pass | pass | pass | — | 因果身份、偏序、采样和分母完整；trace与metric区分正确。 |
| [docs/foundations/protocols.md](../../../docs/foundations/protocols.md) | principles | pass | pass | pass | — | 传输到证据各层准确，stream assembler未冒充Provider兼容。 |
| [docs/foundations/reasoning.md](../../../docs/foundations/reasoning.md) | principles | pass | pass | pass | — | 重采样有draw/预算/验证，未扩大Task分母。 |
| [docs/foundations/security.md](../../../docs/foundations/security.md) | principles | pass | pass | pass | — | 能力、授权、隔离和恢复分层，固定测试不证明普遍安全。 |
| [docs/foundations/state-reliability.md](../../../docs/foundations/state-reliability.md) | principles | pass | pass | pass | S-A02 | 复验通过：统一工具step计数及验收拒绝checkpoint，逐段对照loop.py |
| [docs/foundations/tools.md](../../../docs/foundations/tools.md) | principles | pass | pass | pass | — | 调用、授权、执行与结果分层，幂等和外部对账清楚。 |
| [docs/foundations/what-is-harness.md](../../../docs/foundations/what-is-harness.md) | principles | pass | pass | pass | — | 首屏责任对照使核心术语可区分。 |
| [docs/frameworks/autogen.md](../../../docs/frameworks/autogen.md) | products | pass | pass | pass | S-B05 | 维护态及存量迁移定位正确，探针覆盖现代模块名。 |
| [docs/frameworks/comparison.md](../../../docs/frameworks/comparison.md) | products | pass | pass | pass | S-B05 | MAF新项目入口、现代运行时与协议服务职责分开。 |
| [docs/frameworks/google-adk.md](../../../docs/frameworks/google-adk.md) | products | pass | pass | pass | — | 导航事实与建议分开，Session、授权、部署和验收责任完整。 |
| [docs/frameworks/langgraph.md](../../../docs/frameworks/langgraph.md) | products | pass | pass | pass | — | 状态图与checkpoint清楚，纯Python示例不冒充上游执行。 |
| [docs/frameworks/microsoft-agent-framework.md](../../../docs/frameworks/microsoft-agent-framework.md) | products | pass | pass | pass | — | Agent/workflow、迁移及互操作边界清楚，保持E0。 |
| [docs/frameworks/modern-runtimes.md](../../../docs/frameworks/modern-runtimes.md) | products | pass | pass | pass | — | 三框架均有机制、取舍和负例；没有宣称已集成。 |
| [docs/frameworks/openai-agents-sdk.md](../../../docs/frameworks/openai-agents-sdk.md) | products | pass | pass | pass | — | SDK、Responses及应用职责分层，handoff与验收独立。 |
| [docs/guide/capstone.md](../../../docs/guide/capstone.md) | learning | pass | pass | pass | — | Starter、Coding种子与个人证据身份分开。 |
| [docs/guide/interview-practice.md](../../../docs/guide/interview-practice.md) | learning | pass | pass | pass | — | 五卡只需本仓库，外部项目可选。 |
| [docs/guide/portfolio.md](../../../docs/guide/portfolio.md) | learning | pass | pass | pass | — | 产物、硬门槛和独立复核一致。 |
| [docs/guide/prerequisites.md](../../../docs/guide/prerequisites.md) | learning | pass | pass | pass | — | 阅读、构建、Lab分层，缓存准备与离线运行分开。 |
| [docs/guide/roadmap.md](../../../docs/guide/roadmap.md) | learning | pass | pass | pass | — | 删重复路线，保留依赖图和查漏索引。 |
| [docs/guide/start.md](../../../docs/guide/start.md) | learning | pass | pass | pass | — | 路线按交付物分流，停止、回滚和E1限制明确。 |
| [docs/harnesses/claude-code.md](../../../docs/harnesses/claude-code.md) | products | pass | pass | pass | S-B01, S-B03 | allow非封闭白名单；加载条件、例外、诊断及import完整。 |
| [docs/harnesses/codex.md](../../../docs/harnesses/codex.md) | products | pass | pass | pass | S-B02, S-B08 | permission profile、approval、sandbox读写边界分别记录。 |
| [docs/harnesses/comparison.md](../../../docs/harnesses/comparison.md) | products | pass | pass | pass | S-B07 | 四产品统一责任矩阵及五证据轴；Gemini未测项明确。 |
| [docs/harnesses/gemini-cli.md](../../../docs/harnesses/gemini-cli.md) | products | pass | pass | pass | — | 迁移公告限定未付费层与Google One，没有外推账号可用性。 |
| [docs/harnesses/pi.md](../../../docs/harnesses/pi.md) | products | pass | pass | pass | — | 固定commit、trust、配置、session与外部隔离边界一致。 |
| [docs/implementation/adapter-contract.md](../../../docs/implementation/adapter-contract.md) | learning | pass | pass | pass | — | Adapter不接管权限，call ID/stream/restore可定位。 |
| [docs/implementation/extensions.md](../../../docs/implementation/extensions.md) | learning | pass | pass | pass | S-C06 | 复验通过：补Python/uv锁文件及Chromium前置，setup补获取命令 |
| [docs/implementation/minimal-harness-python.md](../../../docs/implementation/minimal-harness-python.md) | learning | pass | pass | pass | — | 控制流、修正、内存恢复和软deadline清楚。 |
| [docs/implementation/testing.md](../../../docs/implementation/testing.md) | learning | pass | pass | pass | S-C01, S-C05 | 复验通过：明确规范化内容身份与空白/键序边界；与package.json实际脚本逐项对齐 |
| [docs/implementation/typescript-mapping.md](../../../docs/implementation/typescript-mapping.md) | learning | pass | pass | pass | — | 静态与runtime分开，线协议一致不等于恢复一致。 |
| [docs/index.md](../../../docs/index.md) | learning | pass | pass | pass | — | 问题驱动入口连接生态、设计、恢复与作品集。 |
| [docs/labs/browser.md](../../../docs/labs/browser.md) | learning | pass | pass | pass | — | 预标请求、零副作用与真实浏览器分开。 |
| [docs/labs/coding.md](../../../docs/labs/coding.md) | learning | pass | pass | pass | — | 内存patch、精确AST、真实断言与历史身份分开。 |
| [docs/labs/data.md](../../../docs/labs/data.md) | learning | pass | pass | pass | — | missing/null、单位、有限数及邮箱扫描范围明确。 |
| [docs/labs/document.md](../../../docs/labs/document.md) | learning | pass | pass | pass | — | 版本筛选、ACL、解析停止与引用限制明确。 |
| [docs/labs/migration.md](../../../docs/labs/migration.md) | learning | pass | pass | pass | S-C01, S-C03 | 复验通过：明确规范化内容身份与空白/键序边界；明确Git隔离不等于OS强制边界 |
| [docs/labs/research.md](../../../docs/labs/research.md) | learning | pass | pass | pass | — | 字面引用与冲突标签不冒充语义核验。 |
| [docs/labs/runner.md](../../../docs/labs/runner.md) | learning | pass | pass | pass | S-C01 | 复验通过：明确规范化内容身份与空白/键序边界 |
| [docs/labs/setup.md](../../../docs/labs/setup.md) | learning | pass | pass | pass | S-C02 | 复验通过：保留deletion_process不足及unsupported_claims=1 |
| [docs/models/adaptation.md](../../../docs/models/adaptation.md) | products | pass | pass | pass | S-B04 | 身份、资格和回退完整；预期改行为断言。 |
| [docs/models/anthropic.md](../../../docs/models/anthropic.md) | products | pass | pass | pass | — | API、转售与Claude Code分开；固定ID快照获官方支持。 |
| [docs/models/deepseek.md](../../../docs/models/deepseek.md) | products | pass | pass | pass | — | TLS失败保留pending，未填补不可核实的产品数值。 |
| [docs/models/google.md](../../../docs/models/google.md) | products | pass | pass | pass | — | 版本类别、多模态预处理、协议与ADK职责分开。 |
| [docs/models/llama.md](../../../docs/models/llama.md) | products | pass | pass | pass | — | 权重、许可、量化、运行时和硬件身份完整。 |
| [docs/models/openai.md](../../../docs/models/openai.md) | products | pass | pass | pass | — | 工具执行、strict、reasoning连续性与streaming边界明确。 |
| [docs/models/protocol-compatibility.md](../../../docs/models/protocol-compatibility.md) | products | pass | pass | pass | — | 冻结回放与独立请求采用不同等价断言。 |
| [docs/models/qwen.md](../../../docs/models/qwen.md) | products | pass | pass | pass | — | 托管端点和本地权重分开，目标revision仍需资格测试。 |
| [docs/models/reasoning-budget.md](../../../docs/models/reasoning-budget.md) | products | pass | pass | pass | — | 单次参数与任务总预算分开，未扩大E1结论。 |
| [docs/optimization/context-tools.md](../../../docs/optimization/context-tools.md) | principles | pass | pass | pass | S-A09 | 复验通过：基础页定义、调优页变量/指标/回退实验表 |
| [docs/optimization/debugging.md](../../../docs/optimization/debugging.md) | principles | pass | pass | pass | — | 中文诊断模板、首处分歧、替身与邻近回归完整。 |
| [docs/optimization/experiment.md](../../../docs/optimization/experiment.md) | principles | pass | pass | pass | S-A07 | 复验通过：固定selection数据只变threshold，差异可复算 |
| [docs/optimization/memory.md](../../../docs/optimization/memory.md) | principles | pass | pass | pass | — | 序列为实验单位，相关性、真实性和效用分开。 |
| [docs/optimization/model-fit.md](../../../docs/optimization/model-fit.md) | principles | pass | pass | pass | — | 资格、效用、身份与路由清楚，无通用排名。 |
| [docs/optimization/prompting.md](../../../docs/optimization/prompting.md) | principles | pass | pass | pass | — | 目标、交付、验收、权限和停止条件清楚。 |
| [docs/optimization/reasoning-routing.md](../../../docs/optimization/reasoning-routing.md) | principles | pass | pass | pass | — | 盲重试与重采样分开，保留共享预算及权限边界。 |
| [docs/practice/debugging.md](../../../docs/practice/debugging.md) | learning | pass | pass | pass | — | 首处分歧、区分性测试和oracle负例可操作。 |
| [docs/practice/ecosystem-workshop.md](../../../docs/practice/ecosystem-workshop.md) | learning | pass | pass | pass | S-C04 | 复验通过：字段改planned_handler_calls，事件和正文同步 |
| [docs/practice/end-to-end.md](../../../docs/practice/end-to-end.md) | learning | pass | pass | pass | — | 虚构E0与仓库E1分开，错误分母和路由有解释。 |
| [docs/practice/evaluation.md](../../../docs/practice/evaluation.md) | learning | pass | pass | pass | S-C07 | 复验通过：改问执行前提与剩余证据缺口 |
| [docs/practice/framework-selection.md](../../../docs/practice/framework-selection.md) | learning | pass | pass | pass | — | Task形状、基线、资格、效用及退场成本完整。 |
| [docs/practice/harness-design.md](../../../docs/practice/harness-design.md) | learning | pass | pass | pass | — | 当前/目标/unknown分开，动作和恢复可追溯。 |
| [docs/practice/model-playbook.md](../../../docs/practice/model-playbook.md) | learning | pass | pass | pass | — | 身份、资格、采用及路由分开，未知不补零。 |
| [docs/practice/reliability-recovery.md](../../../docs/practice/reliability-recovery.md) | learning | pass | pass | pass | — | attempt、回执和副作用分开，对账反例明确。 |
| [docs/practice/security-review.md](../../../docs/practice/security-review.md) | learning | pass | pass | pass | — | 数据流、主体、失效与E1边界完整。 |
| [docs/references/compatibility.md](../../../docs/references/compatibility.md) | learning | pass | pass | pass | S-C08 | 复验通过：为59条补实际来源摘录、定位、支持范围及缓存身份 |
| [docs/references/fact-registry.md](../../../docs/references/fact-registry.md) | learning | pass | pass | pass | S-C08 | 复验通过：为59条补实际来源摘录、定位、支持范围及缓存身份 |
| [docs/references/glossary.md](../../../docs/references/glossary.md) | learning | pass | pass | pass | — | pass@k/best-of-k拆分，新增术语定义一致。 |
| [docs/references/sources.md](../../../docs/references/sources.md) | learning | pass | pass | pass | S-C08 | 复验通过：为59条补实际来源摘录、定位、支持范围及缓存身份 |
| [docs/security/incident-response.md](../../../docs/security/incident-response.md) | principles | pass | pass | pass | — | 分诊、遏制、取证、对账及恢复完整，取消限制明确。 |
| [docs/security/prompt-injection.md](../../../docs/security/prompt-injection.md) | principles | pass | pass | pass | S-A08 | 复验通过：新增answer-integrity fixture及测试，正常通过、攻击字段失败 |
| [docs/security/secrets-privacy.md](../../../docs/security/secrets-privacy.md) | principles | pass | pass | pass | S-A03 | 复验通过：全站相关预期改为业务断言，不以可变总数判通过 |
| [docs/security/supply-chain.md](../../../docs/security/supply-chain.md) | principles | pass | pass | pass | — | 来源、锁定、执行链与advisory适用性清楚。 |
| [docs/security/threat-model.md](../../../docs/security/threat-model.md) | principles | pass | pass | pass | S-A03 | 复验通过：全站相关预期改为业务断言，不以可变总数判通过 |
| [evals/README.md](../../../evals/README.md) | learning | pass | pass | pass | — | 任务、合成记录、历史fixture与晋级限制清楚。 |
| [examples/harnesses/claude-code/CLAUDE.md](../../../examples/harnesses/claude-code/CLAUDE.md) | learning | pass | pass | pass | — | 项目、凭据及远程操作限制明确。 |
| [examples/harnesses/claude-code/README.md](../../../examples/harnesses/claude-code/README.md) | learning | pass | pass | pass | S-C08 | 复验通过：为59条补实际来源摘录、定位、支持范围及缓存身份 |
| [examples/harnesses/codex/AGENTS.md](../../../examples/harnesses/codex/AGENTS.md) | learning | pass | pass | pass | — | 练习范围和权限约束明确。 |
| [examples/harnesses/codex/README.md](../../../examples/harnesses/codex/README.md) | learning | pass | pass | pass | S-C08 | 复验通过：为59条补实际来源摘录、定位、支持范围及缓存身份 |
| [examples/harnesses/pi/AGENTS.md](../../../examples/harnesses/pi/AGENTS.md) | learning | pass | pass | pass | — | 文档不匹配即停止，不扩大访问。 |
| [examples/harnesses/pi/README.md](../../../examples/harnesses/pi/README.md) | learning | pass | pass | pass | S-C08 | 复验通过：为59条补实际来源摘录、定位、支持范围及缓存身份 |
| [examples/portfolio-starter/README.md](../../../examples/portfolio-starter/README.md) | learning | pass | pass | pass | — | E0脚手架与成果分开，没有预造运行记录。 |
| [examples/portfolio-starter/environment.md](../../../examples/portfolio-starter/environment.md) | learning | pass | pass | pass | — | 环境、改动、许可及停止条件有填写位置。 |
| [examples/portfolio-starter/evaluation/report.md](../../../examples/portfolio-starter/evaluation/report.md) | learning | pass | pass | pass | — | 未运行指标写未观测，零记录数语义明确。 |
| [examples/portfolio-starter/evaluation/study.md](../../../examples/portfolio-starter/evaluation/study.md) | learning | pass | pass | pass | — | Task单位、控制变量、失败保留及E1限制清楚。 |
| [examples/portfolio-starter/evidence/commands.md](../../../examples/portfolio-starter/evidence/commands.md) | learning | pass | pass | pass | — | 命令、退出码、身份、产物与预期分开。 |
| [examples/portfolio-starter/evidence/unresolved.md](../../../examples/portfolio-starter/evidence/unresolved.md) | learning | pass | pass | pass | — | 未知项含风险、owner、触发与决定。 |
| [examples/portfolio-starter/harness/verification.md](../../../examples/portfolio-starter/harness/verification.md) | learning | pass | pass | pass | — | 原失败、邻近正例、安全和实际结果分栏。 |
| [examples/portfolio-starter/knowledge-map.md](../../../examples/portfolio-starter/knowledge-map.md) | learning | pass | pass | pass | — | 无工具回答完整性失败路径已补。 |
| [examples/portfolio-starter/migration/responsibility-map.md](../../../examples/portfolio-starter/migration/responsibility-map.md) | learning | pass | pass | pass | — | 责任unknown不补通过，切换需资格和回退。 |
| [examples/portfolio-starter/model-card/adaptation.md](../../../examples/portfolio-starter/model-card/adaptation.md) | learning | pass | pass | pass | — | 身份、来源和资格保持pending/untested。 |
| [examples/portfolio-starter/security/threat-model.md](../../../examples/portfolio-starter/security/threat-model.md) | learning | pass | pass | pass | — | 纯回答风险和引用/反证验收完整。 |

## 初审 28 项闭环

| 问题 | 初始位置 | 修订与复验判据 | 最终状态 |
| --- | --- | --- | --- |
| A01 | `docs/evaluation/judges.md` | Judge固定u/c分数、严格阈值、覆盖/风险/人工比例；对应E1边界测试通过。 | pass |
| A02 | `docs/evaluation/judges.md` | 格式恢复、随机重采样、位置交换分开记录；四次调用仅两张有效票。 | pass |
| A03 | `docs/optimization/experiment.md` | E1配置包明确禁止单组件归因；补只改变threshold的固定对照。 | pass |
| A04 | `docs/security/prompt-injection.md` | 纯回答固定来源与两候选：正常通过、受攻击答案三个字段失败。 | pass |
| A05 | `docs/foundations/what-is-harness.md` | 首屏给模型、Agent、Harness、工具/环境责任对照。 | pass |
| A06 | `docs/foundations/context.md; docs/optimization/context-tools.md` | 基础页保留定义，优化页改测量变量、代价与回退表。 | pass |
| A07 | `docs/optimization/debugging.md` | 诊断模板中文化。 | pass |
| A08 | `docs/foundations/reasoning.md; docs/optimization/reasoning-routing.md` | 盲重试与有draw身份/独立验证的重采样分开。 | pass |
| A09 | `docs/optimization/experiment.md` | 模型行为实验卡改E2，E1只支持固定接缝。 | pass |
| B01 | `docs/frameworks/autogen.md` | AutoGen维护态、MAF新项目入口、迁移职责及来源齐全。 | pass |
| B02 | `docs/harnesses/comparison.md` | Gemini CLI专题与统一矩阵齐全；生命周期明确适用用户。 | pass |
| B03 | `docs/frameworks/comparison.md` | MAF、DeepAgents、PydanticAI、CrewAI及协议服务分层补全。 | pass |
| B04 | `docs/models/protocol-compatibility.md` | 冻结回放按协议字段核对，独立生成仅比任务与关联不变量。 | pass |
| B05 | `docs/references/fact-registry.md` | 易变事实实读来源并登记；不可达DeepSeek维持pending。 | pass |
| B06 | `docs/harnesses/claude-code.md` | Claude条件加载、例外、诊断、显式import和回退完整。 | pass |
| C01 | `docs/guide/interview-practice.md` | Travel五卡使用仓库内fixture与命令，外部项目仅可选。 | pass |
| C02 | `docs/guide/roadmap.md` | start为规范路线正文；roadmap作为知识索引与查漏。 | pass |
| C03 | `docs/labs/setup.md` | results:redact明确只做失败关闭扫描，不自动脱敏。 | pass |
| C04 | `docs/guide/interview-practice.md` | 教程要素与本地输入补全；实际执行正负例并保留证据边界。 | pass |
| R01 | `docs/index.md` | 九层生态全景及12新页面接入导航、来源、术语与矩阵。 | pass |
| R02 | `docs/references/fact-registry.md` | 五条旧事实及全部59登记具来源摘录/定位，独立复验通过。 | pass |
| R03 | `docs/references/glossary.md` | pass@k与best-of-k拆分；固定候选演示oracle成功但选择失败。 | pass |
| R04 | `examples/harnesses/pi/README.md` | Pi与迁移页均区分worktree和OS强制隔离。 | pass |
| R05 | `examples/portfolio-starter/evaluation/report.md` | 未运行安全/错误/人工指标使用未观测。 | pass |
| R06 | `docs/references/compatibility.md` | Llama及新增生态对象进入兼容矩阵，五证据轴独立。 | pass |
| R07 | `CONTRIBUTING.md` | 编辑与发布前实读核验，配合30天高易变门槛。 | pass |
| R08 | `examples/portfolio-starter/security/threat-model.md` | 作品集与安全正文纳入无工具回答完整性风险。 | pass |
| R09 | `scripts/tutorial-check.mjs; scripts/visual-check.mjs` | 实现/实践命令契约、破坏负例、三视口新入口与实际搜索验证通过。 | pass |

## 第二轮发现的 25 项问题

完整位置、影响、修订判据及独立审阅者见 [second-findings.json](./second-findings.json)。这些问题均先记为缺陷，再由主代理修复、原独立审阅者重新读取验收；没有降低初审判据。

| 问题 | 修订位置 | 问题 → 修订判据 | 状态 |
| --- | --- | --- | --- |
| S-A01 | docs/evaluation/metrics.md | 任一次成功被写成best-of-k交付成功 → 拆分oracle集合成功与实际选择器验收，给出选错b的反例 | pass |
| S-A02 | docs/foundations/agent-loop.md；docs/foundations/state-reliability.md | completion的step+1及仅工具生成checkpoint与实现不符 → 统一工具step计数及验收拒绝checkpoint，逐段对照loop.py | pass |
| S-A03 | docs/foundations/agent-loop.md；docs/security/threat-model.md；docs/security/secrets-privacy.md | 固定测试和扫描数量过期 → 全站相关预期改为业务断言，不以可变总数判通过 | pass |
| S-A04 | docs/ecosystem/evaluation-observability.md | run_id与Task hash误称低基数 → trace关联身份与metric低基数标签分开 | pass |
| S-A05 | docs/evaluation/judges.md | 阈值方向缺手算与等号边界 → 同组u/c表、严格比较、覆盖/风险/人工比例与空集合明确 | pass |
| S-A06 | docs/evaluation/judges.md | 格式恢复仍可能算独立票，缺追溯记录 → 四调用两draw两票的完整记录，位置交换只作诊断 | pass |
| S-A07 | docs/optimization/experiment.md | 配置包解释后仍缺单字段候选 → 固定selection数据只变threshold，差异可复算 | pass |
| S-A08 | docs/security/prompt-injection.md | 定义偏工具，纯回答缺固定正反例 → 新增answer-integrity fixture及测试，正常通过、攻击字段失败 | pass |
| S-A09 | docs/foundations/context.md；docs/optimization/context-tools.md | 范围声明与重复正文不符 → 基础页定义、调优页变量/指标/回退实验表 | pass |
| S-B01 | docs/harnesses/claude-code.md | allow误写成封闭读取/命令白名单 → 改为预先许可，未匹配仍由其他规则与模式决定 | pass |
| S-B02 | docs/harnesses/codex.md | workspace-write误要求范围外读取失败 → 分别验读写，区分工具授权与OS拒绝层 | pass |
| S-B03 | docs/harnesses/claude-code.md | AGENTS条件遗漏及缺诊断/import → 补.claude/CLAUDE、用户/managed/rules例外、config/context及回退 | pass |
| S-B04 | docs/models/adaptation.md | replay测试数量过期 → 改行为断言并保留live-disable边界 | pass |
| S-B05 | docs/frameworks/autogen.md；docs/frameworks/comparison.md | 仅探测旧autogen模块 → 增加autogen_agentchat/core/ext缺依赖检查 | pass |
| S-B06 | docs/ecosystem/knowledge-and-memory.md；docs/ecosystem/multimodal.md | 工作坊链接声称有不存在输入 → 改为本页E0自含输入、判据、失败和清理练习 | pass |
| S-B07 | docs/harnesses/comparison.md | 残留三产品和三证据轴 → 统一四产品和五证据轴 | pass |
| S-B08 | docs/harnesses/codex.md | permission profile与approval混为可替代项 → 独立记录文件/网络策略及approval_policy | pass |
| S-C01 | docs/labs/runner.md；docs/labs/migration.md；docs/implementation/testing.md | canonical JSON哈希误称任何字节变化 → 明确规范化内容身份与空白/键序边界 | pass |
| S-C02 | docs/labs/setup.md | research预期无unsupported与fixture矛盾 → 保留deletion_process不足及unsupported_claims=1 | pass |
| S-C03 | docs/labs/migration.md | worktree被当作sandbox补偿 → 明确Git隔离不等于OS强制边界 | pass |
| S-C04 | docs/practice/ecosystem-workshop.md；lab/src/about_harness/ecosystem.py | 集合模拟被称为真实handler调用 → 字段改planned_handler_calls，事件和正文同步 | pass |
| S-C05 | docs/implementation/testing.md | 门禁列表含已不存在脚本及过时总数 → 与package.json实际脚本逐项对齐 | pass |
| S-C06 | docs/implementation/extensions.md | 仅Node前置不足以运行检查 → 补Python/uv锁文件及Chromium前置，setup补获取命令 | pass |
| S-C07 | docs/practice/evaluation.md | 检查题仍称两阈值未执行 → 改问执行前提与剩余证据缺口 | pass |
| S-C08 | reports/audits/2026-09-21/source-reviews.json | 泛化核对声明无法回溯支持段落 → 为59条补实际来源摘录、定位、支持范围及缓存身份 | pass |
