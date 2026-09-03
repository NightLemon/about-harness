# Coding：从失败断言到受约束修复

## 学习目标

这个案例练习 Coding Agent（编码智能体）最小闭环中的四件事：先复现缺陷，再提出候选修改，随后执行可判定的断言，最后拒绝超出约定边界的输入。你将看到一个 `collect` 函数为什么漏掉列表最后一个元素，以及离线 runner（运行器）如何区分“测试名称存在”和“测试确实通过”。

它是 E1（固定输入、可重复执行）证据：能够证明本仓库中的确定性 evaluator（评估器）按约定工作，不能证明真实模型会发现同一缺陷、生成同一补丁或安全修改真实仓库。共享环境、Windows 与 macOS/Linux 的入口见[实验环境](/labs/setup)。

完成本页后，你应该能够：

- 从输入、执行、断言和负例四层解释一次 Coding 结果；
- 说清 `patch.applied`、`passed` 与“真实工作树已修改”之间的区别；
- 沿 Task、fixture reference（固定输入引用）和 Run 追踪同一份输入；
- 在 hash、契约、执行或验收失败时定位责任层，而不是直接归因于模型；
- 设计一条从固定 E1 案例走向 E2 真实探针和 E3 正式比较的路径。

## 先看证据结论

当前案例的结论可以压缩为三句话：

1. 固定的错误实现会在 `single`、`multiple` 两例失败，固定候选会通过全部三例。
2. loader（加载器）会拒绝与 manifest hash 不一致的 fixture；evaluator 会验证 allowed path、base hash、unified diff hunk 和固定 AST 执行边界。
3. 补丁确实应用到了 fixture 内的内存快照，但没有写真实 Git 工作树；这些结果也不代表模型发现或生成了修复。

| 当前结果可以证明 | 当前结果不能证明 | 真实任务还要补什么 |
| --- | --- | --- |
| 三个具体输入上的返回值符合预期 | 候选对任意列表都正确 | 更广测试、性质测试与代码审查 |
| 固定错误与固定候选都经过真实 Python 执行 | 模型发现、理解或生成了候选 | 锁定模型、提示词、工具事件和原始响应 |
| manifest 能发现未同步的 fixture 改写 | fixture 没有设计偏差或遗漏 | 来源、任务代表性、独立复核和版本策略 |
| 路径穿越、陈旧 base 与 import 扩权被拒绝 | 通用 patch parser 或生产代码沙箱安全 | 隔离 checkout、OS sandbox 与依赖策略 |
| `changed_files`、base/result hash 从内存应用结果推导 | 真实工作树、index 或 commit 已变化 | Git diff、status、测试报告与变更范围审计 |

这里最重要的阅读习惯是：不要只看一个 `passed=true`。输入身份、实际执行、负例、验收逻辑和证据边界必须一起成立。

## 前置条件、版本与输入

- Python 3.11+；本仓库与当前教程固定使用 `uv 0.11.16` 和 `uv.lock`。
- 从仓库根目录运行，保持离线，不安装 package，不需要 API key。
- 输入位于 `lab/fixtures/coding/`，当前 v1.1 bundle hash 为 `18f8153ad36cbbc99ff66a30b311f0ede9316ac3cde2eedae25738df87da71af`。
- 开始前运行 `git status --short`；若已有自己的改动，记录路径，不让后续练习覆盖它们。

这个实验不读取任意项目源码，不调用模型、Provider、网络、shell 或 Git 写操作。所谓“workspace”是 fixture 中带 snapshot ID 的单文件映射；unified diff 只应用到该内存快照，不会触碰当前 checkout。

历史 Eval task `coding-01` 继续通过 commit `6aada53…`、固定 path 与旧 hash `7f4cae…` 引用 v1.0。当前 Lab v1.1 是新输入身份；若要形成对应 Eval 证据，必须新增 Task/ref/Run，不能改写历史记录。

## 四个 fixture 文件分别负责什么

fixture（固定实验输入）不是一个孤立 JSON，而是四个职责不同的文件：

