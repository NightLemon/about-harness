# 全站内容初审报告

审核日：2026-09-21。状态：**需要修订**。本报告在正文改写前冻结，后续处理结果见 final.md 与 coverage.md。

## 宏观结论

项目已有从责任架构、六类离线实验到作品集的完整学习骨架，稳定机制和证据边界总体严谨。主要问题是学习入口重复且术语密集，少数统计/协议/安全论述会诱导错误工程判断，以及产品与生态覆盖落后于本次实际查到的官方资料。应保留可靠章节，以问题驱动深改和补写，而不是把所有页面机械改成同一个模板。

## 基线与方法

- 基线：`bd5ed23f8b1904c8f276cecff4fb6ae490dcbdd0`，分支 `main`；87个站点页面，共108个仓库Markdown文件。
- 逐页覆盖由四组完成，文件身份与哈希见 baseline.json；每页实际阅读要点见 coverage.md，原始审阅记录见 initial-*.json。
- 初始修改：导航、start、capstone及新增interview-practice，已获用户授权一并审核和整合。
- 依次审核整体定位、学习结构、页面论述和命令/fixture/实现细节。规则文件作为约束核验，不改变其授权。
- pass只表示在该页面职责及所读证据下未发现必修问题，不表示全面证明产品或模型能力。pending表示仍需来源核验。

## 分层发现

| 层次 | 判断 | 优先处理 |
| --- | --- | --- |
| 整体定位 | 中文工程学习定位成立，尚缺全景 | 九个生态能力层与明确的选型边界 |
| 学习结构 | 问题驱动入口可用，路线重复 | 主学习路径唯一化、知识地图改为索引 |
| 内容论证 | 多数机制严谨，局部存在关键错误 | 重采样、弃权阈值、协议差分、E1归因与回答完整性 |
| 实践细节 | 六类Lab有固定输入及负例 | Travel独立复现、脱敏扫描语义、教程和视觉覆盖 |

## 覆盖统计

逐页初审维度计数：`{"readability": {"pass": 104, "fail": 4}, "accuracy": {"pass": 85, "fail": 10, "pending": 13}, "coverage": {"pass": 90, "fail": 18}}`。共28个问题编号；跨页同类问题共用编号，不能把编号数当页面数。

## 基线验证与来源边界

- `npm run docs:check`：退出0；只证明文档结构、链接等检查通过。
- `npm run facts:check`：退出0；21条记录中20 verified、1 pending，全部为E0。
- `npm run facts:freshness`：退出1；claude-memory、langgraph-overview、openai-agents-sdk、google-adk、autogen-overview超过30天。
- 官方检索发现AutoGen维护态、Microsoft Agent Framework迁移建议、MCP 2026-07-28及可选扩展、Agents API等新增覆盖。逐条语义核验由修订阶段source-reviews记录承接。
- source-fetches.json保存URL、响应身份与失败；HTTP成功不等于正文主张通过。DeepSeek TLS失败；GAIA数据原始卡401可改用作者论文描述基准设计，不获得数据访问权。
- 本次未调用真实模型/付费API、未启动上游框架、未运行在线产品对照，不形成E2/E3。

## 问题明细

### A01 · P1 · error

- 位置：`docs/evaluation/judges.md:266`
- 原文定位：提高不确定阈值通常会降低覆盖率
- 影响与依据：若规则是 uncertainty >= threshold 则弃权，阈值升高会减少弃权并提高覆盖率；只有把阈值定义为最低置信度才会得到文中方向。当前未定义方向，结论会让读者反向配置自动升级。
- 修订要求：显式定义分数及比较符号，分别写出提高 uncertainty-abstain 阈值和提高 confidence-accept 阈值对覆盖率、选择性风险与人工成本的方向。
- 复审判据：给出同一组分数的两种等价阈值定义，四项方向均可由表或公式复核，且不再使用未定义的“不确定阈值”。
- 初审状态：open。

