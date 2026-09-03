# 文档实验：版本化问答与可追溯出处

本实验把一个常见但容易被忽略的文档问答问题做成固定离线案例：同一 handbook 同时存在 v1 与 v2，系统必须先排除旧版本，再回答 retention policy，并返回实际使用的版本化出处。

它不安装 LlamaIndex，不建立向量索引，也不运行模型。实验验证的是“版本过滤 → 确定性检索 → 回答/拒答 → 引用负例 → 结构化结果”这条最小责任接缝。

完成本页后，你应该能：

- 从四个 fixture 文件重建输入、期望和负例；
- 解释为什么版本过滤必须早于相关性排序；
- 区分“回答文字正确”“引用存在”“引用支持主张”和“引用版本正确”；
- 运行正常回答、旧引用拒绝和无命中拒答测试；
- 说清当前 E1 证据与真实 parser/RAG/LlamaIndex 的差距。

## 先看证据边界

当前合法结论是：锁定的 Python 函数能对固定 JSON 文档按 `doc_id` 保留最大整数版本，用简单词项匹配找到 v2 文本，返回 `handbook@v2`，并拒绝 fixture 提议的 `handbook@v1` 引用。无匹配内容时返回可审计的 `insufficient` 结果。

当前不能推出：

- LlamaIndex 已安装、导入或与当前代码兼容；
- PDF、DOCX、HTML、扫描图、表格或脚注能正确解析；
- Chunking、embedding、vector search、reranker 或生成模型有效；
- “最大整数版本”适用于真实政策的发布、生效和废止规则；
- 引用文本在开放任务中真正支持每条主张；
- ACL、租户隔离、删除传播和索引回滚已经实现。

因此结果保持 E1：离线契约接缝。它不是 E2 上游组件探针，也不是 E3 文档问答质量证据。

## 固定问题是什么

输入包含三条纯文本记录：

| `doc_id` | `version` | 内容 | 在当前规则下的资格 |
| --- | ---: | --- | --- |
| `handbook` | 1 | Retention policy 为 30 天 | 被同 ID 的 v2 排除 |
| `handbook` | 2 | Retention policy 为 45 天 | 最新整数版本，参与匹配 |
| `unrelated` | 1 | 工作日提供支持 | 自身最新，但与查询不匹配 |

查询固定为 `retention policy`。正确答案必须是 45 天，引用只能是 `handbook@v2`；文字答对但引用 v1，仍然失败。

这里的“最新”是实验规则，不是通用业务语义。真实版本资格可能取决于 `status=published`、`effective_from/effective_to`、显式 `supersedes`、地区、租户或 authority hierarchy（权威层级），不能只取最大数字。

## 实际执行链

```text
manifest.json
  ├─ 校验 input/expected/negative 的 SHA256
  └─ 计算整个 fixture hash
            ↓
input.json ──→ answer_from_latest(payload)
                 1. 校验 query 为非空字符串
                 2. 校验 documents 为 list
                 3. 校验 doc_id/text 为非空字符串
                 4. 校验 version 为整数且不是 bool
                 5. 每个 doc_id 只保留最大整数版本
                 6. 对 query.split() 的任一词项做包含匹配
                 7. 候选按 doc_id/version/text 排序，取第一条
                 8. 无候选则返回 insufficient
            ↓
expected.json ──→ 对列出的字段做相等检查
negative.json ──→ proposed stale citation 不得出现在结果中
            ↓
case result ──→ expected matched AND negative rejected
```

这条链路没有模型“理解政策”，也没有检索分数。答案直接等于选中文档的完整 `text`。

## 四个 fixture 文件分别负责什么

| 文件 | 当前内容 | 责任 |
| --- | --- | --- |
| `manifest.json` | 来源、许可、核对日、个人数据标记、三个文件 hash | 冻结实验输入并阻止静默篡改 |
| `input.json` | Query 与三条版本化文档 | 固定文档集合和查询语义 |
| `expected.json` | `answered`、45 天、v2 引用、忽略旧版计数 | 定义业务断言，而非只看退出码 |
| `negative.json` | 提议引用 `handbook@v1` | 验证旧版引用不会被接受 |