| 文件 | 当前内容 | 在实验中的职责 | 不应被误读为 |
| --- | --- | --- | --- |
| `input.json` | Task scope、workspace snapshot、base hash、unified diff 与三个 test ID | 提供成功路径的完整固定输入 | 模型请求或真实 Git 仓库 |
| `expected.json` | Workspace/patch hash、changed file、逐例结果与通过数 | 对完整业务 output 做相等验收 | 通用 Result schema 或独立 Judge |
| `negative.json` | 路径穿越、陈旧 base、import 扩权三组 override | 验证 patch 边界必须失败关闭 | 真实 OS sandbox 或依赖审计 |
| `manifest.json` | 版本、案例 ID、来源、许可、日期与三个文件 hash | 固定文件身份和基本来源元数据 | 内容质量或真实代表性的证明 |

loader 先把 `input.json`、`expected.json`、`negative.json` 分别解析为 JSON，再按 key 排序、移除非语义空白，计算 canonical SHA-256（规范化 SHA-256）。所以只调整缩进不会改变文件 hash，改变字段值才会改变。

三个实际 hash 必须逐一等于 `manifest.json` 中的记录。随后 loader 按固定顺序构造：

```text
input.json<TAB>input_hash
expected.json<TAB>expected_hash
negative.json<TAB>negative_hash
```

它再对三行以换行连接后的字节计算 bundle hash。这样，单文件身份和整组输入身份都可复核；但 hash 只证明“字节所表达的 JSON 没变”，不证明测试设计充分。

## 实际执行链

从 CLI 到最终 JSON 一共经过六步：

```text
run-labs.py coding
  -> load_fixture
  -> 校验三个文件 hash，并计算 bundle hash
  -> evaluate_coding(input)
       -> 校验 Task/workspace/candidate schema
       -> 核对 base hash 与 allowed path
       -> 解析并应用单文件 unified diff
       -> 校验 hunk 上下文、计数与 changed file
       -> 编译固定 AST 并逐例执行
  -> _negative_rejected(negative)
  -> output 与 expected 逐字段比较
  -> 组装 E1 Result
```

各步骤的失败含义不同：

1. `load_fixture` 失败，说明输入身份或 JSON 结构有问题，业务源码不会执行。
2. `evaluate_coding` 失败，说明成功路径输入不满足运行时契约，或源码不在固定 AST 范围内。
3. `_negative_rejected` 返回 `false`，说明负例没有被拒绝，最终 `passed` 必须为 `false`。
4. output 与 expected 不一致不会伪造成功，最终 `passed` 为 `false`。
5. 只有上述成功路径和负例同时通过，外层 Result 才会出现 `passed=true`。

`expected.json` 并不驱动候选执行，也不告诉 evaluator 应该返回什么；它在执行结束后对完整业务 output 做相等比较。Base/result hash 都由输入和应用结果重新计算，而不是从 expected 读取。这仍属于同一仓库作者设计的固定案例，不是独立 Judge。

## 先推导基线，再看候选修改

基线循环条件是：

```python
while index < len(items) - 1:
```

候选只把上界改为：

```python
while index < len(items):
```

运行前就能推导完整矩阵：

| 测试 | 输入 | 预期 | 基线实际 | 候选实际 | 基线是否暴露缺陷 |
| --- | --- | --- | --- | --- | --- |
| `empty` | `[]` | `[]` | `[]` | `[]` | 否，空输入偶然通过 |
| `single` | `[1]` | `[1]` | `[]` | `[1]` | 是 |
| `multiple` | `[1, 2, 3]` | `[1, 2, 3]` | `[1, 2]` | `[1, 2, 3]` | 是 |

所以预期 `baseline_failures` 恰好为 `single` 和 `multiple`。空列表通过不能证明循环边界正确，它只说明这个输入没有执行循环体。真实回归集既需要成功样例，也需要能让错误实现确实失败的 discriminating test（区分性测试）。

## 当前 runtime contract

runtime contract（运行时契约）位于 `evaluate_coding` 与 `_compile_fixture_collect`，它比“能解析 JSON”更严格：

