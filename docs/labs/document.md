# 文档实验：解析、版本与块级出处

从 documents.json 选择已发布且生效的文档版本，再按 allowed 决定是否用于回答。HTML 被解析为带 ID 的段落；Markdown 按段落解析。查询词必须在同一块中命中。

<span id="先看证据边界"></span>
<span id="固定问题是什么"></span>
<span id="实际执行链"></span>
<span id="四个-fixture-文件分别负责什么"></span>
<span id="逐字段解释-result"></span>
<span id="status"></span>
<span id="answer"></span>
<span id="citations"></span>
<span id="stale-versions-ignored"></span>
<span id="staleversionsignored"></span>
<span id="integration-与-mode"></span>
<span id="negative-rejected"></span>
<span id="negativerejected"></span>
<span id="版本选择"></span>
<span id="词项匹配"></span>
<span id="拒答"></span>
<span id="前置条件与固定版本"></span>
<span id="命令"></span>
<span id="预期输出与断言"></span>
<span id="result-如何进入-eval"></span>
<span id="从当前-e1-升级到真实文档管线"></span>
<span id="阶段-a-结构化本地文档"></span>
<span id="阶段-a结构化本地文档"></span>
<span id="阶段-b-固定-parser-ocr"></span>
<span id="阶段-b固定-parserocr"></span>
<span id="阶段-c-chunk-与索引"></span>
<span id="阶段-cchunk-与索引"></span>
<span id="阶段-e-真实-llamaindex-模型探针"></span>
<span id="阶段-e真实-llamaindex模型探针"></span>
<span id="真实文档实验必须记录什么"></span>
<span id="回归矩阵"></span>
<span id="当前离线实验"></span>
<span id="未来真实文档实验"></span>
<span id="完成检查表"></span>
<span id="检查题"></span>

<span id="文档实验-版本、权限、解析与块级出处"></span>

## 前置、版本与输入

按[统一环境](/labs/setup)准备 Python 3.12 与 uv 0.11.16。原始输入在 `lab/fixtures/sources-v2/`，manifest 使用原始字节 SHA-256；依赖由 `uv.lock` 固定。

<span id="运行固定正例"></span>
<span id="运行直接契约测试"></span>

## 运行与预期

```bash
uv run --frozen --offline python scripts/source-labs.py
```

该命令一起运行三类原始材料实验。读取 `outputs.document`，正常查询返回 v2 的 45 天条款及文件 hash、retention 块和原句。无命中为 insufficient；最新版本 denied 时为 access_denied，不回退旧版。

<span id="失败分类与定位"></span>
<span id="阶段-d-检索与引用验证"></span>
<span id="阶段-d检索与引用验证"></span>

## 验证失败

```bash
uv run --frozen --offline pytest -q lab/tests/test_source_labs.py
```

重复版本、活动脚本内容和损坏段落必须失败；无权限与无匹配分别测试。 负例测试通过表示错误被预期拒绝，不能只看顶层 passed。

<span id="停止、清理、回滚与限制"></span>
<span id="停止清理回滚与限制"></span>

## 清理与回滚

实验只读取固定文件并输出结果；测试临时状态自动释放。Hash 或业务断言失败时停止，核对输入和代码，不修改 expected 来获得绿色。回退只撤销自己的候选；有意改变输入时发布新版本。

历史 JSON 契约仍可运行：`uv run --frozen --offline python scripts/run-labs.py document`，历史字段与新原始文件结果分开解释。

<span id="当前检索规则的精确限制"></span>

## 已知限制

本例为 E1。文件均为公开合成材料；allowed 是教学查询策略，不是操作系统 ACL。没有 PDF、OCR、向量索引或模型生成。 领域设计见[对应模式](/domains/document)，报告方法见[评测实践](/practice/evaluation)。
