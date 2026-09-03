# 数据实验：Snapshot、Schema、缺失语义与敏感字段

本实验用三行 synthetic data（合成数据）验证一个最小数据契约：dataset/snapshot/schema/unit identity 必须稳定，主键不能重复，`score` 的 missing、显式 `null` 与数值必须分开，非有限或越界数字必须拒绝，`email` 原值不能进入规范化结果，行数必须守恒。

它不安装 PydanticAI，不运行模型，不连接数据库，也不处理真实个人数据。实验验证的是“固定 fixture → 运行时 schema → 规范化 → 脱敏 → 负例 → 结构化结果”的离线责任接缝。

完成本页后，你应该能：

- 从 manifest、input、expected 和 negative 重建案例；
- 解释 schema 合法、数据正确和隐私安全为什么是三种不同断言；
- 区分 missing、`null`、redacted、invalid 和数值 0；
- 运行字段漂移、重复主键、单位漂移、数值边界和脱敏测试；
- 说清当前 E1 结果与真实 PydanticAI/数据库/数据分析的边界。

## 先看证据结论

当前合法结论是：锁定的 Python normalizer 能在三行固定 JSON 上验证 dataset/snapshot/schema/unit，拒绝未知字段、重复 `user_id`、`NaN/Infinity` 与 0–10 范围外的 score；它用 `score_state=value/null/missing` 保留存在性语义，把非空 email 替换为 `[REDACTED]`，扫描规范化 rows 是否仍含输入 email，并返回 population 与离线执行身份。

当前不能推出：

- PydanticAI 已安装、导入或与当前代码兼容；
- 真实数据源、SQL、DataFrame、流式数据或大表可用；
- Email/电话/地址等 PII（Personally Identifiable Information，个人可识别信息）能自动发现；
- 原值没有进入上游日志、trace、cache 或错误信息；
- 任意业务主键、其他单位、时区、join 和聚合正确；
- 数据库权限、事务、写回、幂等或回滚已经实现；
- 三行 fixture 能代表真实分布或模型分析质量。

因此证据保持 E1：本地离线契约接缝，而不是 E2 真实组件探针或 E3 workload 质量。

## 固定输入与业务断言

| 行 | `user_id` | `score` | 原始 `email` | 期望输出 |
| ---: | --- | ---: | --- | --- |
| 1 | `u-1` | `7.5` | `person1@example.invalid` | Score 保留，email 变 `[REDACTED]` |
| 2 | `u-2` | `null` | `person2@example.invalid` | Score 仍为 `null`，email 变 `[REDACTED]` |
| 3 | `u-3` | Missing | `null` | Score 输出 `null`，但 `score_state=missing`；email 保持 `null` |

输入还固定 `dataset_id=training-scores`、`snapshot_id=synthetic-2026-09-04`、`schema_version=1.1` 与 `score_unit=points_0_10`。正常结果必须满足 `row_count=3`、population 三项守恒、`redacted_fields=2`、`sensitive_values_exposed=0`。三条负例分别制造 `userId` 漂移、重复主键和 score 越界，handler 必须全部拒绝。

## 实际执行链

```text
manifest.json
  ├─ 校验 input/expected/negative 的 SHA256
  └─ 计算整个 fixture hash
            ↓
input.json ──→ normalize_rows(payload)
                 1. payload 只接受 dataset 与 rows
                 2. 固定 dataset/snapshot/schema/unit identity
                 3. rows 必须是 list，每行只接受 user_id/score/email
                 4. user_id 非空且在 snapshot 内唯一
                 5. score 区分 missing/null/value
                 6. value 必须为 0–10 的有限 number
                 7. 非空 email 替换为 [REDACTED]
                 8. 扫描输出是否仍有输入 email 原值
                 9. 返回 rows、population、privacy 计数和 execution mode
            ↓
expected.json ──→ 对列出的字段逐项相等检查
negative.json ──→ 三组坏 rows 分别要求精确错误类别
            ↓
case result ──→ expected matched AND negative rejected
```

这里没有模型生成 schema，也没有 Pydantic model retry。所有判断来自确定性 Python 代码。

## 四个 fixture 文件分别负责什么

