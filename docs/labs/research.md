# 研究实验：冲突来源、证据定位与覆盖缺口

本实验用三个结构化 synthetic sources（合成来源）验证研究流程中最容易被写作掩盖的三步：同一 claim 出现互不相容的值时保留冲突；每条 citation 必须回到已打开 snapshot 的具体 locator 与 quote；required claim 没有证据时输出 `insufficient`，不能从报告中消失。

它不安装 LangGraph，不搜索网页，也不运行模型。这里的“已打开”是 fixture 中冻结的布尔状态，snapshot 是合成文本；实验验证的是“固定 fixture → 来源与定位校验 → required-claim coverage → 支持/冲突/不足状态 → 结构化引用 → 负例”的离线状态转换。

完成本页后，你应该能：

- 从 manifest、input、expected 和 negative 重建案例；
- 解释 source、claim、value、snapshot、locator、quote、citation 和 status 的关系；
- 区分“多个 URL”“多个 citation”和“多个独立来源”；
- 运行冲突保留、引用错位、未打开来源、重复身份和空 query 负例；
- 解释 `unsupported_claims=1` 如何从 required claims 计算，以及它仍不能发现任意自然语言幻觉。

## 先看证据结论

当前合法结论是：锁定的 Python 函数要求非空 query 和显式 required claims，拒绝重复 source ID 与未打开来源；每条 evidence 必须使用 `line:N` 定位到 snapshot 中实际包含 quote 的行，quote 必须字面包含结构化 value。函数按 claim 分组：零条 evidence 为 `insufficient`，一个 unique value 为 `supported`，多个 unique values 为 `conflict`；每条 citation 保留 source、value、locator、quote 和 relation。

当前不能推出：

- LangGraph 已安装、导入或目标版本可用；
- Query 会生成搜索词、筛选 claim 或控制 scope；
- 来源真实存在、网络获取成功、版本正确、许可可用或彼此独立；
- Quote 在语言学和业务语义上蕴含 claim，或 value 的单位、scope 与定义正确；
- 模型能发现无依据主张或在开放文本中稳定保留冲突；
- required claims 覆盖了用户问题中所有应回答的事实；
- 自然语言报告被解析并逐项事实核验。

因此结果保持 E1：离线契约接缝，而不是 E2 live 搜索/Framework 探针或 E3 研究质量。

## 固定问题与来源

Query 固定为：

```text
What retention and review obligations are documented?
```

输入要求回答 `retention_days`、`review_required` 与 `deletion_process`。其中前两项有 evidence，最后一项故意没有：

| Source ID | Claim | Value | Locator | 当前转换结果 |
| --- | --- | --- | --- | --- |
| `policy-v1` | `retention_days` | `30` | `line:2` | quote 命中 snapshot；与 v2 形成 conflict |
| `policy-v2` | `retention_days` | `45` | `line:2` | quote 命中 snapshot；与 v1 形成 conflict |
| `legal-note` | `review_required` | `yes` | `line:2` | 单一值，supported |
| — | `deletion_process` | — | — | required 但无 evidence，insufficient |

注意：函数不会从 Query 自动推导 claim；输出来自 `required_claims` 与 evidence 中出现的 claim 并集。Query 当前只是被校验为非空的 Task 元数据，不参与搜索、过滤、scope 或状态判定。

## 实际执行链

```text
manifest.json
  ├─ 校验 input/expected/negative 的 SHA256
  └─ 计算整个 fixture hash
            ↓
input.json ──→ resolve_versioned_claims(payload)
                 1. query 必须为非空 string
                 2. required_claims 必须为无重复的 string list
                 3. sources 必须为 list，每项必须为 object
                 4. source ID 全局唯一且 opened=true
                 5. id/claim/value/snapshot/locator/quote/relation 必须合法
                 6. locator 的 line:N 必须存在且该行包含 quote
                 7. quote 必须字面包含结构化 value
                 8. 按 claim 收集带定位的 evidence
                 9. 零/一/多个 unique value → insufficient/supported/conflict
                10. 对 claim/value/citation 做确定性排序
            ↓
expected.json ──→ 对列出的 claims 与 unsupported count 做相等检查
negative.json ──→ candidate claim 必须与 ledger 的 status/values/citations 一致
            ↓
case result ──→ expected matched AND negative rejected
```

