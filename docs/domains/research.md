# 研究 Agent 模式

Research agent（研究 Agent）的目标不是生成一篇流畅综述，而是把问题拆成可验证主张，找到并固定合适来源，记录支持、反驳、冲突与缺口，最后输出边界清楚的综合结论。

```text
question → scope → subquestions → source candidates
        → opened snapshots → claim/evidence ledger
        → conflict & gap analysis → synthesis/abstain
        → citation validation → report + unresolved
```

搜索结果数量、语言自信或“多个网页都这么说”都不能替代这条证据链。

## 先定义研究问题

一个可执行 research brief（研究简报）至少包含：

| 字段 | 要回答的问题 |
| --- | --- |
| Decision/use | 结论要支持什么决定，错误成本是什么？ |
| Main question | 精确问题是什么，不包含哪些相邻问题？ |
| Population/scope | 对象、地区、语言、版本和时间窗口？ |
| Claim types | 需要事实、因果、预测、规范还是比较？ |
| Source policy | 哪些来源可用、优先级和排除规则？ |
| Freshness | “当前”以什么 checked/effective date 判断？ |
| Evidence threshold | 每类主张至少需要何种证据？ |
| Deliverable | 表格、报告、清单还是决策备忘录？ |
| Budget | 搜索轮次、来源数、时间、费用和人工上限？ |
| Stop rule | 何时足够、何时结论不足、何时交给人？ |

“调研一下 X”通常无法验收。把它改写为“截至日期 D，在范围 S 内，比较 A/B 的机制、已核验产品事实、限制与未决项，并逐项引用”才能约束检索与输出。

## 五种主张需要不同证据

| Claim type（主张类型） | 示例 | 最低证据思路 | 常见误用 |
| --- | --- | --- | --- |
| Descriptive（描述） | 某版本暴露字段 X | 官方文档/目标版本实测 | 用二手博客替代版本事实 |
| Comparative（比较） | A 在任务集上更快 | 同 workload/config 的配对实验 | 跨榜单直接排序 |
| Causal（因果） | 改动 X 导致 Y | 控制变量、机制和反事实 | 从相关性写成原因 |
| Forecast（预测） | 下季度成本会下降 | 假设、模型、区间和情景 | 把单点预测当事实 |
| Normative（规范） | 应采用 A | 事实 + 明确价值/约束 | 隐藏权重与责任人 |

研究 Agent 应在 claim schema 中标类型。来源能证明“官方声明支持”不等于能证明“本项目可用”；一次实验成功也不能证明通用因果。

## 状态不是一段对话历史

推荐将研究状态结构化：

```text
research_id / brief_version / config_hash
main_question / scope / assumptions
subquestions / search_queries / query_results
source_candidates / opened_snapshots / excluded_sources
claims / evidence_links / counterevidence
conflicts / gaps / unresolved / stop_state
draft_sections / citation_checks / final_decision
budget_used / trace / checked_at
```

每次恢复从 checkpoint 读取已打开来源、未决主张和剩余预算，避免重复搜索与重复计费。Compaction 不能丢掉反证、排除理由或“尚未打开”的状态。

## 发现候选不等于获得证据

搜索流程至少分四层：

1. **Query result（搜索结果）**：标题、摘要、URL，只用于候选发现；
2. **Opened source（已打开来源）**：实际访问并读取的页面/文件；
3. **Snapshot（固定快照）**：保存版本、日期、hash 与可定位内容；
4. **Evidence span（证据片段）**：直接支持或反驳某条主张的段落/表格/代码位置。

搜索摘要可能截断、过期或脱离上下文，不能直接进入 citation。无法打开的候选标 `unavailable`，不要从 snippet 补全主张。页面只有导航或营销口号时，也不自动成为足够证据。

### Query 设计

先从 subquestion 生成最小查询，再按缺口扩展：

- 精确名词、版本、日期和官方域名；
- 定义/规范查询与实现/行为查询分开；
- 支持证据与反例/限制分别检索；
- 来源冲突后针对 scope、version、effective date 搜索；
- 不用最终结论作为查询词反复寻找“同意者”。

保存 query、时间、工具、参数、页码/游标和返回候选。搜索排名会漂移；只保存最终 URL 无法复现发现过程。

## 来源政策先于搜索

Source policy（来源政策）决定什么证据可进入哪类主张：

| 来源 | 适合支持 | 仍需注意 |
| --- | --- | --- |
| 标准/法律/官方规范 | 定义、要求、版本事实 | 生效范围、修订、司法辖区 |
| 产品官方文档/维护仓库 | 当前接口与维护者声明 | Rolling 页面、账号/区域差异 |
| 论文/技术报告/数据集 | 方法与受限实验结果 | Population、基线、统计与复现 |
| 一手公告/财报/记录 | 组织自己的事件与数字 | 自我陈述偏差、口径变化 |
| 高质量二手分析 | 背景、线索和综合 | 回到一手材料核对关键数字 |
| 论坛/社媒/用户报告 | 发现故障假设 | 身份、选择偏差和不可复现 |