| 输入或阶段 | 当前约束 | 拒绝示例 |
| --- | --- | --- |
| `task` | 精确字段；scope 只能是 `src/collect.py`；最多修改一个文件；tests 完整且不重复 | 路径穿越、额外文件、漏测 `single` |
| `workspace` | 精确字段；snapshot ID 非空；files 必须与 allowed paths 一致 | 隐藏额外源码、缺目标文件 |
| `candidate_patch` | 格式固定 `unified-diff`；base hash 完整匹配；diff 使用 `a/`、`b/` 同路径 | 陈旧 hash、rename、多文件或 CRLF diff |
| Diff hunk | 起始位置、old/new 行数、context/removal 必须逐字匹配快照 | 漂移 context、伪造行数、空替换 |
| 编译 | 文件名固定为 `<coding-fixture>`，只执行通过 AST 检查的源码 | 语法错误或 AST 外源码 |
| namespace | `__builtins__` 只显式暴露 `len` | 不能据此开放任意不可信 Python |
| 计数 | 对每个候选返回值执行布尔比较，再统计 `True` | 仅列出三个测试名称并不会得 3 分 |

Diff parser 只实现当前案例需要的单文件、不可 rename、至少一个 hunk 的严格子集。它按源码行游标应用 context/removal/addition，逐个 hunk核对声明行数，并从结果内容计算 SHA-256。它不接受 `diff --git` 前导、binary diff、文件新增/删除、rename 或 `\ No newline` 标记；这是窄契约，不是完整 Git patch 实现。

允许列表比较的是 `ast.dump(..., include_attributes=False)`，也就是精确语法结构，而不是源文件字节。当前预审了基线、正确修复和测试专用的 under-fix 三棵 AST；新增 import、改成列表推导式或行为等价的另一写法仍会被拒绝。这是“只执行预先审阅的结构”，不是通用静态分析。

基线和候选都必须通过相同编译边界。随后 evaluator 为每个测试复制输入列表，避免一个函数对列表的原地修改污染下一步比较。`tests_passed` 来自实际比较为 `True` 的数量，不来自 `tests` 数组长度。

`patch.applied=true` 表示以下条件已经成立：

```text
diff header path 在 Task scope 内
AND candidate base hash 等于 workspace 内容 hash
AND 所有 hunk context 与行数匹配
AND 应用后内容发生非空替换
```

这个字段与测试是否通过相互独立。测试专用 under-fix 也能成功应用，但只通过 `empty`；所以 `patch.applied=true` 不能替代 `test_results`，更不能表示真实工作树或 Git index 已修改。

## 执行边界为什么可控、又为什么很窄

AST（Abstract Syntax Tree，抽象语法树）allowlist（允许列表）只接受仓库内写死的三棵结构：原始缺陷、预期修复和用于证明测试真实执行的 under-fix。执行 namespace（命名空间）只暴露 `len`；任意 import、额外语句、替代实现或结构变化都会被拒绝。

这个边界适合演示确定性验收，却不是通用代码沙箱。它之所以可控，是因为可执行输入只有三棵预先审阅过的 AST；不要把“限制了 `__builtins__`”单独视为可安全运行不可信 Python 的方案。真实 Coding Agent 至少需要操作系统级隔离、资源上限、网络策略、文件范围、进程树控制、审计和清理。

固定允许列表还有另一面：一个完全正确但写法不同的实现也会失败。因此这里测到的是“是否遵守此教学契约”，不是代码质量、创造性或跨任务泛化。

## 运行与预期输出

在仓库根目录运行：

```powershell
uv run --frozen --offline python scripts/run-labs.py coding
```

预期退出码为 0，JSON 中的关键字段如下：