### A02 · P1 · gap

- 位置：`docs/evaluation/judges.md:276`
- 原文定位：是否允许同一 provider 重试
- 影响与依据：这里把传输或无效 schema 的 retry 与为估计随机性的独立 re-sample 放在同一“重复评分”流程，未要求记录 attempt_reason、是否消耗样本配额和聚合资格。两者混计会改变分母、方差和多数票权重。
- 修订要求：定义互斥 attempt 类型：infrastructure/schema retry 只恢复同一计划 run，随机重采样是预注册的新评分 draw；分别保存 parent run、seed、原因、配额和聚合规则。
- 复审判据：Schema/流程示例能对一次解析失败重试、一次随机重采样和一次位置交换分别生成可追溯记录，汇总器不会把前者当独立投票。
- 初审状态：open。

### A03 · P1 · gap

- 位置：`docs/optimization/experiment.md:230`
- 原文定位：2 个 config、3 次重复的矩阵协议、固定 fixture lineage 和 12 行 development 样例
- 影响与依据：本页先要求单一主要干预，样例却比较 default 与含额外 policy.check、source filter、schema validation、negative fixture 的 engineering bundle；二者同为 offline-replay。它可演示配置包汇总，不能成为模型选择或单变量机制的教学例，当前未在该页把处理对象固定为 bundle。
- 修订要求：把样例明确命名为“多控制工程配置包的 E1 汇总演示”，列出差异并禁止单变量或模型归因；另增加一个只改变单一字段的候选 fixture，或链接到它。
- 复审判据：读者能从页面独立判断样例比较的是配置包而非模型；单变量示例有唯一 changed variable、相同其余身份和可复算的差异。
- 初审状态：open。

### A04 · P1 · gap

- 位置：`docs/security/prompt-injection.md:170`
- 原文定位：实际副作用、外发字节和持久化写入是否为零
- 影响与依据：四项观察和离线断言都围绕越权 Action；攻击可不触发工具，而让答案省略关键证据、采信恶意指令或输出错误结论。此时 side_effects=0 仍是完整性失败，现有回归集没有可判定 oracle。
- 修订要求：增加纯答案攻击载体及完整性 oracle，例如要求保持指定来源、拒绝恶意结论、保留冲突与引用；把 answer-integrity 与 action-safety 分开报告。
- 复审判据：至少一个无工具、side_effects=0 的注入 fixture 会因引用、结论或必需限制被操纵而失败；另一正常答案通过，结果记录来源与判定依据。
- 初审状态：open。

### A05 · P2 · editorial

- 位置：`docs/foundations/what-is-harness.md:5`
- 原文定位：让模型能够在约束下持续观察、决策、行动和验证
- 影响与依据：首屏在定义 Harness 时已经依赖 Agent、模型、上下文、工具、验证等核心词，随后才在后文展开；新读者难以分清 Harness、Agent 和执行环境。
- 修订要求：在一句话定义后加入三到四行最小术语对照，或链接术语表并在首次使用处给中文定义。
- 复审判据：不离开首屏即可区分模型、Agent、Harness、工具/环境的责任；英文首次出现均有中文定义或明确术语表链接。
- 初审状态：open。

### A06 · P2 · editorial

- 位置：`docs/foundations/context.md; docs/optimization/context-tools.md:29; 27`
- 原文定位：上下文构建是一条流水线；上下文先做清单，再做压缩
- 影响与依据：两页都覆盖选择、来源信任、预算、压缩、工具结果和验证，重复率高，却没有在开头限定一页讲稳定机制、另一页讲实验调优与工具设计。
- 修订要求：明确章节边界并交叉链接：foundation 保留定义、数据流和不变量；optimization 聚焦诊断、干预、指标和实验。合并或改写重叠段落。
- 复审判据：两页开头各有范围声明；共享概念只保留一个规范定义，另一页用短链接引用；学习路径能说明何时读哪一页。
- 初审状态：open。

