# 研究实验：冲突来源与逐项引用

本实验用三个结构化 synthetic sources（合成来源）验证研究流程中最容易被写作掩盖的一步：同一 claim 出现互不相容的值时，必须保留冲突和双方出处，不能挑一个更顺眼的值写成确定结论。

它不安装 LangGraph，不搜索网页，不打开来源，也不运行模型。实验验证的是“固定 fixture → 来源身份校验 → 按 claim 分组 → 支持/冲突状态 → 引用 → 负例”的离线状态转换。

完成本页后，你应该能：

- 从 manifest、input、expected 和 negative 重建案例；
- 解释 source、claim、value、citation 和 status 的关系；
- 区分“多个 URL”“多个 citation”和“多个独立来源”；
- 运行冲突保留、重复来源身份和空 query 负例；
- 说清 `unsupported_claims=0` 与自然语言负例当前没有证明什么。

## 先看证据结论

当前合法结论是：锁定的 Python 函数要求非空 query、拒绝重复 source ID，把结构化 source records 按 claim 分组；一个 unique value 标记为 `supported`，多个 unique values 标记为 `conflict`，并保留输入中的所有 source IDs 作为 citations。

当前不能推出：

- LangGraph 已安装、导入或目标版本可用；
- Query 会生成搜索词、筛选 claim 或控制 scope；
- 来源真实存在、已打开、版本正确、许可可用或彼此独立；
- Citation 指向可定位 evidence span 并实际支持主张；
- 模型能发现无依据主张或在开放文本中稳定保留冲突；
- `unsupported_claims=0` 来自独立的 claim coverage 检查；
- 自然语言 proposal 被真正解析和事实核验。

因此结果保持 E1：离线契约接缝，而不是 E2 live 搜索/Framework 探针或 E3 研究质量。

## 固定问题与来源

Query 固定为：

```text
Which retention policy is current?
```

输入 records 为：

| Source ID | Claim | Value | 当前转换结果 |
| --- | --- | --- | --- |
| `policy-v1` | `retention_days` | `30` | 与 v2 形成 conflict |
| `policy-v2` | `retention_days` | `45` | 与 v1 形成 conflict |
| `legal-note` | `review_required` | `yes` | 单一值，supported |

注意：函数不会根据 Query 只选择 retention claim，所以还会返回 `review_required`。Query 当前只是被校验为非空的 Task 元数据，不参与搜索、过滤、scope 或状态判定。

## 实际执行链

```text
manifest.json
  ├─ 校验 input/expected/negative 的 SHA256
  └─ 计算整个 fixture hash
            ↓
input.json ──→ resolve_versioned_claims(payload)
                 1. query 必须为非空 string
                 2. sources 必须为 list
                 3. 每个 source 必须为 object
                 4. id/claim/value 必须为非空 string
                 5. source ID 全局唯一，否则拒绝
                 6. 按 claim 收集 (source_id, value)
                 7. 一个 unique value → supported
                 8. 多个 unique values → conflict
                 9. 对 claim/value/citation 做确定性排序
            ↓
expected.json ──→ 对列出的 claims 与 unsupported count 做相等检查
negative.json ──→ proposed_answer 存在且输出中有 conflict
            ↓
case result ──→ expected matched AND negative rejected
```

这里没有搜索、图节点、LLM synthesis（模型综合）或 citation entailment（引用蕴含）判断。函数处理的来源已被 fixture 预先结构化。

## 四个 fixture 文件分别负责什么

| 文件 | 当前内容 | 责任 |
| --- | --- | --- |
| `manifest.json` | 来源、许可、核对日、个人数据标记、三个文件 hash | 冻结输入并阻止静默篡改 |
| `input.json` | Query 与三个 source/claim/value records | 固定 claim ledger 的原始输入 |
| `expected.json` | 一个 conflict、一个 supported、零 unsupported | 定义状态与 citation 断言 |
| `negative.json` | “The policy is definitely 45 days.” | 表达不能强行消解冲突的教学负例 |

整个 fixture hash 当前为：

