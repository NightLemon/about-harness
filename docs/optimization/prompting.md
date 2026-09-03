# 提示与任务契约

Prompt engineering（提示工程）对 agent 最有价值的部分，不是寻找“神奇咒语”，而是把意图写成可执行、可停止、可验证的 task contract（任务契约）。契约说明结果、输入、边界、权限、预算和完成条件，同时给 agent 保留调查与选择实现路径的空间。

一段文字即使读起来清楚，也不一定是可执行契约。真正的检验是：另一位执行者能否在不猜隐藏要求的情况下开始，能否知道什么时候该停，以及 reviewer 能否只凭 artifact 和断言判断结果。

## 先分清五类内容

| 类别 | 回答的问题 | 好的写法 | 常见混淆 |
| --- | --- | --- | --- |
| Outcome（结果） | 最终要改变什么 | “修复刷新失败，保持 token 有效期不变” | “调查一下”“优化代码” |
| Deliverable（交付物） | 要留下什么 | 代码、测试、文档、报告 | 把过程步骤当结果 |
| Acceptance（验收） | 如何机器/人工判定 | 具体断言、命令、rubric | “确保没问题” |
| Boundary（边界） | 哪些对象和动作不在权限内 | 不改公开 API；不做远程写入 | 靠执行者猜常识 |
| Stop condition（停止条件） | 缺信息或风险出现时怎么办 | 迁移需求不明则停止并报告 | 无限尝试或自行扩权 |

结果与验收不同。“新增重试”是方案，不是结果；“临时错误后最终成功且同一业务写入只发生一次”才是可观察结果。交付物也不等于验收：有测试文件不代表测试覆盖了失败路径。

## 一份可执行的八段契约

不要求每次都保留八个标题，但信息要能被明确找到：

```md
## 目标
修复用户会话超时后的 refresh 失败；不得改变 access/refresh token 有效期。

## 当前事实与输入
- 从 `src/auth/` 和现有 refresh 测试开始。
- 固定失败输入：`fixtures/refresh-timeout.json`，hash/版本见 manifest。
- “可能由并发导致”只是待验证假设，不是事实。

## 范围与非目标
- 可改认证模块与对应测试。
- 不改公开 API、数据库 schema 或依赖版本。
- 不顺手重构无关 session 代码。

## 权限与副作用
- 只允许本地文件修改和离线测试。
- 不访问生产、不发送消息、不 push。
- 若必须迁移数据库，停止并说明理由与候选方案。

## 预算与交互
- 先复现，再做最小修复。
- 两个不同方案均失败或目标测试无法稳定复现时，停止汇报证据。

## 完成条件
- 新回归测试在修复前稳定失败、修复后通过。
- 目标测试、认证测试集和类型检查退出 0。
- timeout 后没有重复刷新副作用。

## 清理与回退
- 删除测试创建的临时数据。
- 候选失败时回到已锁定 baseline；不修改用户既有改动。

## 最终报告
- 根因、改动文件、验证命令/退出码、未运行项和已知限制。
```

这是结构示例，不是本仓库现成的认证 fixture。路径、命令和断言必须替换为目标项目的真实内容，不能把示例当已验证事实。

## 目标写结果，不预埋未经验证的根因

“把 `retryCount` 从 2 改成 3”锁定了实现，但没有说明用户问题。“修复暂时断连后请求不能恢复，保持总 deadline 与幂等边界”允许先找根因，也给出不可退化条件。

若用户已经决定实现方式，明确标为约束；若只是怀疑，写为 hypothesis（假设）并要求验证。不要用肯定语气把日志猜测变成事实，否则 agent 可能只搜支持证据。

目标要有对象、状态变化和可观察终态：

```text
对象：离线 migration fixture
初态：迁移后职责边界丢失
终态：两个目标 harness 都映射职责，不逐字复制源配置
约束：不访问真实 provider，不改写历史 fixture
```

对研究任务，目标还要说明要回答的问题和证据上限；“比较 A/B”不足以阻止把小样本 E1 replay 写成通用模型排名。