### A07 · P2 · editorial

- 位置：`docs/optimization/debugging.md:186`
- 原文定位：## Symptom and impact
- 影响与依据：中文教程的诊断记录模板连续使用未定义英文标题，和仓库“首次定义英文术语、使用中文 prose”的写作约定不一致。
- 修订要求：将模板标题改为中文，必要时首次以“症状与影响（Symptom and impact）”并列。
- 复审判据：模板字段为中文或首次中英并列，读者无需依赖英文即可填写诊断记录。
- 初审状态：open。

### A08 · P1 · error

- 位置：`docs/foundations/reasoning.md; docs/optimization/reasoning-routing.md:91; 102`
- 原文定位：同一 prompt、上下文和配置连续“再想一遍”；重试只有在输入、状态、模型配置或外部可用性发生了有意义变化时才可能提供新信息
- 影响与依据：这把盲重试和随机重采样等同。对随机模型，即使输入、状态、配置保持不变，一次预注册的新 draw 也会产生新候选；若配合独立 verifier、聚合或 best-of-k 规则，它可提供可验的候选多样性。只有没有验证反馈、未记录采样身份且不改变决策规则的盲重试，才通常只增加费用和尾延迟。
- 修订要求：两页一致限定为“无有效验证反馈的盲重试”；新增随机重采样定义，要求记录 seed/temperature、draw ID、预算、独立验证结果和预注册聚合规则，并说明它不增加独立 task 样本。
- 复审判据：页面能把同 prompt 的盲重试、随机重采样、收到验证反馈后的 repair/replan 分成互斥路径；示例显示重采样可产生新候选但不会被当作新的 task 或无条件升级。
- 初审状态：open。

### A09 · P1 · gap

- 位置：`docs/optimization/experiment.md:58-60`
- 原文定位：evidence_target: E1；hypothesis: 合并重叠工具会减少 invalid_tool_selection
- 影响与依据：invalid_tool_selection 是模型在工具集合中选择的行为结果。固定 fake/replay 可以验证 registry/schema、计数与固定轨迹，却不能证明合并工具会降低真实模型的选择错误；卡片虽称为 E0 模板，仍把目标 E1 和模型行为假设并列，容易把离线接缝验证误读为模型选择证据。
- 修订要求：若保持 E1，把假设改为固定 fixture 的工具集合可区分性或 validator 行为；若要检验模型选择错误，改为获授权、锁定完整身份的 E2 探针，并保留真实 task、候选动作与 validator 记录。
- 复审判据：实验卡的 hypothesis、evidence_target、输入和 verdict 同层一致：E1 只支持固定离线接缝；涉及模型工具选择的结论至少有 E2 的运行身份、原始候选和独立判定证据。
- 初审状态：open。

### B01 · P1 · error

- 位置：`docs/frameworks/autogen.md:1`
- 原文定位：# AutoGen：从对话原型到可控多 Agent 系统
- 影响与依据：当前页面与框架对照仍把 AutoGen 作为面向新采用的候选；本轮官方维护仓库明确其已进入 maintenance mode，建议新用户转向 Microsoft Agent Framework（MAF）。
- 修订要求：把 AutoGen 改为迁移/存量兼容页，在框架主路线与对照表中以 MAF 替代；为 MAF 建立带来源状态、版本/commit、适用 surface 和 E0 边界的页面及事实项。
- 复审判据：AutoGen 页面明确 maintenance 与迁移边界；框架选型和目录主路径使用 MAF；事实注册表可定位 MAF 与 AutoGen 生命周期来源，且不把 E0 写成已集成。
- 初审状态：open。

### B02 · P2 · gap

