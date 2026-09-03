# 数据 Agent 模式

Data agent（数据 Agent）不是让模型直接“看表算答案”，而是让模型在明确的数据契约、只读/写入权限、确定性计算和审计边界内完成查询、分析或变更。模型可以解释目标、提出计划和说明结果，但 schema 校验、计算、权限和提交必须由可验证控制层承担。

```text
task contract
  → authorize dataset/operation
  → snapshot + schema validation
  → deterministic transform/query
  → invariant & privacy checks
  → explain verified result
  → approve/commit（仅写任务）
  → reconcile + audit + rollback
```

输出符合 JSON Schema 只证明结构合法，不证明数据、公式、样本或业务结论正确。

## 先固定任务契约

自然语言“帮我分析这些数据”既不能验收，也不授权写回。Task contract（任务契约）至少包含：

| 字段 | 要回答的问题 |
| --- | --- |
| Goal | 要做描述、校验、预测、变更还是导出？ |
| Dataset identity | 哪个系统、表/文件、snapshot/version/partition？ |
| Population | 行/用户/事件范围与排除条件是什么？ |
| Input schema | 字段、类型、nullable、主键、单位、时区、枚举？ |
| Allowed operations | 允许 read/aggregate/update/insert/delete/export 中哪些？ |
| Sensitive fields | 哪些是 PII、Secret、业务敏感或禁止送模字段？ |
| Acceptance | 哪些行数、约束、复算和业务规则必须通过？ |
| Budgets | 最大扫描行/字节、时间、费用、tool calls 和输出行数？ |
| Approval | 哪些 query/patch/export 在执行前必须批准？ |
| Rollback | 写入失败或结果错误时怎样恢复、对账？ |

Dataset identity（数据集身份）不能只写 `customers.csv` 或 `orders`。至少固定 source、environment、snapshot/transaction time、schema version、partition/filter 与 content/query hash，防止评测期间数据悄悄变化。

## 把数据链路拆成六层

| 层 | 主要责任 | 典型失败 |
| --- | --- | --- |
| Source（源） | 权威系统、版本、权限、读取一致性 | 读错环境/快照 |
| Contract（契约） | Schema、单位、主键、缺失和敏感等级 | 漂移被静默接受 |
| Transform（变换） | 解析、join、filter、聚合、特征 | 行重复、单位混用 |
| Analysis（分析） | 统计/规则/模型计算与不确定性 | 公式幻觉、泄漏 |
| Output（输出） | 结构、provenance、redaction、解释 | 敏感字段旁路泄漏 |
| Commit（提交） | 审批、事务、幂等、对账和回退 | 重复写、部分成功 |

模型失败与控制层失败分开记录。若 parser 把日期读错或 join 重复行，不应归因给模型“分析能力”。

## Schema 是版本化接口

Schema contract（Schema 契约）至少定义：

```text
field name / type / nullable / default
primary and foreign keys
enum / range / regex / semantic constraints
unit / currency / timezone / precision
sensitive class / masking rule / model visibility
required / optional / deprecated / unknown-field policy
schema version / owner / effective date
```

### 漂移分类

| 漂移 | 示例 | 默认动作 |
| --- | --- | --- |
| Missing required | `user_id` 消失 | 阻断 |
| Renamed | `user_id` → `userId` | 阻断，除非显式 migration |
| Type | number → string | 阻断或经版本化 parser 转换 |
| Semantic | 秒变毫秒、净额变毛额 | 即使类型相同也阻断 |
| Enum expansion | 新状态 `paused` | 未知值保留并阻断旧逻辑 |
| Nullability | non-null 变 nullable | 明确缺失策略后再运行 |
| Additive field | 新增可选列 | 按 unknown-field policy 决定 |
| Key/uniqueness | 一用户多行变成事件流 | 重建分析单元与断言 |

不要自动把未知字段丢掉，也不要在没有迁移规则时“猜”字段改名。兼容迁移应记录 old/new schema、转换函数、损失、计数和可逆性。

### 数值边界

拒绝或明确处理 `NaN`、`Infinity`、超范围整数、精度截断、科学计数法和 locale decimal。JSON/数据库/语言 runtime 对这些值的支持不同；坏值进入聚合后可能污染整列指标。

## 缺失、异常与零不是一回事

至少区分：

- `missing`：未提供或不可获得；
- `null/not applicable`：语义上无值；
- `unknown`：存在但当前不知道；
- `redacted`：有值但因政策隐藏；
- `invalid`：格式/范围不合法；
- `zero`：已知数值为 0。

每个字段预先定义策略：阻断、保留、插补、排除还是单独报告。插补必须记录方法、适用列、影响行数和敏感性分析；不能为了让模型/统计函数运行就把空值统一填 0。

