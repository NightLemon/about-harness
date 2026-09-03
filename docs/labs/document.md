# 文档实验：版本、权限、解析与块级出处

本实验把一个常见但容易被忽略的文档问答问题做成固定离线案例：同一 handbook 同时存在 v1 与 v2，系统必须先排除旧版本，检查最新版的访问与解析状态，在同一个 block 中匹配全部 query terms，再回答 retention policy，并返回实际使用的版本、block 与 quote。

它不安装 LlamaIndex，不建立向量索引，也不运行模型。实验验证的是“身份/版本校验 → ACL/parse 状态 → block-level 确定性检索 → 回答或 typed stop → 结构化引用负例 → 结果”这条最小责任接缝。

完成本页后，你应该能：

- 从四个 fixture 文件重建输入、期望和负例；
- 解释为什么版本过滤必须早于相关性排序；
- 区分“回答文字正确”“引用存在”“引用 block 支持主张”和“引用版本正确”；
- 运行正常回答、旧引用拒绝、重复版本、权限、解析失败和无命中测试；
- 说清当前 E1 证据与真实 parser/RAG/LlamaIndex 的差距。

## 先看证据边界

当前合法结论是：锁定的 Python 函数拒绝重复 `doc_id@version` 与非正版本，按 `doc_id` 保留最大整数版本，不从 denied/failed 最新版回退到旧内容；对 parsed blocks 要求全部 query terms 在同一 block 出现。正常例返回 v2 retention block 的结构化 citation；无匹配、无权访问和解析失败分别返回 `insufficient`、`access_denied`、`parse_failed`。

当前不能推出：

- LlamaIndex 已安装、导入或与当前代码兼容；
- PDF、DOCX、HTML、扫描图、表格或脚注能正确解析；
- Chunking、embedding、vector search、reranker 或生成模型有效；
- “最大整数版本”适用于真实政策的发布、生效和废止规则；
- 引用文本在开放任务中真正支持每条主张；
- 真实 ACL/租户身份、parser、删除传播和索引回滚已经实现。

因此结果保持 E1：离线契约接缝。它不是 E2 上游组件探针，也不是 E3 文档问答质量证据。

## 固定问题是什么

输入包含三条版本化记录，每条都声明 `access`、`parse_status` 和 blocks：

| `doc_id` | `version` | Block | 在当前规则下的资格 |
| --- | ---: | --- | --- |
| `handbook` | 1 | `retention`：30 天 | 被同 ID 的 v2 排除 |
| `handbook` | 2 | `retention`：45 天；`review`：年度复核 | 最新、allowed、parsed，逐 block 匹配 |
| `unrelated` | 1 | `support`：工作日提供支持 | 自身最新，但没有同时包含 query 两个词 |

查询固定为 `retention policy`。正确答案必须是 45 天，citation 必须同时记录 `handbook`、v2、`retention` block 和原 quote；文字答对但引用 v1 或另一个 block，仍然失败。

这里的“最新”是实验规则，不是通用业务语义。真实版本资格可能取决于 `status=published`、`effective_from/effective_to`、显式 `supersedes`、地区、租户或 authority hierarchy（权威层级），不能只取最大数字。

## 实际执行链

```text
manifest.json
  ├─ 校验 input/expected/negative 的 SHA256
  └─ 计算整个 fixture hash
            ↓
input.json ──→ answer_from_latest(payload)
                 1. 校验 query 为非空字符串
                 2. 提取至少一个 query token
                 3. 校验 documents 与唯一 doc_id@positive-version
                 4. 校验 allowed/denied 与 parsed/failed/not_attempted 组合
                 5. 拒绝 denied/failed 记录暴露 blocks
                 6. 校验 parsed block ID 唯一且 text 非空
                 7. 每个 doc_id 只保留最大整数版本
                 8. 在 allowed+parsed 最新版内要求全部 query token 同块命中
                 9. 候选按 doc/version/block/text 排序，取第一条
                10. 无候选按可读性返回 insufficient/access_denied/parse_failed
            ↓
expected.json ──→ 对列出的字段做相等检查
negative.json ──→ candidate answer/status/citation 与当前结果不一致时拒绝
            ↓
case result ──→ expected matched AND negative rejected
```

这条链路没有模型“理解政策”，也没有检索分数。答案直接等于选中 block 的完整 `text`。

## 四个 fixture 文件分别负责什么

| 文件 | 当前内容 | 责任 |
| --- | --- | --- |
| `manifest.json` | 来源、许可、核对日、个人数据标记、三个文件 hash | 冻结实验输入并阻止静默篡改 |
| `input.json` | Query 与三条带 access/parse/blocks 的版本化文档 | 固定文档集合和查询语义 |
| `expected.json` | `answered`、45 天、块级 v2 引用与状态计数 | 定义业务断言，而非只看退出码 |
| `negative.json` | 提交 v1 的 30 天 answer 与块级 citation | 验证旧答案和引用不会被接受 |

整个 fixture hash 当前为：

```text
96ba0bd2abf2608014bab56debf249b24982e8169f21809e85e9d5bb000e52c7
```

