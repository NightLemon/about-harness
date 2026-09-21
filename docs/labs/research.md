# 研究实验：从原文到引用和冲突

读取两份 Markdown 原始政策及一份转载，逐行提取保留天数，保存文件 hash、行号、原句和数值。转载按 derived_from 回到同一来源，不能增加独立来源数。

<span id="先看证据结论"></span>
<span id="固定问题与来源"></span>
<span id="实际执行链"></span>
<span id="四个-fixture-文件分别负责什么"></span>
<span id="冲突是怎样算出来的"></span>
<span id="同一来源不能制造自我冲突"></span>
<span id="逐字段解释-result"></span>
<span id="claims"></span>
<span id="status"></span>
<span id="values"></span>
<span id="citations"></span>
<span id="unsupported-claims"></span>
<span id="unsupportedclaims"></span>
<span id="integration-与-mode"></span>
<span id="negative-rejected"></span>
<span id="negativerejected"></span>
<span id="前置条件与固定版本"></span>
<span id="命令"></span>
<span id="预期输出与断言"></span>
<span id="result-如何进入-eval"></span>
<span id="从当前-e1-升级到真实研究管线"></span>
<span id="阶段-a-丰富结构化-ledger"></span>
<span id="阶段-a丰富结构化-ledger"></span>
<span id="阶段-b-候选发现与来源获取"></span>
<span id="阶段-b候选发现与来源获取"></span>
<span id="阶段-c-来源独立性与冲突分类"></span>
<span id="阶段-c来源独立性与冲突分类"></span>
<span id="阶段-e-真实-langgraph-搜索探针"></span>
<span id="阶段-e真实-langgraph搜索探针"></span>
<span id="真实研究实验必须记录什么"></span>
<span id="回归矩阵"></span>
<span id="当前离线实验"></span>
<span id="未来真实研究实验"></span>
<span id="完成检查表"></span>
<span id="检查题"></span>

<span id="研究实验-冲突来源、证据定位与覆盖缺口"></span>

## 前置、版本与输入

按[统一环境](/labs/setup)准备 Python 3.12 与 uv 0.11.16。原始输入在 `lab/fixtures/sources-v2/`，manifest 使用原始字节 SHA-256；依赖由 `uv.lock` 固定。

<span id="当前运行时契约"></span>
<span id="运行固定正例"></span>
<span id="运行直接契约测试"></span>

## 运行与预期

```bash
uv run --frozen --offline python scripts/source-labs.py
```

该命令一起运行三类原始材料实验。读取 `outputs.research`，保留 30 与 45 的冲突，3 条引用对应 2 个独立来源；deletion_process 明确缺少证据。

<span id="相同值不等于独立验证"></span>
<span id="失败分类与定位"></span>
<span id="阶段-d-模型综合与独立验证"></span>
<span id="阶段-d模型综合与独立验证"></span>

## 验证失败

```bash
uv run --frozen --offline pytest -q lab/tests/test_source_labs.py
```

定向测试删除 policy-b 的保留条款，要求研究断言失败，并核对 deletion_process 保持证据不足。实现另检查固定引用数、独立来源数与数值集合；它没有实现通用来源图校验。负例通过表示列出的输入被预期拒绝，不能只看顶层 passed。

<span id="停止、清理、回滚与限制"></span>
<span id="停止清理回滚与限制"></span>

## 清理与回滚

实验只读取固定文件并输出结果；测试临时状态自动释放。Hash 或业务断言失败时停止，核对输入和代码，不修改 expected 来获得绿色。回退只撤销自己的候选；有意改变输入时发布新版本。

历史 JSON 契约仍可运行：`uv run --frozen --offline python scripts/run-labs.py research`，历史字段与新原始文件结果分开解释。

## 已知限制

本例为 E1。只识别固定条款语法；不搜索网页、不执行自然语言蕴含判断，也不推断哪份政策应覆盖另一份。 领域设计见[对应模式](/domains/research)，报告方法见[评测实践](/practice/evaluation)。