| 文件 | 当前内容 | 责任 |
| --- | --- | --- |
| `manifest.json` | 来源、许可、核对日、个人数据标记、三个文件 hash | 冻结实验身份并阻止静默篡改 |
| `input.json` | Dataset identity 与三行 `user_id/score/email` | 固定 snapshot、单位、存在性和待脱敏字段 |
| `expected.json` | 规范化 rows、score state、population、脱敏计数 | 定义输出断言而非只看退出码 |
| `negative.json` | Rename、重复 key、越界 score 三个案例 | 验证 schema/key/range policy 失败关闭 |

整个 fixture hash 当前为：

```text
48348204c20d075dadfa5f6dd93eb26295e1eda86044dc35528f7bfec8e5dfe2
```

当前 lab 使用上面的 v1.1 fixture。历史 Eval task `data-01` 仍通过 commit `6aada53…`、固定 path 与旧 hash `9a6f960…` 读取 v1.0 输入；它不会被当前工作树升级覆盖。若要用 v1.1 形成评测证据，应新增 fixture ref、Task/run identity 和结果。

## 当前运行时 Schema

| 字段 | 是否必须 | 接受值 | 输出 | 当前未覆盖 |
| --- | --- | --- | --- | --- |
| `dataset` | 是 | 四个固定字段；schema `1.1`、unit `points_0_10` | 原样回传已验证 identity | Content hash、owner、tenant、时区 |
| `user_id` | 是 | 非空 string，snapshot 内唯一 | 原样保留 | 格式、租户和跨 snapshot 主键语义 |
| `score` | 否 | Missing、`null` 或 0–10 有限 int/float，bool 拒绝 | 数值转 float；另返回 `score_state` | 精度、missing reason、其他量纲 |
| `email` | 否 | `null`/缺失或非空 string | 非空统一 `[REDACTED]` | 格式、分类、tokenization、原值 lineage |
| 其他字段 | 否 | Payload、dataset、row 未声明字段全部拒绝 | 无输出 | 版本化 additive field/migration |

Runtime schema 比 TypeScript 类型或文档表格更重要：JSON 来自文件、网络或模型时，静态类型不会自动校验它。反过来，通过 runtime schema 也只证明输入形状被接受，不证明业务含义正确。

## 为什么非有限数字必须拒绝

Python 的 `float` 可以表示 `NaN`、正 `Infinity` 和负 `Infinity`；标准 JSON 不允许这些值，但 Python 默认 JSON parser 可能接受相应 token，直接函数调用也能传入它们。仅用 `isinstance(value, (int, float))` 会让坏值进入聚合、排序和指标。

当前公共 `require_number` 在类型检查后转换为 float，再使用 `math.isfinite` 失败关闭；极大整数转换溢出也归一成稳定的 `IntegrationContractError`。这些坏值不会进入规范化结果。

当前 0–10 范围只对 `points_0_10` 生效。这仍未解决超大有限整数转 float 的精度损失、Decimal/货币或其他量纲；真实 schema 应根据字段语义选择精确表示。

## 缺失、Null、Redacted 与 Zero

| 状态 | 含义 | 当前案例行为 |
| --- | --- | --- |
| Missing | 字段未提供 | Score 输出 `null`，同时 `score_state=missing` |
| `null` | 显式无值 | Score 输出 `null`，同时 `score_state=null` |
| Redacted | 原值存在但因政策隐藏 | 非空 email 输出 `[REDACTED]` |
| Invalid | 类型、有限性或字段集合不合法 | 抛 contract error |
| Zero | 已知数值为 0 | 作为 `0.0` 保留，不等于缺失 |

`score_state` 保住了“字段未提供”和“字段显式为空”的结构差异，但仍没有 `missing_reason`，所以不能进一步推断是未采集、不适用、权限隐藏还是源系统故障。

## 逐字段解释 Result

### `rows`

输出每行只有 `user_id/score/score_state/email`。Unknown field 在输出构造前被拒绝；代码不会自动驼峰转下划线，也不会静默丢列。

Score 的 `7.5` 转为 float，第二、三行都输出 `null`，但 state 分别是 `null` 与 `missing`。Email 无论内容是否真是合法地址，只要是非空字符串就变为固定 redaction token；所以本实验验证的是字段级替换，不是 PII detection。

### `row_count` 与 `population`

`row_count` 是规范化 list 的长度；`population` 同时给出 input/output/rejected rows。当前函数既不 filter、join、deduplicate，也不展开行，因此三项必须是 3/3/0。真实数据变换允许行数改变，但必须保存每一步 before/after/rejected 与原因。

### `sensitive_values_exposed`