```json
{
  "fixture_hash": "18f8153ad36cbbc99ff66a30b311f0ede9316ac3cde2eedae25738df87da71af",
  "negative_rejected": true,
  "offline": true,
  "output": {
    "task_id": "collect-last-item",
    "workspace": {
      "snapshot_id": "coding-workspace-01",
      "base_hashes": {"src/collect.py": "4c0d1877..."}
    },
    "patch": {
      "format": "unified-diff",
      "applied": true,
      "changed_files": ["src/collect.py"],
      "added_lines": 1,
      "deleted_lines": 1,
      "result_hashes": {"src/collect.py": "2652c76a..."}
    },
    "baseline_failures": ["single", "multiple"],
    "test_results": {"empty": true, "multiple": true, "single": true},
    "tests_passed": 3
  },
  "passed": true,
  "evidence": "E1"
}
```

命令完成后至少人工断言：退出码为 0；hash 与本页及 manifest 计算结果一致；`baseline_failures` 不是空数组；三个 `test_results` 都是布尔 `true`；负例确实被拒绝；没有网络请求、凭据提示或工作树写入。

仓库同时保存脱敏的 `lab/results/public/m5-coding-v1-1-trace-sample.json`，把 fixture、workspace、内存 patch、baseline、候选断言和负例按顺序连接。它是当前确定性路径的公开样例，不是从模型或真实 Git session 捕获的原始 trace。

## 逐字段读懂 Result

| 字段 | 生成方式 | 能说明什么 | 不能说明什么 |
| --- | --- | --- | --- |
| `schema_version` | 外层固定为 `1.0` | 当前输出包络版本 | 所有内部字段都有独立 JSON Schema |
| `case_id` | fixture 目录名 `coding` | 当前案例身份 | Eval 的 `task_id` 或 run 身份 |
| `fixture_hash` | 三个规范化文件 hash 再组合 | 本次输入 bundle 身份 | 输入内容充分或无偏 |
| `evidence` | 当前 runner 固定为 `E1` | 这是离线固定实验 | 自动达到 E2/E3 |
| `offline` | 当前 runner 固定为 `true` | 设计上没有 live adapter | 操作系统已强制断网 |
| `passed` | expected 相等且负例拒绝 | 当前案例总验收通过 | 真实业务任务完成 |
| `safety_violation` | 当前外层固定为 `false` | 结果记录没有宣告真实违规 | 已执行通用安全检测 |
| `negative_rejected` | 三组 override 均触发预期 `FixtureError` | 路径/base/AST 相邻边界失败关闭 | 已覆盖所有 Git/OS 攻击面 |
| `workspace` | 从 snapshot ID 与实际源码重新计算 base hash | 当前内存起点身份 | 真实仓库 commit 或 checkout 状态 |
| `patch` | 解析 hunk、应用内容并计算 changed file、行数与 result hash | 固定 diff 确实改变固定快照 | Git index、文件系统或 commit 已改变 |
| `baseline_failures` | 实际执行错误实现所得 | 固定测试能暴露目标缺陷 | 已复现真实仓库缺陷 |
| `test_results` | 候选逐例与预期比较 | 三个固定断言各自结果 | 其他输入或隐藏测试表现 |
| `tests_passed` | `test_results` 中严格为 `True` 的数量 | 通过数不是名称计数 | 测试覆盖率或质量 |

尤其要把 `passed`、`patch.applied` 和 `tests_passed` 分开：第一项还要求完整 expected 对比和三个负例全部拒绝；第二项只表示内存 diff 合法应用；第三项来自实际断言。三者都不等于真实 Coding Agent 的任务状态。

## Result 如何关联到 Eval

Lab Result 不会由这条命令自动写入 `evals/runs.example.jsonl`。当前仓库通过三类独立记录建立 lineage（来源链）：

```text
Task coding-01
  metadata.fixture_ref = coding-m5
  metadata.fixture_hash = 7f4c...
        |
        v
Fixture reference coding-m5
  commit = 6aada534e8b331c1ed1936e1e7426766a5256622
  path = lab/fixtures/coding
  fixture_hash = 7f4c...
        |
        v
Run default-coding-01-r1 / engineering-coding-01-r1
  task_id = coding-01
  fixture_hash = 7f4c...
  model_id = offline-replay
  evidence = E1
```

不可变 commit 加路径让 validator 能从历史内容重新计算 fixture hash，再与 Task 和每条 Run 交叉核对。只复制一个 hash 而不固定 commit/path，无法证明它究竟对应哪份输入。

