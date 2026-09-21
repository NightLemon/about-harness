# Harness 设计工作表

本页把一个任务写成可实施、可验收的设计记录。组件原理见[架构](/foundations/architecture)、[工具](/foundations/tools)与[状态可靠性](/foundations/state-reliability)；这里保留填写项和完整示范。

<span id="当前证据边界"></span>
<span id="第一步把需求改写成-task"></span>
<span id="第二步从责任开始画架构"></span>
<span id="第三步标出信任与权限变化"></span>
<span id="第四步定义-action-生命周期"></span>
<span id="第五步设计-context-与-instruction"></span>
<span id="第六步把能力分成-autoask-和-deny"></span>
<span id="第七步为每个-tool-写执行契约"></span>
<span id="第八步设计-statecheckpoint-与恢复"></span>
<span id="第九步让-validator-拥有完成事实"></span>
<span id="第十步只记录能归因的最小证据"></span>
<span id="工作例仓库内离线计算"></span>
<span id="本页解决什么问题"></span>
<span id="最终证据包"></span>
<span id="第一步-把需求改写成-task"></span>
<span id="用结果条件和过程不变量夹住任务"></span>
<span id="第二步-从责任开始画架构"></span>
<span id="第三步-标出信任与权限变化"></span>
<span id="第四步-定义-action-生命周期"></span>
<span id="第五步-设计-context-与-instruction"></span>
<span id="第六步-把能力分成-auto、ask-和-deny"></span>
<span id="第七步-为每个-tool-写执行契约"></span>
<span id="第八步-设计-state、checkpoint-与恢复"></span>
<span id="第九步-让-validator-拥有完成事实"></span>
<span id="第十步-只记录能归因的最小证据"></span>
<span id="实现前的最小设计审核"></span>
<span id="工作例-仓库内离线计算"></span>
<span id="写出设计决定"></span>

## 填写模板

| 项目 | 必填内容 |
| --- | --- |
| 决策 | 问题、范围、当前基线、采用或暂缓条件 |
| 任务 | 目标、固定输入及 hash、允许修改的路径、业务验收 |
| 职责 | 谁提议、授权、执行、保存状态和最终验收 |
| 工具 | 参数、结果、错误、执行位置、时限和幂等键 |
| 权限 | 自动允许、需批准、拒绝的具体动作与参数边界 |
| 状态 | 权威来源、持久化位置、恢复前对账及未知结果处理 |
| 预算 | 工具步骤、模型请求、时长、费用与停止条件 |
| 证据 | Run、Trace、Result、原始材料、补丁和测试回执 |
| 验证 | 正例、越权、坏输入、假完成、失败测试与恢复负例 |
| 决定 | 实施范围、未决项、重测触发、清理及回退目标 |

填写时写责任主体和可观察结果。例如“安全”不够，应写“只允许读取 solution.py；任何其他路径由工具拒绝”。恢复涉及外部副作用时，另附回执和对账方案。

## 填好示例：集合边界修复

| 项目 | 本案例的填写结果 |
| --- | --- |
| 问题 | 初始实现切掉集合末项；候选应保留全部元素 |
| 输入 | study-coding 的 demo-collection；初始源码、两个预审补丁与固定测试 |
| 决策 | 在六个固定任务上采用候选作为离线回归基线 |
| 提议 | ReplayAdapter 按固定记录请求读取、补丁和测试 |
| 授权与执行 | HarnessRunner 检查允许工具；Workspace 限制路径、补丁 ID 和测试命令 |
| 验收 | WorkspaceValidator 重读源码、diff、验证脚本，再独立运行测试；忽略模型的通过标记 |
| 预算 | 每次最多 5 个工具步骤、配置指定的模型请求数、30 秒；离线费用为 0 |
| 权威状态 | 临时 Git 仓库中的文件；模型文本和展示轨迹不是工作区事实 |
| 恢复 | 本示例不恢复半途临时仓库；保留已写证据，以新目录从固定初始输入重跑 |
| 范围 | 仅改 solution.py；额外文件、验证脚本修改和符号链接被拒绝 |
| 结果 | 完整研究中候选六项通过、基线六项失败；每项指向实际结果文件 |

完整证据见 `examples/portfolio-completed/harness.md` 与 `lab/results/public/study-demo/`。这是一套教学实现，没有持久队列、多写者协调或生产隔离。

<span id="前置条件与固定输入"></span>
<span id="命令"></span>
<span id="预期输出与人工断言"></span>
<span id="最终检查表"></span>
<span id="检查题与下一步"></span>
<span id="在当前仓库验证设计链"></span>
<span id="第十一步把设计变成可反驳的验证计划"></span>
<span id="检查三个平面"></span>
<span id="第十一步-把设计变成可反驳的验证计划"></span>
<span id="harness-设计工作表-把一个任务变成可验证的运行系统"></span>

## 执行与验收

按[前置条件](/guide/prerequisites)准备 Node.js 22、Python 3.12、uv 0.11.16 和 Git。输入为 `lab/fixtures/study-coding/tasks.json`、`examples/study/config.json`：

```bash
npm run study:demo
npm run study:check
uv run --frozen --offline pytest lab/tests/test_study_demo.py
```

报告必须有完整 12 单元及对应产物；修改配置中的请求预算要改变真实执行。负例必须证明假完成、范围外修改和失败测试不能被判为完成。更换任务时，先复现自己的基线失败，再检查候选和相邻正例。

<span id="失败、停止、清理与回滚"></span>
<span id="失败停止清理与回滚"></span>

## 失败、清理与回退

若验证器只相信完成文本、输入身份漂移或出现未知外部副作用，停止采用。运行器只清理自己创建的临时仓库；报告保留。回退自己的配置到上一版并用新输出目录重跑，不能覆盖失败证据。E1 结果不证明真实模型质量或生产可用性。
