# 全站内容复审与本地交付报告

审核日期：2026-09-21。结论：**内容必修问题全部闭环，本地仓库验收通过，可以提交本轮修订。** 产品资料仍有明确的来源与实验边界，不将静态检查、离线样例或站点浏览器检查解释为真实 Agent 产品可用性或模型质量。

## 范围与可追溯基线

本轮继续使用原 `main` checkout，基线为 `bd5ed23f8b1904c8f276cecff4fb6ae490dcbdd0`。原有四处 Travel 练习相关改动（导航、start、capstone、interview-practice）均纳入审核和提交范围；未创建额外工作区。交付止于本地 Git commit，不含 push、PR 或发布。

初审覆盖 **108 个仓库内容 Markdown、其中 87 个站点页面**；改写后全量复审覆盖 **120 个内容 Markdown、其中 99 个站点页面**。审计报告本身另计。规则文件按约束核验，教程引用的配置、fixture、实现和命令同步对照。

- [initial.md](./initial.md) 与四份初审 JSON 保留改写前发现；`initial-freeze.json` 的五项原始字节哈希全部匹配。审计目录的 `.gitattributes` 防止提交时换行规范化改变冻结证据。
- [coverage.md](./coverage.md) 保留原 108 页初审表，追加 120 页三维复审结论、修订位置和问题闭环。
- `baseline.json` 记录原有修改与源文件身份；`review-baseline.json` 对应首次复审前版本；`acceptance-baseline.json` 和 `content-acceptance.json` 绑定最终执行/审阅内容。整合检查未发现内容身份漂移。

## 从整体到页面的改进

| 层级 | 原问题 | 最终处理与读者收益 |
| --- | --- | --- |
| 定位 | 生态范围偏模型与少数 Coding Harness，未说明能力层之间关系 | 新增九层生态地图：模型服务、使用界面、运行时、协议、知识、长任务、应用形态、评测观测、安全研究；按责任寻找下一步 |
| 学习结构 | 学习路线与知识地图重复，首屏术语密度高 | start 保留规范学习路线，初次系统学习沿路线 A；roadmap 负责依赖索引与查漏；核心定义页补最小责任对照 |
| 机制准确性 | 重采样与盲重试、oracle 与选择器、阈值方向及协议等价性混淆 | 用固定候选、严格比较符和明确聚合记录解释；独立生成不再要求相同 call ID/参数；completion、checkpoint、canonical JSON 哈希均与代码一致 |
| 教程闭环 | Travel 私有依赖、漂移测试总数、扫描与脱敏混淆 | 五卡只依赖本仓库；预期以业务断言为主；补输入、失败、停止与回滚；说明扫描不会自动生成安全副本 |
| 安全边界 | worktree 被当作沙箱，纯回答完整性未形成可判定案例 | 分开 Git 改动隔离与 OS 强制边界；补无工具/零副作用仍能失败的答案完整性 oracle |
| 产品时效 | 易变事实过粗、AutoGen 生命周期及新产品覆盖缺失 | 实读一手资料，增加生命周期与条件加载说明；统一事实、术语、来源、兼容矩阵及导航 |

新增 12 个站点页面：8 个生态专题、Gemini CLI、Microsoft Agent Framework、现代 Agent 运行时、生态工作坊。LangGraph/Deep Agents、OpenAI Agents SDK、ADK、MAF/AutoGen、PydanticAI、CrewAI、MCP Tasks/Apps、A2A、Agent Skills、RAG/LlamaIndex、持久运行、多模态、OpenTelemetry GenAI 及指定基准均有定位、机制、边界和进一步阅读入口。

内容深度按作用分配：基础页解释机制；优化页讨论测量与代价；实践页提供闭环；新增产品卡说明如何选择和怎样核验。没有用产品名清单代替机制，也没有把最新榜单当作通用排名。

## 独立第二轮审核

三名未负责对应正文改写的审阅者分别全文审阅原则/安全/评测 **34 页**、产品/领域 **31 页**、学习/实践/引用及仓库说明 **55 页**，共 120 个唯一文件。

初审 **28 项**全部闭环。第二轮新增 **25 项**发现（含初审修复未充分之处），修复后均由原独立审阅者复验通过；没有用绿色测试取代逐页语义判断。首次失败状态保存在 `second-principles.json`、`second-learning.json` 的 `first_review`，问题、影响及判据见 [second-findings.json](./second-findings.json)，复验记录见 `recheck-principles.json`、`recheck-learning.json`；产品审阅记录包含修复后的逐页结论。

特别修正了：Claude allow 规则不是封闭白名单；Codex permission profile 与 approval 独立、workspace-write 不自动限制所有读取；AGENTS 加载条件与例外；AutoGen 现代模块名；模拟能力判断仅产生计划调用；高基数 trace 身份不能与 metric 标签混写。

## 来源、日期与当前覆盖

事实表保持原 **11 列接口**和 E0–E3 定义，共 **59 条：58 verified、1 pending，全部为 E0**。实际核对日期为 2026-09-21；DeepSeek 不可达项保留其旧日期与 pending，没有补写当前已核验。

