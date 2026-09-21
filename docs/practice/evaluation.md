# 评测实践：完整研究与不完整反例

本页使用两份不同输入：一份从真实离线执行生成的完整研究，一份保留历史的合成不完整研究。前者教你连接运行与报告，后者教你识别缺失数据。

<span id="学习目标与证据边界"></span>
<span id="当前四类输入各管什么"></span>
<span id="run-记录必须回答什么"></span>
<span id="不可变-fixture-来源链"></span>
<span id="第一步-验证输入与矩阵"></span>
<span id="第一步验证输入与矩阵"></span>
<span id="第二步-汇总-但不要晋级"></span>
<span id="第二步汇总但不要晋级"></span>
<span id="如何设计自己的-a-b"></span>
<span id="如何设计自己的-ab"></span>
<span id="_1-先写决策-不先跑分"></span>
<span id="1-先写决策不先跑分"></span>
<span id="_2-冻结任务与-split"></span>
<span id="2-冻结任务与-split"></span>
<span id="_3-完整记录每次尝试"></span>
<span id="3-完整记录每次尝试"></span>
<span id="_4-先过-lineage-再看数字"></span>
<span id="4-先过-lineage再看数字"></span>
<span id="_5-结论绑定边界"></span>
<span id="5-结论绑定边界"></span>
<span id="当前实现尚未替你做什么"></span>
<span id="检查题"></span>

<span id="评测实验室-先验证矩阵-再解释结果"></span>

## 前置、版本与输入

使用[统一环境](/guide/prerequisites)。完整研究需要 Node.js 22+、Python 3.12、uv 0.11.16 和 Git；历史汇总只需 Node。所有输入均为本地合成材料，证据为 E1。

## 完整执行

```bash
npm run study:demo
npm run study:check
```

预期 6 个独立编码任务、2 个配置、1 次运行形成 12 个唯一单元；研究为 1.2 learning，新 EvalRun 为 1.1，并绑定 Task（任务）、Run、Trace（轨迹）、Result（结果）、配置和 fixture 文件 hash。

检查器先核对关联和矩阵，再计算成功率与配对差异。候选六项通过来自实际工作区测试；基线失败同样保留。学习研究可以支持固定案例回归决定，不自动支持真实模型采用。

## 历史不完整反例

```bash
npm run eval:validate
npm run eval:summary
npm run eval:self-test
```

原 Study 1.1 设计 20 × 2 × 3 = 120 个单元，只有 12 条作者构造的 development 记录，缺 108 个，holdout 为空。其 1/6 与 6/6 只是分析样例，不能替代新执行结果。

正确阻断项仍是 `incomplete_matrix` 与 `evidence_below_target`。旧格式按原规则读取，不原地更改历史 hash、分母或证据等级。

## 公开结果扫描

先在受限位置最小化并制作脱敏副本，再扫描将公开的目录：

```bash
npm run results:redact
```

当前命令扫描 `lab/results/public/` 的 JSON、JSONL、Markdown 和 patch，只拒绝已知敏感键、路径和凭据模式；不会改写内容或自动生成脱敏副本。预期退出 0 仍不能证明任意自由文本已安全。扫描失败则隔离原始产物、修复受限副本后复扫，不发布原文。敏感原始 prompt、trace 和私有源码保留在受限存储。

## 为自己的研究选择规则

Study 1.2 允许单一工作负载和按需要设置重复次数。填写 `sampling_rationale` 说明任务来源与样本规模；`comparison` 需要分别声明开发与留出任务，质量聚合和成本阈值在运行前固定。

汇总器会执行点估计阈值，并报告配对区间。区间、代表性、关键失败与回退仍要一起判断；结构合法不是样本充分性的证明。指标细节见[指标与区间](/evaluation/metrics)。

<span id="第三步-证明门禁真的会失败"></span>
<span id="第三步证明门禁真的会失败"></span>
<span id="失败、停止、清理与回滚"></span>
<span id="失败停止清理与回滚"></span>
<span id="把真实失败变成回归"></span>

## 失败、清理与回滚

重复单元、坏 hash、身份漂移或缺少产物时停止分析，不补造运行。测试在自己的临时目录注入错误并清理；真实研究输出保留。回退研究设计使用新版本，失败记录不覆盖。

当前未测试真实供应方和费用，也没有自动证明 holdout 未被人为查看。E2/E3 需要对应的真实运行和研究证据。
