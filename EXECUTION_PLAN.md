# Harness 学习文档项目执行计划 v1

状态：**M1-M6 已完成；M7 进行中（Round 01–04 完成）；活动 Goal 已授予 M6-M8 的 A1/A2；A3/A4 未授权**
交付契约批准语句：批准交付契约 v1，请保存执行计划  
计划修订日期：2026-08-21
工作区：仓库根目录（不得记录个人绝对路径）

## 1. 文档用途与恢复入口

本文件是会在 checkpoint 更新的 living execution plan，不是 Goal 授权锚点。当前活动 Goal 已明确授予 M6-M8 的 A1/A2，且不绑定任何文件 SHA256；本文件更新不会撤销授权。

Git 历史和 annotated tags 已验收 M1-M5。当前恢复点为 `m5-complete-v1`（commit `6aada53`）；不得重跑 M1-M5，不得删除、移动或覆盖其 commits/tags。若本文件出现 M0、M1-M5 未开始或逐里程碑重新授权等旧措辞，视为计划回退，必须修正后继续 M6，不得据此阻塞。

M6 已由 `m6-complete-v1`（`999a4c3`）冻结；M7 Round 01–04 已由各自 annotated complete tag 绑定。当前下一步是 Round 05。A3（真实 API/费用）和 A4（remote/发布）仍未授权。

## 2. Progress

本节在每个里程碑开始、暂停、恢复和完成时维护。不得提前把计划状态写成完成。

| 里程碑 | 状态 | 当前说明 |
| --- | --- | --- |
| M0 | **已完成** | 执行计划已批准 |
| M1 | **已完成** | `legacy-baseline-v1` / `m1-complete-v1`；不得重跑 |
| M2 | **已完成** | `m2-complete-v1`，result `ade425e` |
| M3 | **已完成并修正** | `m3-corrected-v1`，result `dd419bb`；旧完成 tag 保留审计 |
| M4 | **已完成** | `m4-complete-v1`，result `e7ba394` |
| M5 | **已完成** | `m5-complete-v1`，result `6aada53` |
| M6 | **已完成** | 来源、许可、隐私、CI、视觉与发布自动化；`npm run verify` 与本地 Pages smoke 通过 |
| M7 | **进行中** | Round 01–04 完成；Round 05 待执行 |
| M8 | 未开始 | 新 review 06–10 和 release candidate |
| M9 | 未开始 | 经用户单独授权后的远程操作与发布 |

进度记录格式：

- 开始时间、结束时间与时区；
- 执行授权原文和授权层级；
- 输入 commit/tag；
- 修改文件清单；
- 已运行、未运行和失败的验证；
- 证据路径或 task transcript；
- 未决项、恢复点和下一次允许动作。

## 3. 项目目标、用户与学习成果

### 3.1 用户画像

首版面向具备 Git、CLI、基础编程和基本 LLM 概念的工程师。正文、导航和案例使用中文；英文术语首次出现时给出原词，命令、API、配置键和产品专名保持原文。不维护英文镜像。

### 3.2 项目目标

建立一套尽可能全面、可验证、可持续维护的 agent harness 中文学习文档。读者应能针对指定模型和明确工作负载，在合适的 harness 中优化上下文、指令、工具、权限、推理预算、记忆、扩展、可靠执行和评测，并用可复现实验证明结论。

### 3.3 学习成果

完成学习后，读者必须能够：

1. 区分 model、provider、adapter、agent、framework、runtime、protocol、surface、harness 和完整产品。
2. 用 Python 实现可观察、可约束、可停止、可恢复的最小 harness，并理解关键 TypeScript 接口映射。
3. 为指定模型建立身份、协议兼容、能力、上下文、工具、权限、推理预算和成本画像。
4. 在 Codex、Pi、Claude Code 中迁移和优化同一工作负载。
5. 为 coding、浏览器、研究、数据和文档 agent 设计安全工作流。
6. 使用配对任务、重复运行、holdout、区间或效应量、安全与成本指标验证配置。
7. 形成带适用边界、版本和证据等级的模型适配结论。

## 4. 范围与全部非目标

### 4.1 纳入范围

- Agent 类型：coding、浏览器、研究、数据、文档。
- 深度 coding harness：Codex、Pi、Claude Code。
- 通用 framework：LangGraph、OpenAI Agents SDK、Google ADK、AutoGen。
- 非 coding 实操代表：
  - Browser Use：浏览器 agent；
  - LangGraph：研究 agent；
  - PydanticAI：数据 agent；
  - LlamaIndex：文档 agent。
- 模型家族：OpenAI、Anthropic、Google、Qwen、DeepSeek、Llama。
- 参考实现：Python 为完整主线，TypeScript 提供关键接口映射。
- 运行基线：容器或 devcontainer；提供 Windows、macOS、Linux 本地回退。
- 六个端到端案例：coding、浏览器、研究、数据、文档、跨 harness 迁移。
- 发布形态：公开项目 Pages，目标路径为 https://<owner>.github.io/about-harness/。
- 文档许可：CC BY 4.0；代码许可：MIT。
- 反馈：公开仓库 Issues；首版不承诺外部 PR 处理流程。
- 遥测：首版不加载 analytics 或站点遥测。

### 4.2 明确非目标

- 模型训练、微调、量化、推理服务器、GPU 调度或模型内核教程。
- 穷举所有模型、provider、IDE、SDK 或 agent 产品。
- 建立脱离工作负载、版本、预算和 harness 的通用模型排行榜。
- 首版深度覆盖 Aider、OpenHands、OpenCode、Cline 等其他 coding 产品。
- 为所有模型家族与所有 harness 运行完整笛卡尔积。
- 英文镜像站。
- 在线 SaaS runner、凭据托管、真实用户数据收集或后台服务。
- 公开原始敏感 trace、凭据、私人 fixture 或未脱敏仓库内容。
- 承诺 WCAG 2.2 AA 合规；仍要求语义标题、图片 alt、键盘无阻断和基本对比度。
- 把教学烟测、营销材料或模型自报写成厂商事实或普遍性能结论。
- 把当前已有 round-01 至 round-10 计入新十轮。
- 在 M8 以前公开 beta；首次公开版本必须是完成新十轮后的 v1。
- 未经单独授权创建 remote、push、PR、Pages、发布或产生 API 费用。

## 5. 完整知识地图

| 领域 | 必须覆盖的内容 |
| --- | --- |
| 术语与边界 | model、provider、adapter、agent、framework、runtime、protocol、surface、harness |
| 系统架构 | controller、agent loop、事件、状态、模型调用、工具执行、验证和停止 |
| 任务契约 | 目标、输入、约束、验收、禁区、风险和人工批准 |
| 模型适配 | 身份解析、协议兼容、能力探针、工作负载画像、基线和路由 |
| 上下文工程 | 选择、检索、排序、预算、缓存、压缩、污染和可信来源 |
| 指令系统 | 系统、项目、目录、任务指令；优先级、冲突、skills、hooks、插件 |
| 记忆 | 工作记忆、会话记忆、长期记忆、写入、检索、失效、删除和隐私 |
| 推理与路由 | 规划、反思、推理预算、模型路由、降级、回退和停止 |
| 工具与协议 | schema、错误语义、MCP、CLI、浏览器、幂等、副作用和授权 |
| 权限与安全 | sandbox、allowlist、审批、注入、秘密、数据流、供应链和事件响应 |
| 可靠执行 | 超时、重试、退避、幂等键、并发、取消、checkpoint 和恢复 |
| 可观测性 | trace、事件日志、工具记录、token、成本、延迟和失败分类 |
| 多 Agent | 委派、隔离、共享状态、汇报、冲突解决和终止传播 |
| 人在循环中 | 计划批准、危险动作审批、升级、人工复核和责任边界 |
| 扩展 | adapters、skills、hooks、plugins、MCP servers 和配置漂移 |
| 实验与评测 | fixture、任务集、重复、holdout、指标、区间、judge 和回归 |
| 领域模式 | coding、浏览器、研究、数据和文档 agent 的专属风险与验证 |
| 产品对照 | 三个 coding harness、四个 framework、四个领域代表 |
| 治理与发布 | 来源、许可、依赖、review 证据、GitHub Pages 和维护周期 |