这里没有搜索、图节点、LLM synthesis（模型综合）或 citation entailment（引用蕴含）模型。Quote/location/value 检查是字面 grounding（落点验证），不是语义真值判断；函数处理的来源已被 fixture 预先结构化。

## 四个 fixture 文件分别负责什么

| 文件 | 当前内容 | 责任 |
| --- | --- | --- |
| `manifest.json` | 来源、许可、核对日、个人数据标记、三个文件 hash | 冻结输入并阻止静默篡改 |
| `input.json` | Query、required claims 与三个带 snapshot/locator/quote 的 evidence records | 固定 claim ledger 的原始输入 |
| `expected.json` | 一个 conflict、一个 supported、一个 insufficient | 定义覆盖状态与结构化 citation 断言 |
| `negative.json` | 只保留 45 和 policy-v2 的 candidate claim | 证明不能隐藏冲突值与另一条引用 |

整个 fixture hash 当前为：

```text
b477fdac98f2b55d7f0654d4e983c852a98072a049161b72b4dddc74be8ce5eb
```

当前 lab 使用上面的 v1.1 fixture。历史 Eval task `research-01` 仍通过 commit `6aada53…`、固定 path 与旧 hash `23b3ff2…` 读取 v1.0 输入；它不会被本次升级静默改写。若要用 v1.1 形成新评测证据，应新增 fixture ref、Task/run identity 和结果，而不是给旧 run 换 hash。

## 当前运行时契约

| 字段 | 接受值 | 用途 | 当前未覆盖 |
| --- | --- | --- | --- |
| `query` | 非空 string | 证明 Task 输入存在 | 不参与筛选、scope 或状态 |
| `required_claims` | 至少一项、无重复的非空 string list | 定义 coverage 分母 | 是否完整覆盖真实问题仍靠 brief 复核 |
| `sources` | list | Claim evidence 输入 | 真实搜索、抓取与候选排除 |
| `source.id` | 非空且全局唯一 string | Citation identity | Canonical URL、版本、hash、publisher、许可 |
| `source.opened` | 必须为 `true` | 防止未打开候选进入引用 | 这里只是冻结状态，不执行网络获取 |
| `source.snapshot` | 非空合成文本 | Locator 的固定载体 | 独立 artifact、媒体类型、真实内容 hash |
| `source.claim` | 非空 string | 分组键 | Claim type、scope、时间和粒度 |
| `source.value` | 非空 string | 冲突判定 | 规范化、单位、语义等价和置信度 |
| `source.locator` | `line:<positive-integer>` | 定位 snapshot 行 | Page/section/table/cell 等真实定位器 |
| `source.quote` | 必须出现在定位行且包含 value | 字面 grounding | 语义蕴含、scope、否定与单位判断 |
| `source.relation` | 当前只能是 `supports` | 声明 evidence 关系 | `contradicts/qualifies` 与关系验证 |
| 其他字段 | 当前被忽略 | 无 | Unknown-field policy 与 schema version |

Source ID 唯一性是必要但不充分的 provenance（来源链）控制。两个 ID 仍可能转载同一公告；同一个组织也可能发布两个彼此依赖的页面。真实 independent source count 必须分析 `derived_from/cites/republishes/shares_dataset`。

## 冲突是怎样算出来的

函数先为 required claim 建立 coverage 集合，再对同一 claim 的所有已验证 evidence value 去重并排序：

```text
len(evidence) == 0       → insufficient
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

如果两个 source IDs 都给 `yes`，结果仍是 `supported` 并保留两个结构化 citations。但函数不检查二者是否独立、是否同 scope、是否复制同一来源。因此 citation 数不能直接当证据强度。

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
  "citations": [
    {
      "source_id": "policy-v1",
      "value": "30",
      "locator": "line:2",
      "quote": "Records are retained for 30 days.",
      "relation": "supports"
    }
  ]
}
```

示例为节省篇幅只展示第一条 citation，真实输出还保留 policy-v2。当前实现能保证 source ID 来自输入、locator 行存在、quote 位于该行且字面包含 value；它仍不含真实 URL、独立 snapshot hash、checked date 或 publisher，也不能判断否定、条件句、单位与 scope，因此不能把字面命中叫作语义蕴含。

### `status`

当前有 `supported`、`conflict` 和 `insufficient`。仍没有：

- `contradicted`：需要明确待判断的候选主张与反证关系；
- `qualified`：需要 scope 限定关系；
- `pending/unavailable`：需要来源获取状态。