“官方”也不是万能最高分。官方文档适合证明它声明了什么，不足以证明产品在你的账号、区域、版本和 workload 中可用或更好。为每类 claim 预先定义 source eligibility，而不是结果出来后挑对自己有利的层级。

## 固定来源身份与许可

每个 opened source 至少记录：

```text
source_id / canonical_url_or_document_id
publisher / author / source_type
title / version / commit / publication date
effective_from / effective_to（若适用）
opened_at / retrieved_at / content_hash
locator scheme / language
license / access class / personal-data status
redirect chain / parser version
```

Rolling 网页保存实际检查日期和必要摘录；代码仓库尽量固定 tag/commit；PDF/数据集记录文件 hash 与页/表 locator。引用许可不等于允许把整份内容放进公开 fixture，公开前检查转载范围和个人数据。

抓取失败、登录墙、robots/policy 限制或许可不清时，保存失败状态与替代来源，不绕过访问控制。

## 建立 Claim–evidence ledger

Claim–evidence ledger（主张—证据账本）是研究的核心中间产物：

```json
{
  "claim_id": "c-12",
  "text": "限定范围内的可验证主张",
  "type": "descriptive",
  "scope": {"version": "...", "region": "...", "as_of": "..."},
  "status": "supported | contradicted | conflict | insufficient",
  "evidence": [
    {
      "source_id": "s-03",
      "locator": "section-or-page",
      "relation": "supports | contradicts | qualifies",
      "quote_or_data": "必要的短摘录",
      "checked_at": "YYYY-MM-DD"
    }
  ],
  "reasoning_summary": "从证据到主张的可审阅连接",
  "limits": [],
  "unresolved": []
}
```

主张粒度要能由一个或少数 evidence spans 判断。把定义、数字、原因和建议塞进一句话，会出现“引用只支持其中一半”的复合主张问题。

### 状态判定

- `supported`：合格证据直接支持限定主张，且没有未解释的关键反证；
- `contradicted`：合格证据直接否定主张；
- `conflict`：合格证据在同一 scope 下给出不可同时成立的结果；
- `insufficient`：证据缺失、只间接相关、范围不匹配或质量不足。

不要把证据数量当状态。十个转载同一新闻稿的页面仍可能只有一个信息源。

## 去重与来源独立性

URL 不同不表示独立证据。检测：

- 相同原始公告、论文、数据集或采访；
- 大段相同文字、相同错误或相同图表；
- 同一组织旗下站点或彼此引用；
- Syndication（转载）、聚合与无新增核验的摘要；
- 同一实验数据被多篇文章重复分析。

建立 provenance graph（来源关系图），标 `derived_from / cites / republishes / shares_dataset`。Citation count 与 independent source count 分开报告。来源多样性不应靠随意降低资格门槛获得。

## 冲突不是“选最新”这么简单

先分类冲突：

| 冲突类型 | 例子 | 首查 |
| --- | --- | --- |
| Version | v1 写 30，v2 写 45 | 是否显式 supersedes、是否已生效 |
| Scope | 全球规则与某地区规则不同 | 地区、账号、population |
| Definition | 两份报告的“成功”口径不同 | 定义、分母、测量过程 |
| Time | 两个日期均真实但对象已变化 | As-of date 与事件时间 |
| Method | 观察研究与随机实验结论不同 | 设计、偏差、区间 |
| Authority | 官方规范与第三方说明不同 | 谁定义规则、目标版本 |
| Genuine uncertainty | 同范围高质量证据仍矛盾 | 保留冲突、缩窄结论 |

更晚日期只有在明确版本政策下才胜出；更权威来源也可能回答另一个 scope。若冲突无法消除，输出双方主张、范围、证据和需要的下一步，不让模型“折中”出一个来源里不存在的数字。

## 时间语义与易变事实

“截至今天”至少涉及：

- Source publication date（来源发布日期）；
- Event/effective date（事件/生效日期）；
- Retrieval/checked date（实际打开核对日期）；
- Target version/date（结论适用对象）；
- Expiry/recheck date（何时需要复核）。

发布日期新不代表内容更新；网页 footer 的年份也不是正文核对日期。易变产品行为要固定目标版本和 checked date；无法在线核验时标 `pending`，不能用模型记忆填空。

## 综合前先做覆盖审计

Draft 前生成 coverage table：