- 位置：`docs/harnesses/comparison.md:1`
- 原文定位：# Codex、Pi 与 Claude Code：职责对照
- 影响与依据：比较单元只覆盖 Codex、Pi、Claude Code，遗漏已获批准补齐的 Gemini CLI，读者无法以同一责任矩阵比较其指令、权限、状态、扩展与恢复。
- 修订要求：新增 Gemini CLI 专题，并把它加入 harness comparison 的冻结身份、责任矩阵、迁移场景、来源登记和 E0/E1/E2/E3 边界。
- 复审判据：Gemini CLI 有官方来源与实际核对日期；对照表逐责任项写 unknown/untested 而非假定等价；无 live probe 时结论保持 E0。
- 初审状态：open。

### B03 · P2 · gap

- 位置：`docs/frameworks/comparison.md:12`
- 原文定位：| AutoGen | AgentChat、Core、Extensions 与 Studio 等分层
- 影响与依据：框架候选集未纳入已批准的 Microsoft Agent Framework、DeepAgents、PydanticAI、CrewAI，也没有把 MCP、A2A、Skills、Agents API 作为互操作或运行时边界单列，选型覆盖不完整。
- 修订要求：以任务形状重构候选矩阵：保留 LangGraph、Agents SDK、ADK，加入 MAF、DeepAgents、PydanticAI、CrewAI；把 MCP/A2A/Skills/Agents API 作为协议或服务层，避免混作框架能力。
- 复审判据：每个新增对象有来源、版本/日期、职责与非职责、最小资格探针和 E0 边界；对照页不把协议/服务/API 当成已验证 framework runtime。
- 初审状态：open。

### B04 · P1 · error

- 位置：`docs/models/protocol-compatibility.md:179`
- 原文定位：非流式与流式路径应产生等价 canonical result：相同 item 类型、call ID、stop class 和完整参数。
- 影响与依据：对于同一次请求的两种传输表示，可比较语义；但分别发起的流式与非流式请求会生成独立 provider tool call，不能要求相同 call_id。该表述会诱导以跨请求 ID 相等作为兼容性断言。
- 修订要求：同一冻结响应的流式重组比较工具、参数和ID；两次独立生成仅比较任务级/规范化不变量，各自保持call/result关联，不要求工具、参数、ID或item数相同。
- 复审判据：冻结回放与独立采样用不同断言；独立请求生成的不同合法候选不误报协议失败，错误关联仍被拒绝。
- 初审状态：open。

### B05 · P2 · pending

- 位置：`docs/references/fact-registry.md:28`
- 原文定位：| langgraph-overview | ... | 2026-08-20 | high | verified |
- 影响与依据：Anthropic、Google、Qwen、Llama 家族页的易变产品来源未逐项登记；且 Claude、LangGraph、Google ADK、AutoGen 等 high volatility 项的登记核对日为 2026-08-20，已超过注册表规定的 30 天复核窗口。本文审未把抓取成功升级为 verified。
- 修订要求：逐 claim 增补或更新事实项，复核官方原文、目标版本或固定 commit 后填写实际 checked date；无法逐条确认的字段保留 pending，并在对应页面改为条件表述。
- 复审判据：所有易变产品主张有可定位 FACT、官方来源、版本/commit、实际核对日期和独立 source status；高易变项在发布时未超过 30 天，未核实项不以确定语气出现。
- 初审状态：open。

### B06 · P2 · gap

- 位置：`docs/harnesses/claude-code.md:28`
- 原文定位：`CLAUDE.md`、rules 和 auto memory 属于 conversation context（对话上下文）
- 影响与依据：当前 Claude Code 文档已描述 AGENTS.md 的条件化直接加载、与 CLAUDE.md 的关系及迁移方式；本页只讲 CLAUDE.md/rules/memory，缺少该现行互操作路径。
- 修订要求：补充 AGENTS.md/CLAUDE.md 并存时的发现条件、版本/surface 限制、验证命令和安全回退，并避免把 AGENTS.md 当作强制 policy。
- 复审判据：页面明确何时加载 AGENTS.md、何时需 import、如何验证实际加载；示例和比较页不再暗示只有 CLAUDE.md 可作为项目指令。
- 初审状态：open。