当前 lab 使用上面的 v1.1 fixture。历史 Eval task `document-01` 仍通过 commit `6aada53…`、固定 path 与旧 hash `37f8d91…` 读取 v1.0 输入；它不会被当前工作树升级覆盖。若要用 v1.1 形成新评测证据，应新增 fixture ref、Task/run identity 和结果。

## 逐字段解释 Result

### `status`

有候选时为 `answered`。至少有一个 allowed+parsed 最新文档但没有 block 同时包含全部 query terms 时为 `insufficient`；没有任何可读最新版且至少有 denied 文档时为 `access_denied`；没有可读最新版但有解析失败时为 `parse_failed`。这三种停止都返回 `answer=null` 和空 citations，调用者不应让模型凭记忆补值。

当前仍没有 `conflict`，也没有真实 user/tenant/ACL policy 或 parser error artifact。`access_denied` 与 `parse_failed` 是固定输入状态机结果，不证明任何真实权限系统或文档 parser 已运行。

### `answer`

`answered` 时直接返回候选 block 完整文本；其他状态为 `null`。这不是模型生成，也没有 claim decomposition（主张拆分）或摘要。

因此答案 45 天正确只证明固定字符串路径正确，不能证明开放问题、跨段综合或数字抽取可靠。

### `citations`

当前 citation 是 `{doc_id, version, block_id, quote}`。它能把 answer 回到固定 v2 block，并证明 quote 与返回文本一致；但没有 source/content hash、page、section、table cell、坐标、独立 chunk identity 或更小 citation span。

真实 citation validator 至少分别检查：

1. Citation identity 存在且当前调用者有权访问；
2. Citation version 是本次查询的合格版本；
3. 引用范围实际支持答案中的对应主张；
4. 所有需要证据的主张都被覆盖。

当前负例会比较整个结构化 citation，而非只查一个版本字符串；仍然没有自然语言 claim-span 蕴含验证。

### `stale_versions_ignored`

实现用 `len(documents) - len(latest_by_doc_id)` 计算被折叠的版本数量。固定输入中有两条 handbook、一个 unrelated，最终保留两个 `doc_id`，所以值为 1。

这个字段统计所有重复 `doc_id` 被丢弃的条目，不只统计与当前 query 相关的文档。它也不证明被丢弃版本确实“过期”；只有 fixture 的教学规则这样解释。

### `integration` 与 `mode`

`integration=LlamaIndex` 是教学职责映射名；`mode=offline-contract-seam` 是实际执行方式。当前依赖中没有 LlamaIndex distribution，代码也不 import 它。

所有四种 status 都返回这两个字段，以及 `stale_versions_ignored`、`access_denied_documents`、`parse_failed_documents`，使停止结果也能说明由哪个离线边界产生。

### `negative_rejected`

Runner 读取结构化 `candidate_answer`，比较 `status`、`answer` 和 `citations`。负例提交 v1 的 30 天文本与块级 citation，因此必须被拒绝。同版本重复身份由输入校验单独拒绝；但当前仍不解析开放自然语言答案或验证 quote 对任意复合 claim 的语义支持。

## 当前检索规则的精确限制

### 版本选择

每个 `doc_id` 只保留最大整数 `version`。当前函数：

- 拒绝 string、float 和 bool 版本；
- 拒绝零和负整数；
- 没有验证版本是否连续；
- 同一 `doc_id/version` 重复时直接拒绝，不允许输入顺序决定内容；
- 不理解 draft/published/effective/superseded 状态；
- 不处理同一政策在不同地区或租户同时生效。

所以这段逻辑只适合固定教学数据。生产版本政策必须由业务元数据决定，并对重复身份/不同 hash 失败关闭。

### 词项匹配

Query 与 block text 经 `casefold()` 后提取 `\w+` tokens；只有 query token 集合全部包含在同一 block token 集合中才进入候选。因此 `retention nonsense` 不再因单个词命中。这仍只是 AND-style exact-token seam，不处理同义词、词形、短语顺序、否定、字段权重或语义相关性。

候选最终按 tuple 排序后取第一条，主要受 `doc_id` 字典序影响；没有 relevance score、reranking、来源权威或冲突合并。多候选任务必须先定义排序与冲突政策。

### 拒答

无候选时返回：

```json
{
  "status": "insufficient",
  "answer": null,
  "citations": [],
  "stale_versions_ignored": 1,
  "access_denied_documents": 0,
  "parse_failed_documents": 0,
  "integration": "LlamaIndex",
  "mode": "offline-contract-seam"
}
```

它说明“存在可读最新版，但固定规则没有找到候选”，不说明语料确实没有答案。Parser 漏字、版本元数据错误、同义表达和 query 拆解错误都可能造成假拒答。若没有可读最新版，函数改用 `access_denied` 或 `parse_failed`，但真实系统仍要保存不泄密的 selected/dropped 原因与 error identity 来归因。

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
fixture_hash            = 96ba0bd2abf2608014bab56debf249b24982e8169f21809e85e9d5bb000e52c7
negative_rejected       = true
safety_violation        = false
status                  = answered
answer                  = The retention policy keeps records for 45 days.
citations[0].doc_id     = handbook
citations[0].version    = 2
citations[0].block_id   = retention
stale_versions_ignored  = 1
access_denied_documents = 0
parse_failed_documents  = 0
integration             = LlamaIndex
mode                    = offline-contract-seam
```

人工复核还要确认进程没有创建索引、访问网络、读取 credential 或导入上游 Framework。

## 运行直接契约测试

以下命令不只经过通用 runner，还直接验证 block 引用、AND-style 查询、重复版本、旧版回退、权限与解析状态：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_m5_labs.py -k document
```

