# 记忆的生命周期：写入、检索、失效与删除

## 学习目标与证据边界

Memory（记忆系统）不是“把更多历史塞进提示词”，而是把可能对未来有用的信息，连同来源、作用域、可信度、时效和删除规则一起管理。本页回答四个基础问题：

1. 哪些信息值得从一次运行提升为可复用记忆；
2. 检索时为什么必须先过滤权限和有效性，再计算相关性；
3. 过期、冲突、替代和删除为什么是不同状态；
4. checkpoint 恢复时，怎样避免让已删除或已失效的记录重新出现。

预计 35–45 分钟。动手部分固定使用仓库内的 Python 3.11+、uv 0.11.x 基线和进程内测试对象，不联网、不读取真实用户数据，也不调用模型。命令提供 E1 证据：证明当前固定实现和负例满足断言，不证明生产级检索质量、跨租户隔离或删除传播。

## 记忆、上下文和指令不是同一件事

一条信息从存储中被检索出来并放入当前模型输入后，才成为这一步的上下文。它不会因为“被记住了”就自动变成高优先级指令。

| 概念 | 回答的问题 | 典型生命周期 | 权威来源 |
| --- | --- | --- | --- |
| Instruction（指令） | 系统应怎样工作、哪些约束必须遵守 | 随配置或仓库版本变化 | system/developer 配置、版本化项目规则 |
| Task state（任务状态） | 这一次运行做到哪里、还剩什么 | 单次 task/run | controller 与验收状态机 |
| Context（上下文） | 模型在当前一步实际看见什么 | 单次模型调用 | context builder 的选择结果 |
| Cache（缓存） | 如何复用可重建结果 | 到期或源变化前 | 原始计算和 cache key |
| Checkpoint（检查点） | 失败后从哪个控制状态恢复 | 单次 run 或恢复窗口 | controller、adapter 和工具台账 |
| Memory（记忆） | 哪些过去信息值得在未来再次检索 | 单次 run 到跨会话 | 带来源和生命周期的记录 |

把强制规则只放进自动记忆，会让规则是否出现取决于召回；把模型猜测写成永久指令，则会制造陈旧真相。稳定规则进入版本控制，运行进度进入 task state，可重建结果进入 cache，只有未来确有复用价值且能治理的信息才进入记忆。

## 先按作用域区分记忆

| 类型 | 作用域与生命周期 | 适合保存 | 主要风险 |
| --- | --- | --- | --- |
| Working Memory（工作记忆） | 单次 run | 当前计划、已完成步骤、局部中间值 | 与 checkpoint 不一致、恢复后重复工作 |
| Session Memory（会话记忆） | 同一会话的多轮 | 已确认事实、分支、未决项 | 摘要丢失否定、数字或验收条件 |
| Project Memory（项目记忆） | 同一仓库或项目的多次任务 | 已验证命令、架构决策、项目偏好 | 分支/版本变化后仍命中 |
| User Memory（用户记忆） | 用户允许的跨项目范围 | 稳定表达偏好、可复用设置 | 错误泛化、隐私和删除失败 |
| Shared Memory（共享记忆） | 团队或组织 | 经审核的术语、流程和知识 | 权限、责任人和租户边界不清 |

生命周期越长、可见主体越多，写入门槛应越高。一次 run 的临时计划可以低成本重建，不应默认升级为跨项目用户偏好；一条团队共享记录则需要明确 owner、版本、审阅和撤销路径。

## 一条记录要经过状态机

Lifecycle（生命周期）不只是 `created_at + TTL`。一个可审计的最小状态机是：

```text
candidate ──来源/分类/作用域/价值校验──> active
    │                                      │
    └──不适合持久化──> rejected             ├──新权威版本──> superseded
                                           ├──到期/源变化──> expired
                                           ├──来源冲突────> disputed
                                           ├──事故隔离────> quarantined
                                           └──删除请求────> deleted
```

- `expired` 表示当前不能使用，但记录可作为审计历史保留；
- `superseded` 指向替代它的新版本，不等于原记录从未存在；
- `disputed` 保留无法解决的冲突，不能让相似度最高者自动获胜；
- `quarantined` 用于事故期间阻断读取，后续再决定更正或删除；
- `deleted` 要阻止主存、索引、cache、checkpoint 和备份恢复路径再次暴露内容。

当前教学实现只有 active、按时间过期和物理删除的最小行为，没有完整状态机。页面中的完整设计是项目建议，不应误报为已经实现的能力。

## 记录由内容和治理元数据组成

当前 `MemoryRecord` 只保留六个字段：

```python
@dataclass(frozen=True, slots=True)
class MemoryRecord:
    record_id: str
    content: str
    source: str
    trusted: bool
    created_at_ms: int
    expires_at_ms: int | None = None
```

