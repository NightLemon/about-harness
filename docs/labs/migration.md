# 跨 Harness 迁移：保留职责而非文件名

## 学习目标与证据边界

迁移 Harness 不是把 `AGENTS.md` 改名为 `CLAUDE.md`，也不是把一套 JSON/TOML 字段翻译成另一套。真正要迁移的是：任务如何进入、模型看到什么、工具如何执行、权限在哪里强制、状态怎样恢复、完成由谁验证。

完成本页后，你应能：

- 把源环境拆成六类稳定责任；
- 为目标机制写出语义、差异和补偿控制；
- 区分 source fact、E1 seam 与 live evidence；
- 识别逐字复制、未补偿 gap 和权限扩大的负例；
- 把 coding 以外的领域状态一并迁移；
- 设计 shadow、切换、回退和事件对账。

当前 Lab 使用合成 fixture，不启动 Codex、Pi 或 Claude Code，也不调用模型。结果只能标为 E1 离线职责接缝，不能用于产品性能或模型排名。

## 前置条件与固定输入

- Python 3.11+；项目基线 `uv 0.11.16`；
- 依赖已按 `uv.lock` 缓存；
- 从仓库根目录执行；
- `lab/fixtures/migration/` 没有来源不明修改；
- 产品事实以[事实注册表](/references/fact-registry)和[兼容矩阵](/references/compatibility)为边界。

容器、Windows 与 POSIX 的完整准备和停止条件见[实验环境](/labs/setup)；本页不重复安装流程。

```powershell
python --version
uv --version
git status --short --branch
uv sync --frozen --offline
```

Fixture version 是 `1.1`，source 为 `project-synthetic`，license 为 `CC-BY-4.0`，不含个人数据。Manifest 固定 `input.json`、`expected.json` 与 `negative.json` 的 SHA256；任一字节变化会在迁移逻辑前失败。

## 本案例的迁移图

```text
                  ┌→ Pi
Codex source ─────┤
                  └→ Claude Code

每条 target path：
instructions / tools / sandbox / approval / network / state

2 targets × 6 responsibilities = 12 mappings
```

本案例把一个受约束的 coding 工作流从 Codex 分别映射到 Pi 和 Claude Code。Source 与 target 名称来自三个已批准 Harness；输入必须覆盖除 source 外的另外两个，且不能重复。切换 source 时不是简单反转文字：需要重新写 source semantics、target gaps 和证据。

## 六类责任

### Instructions：有效指令链

迁移目标是作用域、发现、优先级、冲突和实际加载内容，不是文件名。Codex 的 AGENTS chain、Pi 的 context/project files、Claude Code 的 CLAUDE.md/rules 需要分别验证目标版本语义。

### Tools：调用与结果契约

迁移 tool name、schema、error、timeout、cancel、idempotency、数据目的地和授权。相同的 `bash`/`read` 名称也可能具有不同 cwd、路径、输出和隔离行为。

### Sandbox：技术可达范围

迁移“模型/进程技术上不能触达什么”。若目标没有被证明具有等价内建 sandbox，使用容器、受限账户、只读挂载和隔离 worktree 补偿。

### Approval：何时停下来询问

迁移动作分级、ask/deny 时机、批准人、拒绝终态和审计。Approval 不能替代 sandbox；“会询问”不等于进程没有权限。

### Network：实际出口

迁移默认开关、destination allowlist、proxy、DNS、身份和工具/extension 运行位置。项目指令写“不要联网”不是网络控制。

### State：可安全继续的事实

迁移 Task、session、worktree、last ToolResult、checkpoint、idempotency key、pending approval、unknown external write、acceptance 和预算。恢复对话不等于恢复副作用状态。

## 一条 Mapping 必须回答什么

每个目标的每类责任都使用：

| 字段 | 中文问题 | 不合格示例 |
| --- | --- | --- |
| `source_semantics` | 源环境真正保证什么？ | “有权限控制” |
| `target_semantics` | 目标环境哪个机制承担责任？ | 只写目标文件名 |
| `gap` | 哪些语义不等价或未知？ | 因字段同名写 `none` |
| `compensating_control` | Gap 由什么外部控制补偿？ | Gap 存在但写 `none` |
| `evidence_axis` | 结论来自 source、seam 还是 live？ | 用 E1 seam 冒充 live |
| `preserves_boundary` | 目标边界是否不宽于源边界？ | 默认开放 network |

允许的 `evidence_axis` 是 `source`、`seam`、`source+seam`、`live`。选择 `live` 必须真的有目标版本运行记录；当前 fixture 只使用 `source+seam`。

### 示例：Pi 的 Network