整个 fixture hash 当前为：

```text
37f8d91cca7607c9950e12eb907df81e2e5e889185ae327bcb9683c4f6f59c80
```

Eval task 通过固定 commit、path 与 hash 引用这组输入。修改文档、expected 或负例时要创建新 fixture identity 和新 run；不能只更新 manifest hash 后继续复用旧结果。

## 逐字段解释 Result

### `status`

有候选时为 `answered`，无候选时为 `insufficient`。`insufficient` 不是异常：它表示当前合格版本中没有满足固定匹配规则的内容，调用者不应让模型凭记忆补值。

当前实现没有 `conflict`、`access_denied` 或 `parse_failed`，因为 fixture 没有权限、冲突元数据和解析阶段。真实系统必须把这些状态与 `insufficient` 分开。

### `answer`

`answered` 时直接返回候选文档完整文本；`insufficient` 时为 `null`。这不是模型生成，也没有 claim decomposition（主张拆分）或摘要。

因此答案 45 天正确只证明固定字符串路径正确，不能证明开放问题、跨段综合或数字抽取可靠。

### `citations`

当前 citation 只是 `doc_id@vN`，例如 `handbook@v2`。它能标识文档版本，却没有 page、section、block、table cell、chunk hash 或 citation span。

真实 citation validator 至少分别检查：

1. Citation identity 存在且当前调用者有权访问；
2. Citation version 是本次查询的合格版本；
3. 引用范围实际支持答案中的对应主张；
4. 所有需要证据的主张都被覆盖。

只检查字符串出现在列表中，远弱于支持关系验证。

### `stale_versions_ignored`

实现用 `len(documents) - len(latest_by_doc_id)` 计算被折叠的版本数量。固定输入中有两条 handbook、一个 unrelated，最终保留两个 `doc_id`，所以值为 1。

这个字段统计所有重复 `doc_id` 被丢弃的条目，不只统计与当前 query 相关的文档。它也不证明被丢弃版本确实“过期”；只有 fixture 的教学规则这样解释。

### `integration` 与 `mode`

`integration=LlamaIndex` 是教学职责映射名；`mode=offline-contract-seam` 是实际执行方式。当前依赖中没有 LlamaIndex distribution，代码也不 import 它。

成功和 `insufficient` 现在都会返回这两个字段及 `stale_versions_ignored`，使拒答结果也能说明自己由哪个离线边界产生。

### `negative_rejected`

Runner 读取 `proposed_citation=handbook@v1`，确认它不在输出 citations 中。这个负例证明固定旧版没有进入最终引用；它没有检查“另一个不存在的 citation”“v2 内容不支持答案”或“同版本不同内容”等情况。

## 当前检索规则的精确限制

### 版本选择

每个 `doc_id` 只保留最大整数 `version`。当前函数：

- 拒绝 string、float 和 bool 版本；
- 没有禁止负整数；
- 没有验证版本是否连续；
- 同一 `doc_id/version` 出现不同内容时，不报告冲突，保留先出现的记录；
- 不理解 draft/published/effective/superseded 状态；
- 不处理同一政策在不同地区或租户同时生效。

所以这段逻辑只适合固定教学数据。生产版本政策必须由业务元数据决定，并对重复身份/不同 hash 失败关闭。

### 词项匹配

Query 经 `casefold()` 后按空格拆分；只要任一 term 是文档文本的子字符串，就进入候选。`retention nonsense` 仍可能因为 `retention` 命中。这是 OR-style substring seam，不是 lexical search、语义检索或答案相关性证明。

候选最终按 tuple 排序后取第一条，主要受 `doc_id` 字典序影响；没有 relevance score、reranking、来源权威或冲突合并。多候选任务必须先定义排序与冲突政策。