Outlier（异常值）也不等于错误。先根据业务约束区分 impossible、rare-but-valid 与 measurement error，再决定保留、截尾、修正或人工复核。所有改动保留原值引用和 transformation version。

## 单位、货币、时间和精度

类型为 number 并不代表可直接相加。字段必须附：

- Unit（单位）：秒/毫秒、kg/g、百分比/百分点；
- Currency（货币）：币种、汇率来源、换算日期、税/净额口径；
- Time：event time、ingestion time、时区、DST、窗口闭合规则；
- Precision：小数位、舍入阶段和容差；
- Aggregation semantics：sum/average/rate 是否可加。

时间窗口用半开区间等明确规则，并保存目标时区。按本地日期分组前先说明 DST（夏令时）与跨时区事件；不能把无时区字符串默认为运行机器时区。

金额使用适合业务的 decimal/fixed-point 表示和舍入政策，不用模型生成的小数近似替代账务计算。

## 读取要有边界

只读任务也可能泄漏或耗尽资源。读取工具至少限制：

```text
environment / database / dataset allowlist
tenant and row-level policy
allowed columns and sensitive-field projection
max rows / bytes / partitions / runtime / cost
query grammar or approved templates
snapshot/transaction isolation
result sampling and export limits
```

模型不应获得任意 SQL/脚本执行权。更稳妥的路径是：模型生成 typed query plan（类型化查询计划），controller 将其编译为参数化查询，静态检查允许的表、列、join、filter 和 limit，再执行只读账号。

### Query plan 示例

```json
{
  "dataset": "orders_snapshot",
  "dimensions": ["region"],
  "measures": [{"field": "net_amount", "op": "sum"}],
  "filters": [{"field": "event_date", "op": ">=", "value": "YYYY-MM-DD"}],
  "limit": 100
}
```

Controller 负责把逻辑字段映射到实际 schema，并拒绝未授权表、通配列、无界扫描、动态 DDL/DML 和未知操作。Query plan 符合 schema 仍要做成本估计与权限校验。

## 数据血缘与行数守恒

Data lineage（数据血缘）连接输入、每步变换和输出：

```text
source snapshot/hash
  → parse(schema/parser version; accepted/rejected rows)
  → filter(predicate; before/after counts)
  → join(keys/cardinality; unmatched/duplicated counts)
  → aggregate(group keys/formula; input/output counts)
  → redact(policy version; affected fields/rows)
  → result(hash; assertions)
```

每步保存 config/hash、输入/输出行数、丢弃/新增原因和错误样本的安全摘要。行数变化不是自动失败，但必须可解释。

### Join 不变量

Join 前声明 `one-to-one / one-to-many / many-to-one / many-to-many`。检查 key null、unique、unmatched、duplicate amplification 和 fanout。错误 many-to-many join 可能让总额翻倍，但输出 schema 和平均值看起来仍合理。

### Filter 不变量

保存 predicate、时区、空值处理和 before/after counts。模型提出“清理异常数据”不能授权无记录删行；每种排除都进入报告分母。

## 计算由确定性代码完成

模型适合把用户目标映射成受限计算计划、解释结果和发现需澄清点；以下工作优先交给确定性代码：

- 排序、计数、去重、join、filter 和聚合；
- 财务/比例/置信区间等公式；
- Schema、范围、唯一性和引用完整性校验；
- 隐私 redaction/tokenization；
- Diff、事务提交、幂等与对账。

生成代码也不能直接信任。它在隔离环境运行，固定依赖和输入，限制 CPU/内存/时间/网络，输出通过独立 oracle 或不变量复算。不要让同一段模型代码既算结果又判断自己正确。

## 从描述到因果要跨一道门

“A 组均值更高”是描述，不自动证明 A 导致结果。研究设计至少记录：

- Population、sampling、exposure/treatment 与 outcome；
- 时间顺序、selection bias、confounder 与 missingness；
- Train/development/holdout 的隔离；
- Multiple comparisons 与预注册主要指标；
- Effect size、uncertainty、practical threshold；
- 可支持的是相关、预测还是因果结论。

模型不应把相关性润色成因果。若任务只是数据清洗/汇总，明确禁止输出超出设计的归因。

## 防止训练/评测泄漏

时间、用户、组织、文档或重复样本可能跨 split 泄漏。先确定泛化单位，再切分：

- 同一用户的重复事件不要随机散到 train/test；
- 未来信息不能进入预测时点特征；
- 目标标签派生字段不能进入输入；
- Data normalization/feature selection 只在 train 拟合；
- Holdout 在配置冻结后才查看；
- 重复和近重复样本跨 split 检测。

