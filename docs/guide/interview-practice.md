# 面试迁移练习：五张可复现的 Harness 卡

这五张卡只使用本仓库的固定 fixture、离线 runner 和工作坊。它们训练你用保存的输入、输出与断言解释工程结论，不需要相邻项目、真实模型、在线工具或私人工作区。

## 共同前置、记录、停止与清理

从仓库根目录执行，按[统一环境](/guide/prerequisites)准备 Python 3.12、Node.js 22+、`uv 0.11.16` 和已进入本机 cache 的锁定依赖。

```powershell
node --version
python --version
uv --version
git status --short --branch
```

所有 Python 命令使用 `--frozen --offline`，不读取 API key、不请求网络，也不写正式 fixture。记录命令、退出码、fixture hash、关键 output、E1 边界和下次复测日期。出现 hash 漂移、断言失败、缺离线依赖、凭据提示或预期外网络请求时立即停止；不要删负例、改判据或移除 `--offline` 求通过。

练习只产生终端输出和已忽略 cache。结束后检查 `git status --short`；只撤回自己为练习创建的明确路径，保留失败输出与记录，不要 reset 整个工作树。五张卡只能支持 E1 离线控制契约结论，不能支持真实模型质量、在线工具或完整目标环境结论。

## 卡 1：工具契约决定什么能执行

```powershell
uv run --frozen --offline python scripts/run-labs.py coding
```

预期退出 0，顶层有 `evidence=E1`、`offline=true`、`passed=true`。断言 `baseline_failures` 包含 `single` 与 `multiple`、`tests_passed=3`、`negative_rejected=true`，且 `changed_files` 只有 `src/collect.py`。本卡固定使用历史内存实验，输入与负例分别在 `lab/fixtures/coding/input.json` 和 `negative.json`；[编码实验](/labs/coding)已以真实临时工作区为主线，两套产物不要混用。对照历史 fixture，解释合法 patch、路径越界和 schema/scope 不合法的 patch 为何不能执行。

**面试官：模型已经输出符合 schema 的 JSON，为什么还要检查？**

**参考答：** Schema 只能表达结构和部分取值。宿主还要把候选绑定到可信 snapshot、允许路径、base hash、hunk 上下文和业务断言；本例 patch 只在内存中应用，模型文字不是已修改工作树。

**失败例与限制：** 负例必须在执行前被拒绝。这证明固定 evaluator 的边界，不证明模型能识别所有恶意补丁或真实 OS sandbox 已隔离。

## 卡 2：从证据解释预算与冲突

```powershell
uv run --frozen --offline python scripts/run-labs.py research
```

预期退出 0，输出保留 `evidence=E1`、`offline=true`、`passed=true` 与 `negative_rejected=true`。对照 `lab/fixtures/research/input.json` 与 `expected.json`，找一个 `conflict`、一个 `supported` 和一个 `insufficient`（[研究实验](/labs/research)另有原始文件解析主线），解释为何不能汇总为“模型已经研究正确”。

**面试官：提高 reasoning 档位会自动给任务更多时间吗？**

**参考答：** 不会由名称自动推出。模型推理设置、宿主步数、工具 timeout 和业务 deadline 是不同控制面；要看实际调用、耗时和精确配置。

**变式：接口超时没有返回 usage，能把这一轮记成零成本吗？**

**参考答：** 不能。记录尝试次数、已知/未知用量和保守预算处理；是否重试取决于总预算和副作用状态。

**失败例与限制：** Research negative 会拒绝重复 source identity、空 query 或无效引用。fixture 是预结构化 ledger，不执行搜索、模型或真实费用。

## 卡 3：只读重试与写入恢复分开练

```powershell
npm run reliability:workshop
npm run reliability:workshop -- --unsafe-retry-demo
uv run --frozen --offline pytest -q lab/tests/test_recovery.py
```

正例与测试应退出 0；不安全反例应退出 1 并展示“换 idempotency key 会重复副作用”，不能当作成功。断言正例有 write intent、稳定 key、receipt/reconciliation；反例必须标出 duplicate effect。

**面试官：所有失败都能指数退避后重试吗？**

**参考答：** 先按失败语义分类。临时只读故障可有限重试；错误参数和权限拒绝要先修原因。写入 timeout 可能是远端已执行但回执丢失，应先用原请求身份查询权威状态，无法确认就保留待对账。

**失败例与限制：** 当前工作坊是离线内存示例，不证明任意外部服务有 receipt、可查询状态或 exactly-once 语义。

## 卡 4：独立验收要能发现生产检查器的错

```powershell
npm run lab:ts-runtime-test
uv run --frozen --offline pytest -q lab/tests/test_acceptance.py lab/tests/test_loop.py -k "acceptance or validator"
```

两条命令应退出 0。阅读 `docs/implementation/testing.md`，断言 completion proposal 需要经过独立 acceptance，且 validator failure/timeout 不能被写成 `completed`。

**面试官：模型说 completed，测试脚本也退出零，任务就完成了吗？**

**参考答：** 要看零退出码具体验收了什么。模型自报字段和只检查 JSON 解析的脚本都不能证明业务状态；正式任务需要读取冻结 artifact、退出码、diff 或外部回执的独立 validator。

**失败例与限制：** 本仓库验证 fake/replay runtime 的 fail-closed 行为，不验证生产 evaluator、真实部署或目标业务数据。

## 卡 5：用证据准备两分钟项目深挖

```powershell
uv run --frozen --offline python scripts/run-labs.py migration
uv run --frozen --offline pytest -q lab/tests/test_m5_labs.py::test_migration_rejects_unknown_empty_and_broader_control_mappings
```

预期两条命令退出 0；runner output 要有 `mapped_responsibilities=12`、`domains_checked=5`、空 `uncompensated_gaps`、`negative_rejected=true`。用两分钟说明需求/输入契约、一条失败路径、修复前后边界和验证范围。

**面试官：你说 Agent 更可靠，证据是什么？**

**参考答：** 先说明比较对象、案例分母、预算上限、实际调用量和证据等级。这里 E1 能证明固定迁移 evaluator 会拒绝未知 Harness、空 mapping、逐字复制和扩大 network boundary；真实模型质量、费用与泛化需要另行授权的目标实验。

**变式：哪些部分是你自己完成的？**

**参考答：** 按实际记录区分已有框架、AI 辅助、自己的修改、测试和解释。展示具体错误、改动和证据，不把重跑测试或阅读代码说成独立设计。

## 可选的外部项目映射

可把 Travel 作为可选的外部迁移对象；它是学习者另行选定的独立仓库，不是本仓库子目录或默认存在的相邻项目。没有外部项目仍可完成全部五张卡。已有公开且获授权的项目时，由学习者填写仓库位置和实际命令，再映射到其 tool allowlist、budget trace、reconciliation、independent evaluator 和迁移责任表。先记录该项目的 commit、许可、输入 hash、运行命令和可撤销范围；缺失任一身份或授权时不运行。外部运行是独立证据，不能覆盖本页固定 E1 结论。