空 sources 会把所有 `required_claims` 返回为 `insufficient`。这解决了“缺失 claim 从输出消失”的结构问题，但 required list 本身是否完整、是否正确拆分，仍需由 research brief 和 reviewer 决定。

### `values`

所有 value 都是字符串。`30` 与 `30 days` 会被当成两个冲突值，`YES` 与 `yes` 也不同；相反，相同字符串可能实际使用不同单位或定义。真实 pipeline 需要类型、单位和语义规范化，并保留原值。

### `citations`

Citation list 按 `(source_id, value, locator, quote, relation)` 排序，保留输入的每条 evidence record。不同 source IDs 提供相同值时都会保留；函数验证字面 locator/quote/value 链，但不做转载去重或自然语言蕴含检查。

### `unsupported_claims`

当前值为 `1`，由 `required_claims` 中状态为 `insufficient` 的条目计数：`deletion_process` 没有 evidence，因此不会被静默删除。它证明固定 coverage contract 生效，不证明 required list 已覆盖问题，也不证明系统会识别模型在最终报告中新编的事实。

要覆盖最终报告，还需要解析 candidate claims，并将每条 draft claim 链回这个 ledger；新出现、扩大 scope 或改变限定条件的主张都应单独判为 unsupported。当前 structured negative 只验证一个候选 claim 是否完整复现 ledger 的 status、values 与 citations。

### `integration` 与 `mode`

`integration=LangGraph` 是教学职责映射名；`mode=offline-contract-seam` 是实际执行方式。当前没有 import LangGraph，没有 graph runtime、checkpoint 或 node/edge event。

### `negative_rejected`

现有 runner 读取结构化 `candidate_claim`，按 claim ID 找到 ledger 条目，再比较 `status`、`values` 与 `citations`。负例把 `retention_days` 从 conflict 改成 supported，只保留 45 和 policy-v2，因此必须被拒绝。

这比“任意文本 + 输出里存在 conflict”更强，但仍只是结构化 ledger 一致性，不解析自然语言答案。真实报告 validator 还要抽取复合主张、限定词、否定、数值单位和 citation span，不能把这个负例称为开放文本事实核验。

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
fixture_hash           = b477fdac98f2b55d7f0654d4e983c852a98072a049161b72b4dddc74be8ce5eb
negative_rejected      = true
safety_violation       = false
deletion_process.status = insufficient
deletion_process.citations = []
retention_days.status  = conflict
retention_days.values  = [30, 45]
retention_days.citations[*].source_id = [policy-v1, policy-v2]
retention_days.citations[*].locator = [line:2, line:2]
review_required.status = supported
review_required.values = [yes]
review_required.citations[0].source_id = legal-note
unsupported_claims     = 1
integration            = LangGraph
mode                   = offline-contract-seam
```

人工复核还要确认进程没有网络、真实来源、模型 action 或 Framework runtime。

## 运行直接契约测试

以下命令验证固定 claim ledger、重复来源身份、空 query、错误 locator、quote/value 不一致和未打开来源：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_m5_labs.py -k research
```

预期所有 research 测试通过、退出码 0。拒绝类测试通过表示坏输入被异常拒绝，不表示错误引用、重复来源或空 query 被接受。

再检查上一步结果中的 `offline=true`、`evidence=E1` 与 `mode=offline-contract-seam`。它们证明固定研究职责接缝运行过，不证明 LangGraph 已安装、graph/checkpointer 实际执行或 live provider 可用；字段缺失或结论越界时停止引用。证据边界必须从真实结果和依赖状态得出，不能由映射名或页面关键词自动判定。

## Result 如何进入 Eval

样例 Task `research-01` 固定：

- Goal：保留冲突来源并逐项引用；
- Allowed tools：`fixture.read`、`assert`；
- Budget：8 steps、8 model calls、1000 ms、0 美元；
- Acceptance：`passed=true`；
- Fixture ref：历史 Eval 固定 commit、path 与 v1.0 hash `23b3ff2…`，不指向当前 v1.1 工作树。

样例 runs 中，`offline-default` 记录 `failure_type=verification` 与一个 human turn，`offline-engineering` 记录通过。它们引用历史 v1.0 fixture，是合成 E1 分析数据，不是真实搜索、模型或 LangGraph run，也不证明本轮 v1.1 引用验证；不能用两行样例比较 Framework/模型研究质量。

