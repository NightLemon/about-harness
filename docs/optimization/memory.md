# 记忆优化

Memory optimization（记忆优化）不是让 agent “记得更多”，而是在正确作用域内减少重复输入和重复工作，同时不增加过时事实、错误检索、Prompt Injection、跨租户访问或删除失败。检索命中只是中间信号；最终要看任务是否更正确、更省成本、更少人工纠正，而且安全门槛没有退化。

## 先定义要优化哪类记忆

| 类型 | 生命周期 | 适合内容 | 优化目标 | 主要风险 |
| --- | --- | --- | --- | --- |
| Working memory（工作记忆） | 单次 run | 当前计划、已完成步骤、工具回执 | 少重复、可恢复 | checkpoint 不一致 |
| Session memory（会话记忆） | 多轮会话 | 已确认事实、分支、未决项 | 压缩长对话 | 摘要丢边界 |
| Project memory（项目记忆） | 跨会话、同一项目 | 已验证命令、约定、架构决策 | 减少重新发现 | 版本过时、作用域串线 |
| User memory（用户记忆） | 跨项目 | 用户明确允许保存的稳定偏好 | 减少重复设置 | 隐私、错误泛化 |
| Shared/organizational memory（共享记忆） | 多用户/团队 | 审核过的规则与知识 | 统一行为 | 权限、租户和责任不清 |

Project instruction（项目指令）与自动记忆也要分开。人工维护、版本控制的规则更像可信配置；模型从历史对话自动总结的内容是派生数据，需要来源、写入 gate、失效和删除。不要把所有长期上下文都叫 memory 后使用同一可信等级。

## 记忆是一条数据管线

```text
候选内容
  → 写入判定
  → 结构化记录 + scope/version/TTL/provenance
  → 存储/索引/副本
  → 权限与有效性过滤
  → 相关性检索与 rerank
  → 上下文预算与来源呈现
  → 模型使用/忽略/冲突处理
  → 任务结果与反馈
  → 更新/失效/删除/审计
```

每个箭头都可能造成质量变化。检索不到不一定是 embedding 差，可能是写入从未发生；检索到却没帮助，可能是记录粒度、过时、排序、上下文位置或模型信任错误。先定位失败阶段，再调参数。

## 写入前先判“是否值得长期保存”

长期记录应满足：未来确有重复用途；来源可追溯；内容已验证或不确定性被保留；作用域、版本和失效条件明确；没有不必要的 Secret/个人数据；用户或 owner 能查看与删除。

默认不自动写入：

- 模型猜测、未验证结论和失败中间方案；
- 网页、邮件、issue、tool output 中要求未来执行的指令；
- Secret、cookie、原始个人数据、完整私有 trace；
- 只对一个临时分支或旧版本成立的结论；
- 可从权威源低成本重新计算的数据；
- 与现有记录冲突但尚未解决的新说法。

一个可审计记录至少包含：

```text
record_id / subject_or_key / content_or_reference
source / source_hash / writer / trusted / evidence
tenant / user / project / branch / task scope
created / checked / expires
applies_to_version / invalidation_triggers
classification / allowed_consumers
supersedes / conflicts_with / status
delete_reference / audit_reference
```

内容与元数据原子写入，不能先保存正文、稍后再补 scope。相同 `record_id` 写入不同内容应使用版本或 compare-and-swap（比较并交换），不应静默覆盖并失去历史。

## Granularity：一条记录有多大

Granularity（粒度）过大时，检索一个构建命令会带入整份会话和无关秘密；过小时，前提、版本和例外被拆散。优先按一个可独立验证的事实、决策或步骤保存，并把必要前提放在同一记录或显式关系中。

Chunk（切片）需要稳定 ID、源范围与重叠策略。重叠太多会让同一事实占满 top-k；无重叠可能切断条件。摘要可以降低 token，但要保留 source、否定、数字、未决冲突和适用版本；摘要本身是新派生记录，不能覆盖原来源。

