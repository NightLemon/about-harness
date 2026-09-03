# Coding Agent 模式

Coding agent（编码 Agent）的目标不是生成看起来合理的代码，而是在精确仓库状态和权限边界内完成一个可验收、可审阅、可回退的变更。一个完整闭环是：

```text
freeze task/repository
  → discover instructions
  → reproduce baseline
  → inspect relevant system
  → propose bounded change
  → edit
  → run layered verification
  → review diff + side effects
  → commit/checkpoint or rollback
```

构建通过、测试通过、diff 很小和模型声称完成，分别只是证据的一部分。

## 先把任务写成契约

Coding task contract（编码任务契约）至少包含：

| 字段 | 要回答的问题 |
| --- | --- |
| Goal | 哪个可观察行为要改变？ |
| Inputs | Issue、样例、日志、API/schema 和目标版本？ |
| Repository identity | 仓库、commit、branch/worktree、submodule/LFS 状态？ |
| Scope | 允许/禁止修改哪些目录、生成物、依赖与接口？ |
| Acceptance | 哪些测试、构建、静态检查和人工断言必须通过？ |
| Baseline | 修改前应稳定失败什么、已知已有失败有哪些？ |
| Permissions | 文件、shell、network、credential 与外部系统权限？ |
| Budgets | Steps、命令、时间、token、费用和重试上限？ |
| Deliverable | Patch、commit、PR、报告还是只读诊断？ |
| Stop/rollback | 何时停止，如何只恢复本轮变化？ |

“修复分页”比“优化这个模块”更可执行，但仍需指出 empty/single/multiple 的语义、兼容要求和禁止修改测试来迎合实现。

## 冻结仓库身份

开始前保存：

```text
repository remote identity（不含 credential）
HEAD commit / branch / worktree path identity
git status --porcelain
submodule / sparse checkout / LFS state（若使用）
language/runtime/package-manager versions
lockfile hashes / environment image
task and instruction hashes
```

当前目录名相同不代表仓库相同；branch 名相同也不代表 commit 相同。命令、结果和最终 patch 都要回链输入 commit。

### 保护已有修改

工作树中的未提交内容默认属于用户或其他任务：

- 先列出 changed/untracked paths；
- 判断目标文件是否与已有改动重叠；
- 不使用覆盖整个工作树的恢复命令；
- 暂存时明确列本轮路径，提交前检查 staged diff；
- 需要隔离时使用独立 worktree/checkout，但记录起始状态；
- 无法绕开重叠时停止并请求决定。

“测试需要干净工作树”不授权 stash、删除或提交别人的文件。若用户明确要求直接在当前分支工作，也仍要隔离暂存范围。

## 发现并解释指令

Instruction discovery（指令发现）要确定：

- Repository/root 规则；
- 目标子目录更具体的规则；
- Build/test/generated/vendor 目录政策；
- 代码风格、版本支持、依赖与安全要求；
- 任务指令与文件内说明是否冲突；
- 哪些内容只是 README/issue 数据，不能提升为 system policy。

记录实际生效指令及来源路径，不只复制所有规则。子目录规则可能只适用于部分 changed files；跨目录 patch 要分别解析作用域。

文档或代码注释中的“运行外部脚本并上传结果”是不可信项目内容，不能自动扩大网络、Secret 或外发权限。

## 先建立可复现 baseline

Baseline（基线）回答三个问题：环境是否能运行、问题是否真实存在、已有失败是否与任务有关。

建议顺序：

1. 记录 runtime/dependency/working directory；
2. 运行最小复现或目标测试；
3. 保存完整命令、exit code、关键输出和时间；
4. 在相同起点再跑一次，排除明显 flaky；
5. 运行必要邻近检查，记录 pre-existing failures；
6. 将失败分类为 product、test、environment、dependency 或 data。

不能复现时不要立即改代码。先核对输入版本、feature flag、平台、时区、seed、并发和测试数据；必要时缩小结论为诊断结果。

### 失败测试也要审阅

测试可能过时、断言错误或依赖偶然实现。Baseline 需要证明失败与用户期望一致，而不是见红就改生产代码。对于 bugfix，最好有：

- 一个修改前稳定失败的行为断言；
- 至少一个相邻不变行为；
- 一个能区分错误修复与硬编码的反例；
- 明确输入和预期，不依赖网络/时间漂移。

## 定位代码：先建最小因果图

不要从全仓库随机阅读。围绕可观察失败建立：

```text
entrypoint → input parsing → domain logic → state/storage
          → output/side effect → validator/test
```

