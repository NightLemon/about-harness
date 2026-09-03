# 文档 Agent 模式

Document agent（文档 Agent）不是“把 PDF 转成字符串后提问”，而是围绕版本化文档建立可追溯的数据管线：获得原件、解析结构、生成可失效的索引、按权限和版本检索、输出可定位引用，并在证据不足时拒答。

```text
source → acquire → parse → normalize → chunk → index
                                          ↓
query → identity/access/version filter → retrieve → rerank
      → answer/abstain → citation validator → result
```

任一中间产物都必须能回到精确源文档与处理版本。答案文字正确但引用了错误版本、错误表格行或无权访问的文档，仍然失败。

## 文档不是一个字符串

至少区分五类对象：

| 对象 | 最小身份 | 主要风险 |
| --- | --- | --- |
| Source object（源对象） | source ID、URI/存储键、content hash、许可、访问标签 | 原件被覆盖或来源不明 |
| Document version（文档版本） | doc ID、version、发布日期/生效期、supersedes | 新旧政策混用 |
| Parsed block（解析块） | parser/version、page、block type、坐标/结构路径 | 表格、脚注、阅读顺序丢失 |
| Chunk（检索片段） | chunk ID/hash、父 block、边界策略、版本 | 引用无法定位或上下文被切断 |
| Index entry（索引项） | index version、embedding/model（若有）、ACL namespace | 删除未传播、跨租户召回 |

文档级 hash 只能证明原始字节是否变化；parser、OCR、表格恢复或 chunk 策略改变时，派生产物也应有新身份。只记录文件名无法复现一次回答。

## 先写查询与证据契约

在摄取文档前定义 query contract（查询契约）：

- 允许回答哪些文档集合、租户、语言和时间范围；
- “当前”“最新”“生效”由发布日期、有效期还是显式 supersedes 决定；
- 需要逐句、逐段还是文档级引用；
- 表格数字是否必须引用 row/column；
- 允许综合多个来源，还是只能返回单一权威来源；
- 来源冲突、访问受限、OCR 置信不足或无命中时如何 abstain（拒绝作答）；
- 答案、引用、证据摘要和 confidence 的输出 schema；
- 最大检索量、延迟、token、费用和人工复核预算。

“使用最新文档”不是完整规则。Version `2` 可能只是草稿，较晚发布日期也不一定废止旧政策；需要由业务元数据决定 eligible version（合格版本）。

## 摄取阶段：先冻结原件与权限

Acquisition（摄取）记录：

```text
source_id / doc_id / source_uri_or_key
raw_content_hash / byte_size / media_type
title / language / owner / license
published_at / effective_from / effective_to / supersedes
tenant / ACL / retention / deletion status
acquired_at / connector version / ingestion run ID
```

原件存储与公开 fixture 分开。真实文档可能包含个人数据、合同、隐藏批注或附件；进入实验前先获得使用权、脱敏并固定 hash。下载成功不证明内容可使用，也不证明 parser 完整。

### 摄取负例

- 同一 `doc_id/version` 出现不同 content hash；
- License/owner 缺失却进入公开数据集；
- 已删除或无权访问文档仍进入下游队列；
- Connector timeout 后重复创建两个版本；
- HTML 登录页或错误页被当作 PDF 正文。

这些情况应在解析前失败。不要让模型从标题猜正文或版权状态。

## 解析阶段：保留结构与损失说明

Parsing（解析）把字节转成 typed blocks（有类型的结构块），而不是一段扁平文本。常见 block 包括 heading、paragraph、list、table、figure、caption、footnote、header/footer 和 code。

每个 block 至少保留：

- document/version/source hash；
- page 或 section path；
- block type、顺序与父子关系；
- 原始/规范化文本；
- 表格 row/column、合并单元格和标题关联；
- 图像/caption/alt/OCR 的来源；
- parser、OCR 与布局模型版本；
- block hash、置信度和 warning。

### OCR 不确定性

OCR（光学字符识别）可能把 `0/O`、小数点、负号、日期和表格列读错。不要只保留 OCR 文本；保留页图引用、坐标、引擎版本和置信信号。低于业务阈值的数字、姓名或条款进入人工复核或拒答，不能由语言模型“纠正常识”。

### 表格不是行文本