```text
23b3ff2a78d63ee51b2b7cf911f76082c8490c31c338abd1d4b81678b3c353ac
```

Eval task 通过固定 commit、path 与 hash 引用这组输入。改变来源、expected 或负例时必须产生新 fixture identity 和新 run；不能只更新 manifest hash 后沿用旧证据。

## 当前运行时契约

| 字段 | 接受值 | 用途 | 当前未覆盖 |
| --- | --- | --- | --- |
| `query` | 非空 string | 证明 Task 输入存在 | 不参与筛选、scope 或状态 |
| `sources` | list | Claim ledger 输入 | 空集合合法，未定义 insufficiency |
| `source.id` | 非空且全局唯一 string | Citation identity | URL、版本、hash、publisher、许可 |
| `source.claim` | 非空 string | 分组键 | Claim type、scope、时间和粒度 |
| `source.value` | 非空 string | 冲突判定 | 规范化、单位、语义等价和置信度 |
| 其他字段 | 当前被忽略 | 无 | Unknown-field policy 与 schema version |

Source ID 唯一性是必要但不充分的 provenance（来源链）控制。两个 ID 仍可能转载同一公告；同一个组织也可能发布两个彼此依赖的页面。真实 independent source count 必须分析 `derived_from/cites/republishes/shares_dataset`。

## 冲突是怎样算出来的

函数对同一 claim 的所有 value 去重并排序：

```text
len(unique_values) == 1  → supported
len(unique_values) > 1   → conflict
```

这能保留 `30/45`，但没有区分冲突原因。真实冲突可能来自：

- Version：v2 明确 supersede v1；
- Time：两个值适用于不同生效日期；
- Scope：全球政策与地区政策不同；
- Definition：两份来源的指标口径不同；
- Authority：来源责任不同；
- Genuine uncertainty：同一 scope 下仍互斥。

当前 fixture 没有 version/effective/scope 元数据，所以不能得出“v2 更新，因此 45 正确”。最诚实状态只能是 `conflict`。

### 相同值不等于独立验证

如果两个 source IDs 都给 `yes`，结果仍是 `supported` 并保留两个 citations。但函数不检查二者是否独立、是否同 scope、是否复制同一来源。因此 citation 数不能直接当证据强度。

### 同一来源不能制造自我冲突

重复 source ID 现在在分组前失败关闭。否则同一个 ID 同时提交 30 和 45，会看起来像双来源冲突，也让 citation 无法唯一回链。重复身份错误属于 contract failure，不是可综合的研究分歧。

## 逐字段解释 Result

### `claims`

Claims 按 claim 字符串排序。每项包含：

```json
{
  "claim": "retention_days",
  "status": "conflict",
  "values": ["30", "45"],
  "citations": ["policy-v1", "policy-v2"]
}
```

Citation 只是 source ID，不含 URL、locator、quote、checked date 或 relation。当前实现能保证 ID 来自输入，不能保证 source 内容实际支持 value。

### `status`

当前只有 `supported` 和 `conflict`。没有：

- `contradicted`：需要明确待判断的候选主张与反证关系；
- `insufficient`：需要问题所需 claims/coverage contract；
- `qualified`：需要 scope 限定关系；
- `pending/unavailable`：需要来源获取状态。

空 sources 会返回空 claims，而不是自动生成 `insufficient`，因为函数不知道 query 必须回答哪些 claims。

### `values`

所有 value 都是字符串。`30` 与 `30 days` 会被当成两个冲突值，`YES` 与 `yes` 也不同；相反，相同字符串可能实际使用不同单位或定义。真实 pipeline 需要类型、单位和语义规范化，并保留原值。

### `citations`

Citation list 按 `(source_id, value)` 排序，保留输入的每条 evidence record。不同 source IDs 提供相同值时都会保留；函数不做转载去重或引用支持检查。

### `unsupported_claims`

当前固定返回 `0`，不是从 draft、required claims 或 evidence coverage 计算。Fixture 也没有无来源 claim。因此它只能表示“这个最小输出契约预期没有显式 unsupported 项”，不能证明系统会识别模型新编的事实。

