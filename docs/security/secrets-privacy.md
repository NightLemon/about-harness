# Secret、隐私与公开结果

Secret 是能授予访问能力的凭据秘密，例如 API key、token、cookie、private key；个人数据是能直接或间接关联自然人的信息；业务机密则包括私有源码、内部文档和未公开决策。三者处理方式不同：Secret 暴露后通常要立即撤销或轮换，个人数据要按目的、权限和删除承诺管理，业务机密要控制接收方与再分发。

它们一旦进入 prompt、tool result、trace、memory、Git 或构建 artifact，往往会被复制到多个系统。正确顺序是：先判断任务是否需要该数据，再限制数据流和权限，最后用扫描与人工复核发现遗漏。Redaction（脱敏）是纵深防御，不是允许过量采集的理由。

## 先分类，再决定能否进入 Agent

一个实用的分类不必复杂，但每档要对应动作：

| 分类 | 例子 | 默认处理 |
| --- | --- | --- |
| Public（公开） | 已获许可的公开文档、合成 fixture | 可按许可证和任务目的使用，仍防 Prompt Injection |
| Internal（内部） | 一般项目说明、非敏感日志 | 只给已批准的环境/provider，不公开 |
| Confidential（机密） | 私有源码、客户合同、详细错误数据 | 最小片段、受控接收方、短保留、禁止公开 trace |
| Restricted（严格限制） | Secret、身份信息、支付/健康数据、生产导出 | 默认不进模型；使用专用工具和额外授权 |

分类继承而不是在模型输出后自动消失：包含私有源码的摘要仍是机密；由多个非敏感字段组合推断出的身份可能成为个人数据；hash、embedding 和 pseudonym（假名标识）也可能被关联回个人，不能因为看不懂原文就叫匿名。

未知分类、未知许可或未知接收方时 fail closed（失败关闭）。可以先用合成数据、字段名、schema 或本地统计完成任务，再决定是否真的需要原值。

## 建立数据清单与流向图

对每类数据记录：

```text
data_id / owner / subject
source / classification / license
task purpose / allowed use / forbidden use
allowed model-provider-region / allowed tools / allowed humans
storage / encryption / access log
retention / deletion trigger / backup expiry
public sharing rule / incident contact
```

然后画出每个副本，不只画“用户 → 模型”：

```text
source
  ├─ preprocess/cache
  ├─ prompt/context ──► provider logs/abuse monitoring
  ├─ tool arguments ──► MCP/server/external API
  ├─ trace/telemetry ──► dashboard/export
  ├─ memory/index/checkpoint
  └─ result ──► Git/artifact/Pages/share link
```

每条箭头回答：谁发给谁、哪种身份、哪个区域、为何必要、保存多久、能否用于训练、管理员是否可见、如何删除。模型 provider 的政策与工具 server 的政策分别核对；一个合规的模型端点不代表第三方 MCP 可以接收同样数据。

Owner（数据负责人）决定允许目的，operator（系统运维者）执行控制，data subject（数据主体）可能拥有访问或删除权。不要把“仓库维护者能读取”误作“可以上传给任意服务”。

## 数据最小化要发生在 Prompt 之前

优先依次使用：无数据方案、合成数据、聚合值、字段子集、局部片段、假名化值，最后才是原始数据。只问 schema 问题时不发送数据行；调试 parser 时保留结构而替换内容；总结长文档时先在可信环境做章节选择。

Context builder（上下文构造器）应基于 task purpose 和数据分类选择内容：

- 只加载当前 task、路径和租户需要的片段；
- 去除无关历史、评论、附件、隐藏列和文件元数据；
- 对每个片段保留来源、分类、owner、过期时间和 hash；
- 限制单个来源的 token、行数和时间范围；
- 压缩/摘要后继承最高适用分类；
- 拒绝模型提出的“为了方便请给我全部环境变量/数据库”。

Data minimization（数据最小化）也降低 Prompt Injection 和成本风险：模型没看到的 Secret 不能被网页诱导外发，无关客户记录也不会进入 trace。

## Secret 的完整生命周期

### 创建与配置

为 agent 建立独立、最小 scope、短 TTL 的身份，不复用个人管理员凭据。分别隔离开发、评测、CI 和 production；资源级权限优于账号级通配。创建时就记录 owner、用途、到期、撤销和轮换入口。

不要把真实值写入仓库配置、`.env`、fixture、notebook、截图或示例命令。示例使用显然无效的 placeholder，不使用与真实 token 格式相同的长字符串。

### 注入与使用

首选 credential handle（凭据句柄）：模型和通用 controller 只看见引用，受信工具在执行边界解析真实值，并且不把值返回。句柄绑定工具、资源、动作、task/run、有效期与次数，不能被拿去调用另一服务。

环境变量虽方便，却会被子进程继承，也可能出现在崩溃报告和调试输出；不要把整个父进程环境交给 shell。命令行参数可能出现在进程列表和历史；URL query、错误消息、HTTP debug log、Git remote、文件名和剪贴板同样不是 secret store。