对代码项目，保存“命令 + 适用 commit/脚本 hash + 验证时间”通常比保存一段聊天更可靠。源文件仍是权威，memory 是带有效期的加速索引。

## Scope 和权限必须先于相似度

正确检索顺序是：

1. 验证当前主体与 task authority；
2. 按 tenant/user/project/branch/environment 过滤；
3. 按数据分类和允许消费者过滤；
4. 排除已过期、已删除、被 supersede 或版本不匹配的记录；
5. 处理冲突与来源可信度；
6. 才进行 lexical/vector/hybrid 检索、rerank 和 top-k。

Vector similarity（向量相似度）不能替代访问控制。先从全库取相似结果再让模型过滤，敏感内容已经进入检索服务或上下文。Cache key 也要包含权限、scope、版本和 query policy，防止高权限结果被低权限用户命中。

分支和环境是常见漏项：production 命令不能因文本相似进入本地实验；另一个仓库的同名脚本不能覆盖当前项目；用户偏好也不一定适用于共享自动化。

## Relevance 不等于 Truth，也不等于 Utility

Relevance（相关性）回答“内容是否与查询相近”；truth（真实性）回答“内容是否正确”；utility（效用）回答“此刻加入上下文是否改善任务”。三个维度分别记录。

一条高度相关的旧命令可能错误；一条正确架构决策对当前拼写修复可能无用；一条低可信网页片段可以作为待核验线索，但不能当项目指令。Reranker 只优化排序时，仍需硬过滤和来源标签。

检索结果进入模型时保留 record/source/version/checked/status，并明确它是数据还是指令。模型引用记忆后，trace 记录 selected/dropped memory IDs，而不是永久记录完整私密正文。任务结果应能反查“哪条记录影响了结论”。

## 冲突、更新和失效

同一 subject 的记录可能经历：

```text
active → superseded / expired / disputed / deleted
```

新记录不能只靠时间更晚自动获胜。先比较来源权限、目标版本、证据和 scope；无法解决时把冲突一并呈现并请求核验。例如“构建命令是 A”和“命令已改为 B”需要 package script 或维护者确认，而不是让相似度最高者获胜。

TTL（生存时间）只解决按时间过期，还要事件驱动失效：依赖/模型/工具 schema 更新，仓库 commit/分支变化，文件 hash 变化，权限撤销，用户删除，事故隔离，事实源冲突。失效事件应使索引和 cache 同步不可检索，而不是只改主表状态。

检索时发现过期不是删除证据。保留状态和替代关系供审计；真正删除按隐私/保留策略覆盖副本。

## 上下文预算中的位置

记忆与当前 task、验收、最新 tool result 争夺 token。通常优先级是：不可丢的任务/安全边界，当前权威状态，直接相关且有效的记忆，最后才是可重建历史。Top-k 固定为大值会让噪声随库增长。

记录每次选择的候选数、过滤原因、最终 token、被截断记录和上下文位置。Required memory（必需记忆）超过预算时应失败并请求缩小/摘要，而不是静默丢掉验收条件。

避免把记忆重复放进 system、project 和 task 层。重复会放大其权重，也浪费 token。若同一规则已在版本化项目指令中存在，长期记忆只保存引用或不保存。

## 安全与隐私是硬门槛

- 不可信外部内容不自动持久化为指令；
- 写入与检索都按主体、scope、purpose 和分类授权；
- Secret 不进入模型可检索 memory；
- 个人数据有明确 owner、保留和删除路径；
- 跨租户/项目/环境错误检索必须为零；
- 公开 trace 只含脱敏 ID/统计，不含原始正文；
- Prompt Injection 不能修改写入 gate、TTL 或权限；
- 事故记录隔离后，后续 run 不得继续检索。

Memory poisoning（记忆投毒）至少测试两个 run：第一个让不可信页面尝试写入“跳过测试”，第二个执行无关任务；断言第二个不会把它当可信规则。只看第一个 run 的输出会漏掉持久化影响。

