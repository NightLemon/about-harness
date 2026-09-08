# 学习路径：先完成一次可复核的运行

这条路线面向会使用 Git、命令行和基础 Python/TypeScript 的读者。围绕同一个小任务学习，避免每章重新准备背景。

<span id="这套站点怎样使用"></span>
<span id="先建立一个核心判断"></span>
<span id="第一次进入项目-30-分钟基线"></span>
<span id="第一次进入项目30-分钟基线"></span>
<span id="按交付物选择路线"></span>
<span id="路线-a-第一次系统学习"></span>
<span id="路线-a第一次系统学习"></span>
<span id="第一阶段-建立语言和边界"></span>
<span id="第一阶段建立语言和边界"></span>
<span id="第二阶段-理解最常见的质量杠杆"></span>
<span id="第二阶段理解最常见的质量杠杆"></span>
<span id="第三阶段-建立控制与安全"></span>
<span id="第三阶段建立控制与安全"></span>
<span id="路线-b-适配一个指定模型"></span>
<span id="路线-b适配一个指定模型"></span>
<span id="b1-冻结身份"></span>
<span id="b2-做协议资格测试"></span>
<span id="b3-固定-harness"></span>
<span id="b4-写-task-与研究设计"></span>
<span id="b5-选择指标并诊断"></span>
<span id="路线-c-迁移工作流"></span>
<span id="路线-c迁移工作流"></span>
<span id="路线-d-修复一个失败的-agent-任务"></span>
<span id="路线-d修复一个失败的-agent-任务"></span>
<span id="怎样阅读不同页面"></span>
<span id="e0–e3-阅读标记"></span>
<span id="e0e3-阅读标记"></span>
<span id="学习记录模板"></span>
<span id="常见错误路线"></span>
<span id="每个阶段的停止与回滚"></span>
<span id="学习完成标准"></span>

<span id="学习路径-从理解-harness-到交付可复核证据"></span>

## 第一站：建立责任图

依次阅读[定义](/foundations/what-is-harness)、[架构](/foundations/architecture)和[循环](/foundations/agent-loop)。标出任务、模型、策略、工具、状态和验证器；跟踪一次工具提议怎样变成执行结果。

完成标志：能解释“动作被提出”“动作获准”“动作完成”“任务验收通过”四种状态。

<span id="第四阶段-运行参考实现"></span>
<span id="第四阶段运行参考实现"></span>

## 第二站：运行完整离线研究

按[前置环境](/guide/prerequisites)准备工具链，再运行：

```bash
npm run study:demo
```

输入是六个固定编码任务和两个补丁配置。预期生成完整的 12 单元研究；候选六项通过，基线六项失败，临时仓库在结束后删除，报告和失败证据保留。

到[端到端案例](/practice/end-to-end)逐步核对一个任务的补丁、独立测试、轨迹和结果。已有输出目录不覆盖；命令失败时停止并读取首个错误，保留证据。默认 E1 不调用模型。

## 第三站：补齐任务相关机制

| 遇到的问题 | 阅读 | 验证产物 |
| --- | --- | --- |
| 必要信息没进入模型 | [上下文](/foundations/context)、[指令](/foundations/instructions) | 实际输入清单 |
| 重复执行或无法恢复 | [可靠执行](/foundations/state-reliability)、[恢复工作坊](/practice/reliability-recovery) | 意图、回执与恢复路径 |
| 工具参数或返回不正确 | [工具](/foundations/tools)、[适配器](/implementation/adapter-contract) | 输入契约与回传测试 |
| 结论缺少依据 | [评测](/evaluation/method)、[指标](/evaluation/metrics) | 配对结果、区间与失败分布 |
| 权限或数据边界不清楚 | [安全](/foundations/security)、[人工控制](/foundations/human-control) | 自动、询问、拒绝三类动作 |

## 第四站：接入与选择

先用[框架示例](/frameworks/comparison)理解实际运行时；再选[产品教程](/harnesses/comparison)或[Responses 接入](/models/openai)。这些是不同路径，不要求全部安装。

真实模型调用先固定型号、供应方、权限和预算，并另行授权。离线模式下仍可完成协议、工具和验收测试；真实兼容状态保持未验证。

## 最后交付

按[综合项目](/guide/capstone)填写自己的作品集，使用[评分规则](/guide/portfolio)复核。每个结论能回到输入、命令、实际产物和验收；失败时知道如何停止和恢复，才算完成学习。