### R01 · P1 · gap

- 位置：`docs/index.md:44`
- 原文定位：按你眼前的问题进入
- 影响与依据：缺跨模型服务、协议、运行时、部署、评测与研究的生态全景；新增概念没有统一定位。
- 修订要求：建立九能力层全景与重点专题，旧页链接到唯一深入入口。
- 复审判据：九能力层及计划指定代表产品均有来源、定位、限制与学习入口。
- 初审状态：open。

### R02 · P1 · pending

- 位置：`docs/references/fact-registry.md:29`
- 原文定位：2026-08-20
- 影响与依据：claude-memory、LangGraph、Agents SDK、ADK、AutoGen五条高易变来源超过30天；登记过粗，不能覆盖最新行为。
- 修订要求：逐项实读来源、登记生命周期及新增事实；不可达保留pending。
- 复审判据：freshness通过且核对记录可追溯到支持主张的实际段落，不仅HTTP状态。
- 初审状态：open。

### R03 · P1 · error

- 位置：`docs/references/glossary.md:55`
- 原文定位：pass@k / best-of-k
- 影响与依据：至少一次正确的oracle指标与候选选择策略不是同一统计对象。
- 修订要求：拆分pass@k与best-of-k，说明选择器可能选错及k次成本。
- 复审判据：术语与metrics、推理重采样及新练习一致。
- 初审状态：open。

### R04 · P1 · error

- 位置：`examples/harnesses/pi/README.md:19`
- 原文定位：需要硬隔离时使用容器、受限用户或隔离 worktree
- 影响与依据：Git worktree不隔离文件系统/网络/进程权限。
- 修订要求：将工作目录隔离和操作系统强制隔离分开，容器也需实际权限配置。
- 复审判据：不把worktree称为sandbox或硬权限边界。
- 初审状态：open。

### R05 · P1 · error

- 位置：`examples/portfolio-starter/evaluation/report.md:17`
- 原文定位：baseline | 0 | 未运行 | 0
- 影响与依据：没有run却将安全/工具错误/人工次数置零，混淆未知与实测零。
- 修订要求：未运行的指标留未观测；矩阵观察格数0可保留。
- 复审判据：模板不把未测安全数据解释为零事故。
- 初审状态：open。

### R06 · P2 · gap

- 位置：`docs/references/compatibility.md:58`
- 原文定位：模型页面当前状态
- 影响与依据：Llama已有专题却未在模型兼容矩阵出现；生态新增也须同步。
- 修订要求：补齐Llama及新增对象的来源、静态、E1与live边界。
- 复审判据：各对象可查来源状态和真实未测试边界。
- 初审状态：open。

### R07 · P2 · editorial

- 位置：`CONTRIBUTING.md:41`
- 原文定位：维护者每季度运行带网络的外链探针并刷新高易变事实
- 影响与依据：季度刷新会周期性超过30天发布门槛，贡献者不清楚何时做语义复核。
- 修订要求：明确每次涉及易变主张和发布前复核；季度仅全量外链补充。
- 复审判据：维护说明与facts:freshness职责、时间规则一致。
- 初审状态：open。

### R08 · P2 · gap

- 位置：`examples/portfolio-starter/security/threat-model.md:11`
- 原文定位：T-02
- 影响与依据：模板没有纯回答完整性风险，与工具副作用以外的安全面缺少连接。
- 修订要求：增加隐藏反证/引用污染威胁及输出验收。
- 复审判据：不执行工具也能描述一条攻击和检查断言。
- 初审状态：open。

### R09 · P2 · gap