未来要使该字段有意义，至少需要 candidate claims、required scope、claim-to-evidence links 和独立 validator；对每条 draft claim 判断 supported/conflict/insufficient 后再统计。

### `integration` 与 `mode`

`integration=LangGraph` 是教学职责映射名；`mode=offline-contract-seam` 是实际执行方式。当前没有 import LangGraph，没有 graph runtime、checkpoint 或 node/edge event。

### `negative_rejected`

现有 runner 只检查两件事：`proposed_answer` 是 string；输出 claims 中至少有一个 `status=conflict`。它不解析句子中的 `45`，也不验证 proposal 与 `retention_days` 的对应关系。

因此负例提供的是“冲突存在时，测试要求拒绝单一答案”的结构信号，不是自然语言事实核验。若把 proposed text 换成另一任意字符串，只要输出仍有 conflict，当前负例也可能通过。这是必须公开的限制。

## 运行固定正例

### 前置条件与固定版本

- Python 3.11+；
- uv 0.11，项目当前验证版本为 `0.11.16`；
- 依赖由 `uv.lock` 固定并已在本机缓存；
- 从仓库根目录执行；
- 不安装 LangGraph，不调用搜索、浏览器、模型或外部 API；
- 不设置 credential，不允许命令临时联网。

容器、Windows 与 POSIX 统一入口见[实验环境](/labs/setup)。

### 命令

```powershell
uv run --frozen --offline python scripts/run-labs.py research
```

### 预期输出与断言

命令退出 0，顶层为 `schema_version=1.0`、`evidence=E1`、`offline=true`、`passed=true`。唯一 case 还应满足：

```text
case_id                = research
fixture_hash           = 23b3ff2a78d63ee51b2b7cf911f76082c8490c31c338abd1d4b81678b3c353ac
negative_rejected      = true
safety_violation       = false
retention_days.status  = conflict
retention_days.values  = [30, 45]
retention_days.citations = [policy-v1, policy-v2]
review_required.status = supported
review_required.values = [yes]
review_required.citations = [legal-note]
unsupported_claims     = 0
integration            = LangGraph
mode                   = offline-contract-seam
```

人工复核还要确认进程没有网络、真实来源、模型 action 或 Framework runtime。

## 运行直接契约测试