当前实现收集输入中非空 email 的精确字符串，在规范化 rows 的所有值中递归扫描；任何原值重现都会抛 `redaction failed`。`redacted_fields=2` 记录实际替换次数，`sensitive_values_exposed=0` 来自这次扫描，不再是硬编码常量。

它仍不是 PII detection 或全链路扫描器：没有检查字符串变体、未声明敏感字段、trace、stderr、cache、异常和其他 artifact。因此只能表述为“已知输入 email 没有在规范化 rows 中精确重现”；真实系统应在进入模型前、tool result、trace 和公开 artifact 各自执行 redaction/扫描，并保存 policy/version。

### `integration` 与 `mode`

`integration=PydanticAI` 是教学职责映射名；`mode=offline-contract-seam` 才是实际执行方式。当前锁定环境没有安装或 import PydanticAI。

### `negative_rejected`

Runner 逐一把 `negative.json` 的三组 rows 放入同一份 v1.1 dataset contract，要求分别出现 `schema drift`、`duplicate user_id` 与 `between 0 and 10 points`。任一案例被接受、错误类型不符或负例结构损坏，`negative_rejected` 都是 false。

直接测试另覆盖三个非有限数、单位漂移和“email 原值从另一个输出字段旁路”的情况。仍未覆盖缺 `user_id`、多余 `debug`、坏 email 格式、string number、跨租户 key 或语义相同但标注错误的单位。

## 运行固定正例

### 前置条件与固定版本

- Python 3.11+；
- uv 0.11，项目当前验证版本为 `0.11.16`；
- 依赖由 `uv.lock` 固定并已在本机缓存；
- 从仓库根目录执行；
- 不安装 PydanticAI，不连接数据库，不设置 API credential；
- 不允许命令临时联网，输入中没有真实个人数据。

容器、Windows 与 POSIX 统一入口见[实验环境](/labs/setup)。

### 命令

```powershell
uv run --frozen --offline python scripts/run-labs.py data
```

### 预期输出与断言

命令退出 0，顶层为 `schema_version=1.0`、`evidence=E1`、`offline=true`、`passed=true`。唯一 case 还应满足：

```text
case_id                    = data
fixture_hash               = 48348204c20d075dadfa5f6dd93eb26295e1eda86044dc35528f7bfec8e5dfe2
negative_rejected          = true
safety_violation           = false
dataset.schema_version     = 1.1
dataset.score_unit         = points_0_10
row_count                  = 3
population                 = 3 input / 3 output / 0 rejected
rows[0].score              = 7.5
rows[1].score              = null
rows[1].score_state        = null
rows[2].score_state        = missing
redacted_fields            = 2
sensitive_values_exposed   = 0
integration                = PydanticAI
mode                       = offline-contract-seam
```

人工复核还要确认输出和错误没有原邮箱，进程没有网络、数据库、模型或上游 Framework 行为。

## 运行直接契约测试