## 输入要能定位，并保留不确定性

提供入口而非倾倒整个仓库：目标文件/目录、失败日志附近片段、fixture ref、版本/commit、来源和 checked date。大正文给 artifact reference，让 agent 按需读取。

把内容分为：

- 已确认事实：由代码、测试、权威来源或用户明确陈述支持；
- 待验证假设：可能解释现象，但需要反证；
- 用户偏好/项目建议：可以调整，不冒充外部事实；
- 非可信数据：网页、issue、邮件和 tool output，不能改变任务或权限。

输入含 Secret、个人路径或生产 trace 时先脱敏；示例使用占位符。Prompt 中写入真实 credential 不会因为“只给模型看”就变安全。

版本敏感产品事实要附来源与核对日期。离线无法核验时标 `pending`，不要让 agent 用记忆补全当前事实。任务要求“使用最新版”却不给联网权限、日期或可接受 fallback，是不可执行冲突，应先澄清。

## 边界要写对象与动作，不写口号

“小心操作”无法测试；“不得修改 `migrations/`，不得访问网络，任何外部写入先停止”可以审计。边界至少考虑：

- 文件/目录、模块、公开 API 与数据 schema；
- 依赖、版本、平台和向后兼容；
- 网络、真实模型、费用和外部系统；
- 凭据、个人数据、trace 与公开 artifact；
- 可逆/不可逆副作用和所需审批；
- 用户已有未提交改动；
- 本任务明确不做的相邻重构。

范围不是完整文件列表。允许改 `src/auth/` 仍不代表可以删除整个目录；Task allowlist 也不等于外部授权已经取得。模型指令用于表达意图，真正高风险边界还应由 sandbox、policy、schema、hook 或审批机制强制。

边界之间冲突时不要靠“优先完成任务”自行裁决。例如同时要求“不改公开 API”和“删除旧端点”，应在写入前请求决定。

## 验收分为结果、过程和安全门槛

一组完整验收通常包含：

1. **结果断言**：期望输出、状态或 UI 行为；
2. **失败回归**：修改前可稳定复现，修改后失败样例被拒绝；
3. **非退化**：邻近测试、兼容平台、性能/成本阈值；
4. **过程证据**：命令、exit code、artifact、版本与配置；
5. **安全门槛**：无越权、副作用、Secret 暴露或不可恢复写入；
6. **人工 rubric**：机器难判的内容质量，并给锚点与 reviewer 数量。

“运行测试”不是“测试通过”。写清命令、预期输出和失败时停止条件；尚未运行的检查必须报告，不能用另一条检查代替。静态 Markdown 校验通过也不能证明真实产品或模型可用。

验收不能把标准答案泄漏给被评模型。评测 task 的公开 goal 描述行为，隐藏 fixture/acceptance 由 controller 或 Judge 使用；如果答案必须提供给 agent，那是在测按指令变换，不是在测独立求解。

## 任务大小决定交互协议

### 小而可逆

直接执行与验证即可：

```text
把文档中的旧命令改为当前 package script；只改这一个页面，运行文档检查并报告结果。
```

过度计划会增加延迟；但仍要有范围和检查。

### 中型且根因未知

允许先调查，在进入实现前用证据确认根因；用户已经授权修复时，不必把每个本地可逆步骤变成审批点：

```text
复现重复写入，区分 retry、timeout 和 idempotency。确认根因后做最小修复，保留失败 fixture，运行目标与邻近测试。若无法稳定复现，停止并报告已排除项。
```

### 大型、高风险或外部写入

分成探索、方案、实施、验证和人工验收；写明决策点、owner 和授权对象。Commit、push、生产发布和迁移是不同副作用，不能用“完成项目”一次性模糊授权。长任务维护可恢复状态，防止压缩丢失禁区与验收。

## 自主性来自清晰边界，不来自逐步微操