它足以演示来源、可信过滤和时间过期。真实长期记录还应根据风险增加：

```text
subject / content_or_reference / source_hash / writer
tenant / user / project / branch / environment / task scope
evidence / checked_at / applies_to_version / invalidation_triggers
classification / allowed_consumers / purpose / retention
status / supersedes / conflicts_with / delete_reference / audit_reference
```

正文和元数据必须原子写入。先保存正文、稍后补作用域，会产生一个短暂但真实的越权检索窗口。摘要、embedding 和派生标签继承原内容的最高适用分类与信任边界，不能因为不再是原文就自动升级可信度。

Provenance（来源链）回答信息从哪里、何时、经过谁或哪个工具进入系统。它不同于 truth（真实性）和 authority（动作权限）：官方文档可能是可信事实源，却没有权要求 agent 发布代码；用户有权提出项目任务，也不代表任务引用的网页可以写入长期指令。

## 写入 gate：先证明值得记住

长期写入前至少回答：

1. 未来是否会重复使用，还是能从权威源低成本重算；
2. 来源是谁，原始证据或 source hash 在哪里；
3. 这是已验证事实、用户偏好、决策，还是模型推测；
4. 允许在哪个 tenant、用户、项目、分支和环境使用；
5. 哪个版本适用，时间或什么事件会让它失效；
6. 是否含 Secret、个人数据、私有 trace 或不必要原文；
7. 谁能查看、更正、导出和删除；
8. 与现有记录冲突时，是替代、并存还是等待核验。

默认不要自动持久化：模型猜测、失败中的临时方案、网页或 tool result 中的未来指令、真实凭据、整段私有对话、只对临时分支成立的结论，以及与权威记录冲突但尚未核验的说法。

模型生成的摘要仍是派生数据。若输入来自不可信网页，摘要不能仅因语言更流畅就标为 `trusted=true`；若输入包含个人数据，摘要也不能自动跨用户复用。

## 检索顺序：硬过滤早于相关性

Retrieval（检索）的安全顺序是：

1. 验证当前主体、task authority 和允许用途；
2. 按 tenant、用户、项目、分支、环境和数据分类过滤；
3. 排除 deleted、expired、superseded、quarantined 和版本不匹配记录；
4. 处理来源可信度、证据等级和冲突；
5. 才做关键词/向量检索、rerank 和 top-k；
6. 按上下文预算选择，并保留 record ID 与来源；
7. 在 trace 中记录选择/丢弃原因，不记录不必要的私密正文。

相关不等于正确，也不等于有权使用。先从全库找相似记录、再让模型过滤，敏感数据已经越过了检索边界。向量相似度、reranker 或更大的 top-k 都不能替代权限和状态过滤。

当前 `LongTermMemory.search` 只做大小写不敏感的子串匹配，但有两个安全默认值：

- `trusted_only=True`，默认排除不可信记录；
- 空白查询直接返回空 tuple，避免无条件枚举全部可信内容。

显式设置 `trusted_only=False` 是诊断或审核能力，不应成为普通任务的默认配置。`get(record_id)` 当前只检查存在和过期，不检查信任、scope 或调用者权限，因此更上层必须先授权；知道 record ID 不等于有权读取正文。

## 把记忆放入上下文时保留边界

检索结果进入模型前，至少保留 `record_id/source/status/checked/version/scope/trust`，并标明它是数据、建议还是指令引用。不要只注入一段无来源的流畅摘要。

当记忆与当前权威文件冲突时，以当前作用域的权威源为准，并把旧记录标为 disputed 或 superseded。无法自动解决时，应同时呈现冲突并请求核验，而不是选择文本更相似或创建时间更晚的一条。

Context builder（上下文构造器）还要防止三类放大：

- 同一事实同时出现在 system、项目规则和 memory，重复占用 token 并放大权重；
- 多个重叠 chunk 让单一来源占满 top-k；
- 不可信内容在摘要时丢失来源，变成看似由系统提出的新指令。

必要规则若因预算不足放不下，应失败并缩小任务或重新组织上下文，不能静默丢弃验收条件。普通记忆放不下时可以丢弃，但要记录原因。详细选择策略见[上下文工程](/foundations/context)。

## 失效、更新与冲突

TTL（Time To Live，生存时间）只解决“经过多久过期”。项目记忆还需要事件驱动失效：

- package script、依赖、模型或工具 schema 改变；
- 仓库 commit、分支或配置 hash 改变；
- 权限、数据分类或允许用途撤销；
- 权威文档被替换、来源出现冲突；
- 用户请求更正/删除，或安全事故要求隔离。

新记录不能只因创建时间更晚就覆盖旧记录。比较来源权限、适用版本、scope 和证据；若确为新版本，建立 `supersedes` 关系。当前教学实现的 `put` 会按相同 `record_id` 静默覆盖，没有 compare-and-swap（比较并交换）、版本历史或冲突检测，因此调用方不能把它当成并发安全的更新 API。