`source-fetches.json` 保存可达性、重定向与响应身份；`source-reviews.json` 的 59 个 `evidence_ref` 唯一指向 [source-evidence-notes.json](./source-evidence-notes.json) 的段落定位、必要短摘录、支持范围和边界。58 份可用缓存/本地定义的登记哈希均复算匹配。`.plain` 提取文本与原响应、CRLF 与 LF 的哈希口径分别说明；哈希不替代阅读。

初审指定的 Claude memory、LangGraph、Agents SDK、ADK、AutoGen 五条超期事实，已由独立审阅者实际复读对应段落并核对缓存身份。MAF 的 MCP 入口另补维护仓库实例目录的来源证据。Gemini 生命周期公告限定适用用户；GAIA 数据卡访问失败时仅采用作者论文描述问题设定；旧 τ-bench 与当前 τ³ 入口分开。

“覆盖最新内容”限定为截至核对日上述能力层与登记主张的一手来源复核，不表示穷尽生态或证明账号功能可用。

## 实际验证

本地环境：Windows PowerShell，Node.js **24.14.0**、Python **3.11.15**、uv **0.11.16**，依赖使用仓库锁文件。项目 CI 最低 Node 22 基线本轮未另起环境执行，不将本机 Node 24 结果等同 Node 22 实测。

| 证据类别 | 实际执行 | 结果 | 证据位置 |
| --- | --- | --- | --- |
| 内容审阅 | 120 页全文三维审核、28 初审与25复审问题复验 | pass | coverage、second-*、recheck-*、content-acceptance |
| 仓库聚合 | `npm run check` | exit 0 | final-validation.json |
| 来源结构 | `npm run facts:check` 及30天 freshness | exit 0，59项、0 stale | final-validation.json |
| 站点 | `npm run pages:check` | exit 0；99页、100 HTML含404 | final-validation.json |
| 完整门禁 | `npm run verify` | exit 0；186 pytest、Ruff、Pyright、TS及门禁负例通过 | final-validation.json |
| 文档命令 | 70 条去重、规范化续行后的可直接执行离线 uv 命令 | 全部符合预期；65退出0，5预期退出1 | tutorial-execution.json |
| 失败演练 | PowerShell临时副本篡改 fixture | exit 1，`hash mismatch for input.json` | fixture-tampering.json |
| 新增E1 | 协议/授权集合、直接/程序化汇总、候选选择与弃权、纯答案完整性 | 正反例及边界断言通过 | targeted-validation.json、fixture及tests |
| 自动浏览器 | 1440、390、320px；搜索“生态”、导航、暗色、锚点、长表滚动、新入口、代码块 | pass；24张截图、无运行时错误 | visual-review.json、visual/metrics.json |
| 人工视觉 | 实际查看首页、生态入口、工作坊、迁移、评测的所列首屏与细节取景 | pass，未见遮挡/正文溢出/缺字 | visual中的两张实际截图拼图 |
| 外部可达性 | `npm run links:check -- --network`，62个HTTPS地址 | 60可达，2个已分类例外；整体exit 1 | external-links.json |
| 提交前 | 冻结哈希、最终内容身份、diff空白、敏感信息、范围 | pass | evidence-consistency.json及本地Git检查 |

初次整合的四条聚合检查也通过，保留在 `validation.json`；部分复审修订发生在其后，因此最终验收以 `final-validation.json` 为准。最终批处理曾有两个会话无诊断中断，记录在 `validation-interruptions.json`；未完成部分没有计为通过，随后逐条重跑并持久记录。

教程门禁只扩展确定性契约：实现/实践页面的命令、脚本与引用存在性，以及故意破坏真实页面副本后的拒绝。它不靠字数、关键词数量或测试数量判定内容质量。

## 剩余边界与未执行项

- **pending / blocked**：DeepSeek 当前官方 API 文档连接失败，保留待核实事实；不能据此给出最新价格、别名或兼容性结论。外链另一失败是教程中的 `example.invalid` 保留占位域，按设计不可解析，不是产品来源。
- **not_run**：真实模型/API、第三方框架集成、账号资格、生产安全/性能及 E2/E3 实验；没有凭据、费用或对外写入。
- **not_run**：macOS/Linux shell、Node 22 专用环境及可选 Docker 路径。已执行 Windows 本地路径与相同测试参数，不将其冒充跨平台实测。
- 临时 fixture 的递归清理命令被自动策略拒绝；改为保留仓库外合成副本完成失败验证，清理标记 not_run，没有绕过策略。
- 人工截图检查仅覆盖 `visual-review.json` 列明的取景；全部页面做了构建/路由检查，但没有声称逐页逐像素人工视觉验收。
- VitePress 仍提示部分 bundle 大于500 kB；构建与功能检查通过，本轮不把它解释为已完成加载性能优化。

本地提交包含报告、正文、导航、事实资料、教学 fixture/测试与验证脚本。提交身份以 Git 历史及交付消息中的 commit hash 为准；本报告不嵌入无法自引用的自身提交哈希。