工具调用前检查：请求者、目标资源、所需 scope、task purpose 和参数来源。工具执行后对 stdout/stderr、exception、response headers、trace 和模型可见摘要做结构化脱敏。不要让模型先读取真实 Secret，再依赖它“记得不输出”。

### 轮换与撤销

Rotation（轮换）是计划性替换；revocation（撤销）是使旧凭据立刻失效。两者都要演练。暴露事件先撤销再调查，不等待确认是否被滥用；共享 Secret 的影响范围通常无法可靠区分单个使用者。

轮换流程至少验证新凭据最小权限可用、旧凭据确实失效、缓存/worker 已更新、失败不会回退到旧值。删除配置文件但未撤销远端 token，不算恢复完成。

## 个人数据与跨租户边界

个人数据处理围绕 purpose limitation（目的限制）：为任务 A 收集的数据不能因为“模型可能有用”自动用于任务 B、长期 memory 或公开评测。记录任务目的、授权依据、保留期和允许接收方；具体法律义务由组织政策和适用法域决定，本页不替代法律意见。

Tenant（租户）边界必须在检索、缓存、memory、tool 和日志层同时执行。向量相似度、文件名或模型判断不能代替资源级 tenant ID 过滤。缓存键至少包含租户、权限、数据版本和配置；共享缓存命中也要重新授权。

Pseudonymization（假名化）用可替代标识降低直接识别，但只要映射表或外部数据能关联，就仍不是匿名。Anonymization（匿名化）要求合理手段下不能重新识别；稀有时间戳、职位、错误堆栈、路径和多字段组合都可能破坏它。公开前用“攻击者还知道什么”做重识别审查，不只搜索姓名和邮箱。

## Trace、Memory 与 Cache 是新的数据副本

可观测性默认记录最少结构字段：事件类型、工具名、状态、耗时、计数、来源 ID 和脱敏错误类别。工具参数和响应使用字段 allowlist，不是“先全部记下来再删”。高风险数据只保存 hash、长度或受控引用。

Memory 写入需要单独目的、scope、TTL 和删除入口；模型总结继承源分类，不能把私密对话总结成“通用经验”跨用户检索。Checkpoint 可能包含 adapter 状态和上下文，也按原数据最高分类管理。

Cache 要能回答 key 如何隔离、值何时过期、删除如何传播、是否写入磁盘、谁可读取。关闭 UI 中的聊天记录不一定删除 provider log、本地 session、embedding index 或构建 artifact，必须逐系统核实。

## 脱敏管线应先结构化、再扫描

优先使用 allowlist projection（允许字段投影）：从结果对象只选择允许公开的字段，再对值脱敏。相比在任意原始 trace 上做正则替换，它更容易证明没有多余字段。

一个公开管线可按以下顺序：

1. 验证输入 schema 和数据来源；
2. 选择公开字段，删除原始 prompt/tool payload；
3. 将稳定标识映射为随机、不可跨数据集关联的 ID；
4. 对自由文本做 key/pattern/dictionary/entropy 扫描；
5. 检查编码、分片、嵌套 JSON、URL、堆栈、文件名与元数据；
6. 由不了解原任务答案的人做重识别和许可复核；
7. 生成新 artifact、hash、审批与保留记录，不覆盖原件；
8. 在公开位置再次下载并检查最终字节。

Redaction token 应明确不可逆还是可在受控 vault 中映射。可逆 tokenization（令牌化）仍需保护映射表；相同 hash 跨记录复用会泄露相等关系，低熵字段还可能被字典枚举。

## 当前两道扫描器实际做什么

### `npm run secrets:check`

默认扫描 Git 已跟踪和未忽略的候选文件，拒绝非示例 `.env`，并查找几类已知 provider token、private key 和 Windows/Unix 用户路径。它跳过 `.git`、依赖/虚拟环境、构建目录、cache、大于 2 MB 的文件和包含 NUL 的二进制。

所以通过只表示“扫描到的文本没有命中这些模式”。它不检查 Git 历史、被忽略文件、构建目录、超大/二进制/压缩文件、运行中网络请求、剪贴板、浏览器 profile，也不保证发现自定义 token、编码、分片或语义机密。

### `npm run results:redact`

当前对 `lab/results/public/` 递归检查：目录不能是符号链接，内部符号链接和非普通文件被拒绝；只允许 `.json/.jsonl`；每个对象必须可解析；规范化后的 `rawTrace/rawPrompt/credential/authorization/apiKey/password/secret/cookie/privateKey` 等键被拒绝；文本再匹配凭据赋值和个人路径模式。

通过不表示内容已匿名，也不表示来源有再分发许可。扫描器不会理解专有代码片段、间接身份、内部业务事实、base64/加密载荷或多个字段组合的含义。机器检查后仍要人工看 tool arguments、stdout/stderr、页面内容、模型输出、文件名和引用。