## 6. 完整交付文件矩阵

以下路径是目标结构；尚不存在的文件只有在对应里程碑得到授权后才创建。

| 文件或目录 | 所属里程碑 | 交付内容与完成条件 |
| --- | --- | --- |
| EXECUTION_PLAN.md | M0–M9 | 维护 Progress、发现、决策、结果和恢复点 |
| README.md | M2 | 项目定位、真实状态、运行、许可和入口；不得声称 legacy 十轮已验收 |
| AGENTS.md | M2 | 写作、事实、安全、实验和 review 规则与本计划一致 |
| CONTRIBUTING.md、.github/ISSUE_TEMPLATE/** | M2、M6 | 事实错误、教程失败和内容建议模板 |
| LICENSE、LICENSE-DOCS | M2 | MIT 代码许可与 CC BY 4.0 文档许可边界清楚 |
| package.json、package-lock.json | M2–M6 | 保存稳定命令接口和锁定 Node 依赖 |
| pyproject.toml、Python 锁文件 | M3 | 锁定 runner、测试、类型和格式依赖 |
| Dockerfile、compose.yaml、.devcontainer/** | M3 | 可重复构建的容器基线和本地回退说明 |
| docs/index.md | M2 | 首页、学习成果和主要学习入口 |
| docs/.vitepress/config.mts | M2、M4、M6 | 新导航、项目 base、搜索、旧路由策略和发布配置 |
| docs/.vitepress/theme/index.ts、custom.css | M2、M6 | 视觉身份、响应式表格、锚点偏移和可读性修正 |
| docs/guide/{start,roadmap,prerequisites,portfolio}.md | M2 | 路线、知识地图、前置知识和作品集 rubric |
| docs/foundations/{what-is-harness,architecture,agent-loop,context,instructions,memory,reasoning,tools,protocols,state-reliability,observability,multi-agent,human-control,security}.md | M4 | 跨产品稳定原理、失败模式、练习、自检和实现映射 |
| docs/implementation/{minimal-harness-python,typescript-mapping,adapter-contract,extensions,testing}.md | M3、M4 | 最小实现、接口、扩展和测试说明与代码一致 |
| docs/models/{adaptation,protocol-compatibility,reasoning-budget,openai,anthropic,google,qwen,deepseek,llama}.md | M4 | 六个模型家族、指定模型适配和证据边界 |
| docs/harnesses/{comparison,codex,pi,claude-code}.md | M4 | 三个 coding harness 深度专题和职责迁移 |
| docs/frameworks/{comparison,langgraph,openai-agents-sdk,google-adk,autogen}.md | M4 | framework、SDK、runtime、product 和 harness 边界 |
| docs/domains/{coding,browser,research,data,document}.md | M4 | 五类 agent 的架构、风险、指标和实验入口 |
| docs/optimization/{prompting,context-tools,memory,reasoning-routing,experiment,debugging}.md | M4、M5 | 调优变量、观测信号、实验和问题诊断 |
| docs/security/{threat-model,prompt-injection,secrets-privacy,supply-chain,incident-response}.md | M4 | 预防、检测、停止、恢复和安全回归 |
| docs/evaluation/{method,task-schema,metrics,judges,regression,reporting}.md | M5 | 评测口径、统计、数据完整性和报告纪律 |
| docs/labs/{setup,runner,coding,browser,research,data,document,migration}.md | M5 | 环境及六个端到端案例；离线可运行、可失败和可回滚 |
| docs/references/{glossary,sources,fact-registry,compatibility}.md | M2、M4、M6 | 术语、来源、事实注册表和兼容矩阵 |
| docs/meta/{review-method,changelog,publishing,dependency-security,privacy,maintenance}.md | M2、M6 | 项目治理、依赖、隐私、发布和维护 |
| docs/reviews/legacy/** | M2 | 原样迁移现有十份记录并显示未计入 v1 |
| docs/reviews/v1/round-01.md 至 round-10.md | M7、M8 | 新十轮审阅记录，只有证据齐全后标记完成 |
| artifacts/reviews/v1/round-01/** 至 round-10/** | M7、M8 | baseline、findings、diff、verification、截图、hash 和未决项 |
| artifacts/release/v1/** | M8 | release candidate 清单、验证摘要、许可和风险报告 |
| lab/src/about_harness/{contracts,loop,context,memory,policies,tools,retry,trace}.py | M3 | 可停止、可恢复、可观察的最小 harness |
| lab/src/about_harness/adapters/** | M3 | replay/fake 优先；live adapters 可选且默认禁用 |
| lab/src/about_harness/integrations/{browser_use,langgraph,pydantic_ai,llama_index}.py | M5 | 四个领域代表集成 |
| lab/ts/{contracts,minimal-loop}.ts | M3 | 可编译的关键 TypeScript 接口映射 |
| lab/fixtures/{coding,browser,research,data,document,migration}/** | M5 | 有来源、许可、hash、预期结果、负例和攻击样本的固定 fixture |
| lab/configs/** | M5 | 开箱默认、工程基线和候选配置；不得含 secret |
| lab/results/public/** | M5 | 聚合结果和精选脱敏轨迹；通过 schema 与脱敏检查 |
| lab/schemas/{task,run,trace,result}.json | M3、M5 | 版本化正式 schema、正例和反例 |
| lab/tests/** | M3、M5 | 单元、集成、安全、恢复和六个离线案例测试 |
| evals/** | M5 | 任务、run、统计样例与迁移兼容说明 |
| scripts/check-docs.mjs、check-built-site.mjs | M2、M6 | 扩展当前内部链接、构建、base 和导航检查 |
| scripts/facts-check.*、licenses-check.*、secrets-check.*、visual-check.*、eval-validate.*、pages-smoke.* | M2、M5、M6 | 新的事实、许可、秘密、视觉、评测和线上检查 |
| .github/workflows/ci.yml | M6 | PR 离线门禁 |
| .github/workflows/deploy.yml | M6、M9 | main 发布模板；M9 授权前不得触发 |
| .github/workflows/facts.yml | M6 | 定期事实与外链刷新，不阻塞普通 PR |

## 7. 作品集、证据等级、教程和正式比较

### 7.1 作品集与评分

读者必须提交六项产物：

1. 完整 harness 知识地图；
2. 最小 harness 实现；
3. 指定模型适配卡；
4. 配对实验报告；
5. 安全边界与威胁模型；
6. 跨 harness 迁移报告。

必过门禁：

- 安全边界明确且没有未解释的危险权限；
- 环境、版本、fixture 和命令可复现；
- 验证证据、失败记录和结论边界齐全。

通过必过门禁后评分：

| 维度 | 权重 |
| --- | --- |
| 正确性 | 40% |
| 因果解释与证据 | 25% |
| 迁移性 | 20% |
| 效率与成本 | 15% |

总分至少 80%，且任何维度不得低于该维度满分的 60%。

### 7.2 E0–E3 定义

- **E0：未验证假设。** 只来自推断、营销材料、主观印象或待运行方案；不得写成推荐。
- **E1：确定性离线证据。** 固定 fixture、mock、replay 或本地模型路径通过；证明流程和约束，不证明厂商模型性能。
- **E2：真实环境烟测。** 在锁定模型 ID、provider、adapter、harness、配置和日期的真实 API 或本地模型上完成有限运行；只能支持窄范围可用性结论。
- **E3：正式比较证据。** 满足任务量、重复、holdout、预注册晋级、安全与成本门槛；才允许写成限定工作负载下的较优配置。

### 7.3 教程统一要求

每篇教程必须包含：

- 学习目标、前置知识、预计投入、固定版本和证据等级；
- 容器基线路径及 Windows、macOS、Linux 本地回退；
- 输入、fixture hash、配置和完整命令；
- 预期输出、验收断言和机器可读 artifact；
- 至少一个失败、攻击或基础设施异常场景；
- 超时、停止、清理、回滚和秘密处理；
- 轨迹解释：为什么成功、为什么失败、模型与 harness 责任如何区分；
- 适用边界、已知限制和下一项练习；
- 任何无法运行的步骤必须显式标记，不得用伪输出代替。

### 7.4 六个案例

1. Coding：固定仓库中的多文件测试驱动修复。
2. 浏览器：Browser Use 操作本地合成站点，提取结构化数据并拒绝页面 prompt injection。
3. 研究：LangGraph 处理互相冲突的版本化来源，逐项引用并在证据不足时拒绝断言。
4. 数据：PydanticAI 处理 schema 漂移、缺失值和模拟敏感字段。
5. 文档：LlamaIndex 对版本化文档问答，返回出处并识别过时内容。
6. 迁移：同一受约束 coding 任务在 Codex、Pi、Claude Code 间映射指令、工具、权限和恢复职责。

### 7.5 正式比较门槛

- 至少 20 个不同任务，覆盖至少 4 类工作负载；
- 每配置、每任务至少重复 3 次；
- holdout 至少 20% 且不少于 5 个任务；
- holdout 只在配置与晋级规则冻结后运行；
- 同时保存开箱默认和合理工程基线；
- 报告成功口径、区间或效应量、延迟、token/费用、人工介入、工具错误、安全事件和失败类型；
- 候选只有在预注册主指标达到实际改善阈值、区间不支持明显退化、安全无回退且成本与延迟在预算内时才能晋级；
- 样本不足或结果不确定时必须写“结论不足”，不得强行排名。

真实 API 默认费用授权为 0。E2/E3 真实调用必须取得独立 API 与费用授权。

## 8. 事实时效和发布约束

### 8.1 产品事实

- 命令、配置路径、默认行为、模型可用性等易变主张必须就近引用官方文档或维护仓库。
- 页面记录产品版本、模型 ID、provider、adapter、核对日期和证据等级。
- 滚动仓库尽量固定 tag 或 commit；主分支链接只能作为更新入口。
- 事实注册表字段至少包括：claim ID、页面锚点、主张摘要、来源 URL、来源类型、版本、核对日期、易变等级和冲突说明。
- 发布时所有易变事实必须在最近 30 天内复核。
- 超过 30 天进入待复核队列；超过 90 天的在线页面显示过期提示。
- 每季度运行事实刷新；外链状态在定时任务检查，不作为普通 PR 的不稳定门禁。
- 官方来源冲突时记录冲突，并以目标版本实际探针结果限定结论。
- 模型自报、第三方 benchmark、博客或营销材料不能单独证明产品事实。

### 8.2 发布约束

- 目标是项目站 https://<owner>.github.io/about-harness/，base 为 /about-harness/。
- 首版不配置自定义域名，不加载 analytics。
- 首次公开发布只能发生在 M8 完成且用户单独授权 M9 后。
- PR 必须通过文档、构建、Python/TypeScript、离线案例、schema、事实、许可、secret、脱敏和视觉门禁。
- 视觉覆盖 1440px 桌面、390px 移动端和 320px 窄屏，以及导航、搜索、深浅色、表格、深层锚点和移动菜单。
- 发布后 smoke 至少检查：首页、学习路径、最小 harness、模型适配、三份 harness 指南、六个案例、review 状态、许可和静态资源。
- Smoke 失败不得宣告成功；回到 M8 修复并重新产生 release candidate。
- 公开仓库启用 Issues；不承诺首版外部 PR SLA。

## 9. 授权层次

里程碑描述交付顺序，不隐含获得权限。授权按下表逐级、逐项授予。

| 层级 | 权限 | 默认状态 | 授权要求 |
| --- | --- | --- | --- |
| A0 | 本地只读盘点与计划维护 | 已授权 | 随 M6-M8 持续 |
| A1 | 本地修改项目文件和运行会写入 artifact/cache 的本地验证 | 已授权 | 当前活动 Goal 一次覆盖 M6-M8 |
| A2 | 本地 Git commit 和 annotated tag | 已授权 | 当前活动 Goal 一次覆盖 M6-M8，包括 review baseline/result tags |
| A3 | 真实 API、凭据和费用 | 未授权，预算 0 | 必须指定 provider、凭据方式、数据范围和费用上限 |
| A4 | remote、push、PR、仓库设置、Pages 和发布 | 未授权 | 必须指定 owner/repo 和允许的外部动作；A1/A2/A3 均不包含 A4 |

规则：

- A1 与 A2 由当前活动 Goal 明确授予 M6-M8；授权不绑定任何文件 SHA256。
- A3、A4 不能由 Goal、A1、A2、普通里程碑或“继续执行”隐含获得；A3 和 A4 也不能相互包含。
- M6、M7 完成后记录 checkpoint 并自动继续；M8 完成后必须暂停。
- 需要更高层授权时必须保存当前恢复点并停止。
- 缺少 A2 时可以在 A1 范围内形成未提交 diff，但不能宣告需要 commit/tag 证据的里程碑完成。
- M1-M5 已完成且不得重跑；M6-M8 使用当前活动 Goal 授予的 A1+A2。M9 始终需要 A4。
- 任何授权都不允许读取、记录或输出未获授权的凭据；费用上限为 0，直到 A3 明确改变。

## 10. M0–M9 运行手册

依赖顺序固定为 `M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9`。M1-M6 已由线性 commits/checkpoint、annotated tags 和验证证据满足；形成 M6 tag 后连续进入 M7，不得回退或重跑 M1-M5。

### M0：保存并批准执行计划

**状态：已完成，不得重跑。以下步骤仅作历史审计。**

**输入**

- 已批准的交付契约 v1；
- 当前工作区只读盘点；
- 用户对计划修订的限定要求。

**允许修改的文件**

- 仅 EXECUTION_PLAN.md。

**具体步骤**

1. 将契约、范围、文件矩阵、里程碑、证据和授权规则写入本文件。
2. 建立 Progress、Surprises & Discoveries、Decision Log、Outcomes & Retrospective、Idempotence & Recovery。
3. 对修订前后除本文件以外的工作区源文件计算聚合指纹。
4. 复核里程碑编号只能使用 M0–M9。
5. 记录计划批准和最终 SHA256。
6. 等待已授权 Goal 启动后续里程碑。

**当前已经存在且允许使用的验证**

- Get-Content、Get-FileHash、Get-Item 等只读 PowerShell 命令；
- git status、git diff 等只读 Git 命令，但不得创建 Git 对象。

**需要创建但尚不存在的命令**

- 无。M0 不创建项目命令。

**验收证据**

- 本文件存在且包含所有必需章节；
- Progress 中 M0 为“已完成”；
- 修订前后除本文件外的工作区聚合 SHA256 相同；
- 未出现 commit、tag、API、remote 或发布动作。

**回滚或恢复**

- 使用修订前文件 hash 和本轮 patch 恢复本文件；
- 不使用 git reset、checkout 或其他可能覆盖用户文件的命令。

**完成后状态**

- 已完成。当前恢复不再执行本节步骤。

### M1：冻结当前 legacy 快照并建立 Git baseline

**状态：已完成，不得重跑。** 有效基线为 `legacy-baseline-v1`，完成记录为 `m1-complete-v1`。

**恢复规则**

- `legacy-baseline-v1` 指向 `2847afc`，`m1-complete-v1` 指向 `48950fa`；两者已经核验并保留。
- 当前 M6 改动不属于 M1，不得为了重跑 M1 而 stash、删除、提交或回滚。

**输入**

- M0 已复核的 EXECUTION_PLAN.md 及其 SHA256；
- M0 只读盘点得到的当前工作区、Git 历史、tags、remote、文件和验证现状；
- 用户对任何既有 commit/tag 名称冲突和未提交内容的明确处置决定；
- 已批准的 M1 A1 与 A2 授权原文。

**允许修改的文件或状态**

- baseline commit/tag 完成前，工作区文件内容：**零修改**；
- baseline 阶段只允许更新 .git 内的 index、objects、refs 和 annotated tag 元数据；
- baseline 验证完成后，只允许修改 EXECUTION_PLAN.md 以记录 M1 结果；该修改不并入 baseline；
- baseline 前不得移动、改写或改标现有 review、README、changelog 或任何其他文件。

**具体步骤，顺序不可调整**

1. 只读记录 git status、branch、log、tags、remote、完整文件清单、每个源文件 SHA256、聚合 SHA256、目录结构、验证命令清单和时间。
2. 检查历史、tag 名称或工作树是否与“初始 legacy baseline”发生冲突；若冲突未获用户明确裁定，立即停止，不创建或移动任何 Git 对象。
3. 在不修改源文件的前提下，只运行该快照当时已经存在且不会写回源文件的验证；记录未运行项与原因。
4. 再次计算源文件 hash，确认验证没有改变源文件；构建缓存和已忽略 artifact 不属于 baseline 源文件。
5. 原样将当前源文件创建为初始 baseline commit，commit message 固定为：chore: capture legacy baseline before v1 execution。
6. 创建 annotated tag：`legacy-baseline-v1`；若同名 tag 已存在，停止并报告，禁止覆盖、移动或删除。只有用户明确裁定后才能采用新的不冲突名称。
7. Tag 注释必须包含：commit SHA、branch、remote 状态、每个文件 SHA256 或可完整恢复的 manifest、聚合 SHA256、验证命令与退出码、audit 摘要和已知风险。
8. 用 commit tree 和 tag 注释反向核对步骤 1 的文件和 hash。
9. baseline 完成后才更新 EXECUTION_PLAN.md 的 Progress、Surprises、Decision Log 和 Outcomes，记录 M1 checkpoint；不得移动、改写或改标 legacy reviews、README 或 changelog。
10. 报告 commit SHA、annotated tag、hash、验证结果、未决冲突和恢复点，然后停止。

**当时已经存在的验证命令**

- `git status --short --branch`、`git log`、`git tag`、`git remote -v`；
- PowerShell `Get-Content`、`Get-Item`、`Get-FileHash` 及确定性的文件清单/聚合 hash；
- 只允许运行 M1 输入快照的 `package.json` 在当时实际声明的命令；计划中的未来命令不是 M1 前置条件；
- 对已批准 legacy 快照，预期可用命令为 `npm run check`、`npm run eval:summary`，以及用 `DOCS_BASE=/about-harness/` 运行现有 `npm run check`；执行前仍须从实际 `package.json` 核对；
- `npm audit` 与 `npm audit --omit=dev` 只有在不需要网络且不会改写 lockfile 时才运行；否则记录“未运行”及原因，不因此阻断原样 baseline。

**需要创建但尚不存在的命令**

- 无。未来的 `facts:check`、`reviews:check`、`licenses:check`、`secrets:check`、`lab:smoke`、`lab:typecheck`、`labs:all`、`eval:validate`、`docs:visual`、`verify`、`pages:smoke` 以及全部 `uv` 命令都不是 M1 前置条件，也不得在 M1 假装存在。

**验收证据**

- 初始 commit 与 annotated tag 存在且指向同一快照；
- tag 注释含完整 manifest、命令结果和已知风险；
- baseline 前后所有源文件 SHA256 相同；
- README、changelog、reviews 原路径与内容完全未变；
- remote 仍为空，未 push。

**回滚或恢复**

- 如果 commit 前发现 hash 变化，停止，不创建 commit/tag，报告变化来源。
- 如果 commit 成功但 tag 创建失败，保留 commit，报告部分完成并等待新的 A2 授权；不得伪造完成。
- 不移动、不删除 baseline commit/tag，不用 reset --hard；后续错误通过新 commit 或 revert 处理。

**完成后状态**

- 已满足。当前恢复不再执行本节步骤。

### M2：知识地图、站点骨架、事实注册表和作品集 rubric

**状态：已完成，不得重跑。** 完成记录为 `m2-complete-v1`，result `ade425e`。

**开始授权**

- 历史记录：M2 已由先前 Goal 的 A1+A2 完成；当前恢复不得重跑。

**输入**

- legacy-baseline-v1；
- M1 报告；
- 本文件的范围、知识地图、文件矩阵和作品集要求。

**允许修改的文件**

- EXECUTION_PLAN.md；
- README.md、AGENTS.md、CONTRIBUTING.md；
- LICENSE、LICENSE-DOCS；
- docs/index.md；
- docs/.vitepress/config.mts、docs/.vitepress/theme/**；
- docs/guide/**；
- docs/references/glossary.md、sources.md、fact-registry.md、compatibility.md；
- docs/meta/review-method.md、changelog.md、privacy.md、maintenance.md；
- docs/reviews/legacy/** 及 docs/reviews/v1/ 空结构；
- .github/ISSUE_TEMPLATE/**；
- package.json、package-lock.json；
- 只为 M2 检查所需的 scripts/**。

**具体步骤**

1. 先建立旧页面处置和旧路由映射。
2. 原样移动现有十份 review 到 legacy 区，并显示“未计入 v1”。
3. 修正 README 与 changelog 的十轮完成状态。
4. 建立分层全类型知识地图、前置知识、学习路线和作品集 rubric。
5. 重构首页、导航和侧栏骨架；为有价值旧路由提供重定向或迁移说明。
6. 建立人类可读与机器可读事实注册表。
7. 新增事实日期和新 review 证据结构检查。
8. 运行当前检查并保存 M2 diff、来源和验证证据。
9. 更新 Progress、Surprises、Decision Log 和 Outcomes。

**当时已经存在的验证命令**

- npm run docs:check
- npm run docs:build
- npm run docs:verify-build
- npm run eval:summary
- npm run check

**需要创建但尚不存在的命令**

- npm run facts:check
- npm run reviews:check

**验收证据**

- 新知识地图对文件矩阵全覆盖；
- 每个正式页面有导航或正文入链；
- legacy review 内容 hash 与 M1 对应文件一致；
- README/changelog 不再把 legacy 十轮列为 v1 完成；
- 作品集权重、必过门禁和完成条件可直接评分；
- facts:check 与 reviews:check 正反例通过。

**回滚或恢复**

- 用 legacy-baseline-v1 恢复内容，不删除 baseline tag；
- 移动采用可追溯 rename，失败时恢复原路径；
- 已有用户改动不得被 checkout 覆盖；通过 revert 或精确 patch 恢复。

**完成后状态**

- 已满足并记录为 `m2-complete-v1`；当前恢复不再执行本节步骤。

### M3：Python 最小 harness、TypeScript 映射、容器和离线 runner

**状态：已完成并修正，不得重跑。** `m3-complete-v1` 保留审计；当前有效结果为 `m3-corrected-v1`（`dd419bb`）。

**开始授权**

- 历史记录：M3 已由先前 Goal 的 A1+A2 完成并修正；A3 从未授予。

**输入**

- M2 信息架构和契约；
- 事实注册表；
- 作品集中的最小 harness 要求。

**允许修改的文件**

- EXECUTION_PLAN.md；
- pyproject.toml、Python 锁文件；
- Dockerfile、compose.yaml、.devcontainer/**；
- lab/src/about_harness/{contracts,loop,context,memory,policies,tools,retry,trace}.py；
- lab/src/about_harness/adapters/** 中的 fake、replay 和禁用状态 live adapter 外壳；
- lab/ts/{contracts,minimal-loop}.ts；
- lab/schemas/{task,run,trace,result}.json；
- lab/tests/**；
- docs/implementation/**；
- package.json、package-lock.json；
- M3 所需 scripts/**。

**具体步骤**

1. 定义版本化 task、tool、event、run、trace、result 契约。
2. 实现 fake/replay 驱动的最小 loop。
3. 加入目标、预算、取消、完成和停止传播。
4. 实现上下文、工作记忆、长期记忆接口与失效策略。
5. 实现权限决策、幂等键、超时、重试、退避、checkpoint 和恢复。
6. 实现 trace、成本/延迟字段、错误分类和脱敏。
7. 提供 TypeScript 契约与最小 loop 映射。
8. 建立容器基线和三平台本地回退说明。
9. 把实现行为与教程逐项关联。

**当时已经存在的验证命令**

- M2 完成时的 npm run check
- npm run facts:check
- npm run reviews:check

**需要创建但尚不存在的命令**

- uv sync --frozen
- uv run pytest
- uv run ruff check
- uv run pyright
- npm run lab:smoke
- npm run lab:typecheck

**验收证据**

- 干净容器构建和离线 smoke 日志；
- 正常完成、预算耗尽、超时、取消和无限循环防护测试；
- schema 错误、拒权、重复执行、幂等、重试、并发取消和恢复测试；
- 记忆过期、错误检索、来源污染和删除测试；
- trace 脱敏与 secret 负例；
- Python 类型检查和 TypeScript 编译通过。

**回滚或恢复**

- 容器和测试输出限定在专用 artifact/cache 目录；
- 使用锁文件恢复依赖；
- 失败实现通过 revert 或精确 patch 回到 M2 result；
- live adapter 保持默认禁用，无 API 副作用。

**完成后状态**

- 已满足；有效恢复点为 `m3-corrected-v1`。任何真实 API 需求仍必须申请 A3。

### M4：模型、harness、framework、领域和安全内容

**状态：已完成，不得重跑。** 完成记录为 `m4-complete-v1`（`e7ba394`）。

**开始授权**

- 历史记录：M4 已由先前 Goal 的 A1+A2 完成；事实探针仅限本地/离线，A3 从未授予。

**输入**

- M2 知识地图与事实注册表；
- M3 参考实现、schema 和测试；
- 六个模型家族、三个 harness、四个 framework 和五类 agent 范围。

**允许修改的文件**

- EXECUTION_PLAN.md；
- docs/foundations/**；
- docs/implementation/**；
- docs/models/**；
- docs/harnesses/**；
- docs/frameworks/**；
- docs/domains/**；
- docs/optimization/**；
- docs/security/**；
- docs/references/**；
- docs/.vitepress/config.mts；
- 与上述页面对应的离线测试、示例和事实检查。

**具体步骤**

1. 完成稳定原理：记忆、可靠执行、可观测性、多 agent、人类控制和安全。
2. 完成最小 harness 与 TypeScript 映射教程。
3. 为六个模型家族写身份、provider、adapter、协议、推理和边界。
4. 深度重写 Codex、Pi、Claude Code 指南和迁移对照。
5. 比较四个 framework，明确 SDK、runtime、product 与 harness 边界。
6. 完成五类 agent 的架构、风险、指标和实验入口。
7. 完成威胁模型、注入、秘密/隐私、供应链和事件响应。
8. 每条易变事实就近引用并登记。
9. 所有选择建议绑定工作负载和证据等级。

**当时已经存在的验证命令**

- npm run check
- npm run facts:check
- npm run reviews:check
- npm run lab:smoke
- npm run lab:typecheck
- uv run pytest
- uv run ruff check
- uv run pyright

**需要创建但尚不存在的命令**

- 本里程碑原则上不新增公共命令；若真实发现需要新防回归检查，先记录 Decision Log，再在 A1 范围内增加。

**验收证据**

- 知识地图每个节点都有主页面；
- 易变事实 registry 覆盖率报告；
- 所有示例与 M3 实现或离线探针对应；
- 不存在无工作负载边界的模型排名；
- framework 与产品职责没有误称等价；
- 安全章节覆盖预防、检测、停止、恢复和回归。

**回滚或恢复**

- 保留页面重写前 baseline；
- 事实冲突不强行合并，降级为待核验状态；
- 使用精确 revert 恢复错误主张，不移动 baseline tags。

**完成后状态**

- 已满足并记录为 `m4-complete-v1`；当前恢复不再执行本节步骤。

### M5：六个案例、正式 schema 和评测系统

**状态：已完成，不得重跑。** 当前有效结果为 `m5-complete-v1`（`6aada53`）。

**开始授权**

- 历史记录：M5 已由先前 Goal 的 A1+A2 完成。只交付 E1；A3 从未授予。

**输入**

- M3 runner 与 schema；
- M4 内容、领域风险和事实注册表；
- 六个案例定义与正式比较门槛。

**允许修改的文件**

- EXECUTION_PLAN.md；
- docs/labs/**；
- docs/evaluation/**；
- docs/optimization/experiment.md、debugging.md；
- lab/src/about_harness/integrations/**；
- lab/fixtures/**；
- lab/configs/**；
- lab/results/public/**；
- lab/schemas/**；
- lab/tests/**；
- evals/**；
- 评测和脱敏相关 scripts/**；
- package.json、package-lock.json、pyproject.toml 和 Python 锁文件，仅在案例依赖需要时。

**具体步骤**

1. 建立六类固定 fixture、许可、来源、hash、负例和期望结果。
2. 实现 Browser Use、LangGraph、PydanticAI、LlamaIndex 集成。
3. 完成六篇实验教程的容器和本地回退路径。
4. 将现有示例 JSONL 迁移为正式 task/run/trace/result schema。
5. 实现数据完整性、配对分析、区间/效应量、成本和失败分类。
6. 建立 E0–E3 标记和晋级规则。
7. 建立公开结果脱敏、secret 检查和原始 trace 排除规则。
8. 为 20×3、holdout 和预注册门槛提供可运行模板；无 A3 时只交付协议和 E1 示例，不伪造 E2/E3。

**当时已经存在的验证命令**

- M4 时全部 npm/uv 离线命令
- 现有 npm run eval:summary，但其实现需升级后重新验收

**需要创建但尚不存在的命令**

- npm run eval:validate
- 升级 npm run eval:summary 以支持正式 schema
- npm run results:redact
- npm run labs:all

**验收证据**

- 六个实验在无网络、无凭据环境中通过确定性 smoke；
- 每个实验至少一个安全或错误负例被正确拒绝；
- schema 正反例、数据完整性和脱敏测试通过；
- 公开结果不含 secret、私人路径或未授权原始 trace；
- E1 与 E2/E3 的文字和 artifact 清楚分离；
- 作品集可以使用这些 artifact 评分。

**回滚或恢复**

- fixture 和结果按 hash/version 不可原地覆盖；修正产生新版本；
- 集成失败时保留核心 runner，通过 feature flag 禁用单个 integration；
- 公开结果有污染时立即从工作区隔离，停止后续里程碑并按事件响应处理。

**完成后状态**

- 已满足并记录为 `m5-complete-v1`。当前从 M6 继续；缺少 A3 时 E2/E3 保持未运行。

### M6：来源、许可、隐私、CI、视觉和发布自动化

**状态：已完成，待创建 `m6-complete-v1` checkpoint。**

**开始授权**

- 当前活动 Goal 已授予 M6-M8 的 A1+A2。M6 只创建和本地检查发布自动化；创建 remote、触发 workflow、Pages 或发布仍需 A4。

**输入**

- M2–M5 的完整本地项目；
- 事实、许可、隐私和发布要求；
- 当前 VitePress/GitHub Actions 原型。

**允许修改的文件**

- EXECUTION_PLAN.md；
- docs/references/**；
- docs/meta/**；
- docs/.vitepress/config.mts、docs/.vitepress/theme/**；
- package.json、package-lock.json；
- pyproject.toml、Python 锁文件；
- scripts/**；
- .github/workflows/ci.yml、deploy.yml、facts.yml；
- 测试快照和本地验证 artifact；
- 不允许创建 remote、触发远程 workflow 或发布。

**具体步骤**

1. 完成事实 30/90 天规则和定时外链检查。
2. 完成 MIT/CC BY 4.0 许可边界及宽松依赖门禁。
3. 完成隐私、secret、脱敏和供应链检查。
4. 建立统一 npm run verify 离线门禁。
5. 建立桌面、移动端、窄屏和交互视觉检查。
6. 修正表格、深层锚点、移动菜单和主题等已知视觉风险。
7. 建立 PR CI、main deploy 和定时 facts workflow；第三方 action 固定审核过的 SHA。
8. 建立 Pages base 与线上 smoke 命令，但不连接 remote、不触发发布。

**当时已经存在的验证命令**

- M5 时所有 npm/uv 离线命令
- npm run check
- npm run facts:check
- npm run reviews:check
- npm run lab:smoke
- npm run eval:validate
- npm run eval:summary
- npm run results:redact
- npm run labs:all

**需要创建但尚不存在的命令**

- npm run verify
- npm run docs:visual
- npm run licenses:check
- npm run secrets:check
- npm run pages:smoke -- <published-url>
- 定时外链/事实检查入口

**验收证据**

- npm run verify 在干净环境通过；
- /about-harness/ base 构建与静态 artifact 检查通过；
- 1440、390、320 三种视口截图和数值 fit 记录；
- 搜索、主题、导航、表格、深层锚点和移动菜单通过；
- 许可、secret、脱敏、依赖和 action SHA 报告；
- workflow 只经过静态/本地检查，没有远程 run。

**回滚或恢复**

- 保留原 workflow 和主题 baseline；
- CI 失败时先回滚单一检查或修复脚本，不降低安全门槛来“变绿”；
- 视觉快照按版本保存，不无条件覆盖基准图；
- deploy workflow 在 A4 前保持未触发。

**完成后继续**

- `npm run verify`、`npm run docs:visual` 和本地 `pages:smoke` 已通过；写入 `m6-complete-v1` checkpoint 后自动进入 M7。任何 workflow 远程运行或 Pages 动作始终停留到 A4。

### M7：新 review 01–05

**状态：进行中；Round 01–04 完成，Round 05 待执行。**

**开始授权**

- 当前活动 Goal 已覆盖 M7 内容修正、review artifacts，以及 round 01–05 baseline/result commits 和 annotated tags。
- Round 01–05 连续执行，不逐轮请求确认；A3/A4 均不包含在 M7 中。

**输入**

- M6 完整初稿 result；
- 新 review 方法、严重性、证据模板；
- 对应轮次 rubric。

**允许修改的文件**

- EXECUTION_PLAN.md；
- docs/reviews/v1/round-01.md 至 round-05.md；
- artifacts/reviews/v1/round-01/** 至 round-05/**；
- 为修复已证实发现所必需的任意本地源文件；
- 只允许与对应发现直接相关的脚本和测试；
- .git 内的本地 commits 和 annotated tags，仅在 A2 范围内。

**逐轮关注点与专属证据**

| 轮次 | 关注点 | 专属证据 |
| --- | --- | --- |
| 01 | 范围、术语和知识地图 | 覆盖矩阵、术语冲突、缺口修正和入链检查 |
| 02 | 工程师学习路径、信息架构和作品集 | 任务走查、导航路径、rubric 可评分性和断点修正 |
| 03 | Harness 架构、可靠执行和最小实现 | loop/state/retry/recovery 测试及文档—实现差异 |
| 04 | 模型、provider、协议和调优方法 | 身份/协议探针、证据等级和过度主张修正 |
| 05 | 三个 harness、四个 framework 的事实和兼容性 | 官方来源快照、版本冲突、事实级引用和迁移回归 |

**每轮具体步骤**

1. 冻结上一轮 result 为 baseline commit 和 annotated tag。
2. 在任何修正前运行独立 rubric 并写 findings。
3. 至少修复一个已证实 P1/P2，或一组共同根因 P3 并新增防回归证据。
4. 保存 diff、验证、截图/trace/hash 和未决项。
5. 创建 result commit 和 annotated complete tag。
6. 无实质发现时该次不计数，不创建 complete tag，也不得虚构问题。
7. 更新 Progress、Surprises、Decision Log 和 Outcomes。

**当时已经存在的验证命令**

- M6 的 npm run verify 及全部组成命令
- 全部 uv 离线验证
- Git 只读 diff/status/log/tag 检查

**需要创建但尚不存在的命令**

- 原则上无。只有真实发现证明缺少防回归检查时，才在该轮 diff 中增加并记录理由。

**每轮统一元数据**

- round ID、baseline SHA、result SHA、日期、时区；
- reviewer 角色与 rubric 版本；
- 模型 provider、精确模型 ID、模型版本或解析标识；
- harness 名称、版本、surface 和关键配置；
- system/developer/user 指令版本或内容 hash；
- 使用的 skills、tools、MCP/CLI 及版本；
- OS、容器、Python、Node、浏览器和依赖锁版本；
- offline/live 标识、网络状态和事实来源快照；
- 抽样范围、排除项、命令、退出码和 artifact hash。

**验收证据**

每轮目录必须包含 baseline.json、findings.md、diff.patch、verification.json、unresolved.md，以及所需截图、trace、fixture/result hash。Annotated tag 指向对应 result，并引用证据目录。

**回滚或恢复**

- 每轮 baseline/result tags 不移动、不覆盖；
- 失败修正通过新 revert commit 恢复，不用 reset --hard；
- 中断时以最近完整 baseline tag 恢复，并检查未提交 diff；
- 同一发现不得在多轮重复计数。

**完成后继续**

- Round 01–05 之间不要求人工暂停；写入 M7 checkpoint 后自动进入 M8。

### M8：新 review 06–10 和 release candidate

**状态：未开始。**

**开始授权**

- 当前活动 Goal 已覆盖 M8 内容修正、review/release artifacts，以及 round 06–10 baseline/result commits、complete tags 和 RC commit/tag。
- Round 06–10 连续执行，不逐轮请求确认；M8 不得使用 A4。

**输入**

- M7 round-05 result；
- 前五轮未决项；
- 完整离线门禁和发布模板。

**允许修改的文件**

- EXECUTION_PLAN.md；
- docs/reviews/v1/round-06.md 至 round-10.md；
- artifacts/reviews/v1/round-06/** 至 round-10/**；
- artifacts/release/v1/**；
- 为修复已证实发现所必需的任意本地源文件；
- 本地 .git commits/tags，仅在 A2 范围内；
- 不允许 remote、push、PR、Pages 或发布。

**逐轮关注点与专属证据**

| 轮次 | 关注点 | 专属证据 |
| --- | --- | --- |
| 06 | 六个教程、容器和跨平台复现 | 干净容器日志、三平台说明、失败/回滚证据 |
| 07 | 评测、统计、holdout 和数据完整性 | 配对/holdout 审计、错误数据拒绝和公开结果检查 |
| 08 | 安全、隐私、许可和供应链 | 注入/泄露负例、许可、secret、依赖和 action SHA 报告 |
| 09 | 跨 harness/领域迁移、中文可读性和视觉体验 | 迁移回归、歧义清单、1440/390/320 截图与交互 |
| 10 | 发布、来源时效、全局一致性和最终主张 | Pages base、事实 30 天检查、全量门禁和声明审计 |

**每轮具体步骤**

1. 冻结上一轮 result 为 baseline commit 和 annotated tag。
2. 在任何修正前运行该轮独立 rubric 并写 findings。
3. 至少修复一个已证实 P1/P2，或一组共同根因 P3 并新增防回归证据。
4. 保存 diff、验证、截图/trace/hash 和未决项。
5. 创建 result commit 和 annotated complete tag。
6. 无实质发现时该次不计数，不创建 complete tag，也不得虚构问题。
7. 更新 Progress、Surprises、Decision Log 和 Outcomes。

**每轮统一元数据**

- round ID、baseline SHA、result SHA、日期、时区；
- reviewer 角色与 rubric 版本；
- 模型 provider、精确模型 ID、模型版本或解析标识；
- harness 名称、版本、surface 和关键配置；
- system/developer/user 指令版本或内容 hash；
- 使用的 skills、tools、MCP/CLI 及版本；
- OS、容器、Python、Node、浏览器和依赖锁版本；
- offline/live 标识、网络状态和事实来源快照；
- 抽样范围、排除项、命令、退出码和 artifact hash。

计数门槛和恢复原则与 M7 及第 12 节一致；本节的逐项内容优先用于 round 06–10。

**当时已经存在的验证命令**

- M6 的全部稳定命令；
- M7 中因真实发现新增的检查；
- 全部本地 Git 证据检查。

**需要创建但尚不存在的命令**

- 原则上无；release candidate 只组合既有稳定门禁，不临时发明未测试的发布检查。

**验收证据**

- 新十轮连续可追溯，无跳号、无回填、无移动 tag；
- 无开放 P0/P1；
- 没有阻断学习成果、实验复现、安全或发布的 P2；
- release candidate 含源码/页面清单、commit SHA、事实时效、许可、依赖、已知风险和全量验证摘要；
- 所有易变事实仍在发布前 30 天窗口内；
- 没有远程操作。

**回滚或恢复**

- 按 round baseline/result tag 恢复；
- RC 发现问题时回到对应 review 轮次之后创建修复 commit，并重跑受影响门禁；
- RC 不覆盖已有 artifact，使用新版本目录；
- 不通过降低门禁或删除失败证据来完成 M8。

**完成后必须暂停**

- Round 06–10 之间不要求人工暂停，但每轮仍须满足独立证据要求。
- **M8 完成后必须暂停。** 报告 RC、十轮证据和拟发布动作，等待单独 A4 授权。

### M9：经用户单独授权后的远程操作与发布

**状态：未开始。**

**开始授权**

- 必须获得 A4，明确 owner/repo、允许的 remote、push、PR、Pages 和发布动作。
- A4 不自动包含 A3；真实 API 仍需单独授权。
- 如果 M9 需要修改内容，停止并返回 M8；不得在发布阶段临时修正文档。

**输入**

- M8 release candidate commit/tag；
- 用户指定的 GitHub owner/repo；
- 用户批准的外部动作清单；
- 全量本地验证和拟发布 URL。

**允许修改的文件或状态**

- 本地内容文件：原则上零修改；
- .git/config、remote refs；
- 用户批准的 GitHub repository、PR、branch protection、Pages 和 workflow 状态；
- 如果发现内容缺陷，只能停止并回到 M8。

**具体步骤**

1. 只读确认 GitHub owner/repo、默认分支、可见性和 Pages 策略。
2. 按授权创建或配置 remote，不覆盖已有 remote。
3. 推送明确的 branch/tag；禁止 force push。
4. 创建 PR，等待全部必需检查通过。
5. 配置分支保护和 GitHub Pages 的 GitHub Actions 来源。
6. 合并经批准的 PR，观察 deploy workflow。
7. 运行线上 pages:smoke 和人工视觉抽查。
8. 保存 URL、PR、workflow run、deployment、SHA 和 smoke 证据。
9. 发布成功后在任务报告中给出 Outcomes；M9 不修改本地内容文件。若要把结果回填本文件，须另获 A1，若要提交该回填还须另获 A2；任何失败不得宣告完成。

**当时已经存在的验证命令**

- npm run verify
- npm run pages:smoke -- <published-url>
- M8 全部稳定离线命令
- git status、log、remote、ls-remote 等只读检查

**需要创建但尚不存在的命令**

- 无。M9 只能使用 M6–M8 已验收的发布和 smoke 入口。

**验收证据**

- 远程 commit 与 M8 RC SHA 一致；
- PR 和必需检查通过；
- Pages deployment URL 和 workflow run 可追溯；
- 关键页面、搜索、主题、移动菜单、深层锚点和资源在线通过；
- 没有 force push、未授权 secret 或超范围 API 调用。

**回滚或恢复**

- Remote 配错时停止，不删除未知 remote；等待用户指示。
- Push 后发现问题时通过新 PR/revert 处理，不改写公开历史。
- 部署失败时保留上一成功 artifact，返回 M8 修复。
- 可按用户授权禁用 Pages 或回滚到上一已知良好 release。

**完成后是否必须暂停等待用户**

- **必须暂停并报告最终 URL、SHA、workflow 和 smoke 证据。**

## 11. 稳定命令接口

### 11.1 M6 后已验收的稳定接口

以下接口已在 2026-08-21 的 M6 全量验证中通过，可作为 M7/M8 输入：

- 文档：`npm run docs:check`、`docs:build`、`docs:verify-build`、`docs:project-base`、`docs:visual`；
- 事实与 review：`npm run facts:check`、`facts:release`、`links:check`、`reviews:check`；
- Lab 与评测：`npm run lab:smoke`、`lab:pyright`、`lab:typecheck`、`labs:all`、`eval:validate`、`eval:summary`、`results:redact`；
- 治理与安全：`npm run licenses:check`、`secrets:check`、`workflows:check`；
- 正反例：`npm run checks:self-test`、`m5:self-test`、`m6:self-test`；
- 聚合：`npm run check`、`npm run verify`；
- Python：`uv sync --frozen`、`uv run --frozen --offline pytest`、`uv run --frozen --offline ruff check`、`uv run --frozen --offline pyright`；
- 发布烟测：`npm run pages:smoke -- <published-or-local-base-url>`。

`npm run verify` 聚合全部离线 PR 门禁；`docs:project-base` 显式验证 `/about-harness/` base。本地 `pages:smoke` 必须用相同 base 启动 preview。网络外链探针只存在于定时 workflow 模板，当前未运行，也不构成 A4 发布证据。

### 11.2 M7/M8 命令变更规则

M7/M8 原则上复用第 11.1 节接口。只有真实 finding 证明缺少防回归能力时，才可新增命令；新增命令必须在对应 round 的 findings、diff、正反例和 verification 中出现，不能临时降低或绕过已有门禁。

## 12. 十轮 Review 统一证据契约

当前 round-01 至 round-10 只作为 legacy，不计入 v1。

一轮只有满足以下全部条件才计数：

1. 上一轮 result 已冻结为 baseline commit 和 annotated tag。
2. Findings 在修改前产生，包含复现证据和严重性。
3. 至少修复一个已证实 P1/P2，或一组共同根因 P3 并增加防回归证据。
4. 纯错字、格式、轮次号或无证据改写不计数。
5. 保存 baseline/result SHA、diff、命令与退出码、截图/trace/hash 和未决项。
6. 保存第 M7/M8 节规定的模型、harness、指令、工具和环境元数据。
7. Result commit 和 annotated complete tag 只在验证通过后创建。
8. 无实质发现时不计数，不得虚构问题或事后回填发现。
9. 同一根因不得跨多轮重复计数。
10. 最终无 P0/P1，也无阻断学习、复现、安全或发布的 P2。

## 13. Idempotence & Recovery

### 13.1 通用幂等原则

- 每次开始前读取 Progress、Decision Log、Surprises 和上次恢复点。
- 先运行 git status 和只读 hash，再决定是否继续。
- 所有生成物写入里程碑和版本专属目录，不覆盖上一轮证据。
- Fixture、schema、结果和事实记录使用显式版本或 hash。
- 可重跑命令不得重复产生外部动作；live 和 remote 命令默认关闭。
- 不使用 reset --hard、checkout --、force push 或移动已发布 tag。
- 不删除无法确认归属的文件、remote、artifact 或用户改动。

### 13.2 中断恢复协议

1. 核对当前用户授权原文、授权层级、覆盖里程碑和暂停条件；缺少、过期或含糊时停止并等待用户。
2. 读取 Progress 中最后一个完整里程碑和恢复点。
3. 核对 baseline/result tag、工作树 diff 和证据目录。
4. 若有未提交改动，先只读审计其归属；不得覆盖。
5. 从最近完整 baseline 或 result 开始重跑验证。
6. 记录恢复原因、已重跑命令和仍未验证项。
7. 任何不一致都先暂停，不通过猜测推进。

### 13.3 各类失败恢复

- 安装/构建失败：保留锁文件和日志，在临时容器重现；不直接升级全部依赖。
- 文档迁移失败：恢复旧路由与文件，不删除 legacy 原件。
- Schema 迁移失败：保留旧版本读取器，生成新版本而不原地改写历史数据。
- 实验失败：区分模型、adapter、harness、fixture 和基础设施，不自动重试到“成功”。
- Secret/隐私事件：立即停止、隔离 artifact、撤销凭据、保存取证并请求用户。
- Review 中断：回到该轮 baseline tag，不创建 complete tag。
- 发布失败：保留上一成功部署，返回 M8，不在 M9 临时修改内容。

## 14. Surprises & Discoveries

本节记录改变计划或风险判断的事实；不得只记录成功。

### 已知发现

1. 当前分支为 `main`，HEAD 为 `6aada53`；从 `legacy-baseline-v1` 到 `m5-complete-v1` 是无分叉的线性历史，相关标签均为 annotated tags。
2. `legacy-baseline-v1` 指向 `2847afc`；`m1-complete-v1` 至 `m5-complete-v1` 分别指向已验收的线性提交，M1-M5 不得重跑。
3. 当前没有 remote；A3 和 A4 未授权，真实 API、费用、remote、push、PR、Pages 和发布继续禁止。
4. M4 的 12 条登记事实均为 E1/verified；未运行真实模型性能测试。
5. M5 的离线集成和 12 条合成配对样例只证明 E1 流程；完整 120-run 正式矩阵未运行。
6. M6 已产生 workflow、docs、scripts、package 配置和本地 artifacts；全量 `npm run verify` 于 2026-08-21 通过。
7. M6 本地 Pages smoke 首次因 preview 使用错误 base/旧构建而失败；以 `DOCS_BASE=/about-harness/` 重启 preview 后，16 个路由和 23 个同源资源通过。这是本地服务恢复问题，不是站点 artifact 缺陷。
8. In-app Browser 可复核 1280px 桌面布局、评测表格与深层锚点；其当前 surface 不提供 viewport capability，因此 1440/390/320 的交互与 overflow 证据由固定 Playwright/Chromium manifest 和截图承担。
9. Round 01 首个 complete tag 之前的 `git diff --check` 报告 `diff.patch` 的上下文空行尾随空格，但命令串未停止。该 tag 保留为无效审计对象；使用 `--unified=0` 重建可检查的 patch，并以新的 corrected tag 验收，后续提交命令必须显式检查退出码。
10. Round 02 发现正式学习入口仍回流 legacy `/practice/`、环境页保留未来时态且作品集缺少统一评分锚点；修正后新增 learning-path 正反例门禁并由全量 `npm run verify` 验收。
11. Round 03 复现了负数成本绕过预算和“记录退避但零等待”；现已在 adapter/action/checkpoint 边界验证控制面字段、执行真实可注入 sleeper，并明确总 deadline 不抢占任意阻塞 Python callable。
12. Round 04 依据实际获取的 OpenAI Docs 发现 Responses 工具循环、reasoning state 与 model-dependent effort 没有进入 adapter 验收；现已登记官方事实、补充双路径探针并加入正反例门禁。该技能使 OpenAI 协议主张限定到官方页面与 2026-08-21 响应 hash，没有扩展为 live 模型结论。

后续每次新增发现使用格式：

- 日期/时区：
- 里程碑与输入 SHA：
- 发现：
- 证据：
- 对范围、顺序或风险的影响：
- 决策或待确认项：

## 15. Decision Log

| 日期 | 决策 | 理由与影响 |
| --- | --- | --- |
| 2026-08-20 | 主读者为工程师，中文正文加英文术语 | 控制基础解释量，不维护英文镜像 |
| 2026-08-20 | 采用分层全覆盖 | 通用机制完整；coding 深挖；其他四类各有实操 |
| 2026-08-20 | 深度 coding harness 仅 Codex、Pi、Claude Code | 避免首版产品矩阵失控 |
| 2026-08-20 | 框架为 LangGraph、OpenAI Agents SDK、Google ADK、AutoGen | 覆盖状态图、厂商 SDK 与多 agent 路线 |
| 2026-08-20 | 非 coding 实操为 Browser Use、LangGraph、PydanticAI、LlamaIndex | 开源、本地可复现优先 |
| 2026-08-20 | 模型家族为 OpenAI、Anthropic、Google、Qwen、DeepSeek、Llama | 同时覆盖闭源、中文和开放权重生态 |
| 2026-08-20 | Python 主线、TypeScript 映射、容器基线 | 适配选定生态并保持跨平台复现 |
| 2026-08-20 | 作品集六项，必过门禁后按 40/25/20/15 评分，80 分通过 | 把“学完”转为可验证产物 |
| 2026-08-20 | 正式比较至少 20 任务×3 重复，holdout 20% 且至少 5 题 | 防止低样本过度结论 |
| 2026-08-20 | 采用 E0–E3 分级 | 区分假设、离线流程、真实烟测和正式比较 |
| 2026-08-20 | 易变事实发布前 30 天复核，90 天显示过期 | 控制产品文档陈旧风险 |
| 2026-08-20 | 现有十轮不计入 v1 | 缺少冻结基线和差异证据 |
| 2026-08-20 | 新十轮由多视角 agent 完成 | 不要求逐轮人工确认，但记录完整 reviewer 元数据 |
| 2026-08-20 | 首次公开发布在新十轮后 | 不提前发布 beta |
| 2026-08-20 | 文档 CC BY 4.0、代码 MIT，宽松依赖优先 | 明确复用与依赖边界 |
| 2026-08-20 | 不采集 analytics，不声明 WCAG AA | 控制首版范围和隐私 |
| 2026-08-20 | M1 必须原样 baseline，legacy 移动推迟到 M2 | 避免先改历史再建立证据 |
| 2026-08-20 | A1–A4 分层授权 | commit/API/remote 不得由普通里程碑隐含授权 |
| 2026-08-20 | 里程碑固定为 M0–M9 | 与批准的交付契约完全一致 |
| 2026-08-20 | 本地修改、Git 对象、API/费用、remote/发布分为 A1–A4 | A2、A3、A4 均须明确授权，不能由普通里程碑或较低授权隐含获得 |
| 2026-08-20 | 接受现有 M1-M5 线性历史和 annotated tags | commits、tags 和验证证据有效；删除或重跑会破坏审计链 |
| 2026-08-21 | M6-M8 由当前活动 Goal 一次授予 A1+A2 | 连续执行到 M8；授权不绑定任何文件 SHA256，A3/A4 仍独立禁止 |

新决策必须记录日期、备选方案、选择理由、影响文件和是否需要契约变更。

## 16. Outcomes & Retrospective

### M0 当前结果

- 执行计划已保存并修订为自包含版本。
- M0 已完成；其初始指纹和授权记录只作历史审计，不控制当前 M6 执行。

### M1–M9 当前结果

- M1 已完成：`legacy-baseline-v1`（`2847afc`）和 `m1-complete-v1`（`48950fa`）。
- M2 已完成：`m2-complete-v1`（`ade425e`）。
- M3 已完成并修正：`m3-complete-v1`（`f61b8c7`）保留审计，当前结果为 `m3-corrected-v1`（`dd419bb`）。
- M4 已完成：`m4-complete-v1`（`e7ba394`）。
- M5 已完成：`m5-complete-v1`（`6aada53`）。
- M6 已完成：109 个 Markdown/路由、110 个 HTML、27 项 pytest、Ruff、Pyright、TypeScript、事实时效、许可、秘密、workflow、视觉和 canary 门禁通过；本地 Pages smoke 覆盖 16 路由与 23 个同源资源。
- M6 证据：`artifacts/visual/m6/manifest.json` 和 6 张固定截图；没有远程 workflow run、Pages、真实 API、凭据或费用。
- M7 进行中：Round 01–04 已由各自 annotated complete tag 绑定；Round 04 内容结果为 `58777d9`，事实注册表含 15 条 verified claim。Round 05 待执行。M8-M9 尚未完成，M9 仍需单独 A4。
- 上述 commits 和 annotated tags 是不可移动的恢复证据；本文件的未提交状态变化不得覆盖它们。

### 后续里程碑记录模板

每个里程碑完成或中止时追加：

- 计划目标：
- 实际完成：
- 未完成与原因：
- 修改文件和 result SHA：
- 验证与证据：
- 新发现：
- 与计划的偏差：
- 安全、费用和外部状态：
- 可复用经验：
- 下一里程碑前置条件：
- 用户确认状态：

### 项目最终回顾要求

M9 后必须总结：

- 学习成果和作品集是否可实际完成；
- 六个案例和正式评测是否可复现；
- 新十轮是否满足证据合同；
- 哪些模型/产品结论只有 E0、E1、E2 或 E3；
- 事实、依赖和安全残余风险；
- 发布 URL、SHA、workflow 和线上 smoke；
- 下一次 30/90 天事实刷新日期；
- 未完成范围和不应被误解为已完成的事项。

## 17. 当前停止点

M1-M6 已完成且不得重跑。M7 Round 01–04 已完成，当前动作是以 Round 04 完整证据 result 作为 Round 05 baseline；Round 05 完成后进入 M8。

当前活动 Goal 授予 M6-M8 的 A1+A2，不绑定任何文件 SHA256。禁止真实 API、凭据、费用、remote、push、PR、Pages 和发布；仅在需要 A3/A4、真实安全事件、无法非破坏性合并的用户改动或完成 M8 时停止。

### 待用户确认

- 若未来需要 E2/E3：具体模型、provider、凭据提供方式、允许的数据范围和费用上限；默认预算仍为 0。
- M9 前：GitHub owner/repo、仓库可见性、默认分支，以及允许的 remote、push、PR、Pages、合并和发布动作。