当前两条 Coding Run 都是 `development` split、`offline-replay`、E1，并使用合成的时长与零费用字段。它们对应上图锁定的历史 v1.0 fixture，不对应本页 v1.1 输出；它们是分析 schema 的样例，不是由本页 CLI 自动采集的真实运行，也不是两个模型配置的成绩。`study.example.json` 虽然设计了更多 Coding Task 和重复次数，尚未出现的矩阵单元不能按失败、成功或零值补齐。

如果你要把一次新实验纳入 Eval，应新建不可变 fixture 身份，保存真实配置与执行 artifact，再生成唯一的 `(task_id, config_id, repeat)` 记录；不要手工复制旧成功行并只换 `run_id`。

## 失败演练与停止条件

先运行以下定向测试，验证成功路径、hash 防篡改和 AST 边界：

```powershell
uv run --frozen --offline pytest -q `
  lab/tests/test_m5_labs.py::test_fixture_hash_tampering_is_rejected `
  lab/tests/test_m5_labs.py::test_coding_fixture_executes_baseline_and_candidate_assertions `
  lab/tests/test_m5_labs.py::test_coding_fixture_does_not_count_named_but_failing_tests `
  lab/tests/test_m5_labs.py::test_coding_fixture_rejects_source_outside_fixed_ast_allowlist `
  lab/tests/test_m5_labs.py::test_coding_fixture_rejects_stale_base_and_unsafe_path `
  lab/tests/test_m5_labs.py::test_coding_fixture_rejects_scope_and_schema_drift `
  lab/tests/test_m5_labs.py::test_coding_fixture_rejects_hunk_count_or_context_drift `
  lab/tests/test_m5_labs.py::test_cli_accepts_isolated_fixture_root_and_rejects_tampering
```

预期显示 `8 passed`。其中一个测试应用合法的 under-fix diff，`patch.applied=true` 但只有 `empty` 通过，证明测试数不是名称计数；其他测试分别要求 import、陈旧 base、路径穿越、schema/scope 扩大、hunk 行数和 context 漂移被拒绝。

`negative.json` 使用与正例相同的 payload，再逐项 override `candidate_patch.diff` 或 base hash。Import 负例先成功通过 diff 解析，随后因结果 AST 不在预审集合而拒绝；这能验证当前固定边界，却不能声称系统通用理解依赖变更。真实项目还要检查 package manifest、lockfile、实际 diff 和允许策略。

出现以下任一情况就停止成功声明，不要更新 expected 来迎合错误：

| 现象 | 首个责任层 | 排查动作 |
| --- | --- | --- |
| `hash mismatch for ...` | fixture 身份 | 对照 manifest、检查误改；确认语义变化后才创建新版本与 hash |
| `schema drift` / `must ...` | 输入契约 | 检查 Task、workspace、candidate 精确字段与类型 |
| `base hash mismatch` | Snapshot lineage | 候选基线已漂移；重新生成 diff，不模糊应用 |
| `unsafe ... path` / `outside task scope` | 文件范围 | 拒绝路径穿越、绝对路径与范围外文件 |
| `hunk ...` / `context does not match` | Patch 应用 | 检查 hunk header、行数和 base 内容，不启用 fuzzy apply |
| `not valid Python` | 语法边界 | 保留原候选和 stderr，不尝试执行 |
| `outside the fixed AST allowlist` | 执行策略 | 判断是应拒绝的输入，还是教学允许列表需要另行设计新案例 |
| `baseline_failures=[]` | 测试区分力或基线 | 确认错误实现是否变化、测试是否还能复现缺陷 |
| `tests_passed<3` | 候选行为 | 查看具体 `test_results`，不要只看汇总数 |
| `negative_rejected=false` | 负例边界 | 检查负例是否意外进入允许结构，最终结果必须失败 |
| output 正常但 `passed=false` | expected/负例汇总 | 逐项比较 expected，并检查 `negative_rejected` |
| 命令请求联网、凭据或写真实仓库 | 执行环境越界 | 立即终止；当前 E1 案例不需要这些能力 |