以下命令分别验证固定 claim ledger、重复来源身份与空 query：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_m5_labs.py::test_research_fixture_preserves_conflict_and_claim_citations lab/tests/test_m5_labs.py::test_research_rejects_duplicate_source_identity lab/tests/test_m5_labs.py::test_research_requires_non_empty_query
```

预期 `3 passed`、退出码 0。后两项通过表示坏输入被异常拒绝，不表示重复来源或空 query 被接受。

再确认 integration 映射没有被升级成 live 支持：

```powershell
npm run compat:check
npm run compat:self-test
```

两项都应退出 0；负例门禁必须拒绝把映射名、模块文件或 E1 fixture 当成真实 LangGraph 证据。

## Result 如何进入 Eval

样例 Task `research-01` 固定：

- Goal：保留冲突来源并逐项引用；
- Allowed tools：`fixture.read`、`assert`；
- Budget：8 steps、8 model calls、1000 ms、0 美元；
- Acceptance：`passed=true`；
- Fixture ref：固定 commit、path 与上述 hash。

样例 runs 中，`offline-default` 记录 `failure_type=verification` 与一个 human turn，`offline-engineering` 记录通过。它们是合成 E1 分析数据，不是真实搜索、模型或 LangGraph run，不能用两行样例比较 Framework/模型研究质量。

真实研究 Eval 还需保存 brief、query logs、source candidates、opened snapshots、claim/evidence ledger、conflicts、report、citation verification 和 unresolved。

## 失败分类与定位

| 现象 | 首查 | 合法动作 | 不要做 |
| --- | --- | --- | --- |
| `hash mismatch` | Fixture 字节、manifest、读取路径 | 确认是否有新版本 | 更新 hash 复用旧 run |
| Query 缺失仍运行 | Input validation | Handler 前拒绝 | 从 sources 猜问题 |
| Source ID 重复 | Source registry/provenance | 拒绝并修正身份 | 当成两个独立来源 |
| 30/45 被写成 supported | Value set 与 status 规则 | 保留 conflict | 选择较新名字 |
| Citation 丢失 | Evidence grouping 与排序 | 判失败，修映射 | 因值保留而放行 |
| 两个 citations 实为转载 | Provenance graph | 合并独立来源计数 | 数 URL 当共识 |
| `unsupported_claims=0` 但 draft 编造 | Draft/claim validator 缺失 | 增加 coverage 检查 | 相信硬编码指标 |
| 负例任意文本也通过 | Proposal validator 缺失 | 结构化 candidate claim | 把它叫自然语言核验 |
| `integration` 被当成接入 | Boundary mode 与依赖 | 降回 E1 描述 | 安装包让措辞成立 |

诊断顺序建议为 brief/query → source acquisition → source identity/provenance → claim extraction → evidence linking → conflict/coverage → synthesis → citation validator → evaluator。语言流畅度不能修复上游来源和状态错误。

## 从当前 E1 升级到真实研究管线

### 阶段 A：丰富结构化 ledger

给 source 增加 canonical ID、publisher、version、checked/effective date、hash、license、scope 和 locator；给 claim 增加 type、scope、unit 与 relation。增加 `insufficient/contradicted/qualified` 状态和 required-claim coverage。

### 阶段 B：候选发现与来源获取

把 search result 与 opened source 分开。记录 query、页码/游标、候选 URL、redirect、访问状态和预算；只有实际打开、固定 snapshot 并定位 evidence span 的来源才能进入 citation。

### 阶段 C：来源独立性与冲突分类

建立 `derived_from/cites/republishes/shares_dataset` 图，分别报告 citation count 与 independent source count。冲突按 version/time/scope/definition/method/authority 分类，不用多数票或新日期自动消解。

### 阶段 D：模型综合与独立验证

模型只读取已核验 ledger 生成 candidate claims/report；独立 validator 将每条 draft claim 链回 evidence span，检查 status、scope、版本、citation precision/coverage 和 unsupported claims。无足够证据时输出 `insufficient/conflict`。

### 阶段 E：真实 LangGraph/搜索探针

只有 brief、source policy、budget、snapshot、validator 和安全边界稳定，并另获依赖、网络、数据和费用授权后，才固定 LangGraph/search/model/provider 版本做 E2 probe。开放 workload 的 E3 还需要 holdout、重复运行和人工核验 gold set。

每个阶段创建新的 research/config/source bundle/run identity。不能把当前结构化 fixture 的 E1 标签升级，冒充真实搜索或模型研究证据。

## 真实研究实验必须记录什么

| 层 | 最小身份与状态 |
| --- | --- |
| Brief | Decision、question、scope、as-of、source policy、budget、stop rule |
| Query | Query text、tool/version、time、cursor、candidate results |
| Source | Canonical ID、publisher、version/date/hash、license、access、snapshot |
| Evidence | Source/locator/span、relation、scope、checked date |
| Claim | ID/type/text/scope/status、evidence links、limits、unresolved |
| Provenance | Derived/cites/republishes/shared-data 与独立来源计数 |
| Synthesis | Draft/report、config/model、candidate claim ledger |
| Verification | Citation precision/coverage、conflict、unsupported、安全与 exit code |
| Runtime | Task/run/checkpoint、tool/model calls、duration、token、费用、failure class |

公开 artifact 与内部原始 snapshot 分开。许可可引用不表示可以公开整页内容；公开前移除 credential、个人路径、个人数据和私有文档。

## 回归矩阵

| 维度 | 正常例 | 负例/故障 |
| --- | --- | --- |
| Brief/query | 非空且 scope 明确 | 空、复合问题、scope 漂移 |
| Source identity | 唯一 canonical ID | 重复 ID、同 ID 不同 hash |
| Acquisition | 已打开 snapshot | 只有搜索摘要、登录墙、404 |
| Claim | Atomic、typed、带 scope | 复合主张、单位/定义缺失 |
| Evidence | 可定位且直接支持 | Locator 不存在、范围不匹配 |
| Independence | 真正独立来源 | 转载、同公告、共享数据集 |
| Conflict | 保留并分类 | 多数票、按日期静默覆盖 |
| Coverage | Required claims 有状态 | Draft 新增无依据 claim |
| Synthesis | 限定结论和 unresolved | 流畅但隐藏冲突/缺口 |
| Safety | 内容不能扩大工具权限 | 注入、越权访问、敏感泄漏 |
| Runtime | 有界收敛 | 无限搜索、重复计费、恢复丢反证 |

每个案例要定义预期 failure class 和停止条件。只检查最终报告是否“看起来合理”，无法发现摘要引用、转载计数和中间冲突被吞掉。

## 停止、清理、回滚与限制

### 当前离线实验

命令只读固定 JSON 并打印结果，不保存网页、索引或模型 trace。需要停止时终止进程即可；`.pytest_cache/` 等忽略缓存可以保留。误改时先检查：

```powershell
git diff -- lab/fixtures/research lab/src/about_harness/integrations/langgraph.py lab/src/about_harness/labs.py lab/tests/test_m5_labs.py docs/labs/research.md
```

只恢复自己的修改，不覆盖工作树其他变化。若 fixture、实现或测试失败，回滚到最近通过的锁定版本，并保留失败输出用于归因。

### 未来真实研究实验

出现以下任一情况立即停止：source policy 不明、无法打开关键来源、版本/scope 冲突无法消解、citation 不支持主张、query 无界循环、页面注入请求越权工具、snapshot/报告发生敏感泄漏。

停止后关闭搜索/浏览器/model 任务，撤销 credential 句柄，隔离 snapshot，记录 searched scope、预算、unresolved 和会改变结论的证据。不要让模型凭记忆补完，也不要删除失败来源记录美化报告。

回滚 brief/query/config/model 后要保留 source bundle 与报告版本关系。外部发布的错误结论需要更正和通知，代码回滚不能自动撤销传播。

### 已知限制

当前只有一个非空 query、三个已结构化来源、两个 claims、一个冲突和一个弱自然语言负例。没有真实来源、版本/scope、搜索、snapshot、模型、引用支持验证或 unsupported detection；这些限制决定结果不能外推到真实研究完整性或 LangGraph 质量。

## 完成检查表

- 是否能从四个 fixture 文件重建固定案例？
- Query 与 source identity 是否在分组前校验？
- 是否明白当前 Query 不参与检索或 claim 选择？
- 30/45 是否同时保留并引用双方？
- 是否区分 citations 数与 independent sources 数？
- 是否明白 `supported` 只由字符串值集合决定？
- 是否明白 `unsupported_claims=0` 当前是常量？
- 是否明白负例没有解析 proposed answer 的语义？
- Integration 映射名是否没有被写成 LangGraph 已接入？
- 新 source bundle/config 是否产生新 identity 与 run？
- 真实计划是否覆盖 opened snapshot、locator、scope、冲突分类和 citation validator？
- E0、E1、E2、E3 是否按真实来源与执行边界标注？

下一步先读[研究 Agent 模式](/domains/research)设计完整 brief-to-report 管线，再用[文档 Agent](/domains/document)理解 snapshot/版本/citation span，并对照[评测报告](/evaluation/reporting)表达冲突与 unresolved。随后进入[数据案例](/labs/data)。

## 检查题

1. 为什么两个不同 source IDs 仍可能只有一个独立来源？
2. 当前函数为什么不能决定 v2 的 45 天是“最新真值”？
3. `unsupported_claims=0` 为什么不是开放报告的无幻觉证明？
4. 现有 negative case 实际检查了 proposed answer 的哪些内容？
5. 从结构化 ledger 升级到真实研究 Agent 时，哪几层必须新增独立 artifact？