```text
source_semantics:
  network enablement 与 destination policy 是独立控制
target_semantics:
  runtime 和 extensions 从 network disabled 开始
gap:
  extension-specific egress 不等于统一 allowlist
compensating_control:
  enforce network none 或 container-level destination allowlist
evidence_axis:
  source+seam
preserves_boundary:
  true
```

这条记录没有声称 Pi 内建了与 Codex 同名的网络控制，而是明确由 runtime/container 补偿。

### 示例：Claude Code 的 Approval

```text
source_semantics:
  approval policy 决定执行何时询问
target_semantics:
  permission rules 与 PreToolUse hooks gate side effects
gap:
  rule matching 和 hook failure 行为不同
compensating_control:
  为每个高影响动作运行 deny 与 ask probes
evidence_axis:
  source+seam
preserves_boundary:
  true
```

这是责任映射，不是实际 Claude Code probe 结果；目标版本仍需 live 验证。

## Validator 实际检查什么

`evaluate_migration` 不是关键词计数。它执行：

1. Source 必须是 Codex、Pi、Claude Code 之一；
2. Target 必须不重复且恰好覆盖另外两个；
3. Requirements 必须完整覆盖六类责任；
4. 五个 domain checklist 必须齐全且非空；
5. 每个 target/责任必须存在 mapping object；
6. 五个语义字段必须是非空字符串；
7. Evidence axis 必须在允许集合；
8. 有 gap 时 compensation 不能为 `none`；
9. `preserves_boundary` 必须为 true；
10. 整条 target path 不能逐项复制 source semantics。

它能拒绝结构缺失和几类明显错误，但不能理解每句话是否真实、补偿控制是否足够或产品机制是否 live 生效。因此仍需来源审阅和目标探针。

## 运行与预期

```powershell
uv run --frozen --offline python scripts/run-labs.py migration
```

预期顶层：

```text
evidence=E1
offline=true
passed=true
negative_rejected=true
safety_violation=false
```

业务 output：

```text
source_harness=Codex
target_harnesses=[Pi, Claude Code]
paths_checked=2
mapped_responsibilities=12
domains_checked=5
missing=[]
uncompensated_gaps=[]
boundary_violations=[]
verbatim_targets=[]
config_copied_verbatim=false
control_boundaries_preserved=true
```

同时保存 64 字符 `fixture_hash`。不要只看 `passed=true`；逐项确认 12 个 mapping 和四个空问题列表。

## 两个自动负例

`negative.json` 包含两个 proposal：

### Verbatim config copy

把 Claude Code 六项 `target_semantics` 全部替换成 Codex 的 `source_semantics`。即使字段齐全，也必须因整条 target path 逐字复制而拒绝。

### Network boundary expansion

把 Pi network 改为 unrestricted outbound，`preserves_boundary=false`，且 gap 的 compensation 为 `none`。它同时暴露未补偿 gap 与边界扩大。

`negative_rejected=true` 表示两种 proposal 都被拒绝。若删除其中一个、只拒绝一半或 validator 不再报错，case 应失败；不要更新 expected 让其通过。

## 手动读一次 Fixture

先只读查看：

```powershell
Get-Content -Raw -Encoding utf8 lab/fixtures/migration/input.json
Get-Content -Raw -Encoding utf8 lab/fixtures/migration/negative.json
```

选择一个 mapping，回答：

1. Source semantics 是机制还是文件名？
2. Target semantics 能由哪个目标版本探针证明？
3. Gap 是否真实改变安全、恢复或质量？
4. Compensation 位于产品、容器、身份还是人工流程？
5. 当前证据为何只能是 `source+seam`？

不要在正式 fixture 中练习编辑。Hash 失败练习使用[离线 Runner](/labs/runner)中的唯一临时目录流程。

## 五类领域状态

Harness 责任相同，不代表领域状态相同。Fixture 要求：

| 领域 | 必须随迁移验证的状态 | 丢失后的风险 |
| --- | --- | --- |
| Coding（代码） | cwd/worktree、tests/diff、checkpoint/rollback | 改错 checkout、重复 patch、错误验收 |
| Browser（浏览器） | profile/origin allowlist、注入边界、副作用批准 | 跨账号、跨站写入、页面指令越权 |
| Research（研究） | source snapshot、claim-citation、冲突/拒答 | 引用漂移、把冲突抹平 |
| Data（数据） | schema/单位、PII masking、只读/行数上限 | 单位错误、隐私泄漏、大范围写入 |
| Document（文档） | parser/chunk hash、版本过滤、索引权限/删除 | 旧版本回答、越权检索、删除残留 |

真实迁移报告只需包含目标 workload 的领域，但必须覆盖该领域全部状态。当前 fixture 同时检查五类，是为了展示通用框架。