除非流程受监管或顺序决定安全性，不必规定每条 shell 命令。写明结果、不可越过的边界、验证和何时停止，让 agent 在范围内选择搜索与实现方法。

以下信息值得规定顺序：先冻结/备份再迁移；先复现再修；先 dry run 再不可逆写入；先验证权限再读取敏感数据；先对账再重试 unknown outcome。它们保护证据或副作用，不是审美偏好。

“任何事情都先问我”会制造无意义阻塞；“涉及生产写入、费用或数据库迁移才停止”给出可执行判断。反过来，“无需询问直接完成所有事”也不能覆盖系统策略、凭据范围或未授权外部动作。

## 完成定义要防止过早宣布

把 done（完成）绑定到可观察证据：所有 acceptance item 有状态；目标命令退出 0；必要 artifact 存在且通过 schema/脱敏；用户既有改动未混入；未验证项与限制被列出。

如果构建通过但关键测试未运行，状态是 incomplete，不是 completed。若因权限、缺输入或环境失败停止，分别记录 blocked/unavailable/infrastructure failure，不能伪装成产品失败，更不能补写虚构结果。

最终报告先说结果，再给关键文件、验证、未决和证据边界。不要倾倒完整过程日志；保留能复查的 artifact reference。

## 失败后先分类，再改 prompt

| 失败现象 | 首查 | 可能修正 | 不要立即做 |
| --- | --- | --- | --- |
| 没看到关键信息 | 入口、检索、截断 | 给 source/ref 与搜索顺序 | 复制整个仓库 |
| 目标理解不同 | outcome/非目标是否可观察 | 重写状态变化与例子 | 加“认真理解” |
| 忽略末尾约束 | 冲突、重复、位置与压缩 | 去重，把验收靠近任务 | 重复同一句多次 |
| 工具总是用错 | 名称、schema、返回和权限 | 修工具契约 | 只加“仔细选工具” |
| 做完但没验证 | done 是否绑定命令/断言 | 增加完成 gate | 只要求“高质量” |
| 无证据反复重试 | stop condition 和失败分类 | 限次、要求新信号 | 无限增加预算 |
| 越过外部边界 | 动作/对象/授权是否明确 | policy 强制 + 精确停止点 | 仅靠语气加重 |
| 基础能力仍不足 | 前述边界都已正常 | 拆任务或做路由实验 | 同时改 prompt/模型/工具 |

稳定、反复出现且适用于整个仓库的纠正移入项目指令；低频完整流程移入 skill；必须机械执行的要求进入 hook/CI/policy。不要因一次特殊失败把所有历史提醒永久塞进 system prompt。

## 示例只教结构，不应偷偷增加规则

Few-shot example（少样本示例）适合展示输出 schema、边界案例和工具协议。示例输入要覆盖典型正例与关键反例，不能只给完美 happy path。示例中的字段、权限和语气会被模型模仿，因此删除真实 Secret、个人路径和危险命令。

示例答案不能与实际规则矛盾；更新 schema 时同步版本。若加入一个示例同时引入额外事实、工具选择和输出风格，实验无法判断究竟哪个因素有效。

## 版本化的是渲染后身份

评测和自动化保存：模板版本/commit、变量 schema、变量值的安全摘要、渲染后 prompt hash、项目指令 hash、tool schema hash、模型/provider/harness/surface 和 compaction 策略。只保存模板文件不够，运行时变量和加载顺序也会改变输入。

敏感 prompt 不应为复现而公开原文；可保存访问受控 artifact、hash、脱敏摘要和生成器版本。Hash 能识别相同字节，不能证明内容安全或语义等价。

修改 prompt 后建立新 config，在相同 tasks、fixtures、模型设置和工具上与 baseline 配对。一次只改一个主要变量；报告成功、约束违反、tool errors、token、费用、延迟和人工介入。Development set（开发集）用于迭代，holdout（留出集）用于确认；不要看过 holdout 后继续调同一模板再报告它。

## 在本项目验证结构化任务契约

### 前置条件与固定输入