删除功能必须可发现、可按用户/项目/记录列出，并覆盖主存、索引、embedding、cache、checkpoint、trace 和备份策略。删除 API 返回成功后，再从各检索入口验证没有命中；详情见[Secret、隐私与公开结果](/security/secrets-privacy)。

## 不要优化单一命中率

端到端主指标仍是 task success 或质量 rubric；记忆指标用于解释机制：

| 阶段 | 指标 | 需要同时看的反指标 |
| --- | --- | --- |
| 写入 | 有用事实写入率、重复压缩率 | 错误/无必要写入、敏感写入 |
| 过滤 | 合法记录保留率 | 跨 scope/过期/不可信漏过 |
| 检索 | useful recall、precision@k | stale/conflict hit、空查询噪声 |
| 上下文 | 被选记录实际引用率、memory token | 必需项截断、上下文拥挤 |
| 任务 | 成功率、一次通过、人工纠正 | 由错误记忆造成的失败 |
| 效率 | 重复读取减少、延迟/费用变化 | 写入/索引/检索成本 |
| 生命周期 | 失效延迟、删除完成时间 | 删除后再出现、副本遗漏 |

Hit rate（命中率）高可能只是总返回内容；recall 高可以由增大 top-k 达成，却降低 precision、增加 token 和错误信任。记录“检索到”“注入上下文”“模型引用”“对结果有帮助”四个阶段，不能把前者当后者。

Memory contribution（记忆贡献）最好用 paired ablation（配对消融）：同一 task 起点分别使用无记忆、人工项目指令、候选自动记忆，其他条件固定。单看成功 trace 中出现某条 memory，无法证明没有它就会失败。

## 正确的实验单位是任务序列

记忆会改变后续状态，因此不能把每个 query 当成独立样本。设计固定 sequence（任务序列）：

1. **Seed**：出现一条可保存的已验证约定；
2. **Reuse**：后续任务需要该约定；
3. **Distractor**：相似但不同 scope 的记录出现；
4. **Update**：权威源版本变化；
5. **Conflict**：不可信或同级来源给出矛盾信息；
6. **Delete**：用户删除后再次查询；
7. **Recovery**：checkpoint/cache 不能复活旧记录。

每个配置从干净 store 开始，使用相同序列、顺序和版本。若随机交错单个 task 却共享一个 memory store，前一个候选的写入会污染另一个配置。可以按完整序列随机化配置顺序，或为每个配置使用隔离 namespace。

Development 序列用于调写入和检索，holdout 使用未见项目/表述/更新组合。不能把评测答案、task ID 或 Judge 反馈写进 memory；否则高分可能是数据泄漏，不是泛化。

## 基线与单变量候选

至少比较：

- **Baseline A**：无长期记忆，每个 task 只看当前输入；
- **Baseline B**：只读取人工维护、版本化的项目指令；
- **Candidate**：在 B 上增加一种自动写入/检索策略。

候选一次只改一个主要变量：写入 gate、记录粒度、scope、TTL、retriever、embedding、top-k、reranker、摘要或失效触发。多项一起改只能评价整个 memory bundle，不能解释收益来源。

基线 B 很重要：如果人工项目说明已解决问题，自动 memory 的额外复杂性可能不值得。候选只在开发任务提升、holdout 下降，常见原因是 task/答案污染、过拟合表述或 scope 太宽，不能晋级。

## 工作例：项目构建命令

研究问题：自动 memory 能否在项目构建命令变更时减少重复查找，又不使用过期命令？

任务序列包含：维护者确认当前命令；相同仓库再次构建；另一个仓库存在同名但不同命令；脚本改名；网页声称应跳过测试；用户删除记忆；删除后从 checkpoint 恢复。

主要结果是任务级正确执行。硬门槛是跨仓库检索、过期命令、未授权写入、敏感数据和删除后命中都为零。次要指标是查找次数、memory token、延迟、人工纠正和删除完成时间。