评测数据被反复用于调 prompt 后已成为 development set，应重新建立 holdout，而不是继续称“未见数据”。

## 敏感数据最小化

先问模型是否真的需要原始字段。常见策略：

| 策略 | 用途 | 限制 |
| --- | --- | --- |
| Drop | 完全不需要的敏感列 | 可能影响必要 join/审计 |
| Redact | 展示层隐藏内容 | 原值仍可能存在上游/trace |
| Tokenize/pseudonymize | 保留稳定关联 | Token 仍可能是个人数据 |
| Aggregate | 只提供群组统计 | 小分组可能重识别 |
| Synthetic | 教学与结构测试 | 不证明真实分布表现 |

敏感字段要在进入模型、trace、cache 和公开 artifact 前处理，不能只改最终 JSON。设置 minimum group size、column allowlist 和 output scanning；错误信息也不能回显整行原始数据。

权限按 source、tenant、column、row、operation 和 purpose 分层。模型看到数据不代表可以导出、发送或用于其他目的。

## 写入采用 propose–validate–approve–commit

Write task（写任务）分四阶段：

1. **Propose**：生成结构化 patch/change set，不执行；
2. **Validate**：Schema、业务规则、范围、diff、成本与权限；
3. **Approve**：人或 policy 批准精确版本、目标和参数；
4. **Commit**：事务/幂等写入，随后对账并保存 receipt。

```text
change_set_id / source_snapshot / target
primary_key / before / after
reason / requested_by / config_hash
validation / approval / idempotency_key
commit_status / external_receipt / reconciliation
```

Approval 后 change set 变化则旧批准失效。Bulk update/delete 先 dry-run，报告匹配行、样本 diff 和上限。Timeout 后状态未知不能直接重试；按 idempotency key/transaction ID 查询外部状态。

### 回退类型

- Transaction rollback：提交前/同事务失败；
- Compensating action：外部系统已提交，需要反向动作；
- Restore snapshot：批量变更后恢复版本；
- Forward fix：不可逆或审计要求保留原事件时追加修正。

回退也需要权限、幂等、验证和审计。不能承诺所有写入都可恢复。

## 结果契约与审计

分析输出至少包含：

```json
{
  "status": "completed | insufficient | rejected | failed",
  "dataset": {"id": "...", "snapshot": "...", "schema": "..."},
  "population": {"input_rows": 0, "included_rows": 0, "excluded_rows": 0},
  "result": {},
  "units": {},
  "quality_warnings": [],
  "privacy": {"policy": "...", "redacted_fields": []},
  "lineage": {"plan_hash": "...", "artifact_ids": []},
  "verification": {"assertions": [], "passed": false}
}
```

自然语言解释引用这个已验证结果，不能引入新数字。日志记录 task/config/query/transform/result identities、exit code、failure class、approval 和外部 receipt；公开前脱敏。

## 评测指标

| 层 | 指标 |
| --- | --- |
| Contract | 正例接受、坏类型/未知字段/非有限数字拒绝 |
| Quality | Null、range、unique、referential integrity、异常分类 |
| Transform | 行数守恒、join amplification、过滤原因、公式复算 |
| Privacy | 模型/trace/output 泄漏、小群组与旁路字段 |
| Analysis | 主要结果、区间、切片、相关/因果边界 |
| Write | Scope accuracy、审批绑定、幂等、部分失败、回退成功 |
| Runtime | 扫描量、P50/P90、token/费用、tool error、人工轮次 |

Gold set 要包含 schema 漂移、单位混用、null/zero、重复 key、many-to-many join、时区边界、隐私旁路、无界查询和 timeout 未知副作用。

## 诊断顺序

| 现象 | 首查 | 责任层 | 不要先做 |
| --- | --- | --- | --- |
| 行数突然下降 | Schema reject、filter、null 策略 | Contract/transform | 让模型补行 |
| 总额翻倍 | Join key/cardinality/fanout | Transform | 调 prompt |
| 日期少/多一天 | Timezone、DST、窗口边界 | Time semantics | 改答案文本 |
| 缺失变成 0 | Parser/default/imputation | Contract | 当真实零分析 |
| 输出泄露邮箱 | Projection/redaction/trace | Privacy | 只删最终字段 |
| Query 很慢/很贵 | Plan、partition、limit、index | Execution | 无限提高 timeout |
| 写入重复 | Retry/idempotency/reconciliation | Commit | 归因模型重复 |
| 结构合法但数字错 | Formula/input/validator | Analysis | 把 schema 当正确性 |

修复后建立新 schema/transform/config identity，重跑相邻回归。旧结果保留为历史故障，不静默改分母或覆盖 source snapshot。

