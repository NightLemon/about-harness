# Coding：从失败断言到受约束修复

## 学习目标

这个案例练习 Coding Agent（编码智能体）最小闭环中的四件事：先复现缺陷，再提出候选修改，随后执行可判定的断言，最后拒绝超出约定边界的输入。你将看到一个 `collect` 函数为什么漏掉列表最后一个元素，以及离线 runner 如何区分“测试名称存在”和“测试确实通过”。

它是 E1（固定输入、可重复执行）证据：能够证明本仓库中的确定性 evaluator 按约定工作，不能证明真实模型会发现同一缺陷、生成同一补丁或安全修改真实仓库。共享环境、Windows 与 macOS/Linux 的入口见[实验环境](/labs/setup)。

## 前置条件、版本与输入

- Python 3.11+；本仓库与当前教程固定使用 `uv 0.11.16` 和 `uv.lock`。
- 保持离线，不安装 package，不需要 API key。
- 输入位于 `lab/fixtures/coding/`，当前 bundle hash 为 `7f4caeb33ce09877f8ff4a14d08555619212d1d9c4d8d519fecda4849d258c9c`。

fixture（固定实验输入）由四个文件组成：`input.json` 保存缺陷源码、候选源码和三个测试名；`expected.json` 保存验收摘要；`negative.json` 保存越界输入；`manifest.json` 记录其余三个文件的 SHA-256。runner 先把每个 JSON 规范化后校验文件 hash，再按固定顺序合成 bundle hash。任何一个文件被改写但 manifest 未同步时，实验都会在执行源码前停止。

## 先推导基线，再看候选修改

基线循环条件是：

```python
while index < len(items) - 1:
```

据此可以在运行前推导三组结果：空列表偶然通过；单元素列表不会进入循环；多元素列表会少收集最后一个元素。因此预期 `baseline_failures` 恰好为 `single` 和 `multiple`。

候选只把上界改为 `len(items)`。evaluator 不读取任意项目文件，也不应用真实 patch；它分别编译 fixture 中的 `before` 与 `candidate_patch` 字符串，然后用 `empty`、`single`、`multiple` 三组固定输入比较返回值。只有基线至少失败一例、候选三例全过且两段源码不同，`patch_applied` 才会为 `true`。

## 执行边界

AST（Abstract Syntax Tree，抽象语法树）allowlist（允许列表）只接受仓库内写死的两棵精确语法树：原始缺陷版本和预期修复版本。执行 namespace（命名空间）只暴露 `len`；任意 import、额外语句、替代实现或结构变化都会被拒绝。

这个边界适合演示确定性验收，却不是通用代码沙箱。它之所以可控，是因为可执行输入只有两棵预先审阅过的 AST；不要把“限制了 `__builtins__`”单独视为可安全运行不可信 Python 的方案。

## 运行与预期输出

在仓库根目录运行：

```powershell
uv run --frozen --offline python scripts/run-labs.py coding
```

预期退出码为 0，JSON 中的关键字段如下：

```json
{
  "fixture_hash": "7f4caeb33ce09877f8ff4a14d08555619212d1d9c4d8d519fecda4849d258c9c",
  "negative_rejected": true,
  "offline": true,
  "output": {
    "baseline_failures": ["single", "multiple"],
    "files_changed": 1,
    "patch_applied": true,
    "test_results": {"empty": true, "multiple": true, "single": true},
    "tests_passed": 3
  },
  "passed": true,
  "evidence": "E1"
}
```

`tests_passed=3` 来自三个布尔断言，不是对测试名称计数。`files_changed=1` 则是 evaluator 固定返回的教学字段，不是从 Git diff 计算所得；它只能表达本案例预设的单文件范围，不能作为真实修改证据。

## 失败演练与停止条件

先运行以下定向测试，验证成功路径、hash 防篡改和 AST 边界：

```powershell
uv run --frozen --offline pytest -q `
  lab/tests/test_m5_labs.py::test_fixture_hash_tampering_is_rejected `
  lab/tests/test_m5_labs.py::test_coding_fixture_executes_baseline_and_candidate_assertions `
  lab/tests/test_m5_labs.py::test_coding_fixture_does_not_count_named_but_failing_tests `
  lab/tests/test_m5_labs.py::test_coding_fixture_rejects_source_outside_fixed_ast_allowlist `
  lab/tests/test_m5_labs.py::test_cli_accepts_isolated_fixture_root_and_rejects_tampering
```

预期显示 `5 passed`。其中一个测试把候选换回缺陷源码，结果应只有 `empty` 通过，`patch_applied=false`；另一个测试使用语法合法的 `import os` 源码，预期收到 `fixed AST allowlist` 错误。

`negative.json` 中的候选是自然语言说明，不是合法 Python，所以当前 runner 首先因语法/AST 检查拒绝它。`negative_rejected=true` 只能证明越界输入未被执行，不能声称系统理解了“新增生产依赖”的语义。要验证依赖范围，真实项目还需要检查 lockfile、manifest 和 diff。

若出现 `hash mismatch`，立即停止，不要为迎合本地改动而重写 expected 或 manifest；先确认是否误改 fixture。若断言失败，保留 stdout、stderr 和退出码，检查 Python/uv 版本与工作树差异。失败结果不是 E1 成功证据。

## 清理与回滚

正常运行只读取 fixture 并打印 JSON，不修改项目文件，所以清理动作是终止进程并删除你自行保存的临时输出。定向测试使用 pytest 临时目录，结束后自动清理。

如果为了练习复制了 fixture，请通过 `--fixtures-root` 指向副本，不覆盖原目录。需要回滚时删除该副本即可；若你确实修改了受版本控制的 fixture，先用 `git diff -- lab/fixtures/coding` 审核，只恢复你自己的实验改动，不使用会覆盖整个工作树的命令。

## 已知限制与真实 Coding Agent 的差距

- 没有真实模型、Git 仓库副本、补丁解析/应用、编译器、依赖安装或并发工具调用。
- 测试集合、缺陷源码和唯一候选都由项目作者预先给定，没有测试发现、定位、规划与多轮修复过程。
- 精确 AST allowlist 会拒绝行为等价实现，因此它衡量的是固定契约，不是代码质量或泛化能力。
- `files_changed`、测试数和范围边界都不是从真实工作树推导，不能替代 commit、diff、测试报告与生成物审计。
- E1 replay（离线重放）不能升级为 E2/E3，也不能支持模型排名或生产可用性结论。

真实实验至少还应固定起始 commit，记录模型与 harness 版本、提示词、工具权限、实际 diff、测试发现、退出码、失败分类、成本与回滚点；并在隔离工作树中验证补丁，而不是直接修改主工作区。

## 检查题

1. 为什么基线的空列表测试通过，却不能说明循环边界正确？
2. `patch_applied=true` 依赖哪三个条件？
3. 为什么 `negative_rejected=true` 不能证明 evaluator 识别了依赖变更？
4. 若要把 `files_changed=1` 变成真实证据，还需要从哪里采集数据？

完成后继续[浏览器案例](/labs/browser)。