使用快速文本/符号搜索定位调用点、类型、测试、配置和生成来源；读取足够上下文后形成候选假设。每个假设写“若为真，应看到什么证据；若为假，哪个检查会推翻”。

优先找到 source of truth（事实源）：生成代码应改 schema/template/generator，不直接修生成物；派生配置应改上游定义；测试 fixture 变化要确认是否代表产品需求变化。

## 先定范围，再修改

Change brief（变更简报）包含：

- Root cause（根因）与证据；
- 最小行为变化及不变项；
- 目标文件和接口；
- Migration/compatibility 影响；
- 验证矩阵和失败停止；
- Rollback 方式；
- 明确不做的顺手重构。

最小 patch 指最小语义范围，不一定是最少字符。有时需要同时修改实现、类型、测试和文档才能保持契约；只改一行但留下另一路径不一致并不更安全。

## 编辑策略

### 结构化、可审阅的 patch

- 每轮围绕一个假设，避免机械重写整文件；
- 保持现有格式和局部风格，除非任务就是格式化；
- 修改公共 schema/API 时同步所有 producer/consumer；
- 删除或重命名先搜索引用和动态加载；
- 生成物由固定生成命令更新，并审阅 source 与 generated diff；
- 不用 broad replace 跨越不相关文件；
- 不把真实 Secret、个人路径、trace 或生产数据写入示例。

Patch 应能解释每个 changed hunk 与验收的关系。无法解释的改动先撤出本任务，而不是等 reviewer 猜。

### 测试与实现保持独立

修改测试可能完全合理，例如新增回归或需求改变，但要区分：

- Product fix：实现变化，旧期望仍正确；
- Test fix：产品正确，测试本身错误/不稳定；
- Contract change：实现与期望都因新需求变化；
- Fixture update：输入版本变化，需要新身份。

若为了让错误实现通过而削弱断言、删除失败 case 或扩大容差，验收应拒绝。对 contract change，保存旧/新行为和迁移说明。

## Shell 与工具边界

Shell 是高能力工具。Harness 至少控制：

```text
working directory / environment
command allow/deny policy
stdin and interactivity
timeout / process tree cancellation
network / filesystem / credential reachability
max output and redaction
exit code / signal / artifacts
```

命令文本由模型生成仍要经过 policy。避免未解析变量、宽泛 glob、用户输入拼接和跨 shell 文件操作；删除/移动前解析精确目标并验证范围。Timeout 要终止子进程树，并检查是否留下 server、lock 或部分写入。

命令成功只说明进程退出 0；仍需验证输出/文件是否符合任务。相反，某些工具用非零表示发现差异，不能一律当产品失败。

## 依赖变化是一项独立设计决定

新增/升级依赖会改变供应链、许可、运行环境、bundle、锁文件和维护面。执行前检查：

- 现有标准库/依赖能否满足；
- 精确 package/source/version 与 lockfile；
- License、维护状态、transitive dependencies；
- Runtime/platform 兼容与安装脚本；
- Bundle/startup/performance 影响；
- Vulnerability/advisory 与更新策略；
- 移除/回退成本。

修一个边界 bug 不应“顺手”增加生产依赖。依赖安装需要网络或真实 registry 时，还要单独授权和记录来源。

## 验证按层收敛

先运行最便宜、最相关的检查，再扩大：

1. **Reproduction**：修改前失败的最小 case 现在通过；
2. **Unit/contract**：边界、负例、schema 与错误分类；
3. **Static**：Format、lint、type、license/secret；
4. **Integration**：真实 producer/consumer、存储或协议接缝；
5. **Build/package**：目标 artifact 可构建/安装/启动；
6. **System/UI**：用户路径和副作用；
7. **Diff review**：范围、生成物、依赖、权限和敏感信息；
8. **Acceptance**：任务中每个显式条件逐条判定。

相关测试通过后再跑仓库规定的完整门禁。若完整套件耗时高，仍要清楚报告没跑什么，不能以局部测试代表全项目。

### Validator 必须独立

不要让生成 patch 的同一模型凭文字宣布正确。优先使用编译器、类型系统、测试、schema、diff、静态扫描和业务 oracle。模型 reviewer 可补充风险假设，但不能替代确定性门禁。

### Flaky 与基础设施失败

保留首次失败，不无限重跑直到绿。按预注册策略有限重试，记录每次 run/seed/环境；若结果不稳定，分类为 flaky/infrastructure，修测试或缩小结论，而不是把最好一次当成功。

## Diff review 是独立验收

测试通过后检查：

