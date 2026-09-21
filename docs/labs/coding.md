# 编码实验：真实工作区、补丁与独立验收

本例把固定候选放进真正的临时 Git 仓库，观察补丁是否应用、测试是否执行、完成提议是否被独立验证器接受。

<span id="学习目标"></span>
<span id="先看证据结论"></span>
<span id="前置条件、版本与输入"></span>
<span id="前置条件版本与输入"></span>
<span id="四个-fixture-文件分别负责什么"></span>
<span id="实际执行链"></span>
<span id="先推导基线-再看候选修改"></span>
<span id="先推导基线再看候选修改"></span>
<span id="当前-runtime-contract"></span>
<span id="执行边界为什么可控、又为什么很窄"></span>
<span id="执行边界为什么可控又为什么很窄"></span>
<span id="逐字段读懂-result"></span>
<span id="result-如何关联到-eval"></span>
<span id="从当前-e1-走向真实-coding-agent"></span>
<span id="回归矩阵"></span>
<span id="完成检查表"></span>
<span id="检查题"></span>

<span id="coding-从失败断言到受约束修复"></span>

## 前置、版本与输入

按[统一环境](/labs/setup)准备 Node.js 22+、Python 3.12、uv 0.11.16 和 Git。输入为 `lab/fixtures/study-coding/tasks.json` 与原始字节 manifest；配置为 `examples/study/config.json`。

六个独立任务分别覆盖集合边界、字符串规范化、数值范围、缺失值、稳定排序和去重。每个任务含初始缺陷、两份预审候选和固定测试。

<span id="运行与预期输出"></span>

## 运行与预期

```bash
npm run study:demo
```

预期生成 12 个唯一单元：基线六项失败、候选六项通过。每个任务先证明初始测试失败；补丁实际改变 `solution.py`，随后工具运行一次测试，验证器再次读取当前文件并独立执行测试。

指定其他配置或结果位置：

```bash
npm run study:demo -- --config examples/study/config.json --output lab/results/local/my-study
```

目标目录必须不存在。改变 `variant` 或调用预算会改变实际执行；不是只修改报表标签。

## 跟读一个结果

打开报告链接的 Result（结果），并对照同目录：

| 文件 | 证据 |
| --- | --- |
| `baseline-test.json` | 修改前失败及临时仓库 base commit |
| `candidate.patch` | 实际应用的补丁 |
| `test-*.json` | 固定命令、退出码、逐条断言和文件 hash |
| `workspace.json` | 最终源码、变更路径与 hash |
| `trace.json` | 读取、补丁、测试、验收和停止顺序 |
| `run.json` | 环境、配置、产物引用与清理结果 |

验证器忽略完成文本中的 `tests_passed`。文件不在预审集合、测试脚本被改、路径越界或测试失败，均不能 completed。

<span id="失败演练与停止条件"></span>
<span id="清理与回滚"></span>

## 失败验证、清理与回滚

```bash
npm run study:check
```

该检查运行完整研究，并验证坏产物、重复单元、配置变化和已有目录覆盖被拒绝。失败时保留首个错误和研究目录，不修改结果来迎合汇总器。

临时仓库自动删除；输出报告保留。回退只恢复自己的候选配置或代码，不覆盖旧结果。

<span id="真实实验必须记录什么"></span>
<span id="已知限制"></span>

## 历史实验与已知限制

`uv run --frozen --offline python scripts/run-labs.py coding` 仍运行原有内存补丁与精确 AST 允许列表实验，便于理解更小的执行边界。

新实验提供 E1：补丁、Git 和测试是真实执行，候选由作者预先给定。它不测试模型定位或生成代码，也不提供任意 Python 的生产沙箱。完整证据链见[端到端案例](/practice/end-to-end)。