预期所有 document 测试通过、退出码 0。拒绝类测试通过表示坏输入或错误 candidate 被拒绝；`access_denied`/`parse_failed` 测试通过表示 typed stop 生效，不表示真实 ACL 或 parser 已验证。

再检查上一步结果中的 `offline=true`、`evidence=E1` 与 `mode=offline-contract-seam`。它们证明固定文档职责接缝运行过，不证明 LlamaIndex 已安装、真实索引可恢复或 live provider 可用；字段缺失或结论越界时停止引用。证据边界要根据运行结果和依赖状态人工判断，正文关键词不能自动给出兼容结论。

## Result 如何进入 Eval

样例 Task `document-01` 固定：

- Goal：只用最新文档版本回答并返回出处；
- Allowed tools：`fixture.read`、`assert`；
- Budget：8 steps、8 model calls、1000 ms、0 美元；
- Acceptance：`passed=true`；
- Fixture ref：历史 Eval 固定 commit、path 与 v1.0 hash `37f8d91…`，不指向当前 v1.1 工作树。

样例 runs 中，`offline-default` 记录一条 `failure_type=context`，`offline-engineering` 记录一条通过结果。它们引用历史 v1.0 fixture，是合成 E1 分析样例；既不是实际模型/LlamaIndex run，也不证明 v1.1 的 block/ACL/parse 契约，不能拿两行数据比较产品质量。

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
| 最新版 denied 却回退 v1 | Version-before-ACL 顺序 | 返回 `access_denied` | 用旧内容绕过权限 |
| Parse failed 被写成无答案 | Parse status 与 error identity | 返回 `parse_failed` | 当普通检索零召回 |
| 同一版本出现两次 | Document identity | 拒绝重复输入 | 让先后顺序决定真值 |
| `integration` 被当成已接入 | Boundary mode 与依赖 | 降回 E1 描述 | 安装包让措辞成立 |
| 删除/撤销后仍能检索 | Index/cache/session lineage | 停止并传播删除 | 只删原始文件 |

诊断顺序建议为：fixture/source → version/ACL eligibility → parser/chunk → retrieval/rerank → answer → citation validator → result/evaluator。越靠后的模型不能补偿越靠前的版本或权限错误。

## 从当前 E1 升级到真实文档管线

### 阶段 A：结构化本地文档

当前已有最小 `access/parse_status/blocks` 与重复 identity 拒绝。下一步增加 `published/effective/supersedes/status`、content hash、owner 与 tenant；拒绝版本环和重叠生效区间。仍不引入模型，先验证业务版本与权限政策。

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

当前只有三条英文合成文档、四个 parsed blocks、一个两词 query、一种最大整数版本规则和结构化 stale-answer 负例。权限/解析分支由人工构造状态触发，没有真实 user/tenant ACL、parser error、文档格式、索引、模型、开放查询或删除事件；这些限制决定结果不能外推到 RAG 产品质量或生产数据治理。

## 完成检查表

- 是否能用 manifest/input/expected/negative 重建固定案例？
- 是否核对 fixture hash，而不是只看文件名？
- 是否明白版本过滤发生在匹配之前？
- 是否明白“最大整数版本”只是 fixture 规则？
- 是否区分答案正确、citation 存在、支持关系和版本正确？
- `insufficient` 是否带 `answer=null`、空 citations 与完整运行元数据？
- 是否明白当前 AND-style exact-token 仍不是真实检索？
- 最新版 denied/parse failed 时是否停止而不回退旧版？
- 是否把 LlamaIndex 映射名与 `offline-contract-seam` 执行方式分开？
- 新文档/parser/index/config 是否产生新 identity 与 run？
- 真实计划是否覆盖 parser、chunk、ACL、删除传播和 citation validator？
- E0、E1、E2、E3 是否按真实来源和执行边界标注？

下一步先读[文档 Agent 模式](/domains/document)设计完整 source-to-answer 管线，再用[记忆生命周期](/foundations/memory)理解索引、缓存和删除传播，最后用[评测报告](/evaluation/reporting)表达引用正确性与证据边界。随后进入[跨 Harness 迁移](/labs/migration)。

## 检查题

1. 为什么答案写着 45 天仍可能是失败？
2. 当前 `stale_versions_ignored=1` 到底统计了什么？
3. `retention nonsense` 为什么不再命中，而 `retention policies` 仍可能因词形不同漏召回？
4. `insufficient` 与 `access_denied` 为什么不能合并？
5. 从纯文本 fixture 升级到真实 RAG 时，哪些派生产物必须单独版本化？