| Subquestion | 必需主张 | 状态 | 独立来源 | 反证检查 | 下一步 |
| --- | --- | --- | ---: | --- | --- |
| 定义 | c-01 | supported | 1 | done | 可写 |
| 当前行为 | c-02 | pending | 0 | incomplete | 补官方来源 |
| 比较结果 | c-03 | conflict | 2 | done | 分范围报告 |

关键主张仍为 `insufficient` 时，不应靠写作隐藏缺口。可以缩窄问题、改为“已知/未知”、请求输入或停止。

### Stop rule

合理停止条件包括：

- 所有 must-answer subquestions 达到预注册证据阈值；
- 新一轮合格搜索不再改变 claim status，且预算达到上限；
- 必需来源不可访问，需要用户/责任人提供；
- 冲突只能由新的实验、法律解释或产品实测解决；
- 继续检索的预期价值低于时间/费用/隐私风险。

停止不等于“搜索了 N 次就宣称完整”。报告 searched scope、unresolved 和可能改变结论的证据。

## 写作与引用规则

Synthesis（综合）只读取已核验的 ledger，不重新凭模型记忆扩展事实。建议按以下顺序写：

1. 结论及适用 scope/as-of；
2. 关键证据与直接 locator；
3. 冲突、反证和不同解释；
4. 未决项和不能支持的推断；
5. 对决策的影响与可逆下一步。

每个易变、数字、比较和归因主张都应就近引用。Citation validator 至少检查：source 存在、已打开、locator 存在、span 实际支持、版本/scope 匹配、没有引用搜索摘要。

引用覆盖率高仍可能引用错误；引用精确率高也可能漏掉关键主张。两者分别评测。

## 工具与安全边界

网页、PDF、邮件和文档中的文字是不可信数据，不能改变研究目标、source policy、tool allowlist 或发送权限。研究 Harness 应限制：

- 允许访问的域名/连接器、下载类型和文件大小；
- 登录态、cookie、credential 与租户隔离；
- Page/redirect/depth/query/tool-call budgets；
- 下载解析的 sandbox、timeout 和资源；
- 对外发送、表单提交、购买/付费和自动联系；
- Trace、snapshot、摘录和公开报告的脱敏；
- 删除、保留与撤销后的缓存传播。

页面中的“上传密钥才能查看证据”是内容，不是授权。遇到 paywall/登录/验证码时停止或请求合法访问，不绕过控制。

## 评测指标

| 维度 | 指标 |
| --- | --- |
| Source acquisition | 合格来源召回、打开成功、snapshot/hash、许可完整 |
| Claim extraction | Atomic claim 正确率、scope/date 保留、复合主张拆分 |
| Evidence linking | Citation precision/coverage、locator accuracy、摘要误用 |
| Conflict | 冲突检测/分类、反证覆盖、错误强行消解 |
| Independence | 独立来源数、转载去重、provenance graph 准确 |
| Synthesis | Unsupported claims、限定语、拒答与未决完整 |
| Safety | 注入拒绝、越权访问、个人数据/Secret 泄漏、外部副作用 |
| Efficiency | 搜索/打开/tool calls、P50/P90、token、费用、人工轮次 |

Gold set（人工核验集）要包含支持、反驳、冲突、过期、范围不匹配、搜索摘要诱导和证据不足。只用“有明确答案”的题会掩盖拒答能力。

## 可复现证据包

一次研究至少保存：

```text
brief.json             # 问题、范围、来源政策、预算、停止规则
queries.jsonl          # 查询与候选结果
sources.jsonl          # 来源身份、访问状态、版本、hash、许可
snapshots/             # 允许保存的固定内容或短摘录
claims.jsonl           # claim/evidence ledger
conflicts.jsonl        # 冲突分类与未决
report.md              # 限定结论与逐项引用
verification.json      # 引用、覆盖、安全和退出码
unresolved.md          # 缺口和会改变结论的证据
```

公开版本与内部原始包分开；公开前运行 redaction，不能上传 credential、个人路径、私有文档或整页受限内容。Hash 用于追踪身份，不等于可以公开分发。

## 诊断顺序

| 现象 | 首查 | 责任层 | 不要先做 |
| --- | --- | --- | --- |
| 没找到关键来源 | Query、allowlist、连接器、访问 | 发现/获取 | 让模型补事实 |
| 有 URL 但无证据 | 是否打开、snapshot、parser、locator | 获取/解析 | 引用摘要 |
| 引用不支持结论 | Claim 粒度、evidence span、scope | 提取/链接 | 只换引用格式 |
| 冲突被吞掉 | 去重、status 规则、综合 prompt | 状态/综合 | 选多数网页 |
| 多来源其实同源 | Provenance、转载、共享数据 | 独立性 | 数 URL |
| “当前”结论过期 | Target/checked/effective date | 时间/事实治理 | 改 footer 日期 |
| 反复搜索无收敛 | Gap、stop rule、预算、新信息量 | 控制器 | 无限增加轮次 |
| 报告泄露敏感内容 | Snapshot/trace/redaction/access | 安全/发布 | 只删最终一句 |