## 真实迁移的七个阶段

### 1. 冻结 Source

记录 source Harness/version/surface、model/provider、Task、effective instructions、tools、sandbox、approval、network、state、validator 与真实运行基线。

### 2. 建立责任表

不要打开目标产品后立即复制配置。先对 source 六项责任写 semantic statement 与验证证据。

### 3. 选择 Target mechanism

为每项责任找到目标机制；找不到等价能力时明确 gap，不因产品偏好隐藏差异。

### 4. 添加 Compensation

Gap 可以由容器、受限身份、外部 approval service、业务幂等、validator 或人工流程补偿。补偿本身也要有 owner、失败模式和测试。

### 5. Qualification

从 read-only、deny/ask、network、tool error、checkpoint/cancel 开始。任何硬边界失败都停止，不进入模型任务评分。

### 6. Shadow 与局部切换

使用相同 Task 和输入并行运行 target，但不产生外部副作用。先迁移一个可逆 workload，不要求一次替换所有任务。

### 7. Cutover 与回退

预注册质量、安全、延迟、费用与恢复阈值。保留 source 配置和 state；出现身份漂移、边界扩大、验收退化或费用异常时停止 target 并恢复。

## 比较时控制变量

迁移实验必须固定或显式报告：

```text
model/provider/resolved identity
Task + fixture + repository commit
instructions/context hash
tool capability and schemas
sandbox/approval/network boundaries
budgets and human interventions
validator and failure classification
```

如果目标 Harness 内建不同工具/状态机制，强行抹平成同样配置也不公平。分别报告“默认体验”和“边界对齐后的合理配置”，把结构差异作为结果。

## 失败归因

| 症状 | 首查 | 不要先归因给 |
| --- | --- | --- |
| 目标没遵循规则 | effective instruction chain、cwd | 模型不服从 |
| 工具行为不同 | schema、error、timeout、cwd | Harness 整体更差 |
| Ask/Deny 不等价 | rule matching、hook、事件顺序 | 自然语言指令 |
| 范围外可写 | sandbox/identity/mount | approval 配置 |
| 网络意外可用 | 工具执行位置、container/proxy | 模型主动越权 |
| Resume 重复副作用 | checkpoint、idempotency、对账 | 模型记忆差 |
| Context 压缩后丢规则 | compaction state 与摘要 | 目标模型弱 |
| 任务通过率变化 | model/provider/tool/validator 是否一致 | Harness 单一变量 |

修复后同时重跑 source baseline、target 原失败、相邻正例与领域负例。

## 记录模板

```text
Migration ID:
Source config + evidence:
Target config + evidence:
Workload / Task / fixture:

Responsibility:
Source semantics:
Target semantics:
Gap:
Compensating control:
Evidence axis:
Verification command/result:
Preserves boundary:
Owner / unresolved:

Domain state:
Cutover threshold:
Rollback trigger and steps:
```

每一条 live 结论引用目标版本 run；没有运行写 `untested`，不要从 source 或 E1 fixture 推断。

## 完整验证

修改 migration fixture/runner 时运行：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_m5_labs.py
uv run --frozen --offline python scripts/run-labs.py migration
npm run eval:validate
```

预期 pytest 与 Runner 退出 0，migration 结果满足前述断言；Eval 仍验证 fixture lineage。Hash 不一致、负例被接受、边界列表非空或 evidence 升级为 E2/E3 时立即停止。

## 清理、回滚与已知限制

Runner 只读 fixture 并输出 stdout；发送 `Ctrl+C` 可停止。命令可能产生测试 cache，先用 `git status --short` 确认范围，再只清理本轮明确生成的路径。

真实迁移在隔离 worktree/环境生成 target 配置；保留 source 配置与 checkpoint。失败时停用 target，恢复 source，并对外部资源逐项核对。不要删除失败 run、移动旧 tag 或让 Git revert 代替外部回滚。

当前 validator 不检查自然语言真实性、不启动产品、不测试实际 sandbox/permission/network，也未固定同一 model/provider。E1 结果不能用于性能、兼容或安全认证。

## 检查题与下一步

1. 为什么文件名映射不能证明指令语义已迁移？
2. Approval 与 sandbox 的 gap 应由什么证据区分？
3. `preserves_boundary=true` 为什么仍需要 live probe？
4. Session 对话已恢复时，哪些外部副作用可能仍未知？
5. 目标 Harness 有结构优势时，怎样比较而不抹平差异？

下一步把结果放入[评测方法](/evaluation/method)，并按[三个 Harness 对照](/harnesses/comparison)形成自己的选择记录。