- 位置：`scripts/tutorial-check.mjs; scripts/visual-check.mjs:43; 85`
- 原文定位：const cases = [coding, browser, research, data, document, migration]
- 影响与依据：教程门禁只硬编码六类Lab；实现/实践教程命令无法被结构门禁覆盖，视觉检查只有少数页面。
- 修订要求：增加明确的教程命令契约清单与副本破坏负例；将新入口、长表、代码页纳入三视口检查。
- 复审判据：新增教程/代表实现和实践命令路径受检，缺失脚本或错误引用触发失败；三视口覆盖新增内容。
- 初审状态：open。

### C01 · P1 · pending

- 位置：`docs/guide/interview-practice.md:3`
- 原文定位：Travel 位于同级本地仓库的 `../interview-guide/projects/travel-agent`
- 影响与依据：教程依赖未随本仓库发布的相邻目录；本机该目录没有 Git metadata，故第 12 行要求记录 Travel 当前代码 hash 不可执行，其他读者也没有可验证的固定输入。
- 修订要求：把五张卡改为本仓库固定 fixture/示例，或发布许可明确、带 commit/hash 的 Travel fixture bundle 和独立运行入口；外部项目只作为可选补充。
- 复审判据：全新 checkout 中不依赖相邻私人路径即可运行每张卡的命令、获得预期断言；若保留外部扩展，缺失时必须安全跳过并给出固定身份要求。
- 初审状态：open。

### C02 · P2 · editorial

- 位置：`docs/guide/roadmap.md:81`
- 原文定位：## 四条可独立完成的学习路径
- 影响与依据：roadmap 的四条路径及产物与 start.md 的“路线 A–D”重复，读者需要在两处维护同一学习顺序，未来更新会漂移。
- 修订要求：保留 roadmap 的依赖图、知识索引和按症状查漏；将可执行路线只保留在 start，roadmap 改为链接到对应路线。
- 复审判据：四条路线只有一个规范正文来源；知识地图只保留依赖/索引并链接该来源，两个页面的入门入口仍可达。
- 初审状态：open。

### C03 · P2 · editorial

- 位置：`docs/labs/setup.md:98`
- 原文定位：npm run results:redact
- 影响与依据：脚本 `scripts/redact-results.mjs` 只扫描既有 JSON/JSONL、发现模式后非零退出，不会生成或改写脱敏副本；命令名与学习流程容易造成“已自动脱敏”的误读。
- 修订要求：将公开流程明确命名为 scan/check，或在命令前后用醒目文字说明它是失败关闭扫描，人工/上游脱敏必须先完成。
- 复审判据：读者能从页面和命令名判断该步骤不会修改 artifact；文档明确给出产生脱敏副本的责任方或说明该步骤不负责产生副本。
- 初审状态：open。

### C04 · P2 · gap

- 位置：`docs/guide/interview-practice.md:11`
- 原文定位：先完成[实验环境](../labs/setup.md)的依赖准备；本页沿用锁文件
- 影响与依据：页面把五张实践卡作为教程，但没有为 Travel 环境给出固定版本、安装/输入身份、每卡可复制的命令块、预期结构化输出或精确清理/回滚步骤；第 16–17 行只汇总退出码预期。
- 修订要求：在本仓库替代路径确定后，为每卡补齐前置版本、固定输入、命令、期望输出、业务断言、失败例、清理、回滚和已知限制，或明确改名为非可执行面试讨论卡。
- 复审判据：每张卡都能独立复现并记录上述教程要素；任何不可运行的外部扩展均标为 optional/pending，不作为主线完成条件。
- 初审状态：open。

## 修订与复审纪律

先修概念错误与独立复现问题，再补生态覆盖并整合导航和事实引用。所有新增易变主张须实际核对官方材料；未知保持pending，产品声明与项目实验分开。复审重新覆盖全部旧页与新增页，作者之外的审阅者逐项核对，新增问题亦须修正和重验。最终同时报告人工审阅、结构验证、离线运行和浏览器检查，不以任一绿色检查替代其他层。