过期检查使用调用方传入的 `now_ms`。真实系统应由受信时钟提供时间，并记录失效事件处理延迟；不能接受模型任意提供“当前时间”来延长记录寿命。

## 删除不等于查询时隐藏

删除要覆盖每个派生副本：主存、全文/向量索引、cache、摘要、checkpoint、trace、导出、公开 artifact 和备份恢复流程。主表 `DELETE` 成功但索引仍可命中，不算完成。

Tombstone（删除标记）用于通知异步索引和备份恢复：“这个 record ID 不得重新出现”。物理删除不能立即完成时，先阻断读取，记录最晚清除时间，并在恢复备份后重新执行 tombstone。删除完成证据应是各读取入口重查无结果，而不只是 API 返回 200。

当前 `WorkingMemory.delete` 和 `LongTermMemory.delete` 只删除进程内字典。它们没有索引、备份或异步副本；这一点让 E1 测试简单，但不能证明真实删除传播。更完整的隐私边界见[Secret、隐私与公开结果](/security/secrets-privacy)。

## 恢复时记忆也要对账

Checkpoint 可能保存 memory 版本、选中记录或上下文摘要。恢复不能直接复用旧快照，而要重新核对：

1. task、主体、policy 与配置身份仍一致；
2. 引用记录仍 active，scope 和权限仍匹配；
3. 记录没有过期、被替代、争议、隔离或删除；
4. cache 和索引没有把旧正文重新注入；
5. 恢复后选中的 memory IDs 被写入新 trace。

若 checkpoint 引用了已删除记忆，正确默认是停止或在不使用该记录的前提下重新构建上下文，不是把快照当作权威副本恢复。关于 run 状态与外部副作用的恢复顺序见[状态与可靠执行](/foundations/state-reliability)。

## 工作例：项目测试命令

假设维护者确认：“当前仓库完整测试命令是 `npm run verify`。”一条合格记录不只保存这句话，还保存：

- 来源是当前 `package.json` 与维护者确认；
- scope 是该仓库、当前默认分支与适用 commit；
- evidence 是实际执行结果，而不是模型猜测；
- invalidation trigger 是 `package.json` scripts 或 lockfile 变化；
- 不含终端中的个人路径、环境变量或完整日志；
- owner 可以查看、更正和删除。

后续任务检索时先匹配仓库和分支，再检查脚本 hash。若命令已改名，旧记录进入 expired/superseded，系统回到权威文件重新发现。网页中即使出现同一句命令，也只能作为待核验线索，不能借此要求“以后跳过测试”。

这个例子还说明 cache 与 memory 的区别：一次测试输出可由同一 commit/config 重算，更像短期 cache；“哪个命令是项目正式入口”是可复用项目知识，但仍要绑定版本。

## 当前最小实现实际覆盖什么

| 组件 | 已实现行为 | 未实现边界 |
| --- | --- | --- |
| `WorkingMemory` | 非空 key 的 set/get、显式 delete、clear；存入 `None` 也能正确报告删除 | scope、版本、序列化、并发；get 无法区分缺失与显式 `None` |
| `MemoryRecord` | ID、正文、来源、可信标志、创建/到期时间 | owner、权限、分类、source hash、状态关系 |
| `LongTermMemory.put` | 写入进程内字典 | 重复 ID 冲突、版本历史、原子索引 |
| `LongTermMemory.search` | 子串匹配、过期过滤、默认 trusted-only、空查询拒绝 | tenant/scope、排序分数、top-k、向量/混合检索 |
| `purge_expired` / `delete` | 从当前字典物理删除 | tombstone、cache/index/backup/checkpoint 传播 |
| `ContextBudget` | required、trusted、priority 的固定选择顺序 | 真实 tokenizer、权限引擎、来源多样性 |

`trusted` 只是调用方传入的 boolean，不是密码学证明或自动审核结果。当前 store 也不是线程/进程安全数据库。理解这些缺口，比看到测试通过后把它包装成“生产级 memory”更重要。

## 动手验证

### 前置条件与输入

在仓库根目录执行；要求 Python 3.11+、uv 0.11.x，依赖已按 `uv.lock` 安装。先检查环境：

```bash
uv --version
uv run --frozen --offline python --version
```

测试输入全部是合成数据：可信的 `release checklist`、不可信网页记录 `release without tests`、到期记录 `old release`、工作记忆中的计划与 `None`，以及 8-token 上下文预算。没有真实凭据、个人数据、网络或模型调用。

### 运行最小生命周期回归