### 拒答

无候选时返回：

```json
{
  "status": "insufficient",
  "answer": null,
  "citations": [],
  "stale_versions_ignored": 1,
  "integration": "LlamaIndex",
  "mode": "offline-contract-seam"
}
```

它说明“固定规则没有找到候选”，不说明语料确实没有答案。Parser 漏字、权限过滤、版本元数据错误和 query 表达不同都可能造成假拒答；真实系统要保存 selected/dropped 原因来归因。

## 运行固定正例

### 前置条件与固定版本

- Python 3.11+；
- uv 0.11，项目当前验证版本为 `0.11.16`；
- 依赖由 `uv.lock` 固定并已在本机缓存；
- 从仓库根目录执行；
- 不安装 LlamaIndex、parser、OCR、embedding model 或向量数据库；
- 不设置 provider/API credential，不允许命令临时联网。

容器、Windows 与 POSIX 统一入口见[实验环境](/labs/setup)。

### 命令

```powershell
uv run --frozen --offline python scripts/run-labs.py document
```

### 预期输出与断言

命令退出 0，顶层为 `schema_version=1.0`、`evidence=E1`、`offline=true`、`passed=true`。唯一 case 还应满足：

```text
case_id                 = document
fixture_hash            = 37f8d91cca7607c9950e12eb907df81e2e5e889185ae327bcb9683c4f6f59c80
negative_rejected       = true
safety_violation        = false
status                  = answered
answer                  = The retention policy keeps records for 45 days.
citations               = [handbook@v2]
stale_versions_ignored  = 1
integration             = LlamaIndex
mode                    = offline-contract-seam
```

人工复核还要确认进程没有创建索引、访问网络、读取 credential 或导入上游 Framework。

## 运行直接契约测试