表格需要 header hierarchy、row/column identity、merged cell 和 footnote。将每行直接拼成句子可能把金额与错误实体配对。负例应交换两列、删除单位、跨页截断和合并单元格，验证解析器能拒绝或显式标记损失。

### 页眉页脚与阅读顺序

重复页眉可能污染检索；双栏页面按错误顺序拼接会制造不存在的句子。清理规则应保存原 block 和 transformation version，避免“去噪”后无法解释缺字。

## Chunking：检索单位不等于引用单位

Chunking（切片）把结构块组合成检索单元。Chunk 应满足：

- 不跨 tenant、document version 或权限边界；
- 尽量保留 heading、table、list 和 footnote 的完整语义；
- overlap 可追踪，避免重复证据被当成多个来源；
- 父文档、页/段锚点和 block ID 始终可回链；
- Token 长度适合目标 embedding/retrieval/model，但不硬编码为通用值；
- Chunk text、metadata、strategy 和 hash 一起版本化。

Embedding chunk 可以比引用范围更宽；最终 citation span（引用范围）应指向实际支持主张的最小页/段/表格单元。引用整个 100 页手册不能证明某个数字。

### Chunk 边界实验

用含跨页段落、标题+列表、表格+脚注的固定小文档比较候选策略。主要结果不是“切得更碎”，而是 retrieval recall、citation precision、重复率、上下文 token 和错误版本率。每次只改变一个主要策略。

## Index：身份、权限与失效

Index（索引）是派生缓存，不是事实源。索引记录至少绑定：

```text
index_id / schema_version
source bundle hash / parser version / chunk strategy
embedding model/provider/version and dimensions（若使用）
tenant / ACL namespace / encryption class
built_at / build run / item count / failure count
superseded_by / deletion watermark
```

更新不能只追加新版本。新文档生效、旧版撤销、权限变化或删除请求发生时，要让旧 chunk 在查询路径中不可检索，并验证物理清理/保留策略。Blue-green index（蓝绿索引）可以先构建新版本、跑回归、原子切换，再保留有限回退窗口。

访问控制最好在检索前作用于 index namespace/filter，并在返回结果后再防御性复核。先跨租户检索再让模型“忽略无权内容”已经造成泄漏。

## Query：先做资格过滤，再排序相关性

查询流程建议固定为：

1. 验证用户、tenant、权限、任务和 query schema；
2. 解析时间/版本语义，选择 eligible documents；
3. 在合格集合内 lexical/vector/hybrid retrieve；
4. 去重同一 chunk/overlap，保留来源多样性；
5. Rerank（重排）但不允许把不合格版本重新带回；
6. 组装 context，记录 selected/dropped 与原因；
7. 生成答案或 `insufficient/conflict/access_denied/parse_failed`；
8. Citation validator 独立核对每条主张和引用；
9. 保存结果、索引/config identity、latency 和 failure class。

版本和 ACL 是资格条件，不是一个可被 relevance score 抵消的软分数。旧政策与当前问题文字更相似，也不能因此排在生效版本前。

## 回答、引用与拒答

推荐输出契约：

```json
{
  "status": "answered | insufficient | conflict | access_denied | parse_failed",
  "answer": "... or null",
  "claims": [
    {
      "text": "...",
      "citations": [
        {
          "doc_id": "...",
          "version": "...",
          "page": 0,
          "block_id": "...",
          "chunk_hash": "..."
        }
      ]
    }
  ],
  "warnings": [],
  "evidence_bundle_id": "..."
}
```

Citation correctness（引用正确性）至少包含两件事：引用对象确实存在；引用内容实际支持该主张。Citation coverage（引用覆盖）检查所有需要证据的主张是否有出处。二者不能只靠 URL 或文档标题存在来通过。

拒答不是空字符串。`insufficient` 应记录查过的版本范围和缺口；`conflict` 保留各方主张与来源；`access_denied` 不泄露被拒文档的标题或内容；`parse_failed` 保留不含原文的解析错误 identity。模型记忆不能补发布日期、政策数字或缺失页。

## 版本选择要写成政策

常见策略各有前提：

| 策略 | 合法前提 | 风险 |
| --- | --- | --- |
| 最大整数版本 | 版本号单调且只含已发布内容 | 草稿/分支版本被误选 |
| 最新发布日期 | 日期可信且新版自动取代旧版 | 修订不等于生效 |
| 生效时间窗口 | Metadata 完整、时区明确 | 缺失/重叠窗口 |
| 显式 supersedes 图 | 文档维护者记录替代关系 | 图断裂或环 |
| Authority hierarchy | 有稳定来源优先级 | 新低权威来源被忽略 |