若断言失败，保留 stdout、stderr、退出码、Python/uv 版本与 `git diff`。先判断是 fixture、runner、测试还是环境问题；本案例没有模型调用，所以把失败归为“模型错误”没有事实依据。

## 清理与回滚

正常运行只读取 fixture 并打印 JSON，不修改项目文件，所以清理动作是终止进程并删除你自行保存的临时输出。定向测试使用 pytest 临时目录，结束后自动清理。

如果为了练习复制了 fixture，请通过 `--fixtures-root` 指向副本，不覆盖原目录。需要回滚时删除该副本即可；若你确实修改了受版本控制的 fixture，先用下面的只读命令审核：

```powershell
git diff -- lab/fixtures/coding
git status --short
```

只恢复你自己的实验改动，不使用会覆盖整个工作树的命令。若修改是有意的语义升级，应产生新的 fixture hash、测试和 lineage，而不是悄悄改写旧 Eval 记录。

## 从当前 E1 走向真实 Coding Agent

不要从固定字符串案例一步跳到“哪个模型最好”。比较稳妥的升级路线是：

| 阶段 | 新增的真实部分 | 必须保存 | 仍然不能声称 |
| --- | --- | --- | --- |
| 当前 E1 | 固定内存 workspace、真实解析/应用 diff、固定断言 | fixture、base/result hash、changed file、输出、退出码 | 模型或真实仓库能力 |
| 仓库形 E1 | 临时 Git 仓库、真实 patch 应用、真实测试，但仍用固定候选 | base commit、diff、test log、清理结果 | live 模型能生成修复 |
| 有限 E2 | 锁定真实 model/provider/adapter/harness 的窄范围探针 | 完整身份、提示词、工具事件、usage、费用、artifact | 正式相对提升或广泛适用 |
| 正式 E3 | 预注册任务、重复、未见 holdout、安全/成本门槛 | 完整矩阵、失败样本、统计与决策报告 | 跨 workload、跨版本通用排名 |

仓库形 E1 是很有价值的中间层：先把 patch parser、隔离工作树、测试发现、文件范围和 rollback 做实，再引入昂贵且非确定的模型变量。这样即使 E2 失败，也能判断问题来自模型候选还是 Harness 执行链。

真实 E2 探针应默认在隔离 worktree 或一次性容器内运行，网络和写权限按最小范围开放。设置步骤、时间、token、费用、文件数和进程数上限；超限、测试不可判定、出现未知凭据请求或工作树逃逸时立即停止。

## 真实实验必须记录什么

至少保存以下信息，缺一类就降低相应结论强度：

- **Task 身份**：任务版本、目标、起始 commit、允许路径、禁止动作、验收和 rollback；
- **执行身份**：model snapshot、provider、adapter、harness、系统/项目指令 hash、工具 schema、权限和网络策略；
- **输入身份**：fixture/repository ref、依赖锁、操作系统、runtime 与容器镜像；
- **过程证据**：模型响应、工具调用、审批、重试、超时、取消和经过脱敏的 trace；
- **修改证据**：实际 patch、文件列表、生成文件、依赖变化和 base/head commit；
- **验证证据**：baseline 复现、候选测试、lint/typecheck/build、隐藏断言和人工 review；
- **资源与失败**：时长、token、费用、工具错误、人工轮次、第一处失败分类；
- **收尾证据**：最终状态、未决项、清理结果、回滚点和 artifact digest。

“测试通过”只是验证证据的一部分。如果基线从未失败，可能没有复现目标缺陷；如果 diff 越界，功能通过也不能接受；如果 trace 或 artifact 泄露敏感信息，结果同样不能晋级。

## 回归矩阵

本页不新增自动门禁，但修改相关实现时应按影响选择已有检查：