## 当前离线工作例

仓库 v1.1 fixture 包含一个固定 dataset/snapshot/schema/unit identity 与三行合成数据，row 字段严格限定为 `user_id/score/email`。确定性函数要求 snapshot 内 `user_id` 唯一，把 score 分成 `value/null/missing`，只接受 0–10 的有限 points；非空 email 替换为 `[REDACTED]`，随后扫描规范化 rows 是否仍含输入原值。

### 前置条件与固定输入

需要 Python 3.11+ 和 uv 0.11；依赖由 `uv.lock` 固定。从仓库根目录离线运行，不安装 PydanticAI，不使用数据库、模型、网络或真实个人数据，也不设置 credential。

输入位于 `lab/fixtures/data/`：

- `manifest.json` 固定 project-synthetic 来源、CC BY 4.0 与三个文件 hash；
- `input.json` 有三行，分别包含数值 score、显式 `null` 与 missing score；
- `expected.json` 要求 dataset identity 回链、三行守恒、score state 分离、email 脱敏；
- `negative.json` 包含 renamed field、重复 key 与 score 越界，runner 必须全部拒绝。

### 命令

```powershell
uv run --frozen --offline python scripts/run-labs.py data
```

### 预期输出与断言

命令退出 0，输出 `evidence=E1`、`offline=true`、`passed=true`、`negative_rejected=true`。`row_count=3`、population 为 3/3/0；第二、三行 score 都为 `null`，但 `score_state` 分别是 `null/missing`；两个输入 email 均被替换，`redacted_fields=2`、`sensitive_values_exposed=0`。

人工复核没有网络/credential/model action；`integration=PydanticAI` 只是职责映射，`mode=offline-contract-seam` 才是实际执行方式。

### 失败、停止、清理与回退

若 identity/unit 漂移被接受、重复 key 未阻断、行数改变、null/missing 混写、原邮箱出现在 result、manifest hash 不一致、负例未拒绝或命令需要网络，停止数据能力声明。先修 schema/normalizer/validator 并保留失败输出；不要安装上游框架、修改 expected 迎合结果或删除问题行让测试通过。

命令只读固定 JSON 并打印结果，不连接数据库、不落盘写回。误改时先运行：

```powershell
git diff -- lab/fixtures/data lab/src/about_harness/integrations/pydantic_ai.py lab/src/about_harness/labs.py docs/domains/data.md
```

确认范围后只恢复自己的变化。失败时回到 manifest 锁定 fixture 和最近通过的确定性实现，不覆盖工作树其他修改。

### 证据边界

实验提供 E1：当前仓库会校验固定 synthetic fixture，在三行输入上验证 identity/unit，拒绝未知字段、重复 key、越界/非有限 score，保留 missing/null 区别，替换非空 email，并对已知原值执行结果内精确扫描。

它没有验证真实 PII 发现、字符串变体、trace/cache 脱敏、其他单位/时区、join/聚合、统计、SQL、数据库权限、事务、写回或真实 PydanticAI。`sensitive_values_exposed=0` 只来自规范化 rows 对已知 email 的精确字符串扫描，不能扩展为“无任何泄漏”。

## 完成检查表

- Task 是否固定 dataset snapshot、population、schema、operation 与验收？
- Schema 是否包含类型、nullable、key、单位、时区、敏感和未知字段策略？
- Missing/null/unknown/redacted/invalid/zero 是否没有混写？
- 非有限数字、精度、货币与时间窗口是否显式处理？
- Query 是否来自受限 typed plan，并有表/列/行/成本/时间预算？
- 每步 transform 是否记录 before/after counts、hash 和排除原因？
- Join cardinality、重复 key 和 fanout 是否有断言？
- 计算是否由确定性代码完成并由独立 oracle/不变量复核？
- 模型、trace、cache 和输出前是否都执行数据最小化？
- 写任务是否经过 propose/validate/approve/commit 和对账？
- Rollback 是否与外部副作用现实相符，而非一律声称可恢复？
- 当前 E1 fixture 是否没有被误写成真实数据分析或框架能力？

下一步：运行[数据离线案例](/labs/data)，对照[Secret 与隐私](/security/secrets-privacy)扩展泄漏负例，再用[评测指标](/evaluation/metrics)设计数据质量与写回门槛。

## 检查题

1. 为什么 JSON Schema 合法仍不能证明一个聚合数字正确？
2. `null`、`redacted` 与数值 0 为什么必须分开？
3. Many-to-many join 如何在结构合法时制造错误总额？
4. Timeout 后写入状态未知时，为什么不能直接 retry？
5. 当前 data fixture 的 `sensitive_values_exposed=0` 为什么不是完整隐私证明？