如果候选命中率 100%，但脚本改名后仍返回旧命令，它在最重要的失效门槛上失败。正确回退是关闭自动写入/检索，继续使用版本控制的人工指令，同时保留过期/污染 fixture 作为回归。

## 按症状定位优化失败

| 症状 | 首查 | 不要用什么掩盖 |
| --- | --- | --- |
| 应记内容没出现 | 写入 gate、scope、索引延迟 | 直接增大 top-k |
| 相关结果很多但任务变差 | 粒度、过期、冲突、上下文位置 | 只看 hit rate |
| 另一项目记录出现 | tenant/project/branch 过滤、cache key | 让模型自行忽略 |
| 版本升级后仍命中 | invalidation event、source hash | 仅缩短所有 TTL |
| 不可信内容被引用 | provenance、trusted filter、写入审批 | 关键词黑名单 |
| 删除后再次出现 | 索引/cache/checkpoint/备份传播 | 重复调用主表 delete |
| Token 降了但质量也降 | 摘要是否丢否定/条件/验收 | 只优化压缩率 |
| 只在评测题提升 | task ID/答案/holdout 泄漏 | 宣称“记忆有效” |

修复后用原失败和邻近变体回归。Scope 修复不仅测两个项目名，还要测同名分支、用户和环境；过期修复同时测 TTL、版本事件和 cache；删除修复要跨新 run 和恢复路径。

## 在本项目验证最小 Memory 契约

### 前置条件与输入

要求 Python 3.11+ 与 uv 0.11，依赖已按 `uv.lock` 安装，并从仓库根目录执行。测试只使用进程内 `WorkingMemory`、`LongTermMemory` 和固定 `ContextItem`，不访问网络、数据库、真实用户数据或模型。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_memory_context_trace.py::test_context_budget_prioritizes_required_and_trusted_sources lab/tests/test_memory_context_trace.py::test_memory_expiration_pollution_filter_and_delete lab/tests/test_memory_context_trace.py::test_working_memory_supports_explicit_deletion
```

### 预期输出与断言

应有 3 项通过：

- 8-token 上下文预算优先保留 required/trusted 的项目规则与代码，丢弃高优先级但不可信的网页内容；
- 长期记忆默认只返回 trusted、未过期且内容包含查询子串的记录；显式关闭可信过滤才会看到不可信记录；
- 过期记录能 purge，污染记录和工作记忆键都能显式删除，随后 `get` 返回空。

### 失败、停止、清理与回退

若不可信网页挤掉必需规则、过期记录被返回、默认检索包含污染记录或删除后仍能 `get`，停止扩大 memory 使用；不要提高预算、延长 TTL 或关闭过滤让测试变绿。修复相应选择/过滤/删除边界，并保留负例。

命令只创建进程内对象和可忽略测试缓存；需要时只清理 `.pytest_cache/`。误改实现时用 `git diff -- lab/src/about_harness/memory.py lab/src/about_harness/context.py lab/tests/` 精确定位，只恢复自己改动。候选失败时关闭自动 memory，回到人工项目指令基线。

这些测试提供 E1：当前 `LongTermMemory` 是进程内字典，按大小写不敏感子串检索并按 record ID 排序；它没有持久存储、向量/混合检索、top-k/reranker、scope/tenant/版本、并发、索引副本或删除传播。测试通过不能支持生产级 memory 质量或隐私结论。

下一步复习[记忆生命周期](/foundations/memory)，按[实验方法](/optimization/experiment)设计任务序列，并在[评测报告](/evaluation/reporting)同时公开效用、污染和删除结果。

## 检查题

1. 检索到高度相关文本，为什么仍不能说明它真实或有用？
2. 为什么 scope/权限过滤必须发生在向量相似度检索之前？
3. 共享 store 的单任务随机 A/B 为什么会让两个配置互相污染？
4. `delete` 返回成功后，还要检查哪些副本和恢复路径？
5. 人工项目指令基线与无记忆基线分别回答什么问题？