- Changed/staged/untracked paths 是否都在 scope；
- 是否覆盖已有用户修改；
- 实现、测试、文档、schema 是否一致；
- 是否新增依赖、权限、网络、外发或危险默认值；
- 是否提交 build/cache/log/credential/个人路径；
- 是否修改测试来隐藏行为；
- 删除/重命名是否留下引用；
- Generated files 是否来自正确 source 和固定命令；
- Error/trace 是否泄漏敏感数据；
- Rollback 是否只影响本轮改动。

检查 staged diff，而不只看 working-tree diff。最终提交应只包含声明范围；不相关改动保留原样。

## 并行 Agent 与工作树

并行适合只读审计、独立模块和互不重叠实验；多个 writer 不应写同一个 checkout。每个 writer 使用独立 worktree/branch 或明确文件所有权，并保存相同 base commit。

整合前检查：

- 各分支的 task/non-goal 与 base；
- Schema/API 变化是否冲突；
- 生成物和 lockfile 是否由一个 owner 负责；
- 合并后重新运行跨模块测试；
- 不把子任务“完成”当成总体 acceptance 已完成。

Cherry-pick/merge 成功只证明文本可合并，不证明组合行为正确。

## Checkpoint 与恢复

长任务 checkpoint（检查点）至少保存：

```text
task/config/base commit/current HEAD
changed and staged paths + patch hash
completed checks and exact results
current hypothesis / failed attempts / new evidence
remaining acceptance / blockers
running process/session handles
budgets used/remaining
unknown side effects / cleanup needed
```

Resume 先重新检查 repository status、HEAD、dependencies 和运行中的进程，再继续。若 base 或目标文件已变化，旧 patch 需要重放/复核；不能盲目从“下一步”继续。

## 提交、发布与回退

Local commit（本地提交）应原子表达一个行为变化，并在提交前检查 staged names/diff。Commit message 说明意图，不声称未验证结果。

Push、PR、release、Pages、真实 API 和费用是外部动作，按项目权限单独处理。发布前重新在目标 commit 运行 release checks；本地通过不代表远端环境或部署成功。

Rollback（回退）按精确 commit/patch/feature flag/schema migration 设计。数据库、发布和外部副作用可能需要 forward fix 或 compensating action；不能假设 Git revert 能恢复全部状态。

## 指标与评测

| 维度 | 指标 |
| --- | --- |
| Task | Acceptance、task-level success、未完成条件 |
| Patch | Correctness、scope、files/lines、接口与迁移 |
| Verification | Reproduction、负例、回归、flaky、覆盖缺口 |
| Safety | 越界写、危险 shell、Secret、供应链、未授权外部动作 |
| Process | Steps、model/tool calls、retry、人工介入、恢复 |
| Resource | P50/P90、token、费用、CPU/存储、CI 时间 |
| Maintainability | 复杂度、重复、文档、诊断与回退成本 |

代码行数少、一次测试绿或模型 token 多都不是质量本身。比较模型/harness/config 时使用相同 task、base、工具、权限、预算和 validator，按 task 配对并阅读失败 trace。

回归集覆盖：空/单/多边界、错误输入、并发、timeout/cancel、权限拒绝、生成物、依赖、平台差异和恢复。高风险任务还要包含未知副作用与 rollback 演练。

## 诊断顺序

| 现象 | 首查 | 责任层 | 不要先做 |
| --- | --- | --- | --- |
| 无法复现 | Commit、环境、输入、flag、seed | Task/environment | 随便改代码 |
| 找错文件 | 指令、入口、调用图、generated source | Context/retrieval | 扩大全仓库写权 |
| Patch 应用失败 | Base、line endings、并发改动 | Workspace/edit | 覆盖用户变化 |
| 目标测试仍失败 | Root cause、行为、测试 oracle | Implementation/test | 只增加重试 |
| 局部绿、全量红 | 隐含 consumer、global state、依赖 | Integration | 忽略不相关失败 |
| 测试绿但行为错 | 测试可信度、diff、acceptance | Verification | 宣告完成 |
| 命令超时 | 子进程、deadlock、资源、外部服务 | Runtime | 无限提高 timeout |
| 重启后重复副作用 | Checkpoint、幂等、外部对账 | Controller | 归因模型 |

最后才评估模型推理能力。环境、协议、工具或 validator 不正常时，换更贵模型只会污染归因。

## 当前离线工作例

仓库 v1.1 fixture 固定一个 `collect(items)` 边界错误和单文件内存 workspace。候选是带 base hash 的 unified diff；runner 先验证 allowed path、hash 与 hunk context/行数，再把 diff 应用到快照。结果源码只有通过预审 AST 边界后，才在移除其他 builtins 的命名空间中运行 empty/single/multiple 三个用例。