生产系统常组合有效期、状态与 supersedes；冲突时返回 `conflict` 或人工复核。当前仓库 fixture 使用“同 doc ID 取最大整数版本”，只是固定教学规则，不应复制为通用政策。

## 删除与重新索引是端到端事件

删除文档时要追踪：

```text
source object
  → parse artifacts
  → chunks
  → lexical/vector index
  → caches
  → sessions/memory
  → traces/evaluation fixtures/public exports
```

不同存储可有合法保留期，但查询路径必须及时停止返回已撤销内容。记录 deletion request、対象 identity、各层完成状态、异常和最终验证。只从对象存储删原件而索引仍可召回，是数据生命周期故障。

回退索引版本前也要复核：旧索引可能包含已删除或权限已收紧的文档，不能因技术回退重新暴露。

## 威胁模型

文档内容是不可信数据。需要防范：

- 文档内 prompt injection 诱导读取 Secret、调用工具或改变权限；
- 隐藏层、批注、附件、白字或 metadata 中的指令；
- 通过文件名、标题或引用泄露另一个 tenant 的存在；
- 恶意压缩包、超大页、递归对象和 parser 资源耗尽；
- OCR/解析器漏洞与危险外部链接；
- 模型在答案中复述敏感原文；
- Public trace/fixture 携带未脱敏文档片段。

解析放入隔离环境，限制文件大小、页数、时间和内存；模型只能使用检索到的内容回答，文档文字不能提升为 system 指令或工具授权。高敏内容先做字段级 redaction，再决定是否送给模型。

## 指标分层

不要只测 end-to-end answer accuracy。分层指标更容易归因：

| 层 | 指标 |
| --- | --- |
| 摄取 | 成功/拒绝分类、hash 冲突、许可/ACL 完整率 |
| 解析 | Block 顺序、表格单元格、OCR 字符/字段正确、warning recall |
| Chunk | 语义完整、重复率、锚点可回链、token 分布 |
| Index | Item/文档数守恒、ACL 隔离、更新/删除传播、构建失败 |
| Retrieval | Recall@k、版本选择、权限违规、重复、无关召回 |
| Answer | Task correctness、unsupported claims、拒答/冲突质量 |
| Citation | Precision、coverage、span accuracy、版本正确 |
| 运行 | P50/P90、token/费用、cache、人工介入和失败恢复 |

建立 gold set（人工核验集）时保存 source bundle、parser/index/config 和 rubric 版本。Parser 修复后旧 gold span 可能失效，需要迁移而不是直接比较。

## 诊断顺序

| 现象 | 首查证据 | 正确责任层 | 不要先做 |
| --- | --- | --- | --- |
| 找不到答案 | Eligible set、ACL、版本、parse/chunk | 摄取/检索 | 增加模型推理 |
| 答案引用旧政策 | Version policy、index invalidation | 版本/生命周期 | 只改 prompt |
| 表格数字错配 | Cell/row/column、跨页结构 | Parser | 归因模型算错 |
| 引用存在但不支持 | Claim-span validator | 生成/引用 | 只看链接有效 |
| 删除后仍命中 | Index/cache/session lineage | 生命周期 | 清空全部而无审计 |
| 跨租户泄漏 | Namespace/filter/identity | 权限 | 让模型忽略 |
| 回答流畅但无出处 | Retrieval/context/answer schema | Harness | 用自信度代替证据 |
| OCR 数字可疑 | Page image/坐标/置信度 | OCR/人工复核 | 让模型猜 |

每次修复建立新 parser/chunk/index/config identity，重跑相邻回归。旧结果保留为历史故障，不混入新配置指标。

## 当前离线工作例

仓库的 `document` fixture 有三条合成文档记录：`handbook@v1` 的 retention block 写 30 天，`handbook@v2` 写 45 天并另有 review block，第三条是无关 support block。确定性函数拒绝重复版本身份，按 `doc_id` 选择最大正整数版本，先检查 `access/parse_status`，再要求全部 query tokens 在同一 block 命中。

### 前置条件与固定输入