```bash
uv run --frozen --offline pytest -q lab/tests/test_memory_context_trace.py::test_context_budget_prioritizes_required_and_trusted_sources lab/tests/test_memory_context_trace.py::test_memory_expiration_pollution_filter_and_delete lab/tests/test_memory_context_trace.py::test_working_memory_supports_explicit_deletion
```

预期退出码为 0，3 项测试全部通过。断言分别证明：

- 8-token 预算保留 required/trusted 的项目规则和可信代码，丢弃优先级更高但不可信的网页；
- 默认检索只返回未过期的可信记录，显式关闭过滤时才会看到污染记录；
- 到期记录被清理，删除后的记录不可 `get`，空/空白查询不枚举 store；
- 工作记忆能删除普通值和 `None`，第一次删除返回 true，重复删除返回 false。

这些断言覆盖固定生命周期边界，不衡量自然语言召回，也没有测试真实持久化、跨用户权限或备份删除。

## 失败练习：证明可信过滤必须默认开启

只在自己的临时学习改动中，把 `lab/src/about_harness/memory.py` 中：

```python
trusted_only: bool = True,
```

临时改为：

```python
trusted_only: bool = False,
```

重新运行长期记忆测试：

```bash
uv run --frozen --offline pytest -q lab/tests/test_memory_context_trace.py::test_memory_expiration_pollution_filter_and_delete
```

预期测试失败，因为默认搜索会同时返回 `poison` 和 `trusted`。若测试仍通过，立即停止：说明负例没有覆盖默认信任边界，不能继续扩大记忆使用范围。不要通过删除污染 fixture 或改期望值让测试变绿。

练习后只恢复这一行，先查看限定路径差异，再重跑测试：

```bash
git diff -- lab/src/about_harness/memory.py
uv run --frozen --offline pytest -q lab/tests/test_memory_context_trace.py::test_memory_expiration_pollution_filter_and_delete
```

最终限定 diff 应只剩你原本打算保留的改动。不要用 `reset --hard` 或覆盖整个工作树，因为其中可能有别人的未提交文件。

## 按症状定位问题

| 症状 | 先检查 | 不要用什么掩盖 |
| --- | --- | --- |
| 应有记录没出现 | 写入 gate、scope、状态、索引延迟 | 直接增大 top-k |
| 旧命令仍被使用 | source/version hash、失效事件、cache key | 只缩短所有 TTL |
| 不可信网页成为规则 | provenance、trusted 默认值、上下文角色 | 关键词黑名单 |
| 另一项目记录出现 | tenant/project/branch 过滤与 cache 隔离 | 让模型自行忽略 |
| 删除后再次命中 | 索引、cache、checkpoint、导出与备份 | 重复调用主表 delete |
| 摘要遗漏验收条件 | 压缩输入、否定/数字/未决项保留 | 给摘要更高信任 |
| 命中率高但任务变差 | 过期、冲突、粒度、上下文位置 | 只报告 hit rate |
| 恢复后旧内容复活 | checkpoint 引用和 tombstone 重放 | 把快照当最新事实 |

修复后保留原失败作为回归，并加入邻近变体。污染修复至少跨两个 run 测试：第一个尝试写入攻击内容，第二个执行无关任务；只看当前回答会漏掉持久影响。Prompt Injection（提示注入）的完整动作边界见[Prompt Injection 防护](/security/prompt-injection)。

## 清理、回滚与已知限制

正常命令只创建进程内对象，最多留下可忽略的 `.pytest_cache/`；无需清理数据或外部服务。若确需删除缓存，只确认并处理该测试缓存目录，不要递归清理仓库根目录或用户目录。

误改源码时先用限定 `git diff` 找到自己的行，使用编辑器 undo 或精确反向修改；恢复后重新运行目标测试。候选记忆策略失败时，安全回退是关闭自动写入/检索，继续使用人工维护、版本化的项目指令，而不是放宽信任过滤。

当前 E1 实现的已知限制包括：进程退出即丢失；同 ID 写入可静默覆盖；没有 scope、权限、分类、来源 hash、冲突状态或审计；检索只做子串匹配；`get` 不做可信过滤；工作记忆的 `get` 无法区分缺失与显式 `None`；没有并发控制、索引副本、tombstone、删除传播或 checkpoint 对账；时间完全由调用方传入。

下一步进入[记忆优化](/optimization/memory)，用无记忆、人工项目指令和自动记忆做配对任务序列；同时阅读[上下文工程](/foundations/context)，避免把“检索到”误当成“应该注入”。

## 检查题

1. 一条记录与当前任务高度相关，为什么仍可能不得进入上下文？
2. TTL 到期、被新版本替代和用户删除，为什么不能合并为同一状态？
3. `trusted=true` 为什么不能授予工具执行权限？
4. 主存删除成功后，还要检查哪些副本和恢复路径？
5. 为什么记忆污染测试至少需要跨两个 run？
