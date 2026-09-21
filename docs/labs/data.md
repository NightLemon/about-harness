# 数据实验：从 CSV 到可复算结果

读取 scores.csv，验证字段、唯一用户 ID 与 0–10 分范围；用 score_state 保留空单元格、null 和数值的区别；邮箱字段投影为脱敏值，再计算已知分数的总和与均值。

<span id="先看证据结论"></span>
<span id="固定输入与业务断言"></span>
<span id="实际执行链"></span>
<span id="四个-fixture-文件分别负责什么"></span>
<span id="为什么非有限数字必须拒绝"></span>
<span id="缺失、null、redacted-与-zero"></span>
<span id="缺失nullredacted-与-zero"></span>
<span id="逐字段解释-result"></span>
<span id="rows"></span>
<span id="row-count-与-population"></span>
<span id="rowcount-与-population"></span>
<span id="sensitive-values-exposed"></span>
<span id="sensitivevaluesexposed"></span>
<span id="integration-与-mode"></span>
<span id="negative-rejected"></span>
<span id="negativerejected"></span>
<span id="前置条件与固定版本"></span>
<span id="命令"></span>
<span id="预期输出与断言"></span>
<span id="result-如何进入-eval"></span>
<span id="从当前-e1-升级到真实数据管线"></span>
<span id="阶段-a-丰富结构化-fixture"></span>
<span id="阶段-a丰富结构化-fixture"></span>
<span id="阶段-b-确定性变换与血缘"></span>
<span id="阶段-b确定性变换与血缘"></span>
<span id="阶段-c-只读数据源"></span>
<span id="阶段-c只读数据源"></span>
<span id="阶段-d-真实-pydanticai-model-探针"></span>
<span id="阶段-d真实-pydanticaimodel-探针"></span>
<span id="阶段-e-受控写回"></span>
<span id="阶段-e受控写回"></span>
<span id="真实数据实验必须记录什么"></span>
<span id="回归矩阵"></span>
<span id="当前离线实验"></span>
<span id="未来真实数据实验"></span>
<span id="完成检查表"></span>
<span id="检查题"></span>

<span id="数据实验-snapshot、schema、缺失语义与敏感字段"></span>

## 前置、版本与输入

按[统一环境](/labs/setup)准备 Python 3.12 与 uv 0.11.16。原始输入在 `lab/fixtures/sources-v2/`，manifest 使用原始字节 SHA-256；依赖由 `uv.lock` 固定。

<span id="当前运行时-schema"></span>
<span id="运行固定正例"></span>
<span id="运行直接契约测试"></span>

## 运行与预期

```bash
uv run --frozen --offline python scripts/source-labs.py
```

该命令一起运行三类原始材料实验。读取 `outputs.data`，输入与输出均为 4 行；只有 2 个已知分数，总和 10、均值 5；缺失和 null 不进入数值分母。

<span id="失败分类与定位"></span>

## 验证失败

```bash
uv run --frozen --offline pytest -q lab/tests/test_source_labs.py
```

定向测试要求重复用户 ID 和 NaN 被拒绝，并核对正常数据的均值。实现另检查字段、行形状、行数、总和与分母；这些条件需要在扩展数据格式时补充相应负例，不能只看顶层 passed。

<span id="停止、清理、回滚与限制"></span>
<span id="停止清理回滚与限制"></span>

## 清理与回滚

实验只读取固定文件并输出结果；测试临时状态自动释放。Hash 或业务断言失败时停止，核对输入和代码，不修改 expected 来获得绿色。回退只撤销自己的候选；有意改变输入时发布新版本。

历史 JSON 契约仍可运行：`uv run --frozen --offline python scripts/run-labs.py data`，历史字段与新原始文件结果分开解释。

## 已知限制

本例为 E1。不包含数据库、写回、任意敏感信息发现和复杂统计；脱敏只覆盖声明的字段。 领域设计见[对应模式](/domains/data)，报告方法见[评测实践](/practice/evaluation)。