真实研究 Eval 还需保存 brief、query logs、source candidates、opened snapshots、claim/evidence ledger、conflicts、report、citation verification 和 unresolved。

## 失败分类与定位

| 现象 | 首查 | 合法动作 | 不要做 |
| --- | --- | --- | --- |
| `hash mismatch` | Fixture 字节、manifest、读取路径 | 确认是否有新版本 | 更新 hash 复用旧 run |
| Query 缺失仍运行 | Input validation | Handler 前拒绝 | 从 sources 猜问题 |
| Source ID 重复 | Source registry/provenance | 拒绝并修正身份 | 当成两个独立来源 |
| 30/45 被写成 supported | Value set 与 status 规则 | 保留 conflict | 选择较新名字 |
| Citation 丢失 | Evidence grouping 与排序 | 判失败，修映射 | 因值保留而放行 |
| Quote 不在 locator 行 | Snapshot/locator/quote identity | 拒绝 evidence，修提取路径 | 只保留 source ID |
| Quote 不含结构化 value | Claim extraction | 拒绝不一致记录 | 相信预填 value |
| Required claim 无 evidence | Coverage | 输出 insufficient | 从报告中删掉该项 |
| 两个 citations 实为转载 | Provenance graph | 合并独立来源计数 | 数 URL 当共识 |
| `unsupported_claims=1` 仍有 draft 编造 | Draft parser/validator 缺失 | 将 draft claim 链回 ledger | 把 coverage 数当无幻觉证明 |
| 结构化负例通过但自然语言越界 | Report parser 缺失 | 增加 candidate-claim extraction | 把结构一致叫自然语言核验 |
| `integration` 被当成接入 | Boundary mode 与依赖 | 降回 E1 描述 | 安装包让措辞成立 |

诊断顺序建议为 brief/query → source acquisition → source identity/provenance → claim extraction → evidence linking → conflict/coverage → synthesis → citation validator → evaluator。语言流畅度不能修复上游来源和状态错误。

## 从当前 E1 升级到真实研究管线

### 阶段 A：丰富结构化 ledger

当前已有最小 required-claim coverage 与合成 snapshot/line locator。下一步给 source 增加 canonical ID、publisher、version、checked/effective date、独立 snapshot hash、license 和 scope；给 claim 增加 type、scope、unit，并增加 `contradicted/qualified/pending` 状态与可验证 relation。

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

当前只有一个非空 query、三个已结构化来源、三个 required claims、一个冲突、一个支持、一个不足和一个结构化 candidate 负例。Snapshot 是 fixture 内合成字符串；line locator 与 value 只做字面验证。没有真实来源获取、独立 snapshot artifact、版本/scope、搜索、模型、语义蕴含或自然语言报告解析；这些限制决定结果不能外推到真实研究完整性或 LangGraph 质量。

## 完成检查表

- 是否能从四个 fixture 文件重建固定案例？
- Query 与 source identity 是否在分组前校验？
- 是否明白当前 Query 不参与检索或 claim 选择？
- 30/45 是否同时保留并引用双方？
- 是否区分 citations 数与 independent sources 数？
- 是否确认每条 citation 的 locator、quote 与 value 字面一致？
- 是否明白 `supported` 仍主要由字符串值集合决定？
- 是否明白 `unsupported_claims=1` 只来自预先声明的 required list？
- 是否明白结构化负例没有解析自然语言报告？
- Integration 映射名是否没有被写成 LangGraph 已接入？
- 新 source bundle/config 是否产生新 identity 与 run？
- 真实计划是否覆盖 opened snapshot、locator、scope、冲突分类和 citation validator？
- E0、E1、E2、E3 是否按真实来源与执行边界标注？

下一步先读[研究 Agent 模式](/domains/research)设计完整 brief-to-report 管线，再用[文档 Agent](/domains/document)理解 snapshot/版本/citation span，并对照[评测报告](/evaluation/reporting)表达冲突与 unresolved。随后进入[数据案例](/labs/data)。

## 检查题

1. 为什么两个不同 source IDs 仍可能只有一个独立来源？
2. 当前函数为什么不能决定 v2 的 45 天是“最新真值”？
3. `unsupported_claims=1` 为什么仍不是开放报告的无幻觉证明？
4. 现有 negative case 实际检查了 candidate claim 的哪些字段？
5. 从结构化 ledger 升级到真实研究 Agent 时，哪几层必须新增独立 artifact？