## 删除必须覆盖所有副本

维护一张 deletion map（删除映射）：

| 副本 | 删除动作 | 完成证据 | 无法立即删除时 |
| --- | --- | --- | --- |
| 源文件/数据库 | 按主键删除或更正 | 重查为空、变更审计 | 限制访问并标记到期 |
| Prompt/provider | 调用对应删除/保留策略 | 请求 ID、策略或回执 | 记录最晚清除日期 |
| Trace/日志/遥测 | 删除或加密擦除 | 查询各索引与导出 | 缩短保留、吊销密钥 |
| Memory/vector index | 删除原记录及派生 embedding | ID/hash 搜索无结果 | 隔离 namespace |
| Cache/checkpoint | 失效所有 key/副本 | 命中测试失败 | 等待 TTL 并禁止读取 |
| Git/artifact/Pages | 隔离、清理历史/重建 | clone/download 后复查 | 限制访问并公告范围 |
| Backup | 按备份生命周期过期 | 备份目录与到期证明 | 恢复时执行删除 tombstone |

Tombstone（删除标记）用于告诉异步系统和备份恢复流程“此对象不得重新出现”。物理删除不可立即完成时，公开访问限制、加密密钥吊销、保留期限和恢复后再删除规则。

删除完成不是 API 返回 200，而是从各可查询副本重查、确认 downstream 消费者已处理，并验证新 run 不会从 cache/memory 恢复该数据。仅删除工作树文件不能清除 Git commit、remote、CI log 或 Pages artifact。

## 发现泄漏时先按数据类型行动

### Secret 泄漏

停止 run 和自动重试，撤销/轮换凭据，限制网络和外部工具，再判断 Git、日志、artifact、终端历史和下游系统的暴露范围。不要先花时间证明攻击者“可能没看到”；有效凭据本身就是风险。

### 个人或业务数据泄漏

隔离公开副本和共享链接，停止继续处理，保留不含敏感原文的时间线/hash，识别数据类别、主体、接收方、时间窗和下载范围，并交由组织的隐私/安全流程决定通知和删除。模型不能自行判断是否需要通知当事人。

两类事件都要用合成 canary 建立回归：保留字段形状和失败路径，不把真实泄漏值复制进测试。完整固定顺序见[Agent 事件响应](/security/incident-response)。

## 在本项目验证脱敏边界

### 前置条件与输入

要求 Python 3.11+、uv 0.11、Node.js 22+，依赖已按锁文件安装，并从仓库根目录执行。测试使用合成 token/个人路径和临时目录，不需要真实凭据、网络或模型 API。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_memory_context_trace.py::test_trace_redacts_secret_values_paths_and_tool_results
npm run secrets:check
npm run results:redact
npm run eval:self-test
```

### 预期输出与断言

Python 测试应有 1 项通过，并证明嵌套 tool result 中的合成 token、Authorization 值和 Windows 个人路径不会进入序列化 Result。仓库扫描应通过已跟踪和候选文件；公开结果扫描应报告 2 个 JSON/JSONL 文件通过。

`eval:self-test` 应证明负例真的有效：公开目录中的合成 secret、规范化后的 `rawPrompt` 键和未知 `.log` 格式都会被拒绝，安全 JSONL 会被接受。正例门禁通过而负例也通过，说明 checker 没有证据价值。

### 失败、停止、清理与回退

若合成值出现在 Result、扫描器接受危险键/未知格式，或发现疑似真实凭据，立即停止提交和发布。真实凭据先撤销，不能只把测试字符串加进 ignore；个人数据先隔离并评估接收方。

这些命令只读仓库输入，self-test 在系统临时目录创建并自动删除合成文件；Python 可能留下可忽略缓存。需要时只清理 `.pytest_cache/`。误改公开结果或脱敏代码时先用 `git diff -- lab/results/public/ lab/src/about_harness/trace.py scripts/` 定位，只恢复自己本轮变更；新规则误报时回到上一已验证版本，并保留失败 canary 再调整。

当前 E1 证据只覆盖若干已知文本模式、敏感键和一个嵌套 trace 路径，不证明真实 provider 保留、网络出口、跨租户隔离、删除传播或匿名化已经验证。上线前还需要 provider 数据政策、访问审计、出口日志、删除演练和组织许可。

下一步结合[威胁模型](/security/threat-model)检查接收方与数据流，用[Prompt Injection](/security/prompt-injection)限制不可信内容借工具外发，并在[事件响应](/security/incident-response)演练撤销和隔离。

## 检查题

1. 为什么模型生成的摘要仍可能继承原文的机密分类？
2. 环境变量比硬编码方便，为什么仍不应把完整进程环境交给 agent shell？
3. 假名化 ID 为什么不自动等于匿名数据？
4. `secrets:check` 通过后，哪些位置和泄漏方式仍未检查？
5. 删除 API 成功返回后，还要用什么证据确认数据没有从 cache 或备份恢复？