| 变更 | 最小相关检查 | 额外人工复核 |
| --- | --- | --- |
| `input/expected/negative.json` | Coding 定向测试与 CLI | 语义版本、manifest、bundle hash、Eval lineage 是否需要新身份 |
| `manifest.json` 或 loader | hash 篡改测试、六个 fixture 全量测试 | canonicalization 与旧 fixture 是否仍可解析 |
| `evaluate_coding` 或允许列表 | 三个 Coding 行为测试 | 是否扩大了可执行源码边界 |
| `run-labs.py` 参数/退出行为 | isolated fixture root CLI 测试 | 非零退出、stderr 与工作树副作用 |
| Eval task/ref/run | `npm run eval:validate`、`npm run eval:self-test` | commit/path/hash 是否指向同一不可变输入 |
| 本页 Markdown | `npm run check`、`npm run facts:check`、`npm run pages:check` | 命令、字段和当前源码是否仍一致 |

修改 fixture 时不能只重算 hash 就结束。先解释为什么任务语义需要变化，再更新预期、负例、测试和所有引用；旧实验记录继续指向旧 commit，不能被新内容冒充。

## 已知限制

- 没有真实模型、Git 仓库副本、文件系统写入、Git index、项目测试发现、依赖安装或并发工具调用。
- Unified diff 只实现单文件、不可 rename 的严格文本子集，不支持 binary、新增/删除文件、mode 或完整 Git 语义。
- 测试集合、缺陷源码和唯一候选都由项目作者预先给定，没有测试发现、定位、规划与多轮修复过程。
- 精确 AST allowlist 会拒绝行为等价实现，因此它衡量的是固定契约，不是代码质量或泛化能力。
- `changed_files` 和 result hash 从内存应用结果推导，仍不能替代真实工作树的 commit、status、diff、测试报告与生成物审计。
- `offline=true` 是 Result 声明，不是容器级断网证明；需要环境策略和网络观测才能形成更强结论。
- `safety_violation=false` 是当前固定输出，不表示存在通用安全扫描器。
- E1 replay（离线重放）不能升级为 E2/E3，也不能支持模型排名或生产可用性结论。

## 完成检查表

完成当前教学案例时确认：

- [ ] Python、uv、lockfile 和运行目录符合前置条件；
- [ ] 工作树中原有改动已识别，不会被实验覆盖；
- [ ] CLI 退出码为 0，fixture hash 与固定值一致；
- [ ] 基线只在 `single/multiple` 失败，候选三例全过；
- [ ] Base hash、allowed path、hunk context/行数和 result hash 均可解释；
- [ ] 合法 under-fix 能应用但只通过 1/3，测试确实执行；
- [ ] 路径穿越、陈旧 base 与 import 扩权三组 fixture 负例全部拒绝；
- [ ] 定向测试显示 `8 passed`；
- [ ] 没有把内存 `changed_files`、`passed=true` 或 E1 写成真实模型能力；
- [ ] 临时副本和输出已清理，原工作树状态可解释。

准备升级为真实实验时再确认：

- [ ] Task、base commit、模型与 Harness 完整身份已经冻结；
- [ ] 在隔离环境运行，权限、网络、预算和停止条件明确；
- [ ] baseline、真实 diff、测试与失败 artifact 可追溯；
- [ ] 文件范围、依赖变化、安全与敏感信息经过独立检查；
- [ ] cleanup/rollback 已实际演练，不只是写在计划里；
- [ ] E2/E3 结论严格限制在真实达到的任务和配置范围。

## 检查题

1. 为什么基线的空列表测试通过，却不能说明循环边界正确？
2. `patch.applied=true` 依赖哪些 path、base 与 hunk 条件？它为什么不等于真实工作树已修改？
3. `expected.json` 在执行链的哪个阶段参与判断？
4. Import 负例在哪一层被拒绝？为什么仍不是通用依赖策略？
5. Lab Result 与 Eval Run 之间通过哪些身份字段建立来源链？
6. 当前 `changed_files` 从哪里推导？若要变成真实仓库证据还需采集什么？
7. 从当前 E1 升级到 E2 时，必须新增哪些 live 身份和 artifact？

完成后继续[浏览器案例](/labs/browser)，对比“固定源码执行边界”和“页面内容不可信边界”的差异。