以下命令验证 dataset identity、missing/null、脱敏、字段漂移、重复 key、范围、单位和非有限数：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_m5_labs.py -k data
```

预期 `8 passed`、退出码 0。负例测试通过表示坏输入被正确阻断；它不表示真实数据源、PydanticAI 或任意敏感内容已验证。

再检查上一步结果中的 `offline=true`、`evidence=E1` 与 `mode=offline-contract-seam`。它们证明固定数据职责接缝运行过，不证明 PydanticAI 已安装、真实 provider 可用或生产数据兼容；任何缺失或被改成 live 的结果都应停止引用。这个证据判断必须读取实际结果，不能由页面中是否出现产品名替代。

## Result 如何进入 Eval

样例 Task `data-01` 固定：

- Goal：验证 schema、保留缺失并脱敏邮箱；
- Allowed tools：`fixture.read`、`assert`；
- Budget：8 steps、8 model calls、1000 ms、0 美元；
- Acceptance：`passed=true`、`sensitive_values_exposed=0`；
- Fixture ref：历史 Eval 固定 commit、path 与 v1.0 hash `9a6f960…`，不指向当前 v1.1 工作树。

样例 run 把 `offline-default` 记为 `failure_type=contract`，把 `offline-engineering` 记为通过。它们引用历史 v1.0 fixture，是 E1 合成分析样例；既不是 PydanticAI/model run，也不验证 v1.1 的 identity/key/range/privacy 契约，不能用三行结果推导配置或框架排名。

真实数据 Eval 还应保存 dataset snapshot、schema、transform/query plan、privacy policy、validator、result hash、输入/输出/rejected counts 和所有副作用 receipt。

## 失败分类与定位

| 现象 | 首查 | 合法动作 | 不要做 |
| --- | --- | --- | --- |
| `hash mismatch` | Fixture 字节、manifest、读取路径 | 确认是否有新版本 | 更新 hash 继续复用旧 run |
| `userId` 被接受 | Unknown-field policy 与 normalizer | 阻断并写显式 migration | 静默改名 |
| 缺失 score 变 0 | `.get`、default、imputation | 保留 null 或记录插补 | 当成真实零分析 |
| `NaN/Infinity` 通过 | 类型检查与 `isfinite` | handler 前拒绝 | 让聚合自行处理 |
| 重复 `user_id` 被接受 | Snapshot key policy | 阻断并归因上游 | 任取第一行或最后一行 |
| Unit 变成 `percent` | Dataset schema identity | 新建兼容 schema/transform | 沿用 0–10 points 规则 |
| 行数变化 | Reject/filter/join/dedup | 保存 before/after/reason | 删除异常行让测试绿 |
| 原 email 出现在 rows | Projection/redaction 构造 | 立即停止并修复 | 只把计数字段改为 0 |
| 原值出现在 trace/error | 日志参数与异常格式 | 隔离 artifact，扩展 redaction | 因最终 JSON 安全而放行 |
| `integration` 被当成接入 | Boundary mode 与依赖 | 降回 E1 描述 | 安装包让措辞成立 |

诊断顺序建议为 source/snapshot → schema/parser → transform → privacy → result/validator → evaluator。数据被解析错时，增加模型推理不能修复源层错误。

## 从当前 E1 升级到真实数据管线

### 阶段 A：丰富结构化 fixture

当前 v1.1 已有 schema version、snapshot、唯一主键、0–10 points 范围、missing/null state 和 email 字段级脱敏。下一步增加 content hash、owner/tenant、时区、missing reason 与敏感分类，并覆盖跨租户 key、string number、精度和语义单位漂移。

### 阶段 B：确定性变换与血缘

加入 filter/join/aggregate，但每一步记录 input/output/rejected counts、predicate、key cardinality、单位和 result hash。用 many-to-many fanout、错误时区、货币和精度做负例；计算由确定性代码与独立 oracle 复算。

### 阶段 C：只读数据源

固定 source/environment/snapshot/transaction identity，使用最小权限账号和参数化 typed query plan。限制表、列、租户、扫描行/字节、时间和费用；模型看不到任意 SQL、credential 或未投影敏感列。

### 阶段 D：真实 PydanticAI/model 探针

只有 schema、privacy、query 和 validator 稳定，并另获依赖、provider、网络、数据和费用授权后，才固定 PydanticAI/model 版本做 E2 probe。模型负责映射目标与解释，确定性层仍负责 schema、计算和隐私。

### 阶段 E：受控写回

写任务必须经过 propose → validate → approve → commit → reconcile。Change set 绑定 source snapshot、before/after、scope、approval 与幂等键；timeout 后先对账。真实 workload 的 E3 要覆盖 partial、conflict、rollback 和 holdout。

每个阶段创建新 task/schema/config/adapter/run identity。不能把当前三行 fixture 的 E1 标签升级，冒充数据库或模型证据。

## 真实数据实验必须记录什么

| 层 | 最小身份与状态 |
| --- | --- |
| Source | System/environment/dataset/snapshot/partition/hash、owner、tenant |
| Contract | Schema/version、type/null/key/unit/timezone/sensitive/unknown policy |
| Query | Typed plan、allowed tables/columns、filter、limit、cost estimate |
| Transform | Code/config hash、before/after/rejected counts、join cardinality |
| Privacy | Classification/policy、model-visible fields、redaction/tokenization |
| Result | Dataset/result hash、units、warnings、assertions、failure class |
| Runtime | Task/run/model/adapter、duration、token、tool/warehouse cost |
| Write | Change set、approval、idempotency、transaction/receipt、reconciliation |
| Lifecycle | Retention、delete/export、cache/trace/public artifact propagation |

公开结果只保留合成数据或经过批准的最小统计。Pseudonymous ID、稀有组合和小分组仍可能重识别，不能因为没有 email 就自动判定安全。

## 回归矩阵

| 维度 | 正常例 | 负例/故障 |
| --- | --- | --- |
| Schema | 三个固定字段 | Rename、missing required、extra、type drift |
| Number | 有限正/负/零 | Bool、NaN、Infinity、精度丢失、越界 |
| Missing | 显式 null、合法缺失 | Null 变 0、unknown/redacted 混写 |
| Key | 唯一 `user_id` | Null、duplicate、跨 tenant 冲突 |
| Unit/time | 明确单位和时区 | 秒/毫秒、币种、DST、窗口边界 |
| Transform | 行数变化可解释 | Filter 丢行、join fanout、重复聚合 |
| Privacy | 输入前最小化、输出脱敏 | Trace/error/cache/旁路字段泄漏 |
| Query | 有界只读 plan | 任意 SQL、无租户、无 limit、昂贵扫描 |
| Write | 精确 change set 与 receipt | 重复、partial、conflict、timeout unknown |
| Eval | 固定 snapshot 与 validator | Split 泄漏、分母漂移、改 expected |

每个案例定义预期 failure class、handler 是否执行和副作用状态。只检查最终 JSON 会漏掉上游 trace 或数据库已发生的泄漏/写入。

## 停止、清理、回滚与限制

### 当前离线实验

命令只读固定 JSON 并打印结果，不连接数据库、不落盘写回。需要停止时终止进程即可；`.pytest_cache/` 等忽略缓存可以保留。误改时先检查：

```powershell
git diff -- lab/fixtures/data lab/src/about_harness/integrations/base.py lab/src/about_harness/integrations/pydantic_ai.py lab/src/about_harness/labs.py lab/tests/test_m5_labs.py docs/labs/data.md
```

只恢复自己的修改，不覆盖工作树其他变化。若 fixture、实现或测试失败，回滚到最近通过的锁定版本，并保留失败输出用于归因。

### 未来真实数据实验

出现以下任一情况立即停止：读错 environment/tenant/snapshot、schema identity 不明、非有限数进入变换、行数无法对账、敏感数据进入模型或公开 trace、Query 无界、写入 approval 失效、commit 结果未知。

停止后撤销数据/credential 句柄，隔离 artifact，核对数据库/外部系统真实状态，再按 retention/privacy 流程处理缓存、trace 和导出。不要只删除最终结果，也不要在写入状态未知时重试。

回滚 schema/transform/config 时保持版本一致；已经提交的外部写入需 transaction rollback、补偿或 forward fix。代码降级不能撤销业务数据。

### 已知限制

当前只有三行合成 JSON、一个固定 0–10 points 单位、三组 fixture 负例和少量直接测试。精确字符串扫描只覆盖声明的 email 原值；没有真实 PII、数据库、统计、时区、join、模型、写回或生命周期事件。这些限制决定结果不能外推到生产数据安全或分析质量。

## 完成检查表

- 是否能从四个 fixture 文件重建固定案例？
- 是否核对 fixture hash 与 execution mode？
- Unknown field 是否在任何变换前失败关闭？
- `NaN/Infinity` 是否不会进入结果或 metrics？
- Missing、`null`、redacted、invalid 和 zero 是否没有混写？
- 是否明白 email 替换不是 PII 自动发现？
- 是否明白 `sensitive_values_exposed=0` 不是独立全链路扫描？
- 行数变化是否有 before/after/rejected 与原因？
- Integration 映射名是否没有被误写成 PydanticAI 已接入？
- 新 schema/fixture/config 是否产生新 identity 和 run？
- 真实计划是否覆盖 source snapshot、单位、时区、privacy 和写回对账？
- E0、E1、E2、E3 是否按真实来源与执行边界标注？

下一步先读[数据 Agent 模式](/domains/data)设计完整 source-to-result 管线，再用[Secret 与隐私](/security/secrets-privacy)扩展全链路泄漏负例，并对照[评测指标](/evaluation/metrics)建立数据质量和写回门槛。随后进入[文档案例](/labs/document)。

## 检查题

1. Runtime schema 通过后，为什么聚合结果仍可能错误？
2. `score_state` 如何保住 missing 与显式 `null` 的差异，又为什么仍不能说明缺失原因？
3. `sensitive_values_exposed=0` 当前检查了什么，又没有检查哪些位置？
4. `NaN/Infinity` 为什么可能绕过简单 number 类型检查？
5. 从三行 JSON 升级到真实数据库写回时，至少要新增哪些身份和副作用记录？