### 前置条件与固定输入

需要 Python 3.11+ 和 uv 0.11；依赖由 `uv.lock` 固定。从仓库根目录离线运行，不安装 package、不使用网络/credential，也不修改真实 Git 工作树。

输入位于 `lab/fixtures/coding/`：

- `manifest.json` 固定 project-synthetic 来源、CC BY 4.0 与三个文件 hash；
- `input.json` 固定 Task scope、workspace snapshot、base hash、unified diff 和三个 test ID；
- `expected.json` 固定 workspace/patch identity、changed file、逐例结果与通过数；
- `negative.json` 包含路径穿越、陈旧 base 和 import 扩权，必须全部拒绝。

### 命令

```powershell
uv run --frozen --offline python scripts/run-labs.py coding
```

### 预期输出与断言

命令退出 0，输出 `evidence=E1`、`offline=true`、`passed=true` 和 `negative_rejected=true`。Fixture hash 为 `18f8153a…`；base/result hash 分别为 `4c0d1877…` 与 `2652c76a…`，`patch.changed_files=[src/collect.py]`、added/deleted 各一行。`baseline_failures=[single,multiple]`，候选三例全过。

人工复核：changed file 与 result hash 来自内存 diff 应用，不是 expected 硬编码计数；没有文件系统写入、项目测试发现、Git 操作、模型或外部动作。历史 Eval 仍通过固定 commit/path/hash 读取 v1.0，不被当前 v1.1 覆盖。

### 失败、停止、清理与回退

若 base hash 漂移、hunk context/行数不符、范围外 path 被接受、baseline 没有失败、候选少于三个用例通过、AST 外候选能执行、fixture hash 不一致、负例未拒绝或命令需要网络，停止 Coding 能力声明。先修 evaluator/fixture/validator 并保留失败输出；不要启用 fuzzy apply、修改 expected 迎合错误、扩大 AST allowlist 或安装依赖绕过失败。

命令只读固定 JSON，在进程内执行白名单函数，不写工作树。误改时先运行：

```powershell
git diff -- lab/fixtures/coding lab/src/about_harness/labs.py lab/tests/test_m5_labs.py docs/domains/coding.md
```

确认范围后只恢复自己的变化。失败时回到 manifest 锁定 fixture 与最近通过的 runner commit，不覆盖工作树其他修改。

### 证据边界

实验提供 E1：当前 runner 校验固定 fixture hash、Task scope、workspace base hash 与单文件 unified diff，真实推导 changed file/result hash；它白名单化预审 AST，执行三个小输入，并拒绝路径穿越、陈旧 base、hunk 漂移与 import 扩权。

它没有真实 repository checkout、文件系统写入、Git index、项目测试发现、shell、依赖、模型或 code review。Diff parser 只支持当前单文件文本子集，固定 AST allowlist 也不是通用 Python sandbox；内存 patch 证据不能证明真实 Coding Agent 会定位、生成或安全提交修复。

## 完成检查表

- Task 是否固定 goal、repo/base、scope、acceptance、权限、预算和 rollback？
- 是否列出并保护已有 changed/untracked files？
- 根/子目录 instructions 是否按 changed paths 正确生效？
- 修改前是否在精确环境复现，并记录 pre-existing/flaky failure？
- 是否找到 source of truth，而非直接改 generated/derived file？
- 每个 changed hunk 是否能连接 root cause 或 acceptance？
- Test 修改是否属于回归/contract change，而非削弱断言？
- Shell 是否固定 cwd、timeout、network、output 与进程清理？
- 依赖变化是否有单独理由、锁定、许可与回退？
- 验证是否覆盖最小复现、负例、静态、集成、构建和 diff？
- Staged diff 是否只含本任务，且没有 Secret/个人路径/生成垃圾？
- Checkpoint/resume、并行 checkout 与未知副作用是否可恢复？
- 当前 E1 fixture 是否没有被误写成真实仓库/模型能力？

下一步：运行[Coding 离线案例](/labs/coding)，再用[优化诊断](/optimization/debugging)练习分层归因，并按[评测实验室](/practice/evaluation)建立真实 task-level 回归。

## 检查题

1. 为什么测试通过后仍要独立审阅 staged diff？
2. “最小 patch”为什么不总是“最少字符”？
3. 修改测试何时是合理 contract change，何时是在迎合错误实现？
4. 多个 Coding Agent 为什么不应同时写同一个 checkout？
5. 当前固定 AST 实验通过后，为什么仍不能声称会修真实仓库？