修复后建立新 brief/config/snapshot identity 并重跑相邻任务。旧报告保留为历史版本，不静默改写 as-of date。

## 当前离线工作例

仓库 fixture 预先给出三条结构化记录：`policy-v1` 和 `policy-v2` 对 `retention_days` 分别给出 30 与 45，`legal-note` 对 `review_required` 给出 yes。确定性函数只按 claim 分组，值集合为一项则 `supported`，多项则 `conflict`。

### 前置条件与固定输入

需要 Python 3.11+ 和 uv 0.11，依赖由 `uv.lock` 固定。从仓库根目录离线运行；不安装 LangGraph，不调用搜索、浏览器、模型或外部 API，也不设置 credential。

输入位于 `lab/fixtures/research/`：

- `manifest.json` 固定 project-synthetic 来源、CC BY 4.0 和三个文件 hash；
- `input.json` 固定 query 与三个 source/claim/value 元组；
- `expected.json` 要求保留一个冲突和一个支持主张；
- `negative.json` 提议“确定是 45 天”，runner 必须拒绝。

### 命令

```powershell
uv run --frozen --offline python scripts/run-labs.py research
```

### 预期输出与断言

命令退出 0，输出 `evidence=E1`、`offline=true`、`passed=true` 和 `negative_rejected=true`。`retention_days` 为 `conflict`，values 同时保留 `30/45`，citations 同时保留 `policy-v1/policy-v2`；`review_required` 为 `supported` 并引用 `legal-note`；`unsupported_claims=0`。

人工复核：没有网络/credential/model action；`integration=LangGraph` 只是职责映射，`mode=offline-contract-seam` 才是实际执行方式。

### 失败、停止、清理与回退

若丢掉任一冲突值/引用、把 45 写成确定答案、manifest hash 不一致、负例未拒绝或命令需要网络，停止研究能力声明。先修 fixture/状态转换/validator 并保留失败输出；不要安装上游框架、修改 expected 迎合结果或用语言流畅度覆盖冲突。

命令只读固定 JSON 并打印结果，不保存网页或索引。误改时先运行：

```powershell
git diff -- lab/fixtures/research lab/src/about_harness/integrations/langgraph.py lab/src/about_harness/labs.py docs/domains/research.md
```

确认范围后只恢复自己的变化。失败时回到 manifest 锁定的 fixture 和最近通过的确定性实现，不覆盖工作树其他修改。

### 证据边界

实验提供 E1：当前仓库会校验固定 fixture bundle，并能在已结构化、完整输入中按值集合保留一个冲突和引用，拒绝单一确定答案。

它不生成 query、不搜索或打开来源、不验证 publisher/版本/日期/许可、不判断来源独立性，也没有模型综合或真实 LangGraph。`unsupported_claims=0` 只因 fixture 没有未支持 claim，不证明系统能检测任意无依据陈述。

## 完成检查表

- Brief 是否固定 decision、scope、as-of、来源政策、预算和停止规则？
- Claim 是否按类型和可验证粒度拆分，而非一段综合结论？
- 搜索候选、已打开来源、snapshot 与 evidence span 是否分开？
- 每个来源是否有版本、日期、hash、locator、许可与访问身份？
- Citation 是否直接支持主张，且 scope/version/time 匹配？
- 转载与共享数据是否从独立来源数中去重？
- 支持、反驳、限定、冲突和证据不足是否都保留？
- “当前/最新”是否有 checked/effective/target date，而非模型记忆？
- 综合是否只读取已核验 ledger，并逐项列 unresolved？
- 搜索、抓取、下载和公开 artifact 是否有权限、预算和脱敏？
- 指标是否覆盖 source、claim、citation、conflict、safety 与成本？
- 当前 E1 fixture 是否没有被误写为真实搜索/研究/框架质量？

下一步：运行[研究离线案例](/labs/research)，再学习[文档 Agent](/domains/document)的 snapshot/版本机制，并用[评测报告](/evaluation/reporting)表达证据边界。

## 检查题

1. 为什么搜索摘要不能直接作为最终主张的引用？
2. 十个不同 URL 为什么可能仍然只有一个独立来源？
3. 新日期的来源为什么不能自动消除旧来源冲突？
4. `unsupported_claims=0` 在当前 fixture 中为什么不能证明系统会发现所有无依据陈述？
5. 什么时候继续搜索的价值低于停止并报告 `insufficient/conflict`？