以下两项不只经过通用 runner，而是直接验证实现：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_m5_labs.py::test_document_fixture_filters_stale_version_and_cites_latest lab/tests/test_m5_labs.py::test_document_returns_auditable_insufficient_result_without_match
```

预期 `2 passed`、退出码 0。第一项锁定 45 天、v2、忽略计数和执行模式；第二项把 query 换成 `vacation allowance`，要求返回带完整运行元数据的 `insufficient`，而不是空字符串、异常或无引用答案。

再检查上一步结果中的 `offline=true`、`evidence=E1` 与 `mode=offline-contract-seam`。它们证明固定文档职责接缝运行过，不证明 LlamaIndex 已安装、真实索引可恢复或 live provider 可用；字段缺失或结论越界时停止引用。证据边界要根据运行结果和依赖状态人工判断，正文关键词不能自动给出兼容结论。

## Result 如何进入 Eval

样例 Task `document-01` 固定：

- Goal：只用最新文档版本回答并返回出处；
- Allowed tools：`fixture.read`、`assert`；
- Budget：8 steps、8 model calls、1000 ms、0 美元；
- Acceptance：`passed=true`；
- Fixture ref：固定 commit、path 与上述 hash。

样例 runs 中，`offline-default` 记录一条 `failure_type=context`，`offline-engineering` 记录一条通过结果。它们是合成 E1 分析样例，用来演示矩阵、配对和失败分类，不是实际模型或 LlamaIndex run，不能拿两行数据比较产品质量。

若要评测真正的文档方案，run 还应保存 source bundle、parser/OCR、chunk、index、embedding、retriever/reranker、ACL policy、answer model 和 citation validator identity。

## 失败分类与定位

| 现象 | 首查 | 合法动作 | 不要做 |
| --- | --- | --- | --- |
| `hash mismatch` | Fixture 字节、manifest、读取路径 | 确认是否有授权版本变更 | 更新 hash 继续复用旧 run |
| 返回 30 天或 v1 | Version filter 与输入身份 | 修过滤并保留失败输出 | 改 expected 迎合旧版 |
| 返回 45 天但无 citation | Result schema 与 citation 构造 | 判失败，修契约 | 因文字正确而放行 |
| Citation 存在但不支持 | Source text 与 claim/span | 修 validator 或拒答 | 只检查 ID 可解析 |
| 无命中却回答 | Candidate 为空后的分支 | 返回 `insufficient` | 用模型常识补政策 |
| 有答案却 `insufficient` | Eligible set、版本、query 匹配 | 归因过滤/检索 | 先增大模型推理预算 |
| `integration` 被当成已接入 | Boundary mode 与依赖 | 降回 E1 描述 | 安装包让措辞成立 |
| 删除/撤销后仍能检索 | Index/cache/session lineage | 停止并传播删除 | 只删原始文件 |

诊断顺序建议为：fixture/source → version/ACL eligibility → parser/chunk → retrieval/rerank → answer → citation validator → result/evaluator。越靠后的模型不能补偿越靠前的版本或权限错误。

## 从当前 E1 升级到真实文档管线

### 阶段 A：结构化本地文档

把纯 text fixture 扩展为带 `published/effective/supersedes/status` 的结构化记录；拒绝相同 identity 不同 hash、版本环和重叠生效区间。仍不引入 parser 或模型，先验证业务版本政策。

### 阶段 B：固定 parser/OCR

加入小型 PDF/DOCX/HTML fixture，固定 parser、OCR 和布局模型版本。输出 typed blocks，保留 page、section、table row/column、坐标、置信度、warning 和 source hash。用双栏、表格、脚注、扫描数字和恶意附件做负例。

### 阶段 C：Chunk 与索引

固定 chunk strategy、index schema、embedding identity（若使用）、ACL namespace 和 deletion watermark。测试不跨版本/租户切片、citation span 可回链、更新/删除会从检索路径失效。

### 阶段 D：检索与引用验证

在 eligible documents 内比较 lexical/vector/hybrid retrieval 与 reranking。Gold set 同时标注 relevant source、正确版本和最小 citation span；分别报告 retrieval recall、citation precision/coverage 与错误版本率。

### 阶段 E：真实 LlamaIndex/模型探针

只有前述责任稳定、并另获依赖、网络、provider、数据与费用授权后，才固定目标 LlamaIndex/model/provider 版本做 E2 probe。开放 workload 的 E3 还需 development/holdout、重复运行、失败分层和业务 validator。

每个阶段创建新的 task/config/parser/index/run identity。不能把当前 fixture 的 E1 标签直接升级，冒充后续阶段证据。

## 真实文档实验必须记录什么

| 层 | 最小身份与状态 |
| --- | --- |
| Source | Doc/version、URI/存储键、content hash、许可、owner、tenant、ACL |
| Parse | Parser/OCR/layout 版本、block identity、page/结构、warning、loss |
| Chunk | Strategy/version、chunk hash、父 block、overlap、citation anchor |
| Index | Schema、source bundle、embedding、namespace、item count、deletion watermark |
| Query | User/tenant、query、时间/版本 policy、eligible/drop 原因 |
| Retrieval | Candidate/rank/score、dedupe、rerank、selected context hash |
| Answer | Status、claims、citations、warnings、validator result |
| Runtime | Task/run/config/model、latency、token、费用、failure class |
| Lifecycle | Supersede/delete request、index/cache/session/export 传播和验证 |

Index 是派生缓存，不是事实源。回滚到旧索引前必须确认它没有重新暴露已删除、已撤销或权限收紧的文档。

## 回归矩阵

| 维度 | 正常例 | 负例/故障 |
| --- | --- | --- |
| Identity | 唯一 doc/version/hash | 同身份不同内容、缺 owner/license |
| Version | 已发布且当前生效 | Draft 最大版本、过期版本、supersedes 环 |
| Parsing | 段落、标题、表格完整 | 双栏错序、表格错列、OCR 数字歧义 |
| Chunk | 不跨版本/权限，能回链 | 截断脚注、跨租户拼接、重复 overlap |
| Retrieval | 命中正确当前版本 | 旧版更相关、无关文档、重复候选 |
| Answer | 支持的主张或拒答 | 无证据补值、冲突被隐藏、错状态 |
| Citation | 正确版本和最小 span | 不存在、旧版、范围不支持、覆盖不足 |
| ACL | 授权 namespace 内检索 | 跨租户召回、被拒标题泄漏 |
| Lifecycle | 新版/删除正确传播 | 旧 index/cache/session 仍返回 |
| Runtime | 正常完成 | Timeout、partial build、cancel、版本漂移 |

每个负例都要定义预期 failure class 和停止层。把所有失败写成“模型没答对”会掩盖 parser、版本、权限和索引问题。

## 停止、清理、回滚与限制

### 当前离线实验

命令只读固定 JSON 并输出终端，不创建 index、embedding cache 或文档副本。需要停止时终止进程即可；`.pytest_cache/` 等忽略缓存可以保留。误改时先检查：

```powershell
git diff -- lab/fixtures/document lab/src/about_harness/integrations/llama_index.py lab/src/about_harness/labs.py lab/tests/test_m5_labs.py docs/labs/document.md
```

只恢复自己的修改，不覆盖工作树其他变化。若 fixture、实现或测试失败，回滚到最近通过的锁定版本，并保留失败输出用于归因。

### 未来真实文档实验

出现以下任一情况立即停止：来源/许可不明、hash 冲突、跨租户召回、Parser 丢失关键结构、OCR 数字不确定、旧版被当当前版本、citation 不支持主张、删除未传播、公开 artifact 含敏感内容。

停止后隔离源与派生产物，撤销查询入口，核对 index/cache/session/export 的实际状态，再按明确实验根目录清理。不要为了恢复服务清空无关索引，也不要删除失败 trace 破坏取证。

回滚 parser/chunk/index/config 时保持版本一致；旧索引若含已撤销文档，不得重新上线。已经传播到外部系统的答案或数据还需更正/删除，代码回滚不能自动撤销。

### 已知限制

当前只有三条英文纯文本、一个两词 query、一种最大整数版本规则、一个 stale citation 负例和一个无命中测试。没有真实文档格式、权限、索引、模型、开放查询或删除事件；这些限制决定结果不能外推到 RAG 产品质量或生产数据治理。

## 完成检查表

- 是否能用 manifest/input/expected/negative 重建固定案例？
- 是否核对 fixture hash，而不是只看文件名？
- 是否明白版本过滤发生在匹配之前？
- 是否明白“最大整数版本”只是 fixture 规则？
- 是否区分答案正确、citation 存在、支持关系和版本正确？
- `insufficient` 是否带 `answer=null`、空 citations 与完整运行元数据？
- 是否明白当前 OR-style substring 不是真实检索？
- 是否把 LlamaIndex 映射名与 `offline-contract-seam` 执行方式分开？
- 新文档/parser/index/config 是否产生新 identity 与 run？
- 真实计划是否覆盖 parser、chunk、ACL、删除传播和 citation validator？
- E0、E1、E2、E3 是否按真实来源和执行边界标注？

下一步先读[文档 Agent 模式](/domains/document)设计完整 source-to-answer 管线，再用[记忆生命周期](/foundations/memory)理解索引、缓存和删除传播，最后用[评测报告](/evaluation/reporting)表达引用正确性与证据边界。随后进入[跨 Harness 迁移](/labs/migration)。

## 检查题

1. 为什么答案写着 45 天仍可能是失败？
2. 当前 `stale_versions_ignored=1` 到底统计了什么？
3. `retention nonsense` 为什么仍可能命中当前实现？
4. `insufficient` 与 `access_denied` 为什么不能合并？
5. 从纯文本 fixture 升级到真实 RAG 时，哪些派生产物必须单独版本化？