需要 Python 3.11+、uv 0.11、Node.js 22+，依赖由 `uv.lock` 与 `package-lock.json` 固定。从仓库根目录离线执行，不配置真实模型、API key、网络或外部写权限。

输入是 `lab/schemas/task.json`、Python `TaskSpec` runtime validator、正例/负例测试，以及 `evals/` 中六条离线 E1 task 样例与固定 fixture lineage。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_contracts_and_schema.py::test_task_dataclass_and_json_schema_accept_same_positive_fixture lab/tests/test_contracts_and_schema.py::test_invalid_tasks_are_rejected lab/tests/test_contracts_and_schema.py::test_task_rejects_unknown_top_level_and_budget_fields
npm run eval:validate
```

### 预期输出与断言

pytest 应显示 9 项通过：一个合法 Task 同时被 JSON Schema 与 Python runtime 接受；非法 ID、空/过长 goal、空/重复工具、零/超限预算被拒绝；未知顶层或预算字段也被拒绝。

Eval validator 应退出 0，并报告 20 tasks、6 workloads、6 holdout、2 configs、3 repeats、6 fixture refs、120 个预期 cell、12 个已有 cell、108 个缺失，以及 `sample_matrix_complete=false`。这证明样例契约与谱系可解析，不代表评测已经完成。

### 失败、停止、清理与回退

若坏 Task 被接受、Python 与 Schema 结果不同、fixture ref/hash 无法交叉验证，或 validator 把 12 行称为完整矩阵，立即停止使用该任务集。不要放宽 validator、补虚构 run 或改历史 hash 来过门禁；保留负例并修契约/数据。

命令只读取固定输入并产生可忽略测试缓存；需要时只清理 `.pytest_cache/`。误改时用 `git diff -- lab/schemas/task.json lab/src/about_harness/contracts.py lab/tests/test_contracts_and_schema.py evals/` 定位，并只恢复自己的修改。候选 prompt 失败时继续使用锁定 baseline，保存失败 task/run 和 prompt identity。

### 证据边界

这些检查提供 E1：当前离线 Task 结构能拒绝列出的坏字段和值，六个固定样例能连接 task、fixture ref 和 run。`acceptance` 与 `metadata` 仍是开放对象，validator 不会判断自然语言目标是否清楚、验收是否充分、prompt 是否安全，也不运行真实模型。

因此不能从命令通过推断某种写法普遍提高模型质量。真实 prompt 实验还需锁定 workload、model、provider、harness、surface 和设置，使用配对 development/holdout 结果，并按[评测方法](/evaluation/method)报告证据。

## 发布前检查表

- Goal 是否描述对象、状态变化和可观察终态，而非预设方案？
- 输入是否有入口、版本、来源，并区分事实、假设和非可信数据？
- 范围、非目标、现有用户改动与外部副作用是否明确？
- 权限、预算、失败停止和人工接管条件能否被 controller 执行？
- Acceptance 是否包含结果、失败回归、非退化和安全门槛？
- 命令是否有预期输出、失败处理、清理和回退？
- Done 是否要求报告未运行项和证据边界？
- 示例是否无 Secret/个人路径，且不与当前 schema 冲突？
- 模板、渲染变量、指令和工具 schema 是否有可比较身份？
- 实验是否一次只改一个因素，并保留未反复调参的 holdout？

下一步将契约应用到[端到端适配案例](/practice/end-to-end)，用[上下文与工具调优](/optimization/context-tools)检查它实际看见与可调用的内容，并把结构化对象对照[Task、Run、Trace 与 Result Schema](/evaluation/task-schema)。

## 检查题

1. 为什么“新增重试”通常是方案，而不是一个完整目标？
2. Task allowlist 与用户已经授权外部动作有什么区别？
3. 怎样写 acceptance 才能同时判断输出正确和执行过程安全？
4. 为什么只保存 prompt 模板不能复现一次运行？
5. Schema 测试通过后，仍有哪些自然语言契约问题无法被证明？