需要 Python 3.11+ 和 uv 0.11；依赖由 `uv.lock` 固定。从仓库根目录离线执行，不安装 LlamaIndex、parser、OCR、embedding model 或向量数据库，不设置 provider credential。

输入与期望位于 `lab/fixtures/document/`：

- `manifest.json` 固定 synthetic 来源、CC BY 4.0 许可和三个文件 hash；
- `input.json` 固定 query 与三个带 access/parse/blocks 的版本化文档；
- `expected.json` 要求回答 45 天、返回 v2 retention block 的结构化 citation、忽略一个旧版本；
- `negative.json` 提交 v1 的 30 天 answer 与 citation，runner 必须拒绝。

### 命令

```powershell
uv run --frozen --offline python scripts/run-labs.py document
```

### 预期输出与断言

命令退出 0，并输出 `evidence=E1`、`offline=true`、`passed=true`、`negative_rejected=true`。Result 的 `status=answered`，答案包含 45 天，citation 锁定 `handbook` v2 的 `retention` block 与 quote；`stale_versions_ignored=1`，权限/解析失败计数为 0，fixture hash 与 manifest bundle 一致。

人工复核还要确认：没有网络、credential、真实文档或上游 framework import；机器字段 `integration=LlamaIndex` 只是教学职责映射，`mode=offline-contract-seam` 才是实际执行方式。

### 失败、停止、清理与回退

若引用 v1、混用 30/45 天、无出处回答、manifest hash 不一致、负例未拒绝或命令需要网络，停止文档能力声明。先修 fixture/validator/版本规则，并保留失败输出；不要安装真实依赖、修改 expected 迎合错误结果或让模型凭记忆补答案。

命令只读固定 JSON 并打印结果，不构建索引；无需清理文档数据，可能产生的 Python cache 不属于证据。误改时先运行：

```powershell
git diff -- lab/fixtures/document lab/src/about_harness/integrations/llama_index.py lab/src/about_harness/labs.py docs/domains/document.md
```

确认范围后只恢复自己的变化。候选失败时回到 manifest 锁定的 fixture 与已通过的确定性实现，不覆盖其他工作树改动。

### 证据边界

该实验提供 E1：当前仓库能读取固定 JSON、校验 bundle hash、拒绝版本身份冲突、按教学规则排除旧整数版本、在 parsed blocks 做 AND-style token 匹配、返回块级引用，并区分普通无命中、权限拒绝与解析失败。

它没有 PDF/DOCX/HTML 解析、OCR、表格、图片、embedding、vector search、reranker、真实 user/tenant ACL、删除传播或真实 LlamaIndex；也没有模型生成。`access/parse_status` 是 fixture 输入，不是外部系统实测。因此不能证明真实文档问答正确、真实框架已接入或生产数据安全。

## 完成检查表

- 原件、document version、parsed block、chunk 和 index 是否有独立身份？
- License、owner、tenant、ACL、保留与删除是否在摄取前明确？
- Parser/OCR 是否保留结构、坐标、版本、置信和损失 warning？
- Chunk 是否不跨版本/权限边界，并能回链最小 citation span？
- “当前版本”是否有业务政策，而不是简单取最大数字？
- ACL 和版本是否在 retrieval 前作为资格过滤？
- Answer 是否逐主张引用，并由独立 validator 检查支持关系？
- `insufficient/conflict/access_denied/parse_failed` 是否不泄漏、不由模型记忆补值？
- 更新、撤销、权限变化和删除是否传播到 index/cache/session/export？
- 指标是否覆盖摄取、解析、检索、引用、安全与运行，而非只看答案？
- 每个结果能否回链 source/parser/chunk/index/config identity？
- 当前 E1 fixture 是否没有被误写成真实 parser/RAG/LlamaIndex 证据？

下一步：运行[文档离线案例](/labs/document)，再读[记忆生命周期](/foundations/memory)设计删除传播，并用[评测报告](/evaluation/reporting)表达引用和证据边界。

## 检查题

1. 为什么文档 content hash 不足以复现一个检索结果？
2. “最新发布日期”与“当前生效版本”为什么不是同一概念？
3. Retrieval chunk 与 citation span 为什么可以不同？
4. 已删除原件仍能从向量索引召回时，故障属于哪一层？
5. 当前 document fixture 通过后，为什么仍不能声称具备 PDF RAG 能力？
