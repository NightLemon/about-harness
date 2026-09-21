# Agent 框架对照与选择

Framework（框架）提供循环、图、会话或协作运行时。项目仍负责任务、权限、工具实现和业务验收。先找到当前系统的瓶颈，再选择能减少这部分复杂度的抽象。

<span id="四个对象分别从哪里切入"></span>
<span id="framework-不是完整-harness"></span>
<span id="先决定是否需要-framework"></span>
<span id="从任务形状选择抽象中心"></span>
<span id="状态图型任务"></span>
<span id="agent-loop-型任务"></span>
<span id="组件组合型任务"></span>
<span id="conversation-event-型多-agent-任务"></span>
<span id="conversationevent-型多-agent-任务"></span>
<span id="七步选型流程"></span>
<span id="_1-冻结问题-不先写候选名"></span>
<span id="1-冻结问题不先写候选名"></span>
<span id="_2-建立无-framework-或更简单的-baseline"></span>
<span id="2-建立无-framework-或更简单的-baseline"></span>
<span id="_3-标出控制责任"></span>
<span id="3-标出控制责任"></span>
<span id="_4-只选一到两个合理候选"></span>
<span id="4-只选一到两个合理候选"></span>
<span id="_5-映射同一内部契约"></span>
<span id="5-映射同一内部契约"></span>
<span id="_6-用相同-fixture-做正负例"></span>
<span id="6-用相同-fixture-做正负例"></span>
<span id="_7-用采用门槛而非印象做决定"></span>
<span id="7-用采用门槛而非印象做决定"></span>
<span id="同条件比较协议"></span>
<span id="固定项与变量"></span>
<span id="指标不要只看成功率"></span>
<span id="最小决策记录"></span>
<span id="多-agent-能力要单独收费和验收"></span>
<span id="framework-lock-in-从状态和-trace-开始"></span>
<span id="在本项目做一次离线选型练习"></span>
<span id="前置条件与固定输入"></span>
<span id="命令"></span>
<span id="预期输出与断言"></span>
<span id="证据边界"></span>
<span id="常见反模式"></span>
<span id="采用门槛"></span>
<span id="检查题"></span>

<span id="agent-framework-对照与选型方法"></span>

## 四个实际运行的例子

| 框架与固定版本 | 本例观察什么 | 何时值得评估 |
| --- | --- | --- |
| [LangGraph 1.2.11](/frameworks/langgraph) | 条件图、聚合、暂停与恢复 | 业务状态和恢复点是主要难点 |
| [Agents SDK 0.22.1](/frameworks/openai-agents-sdk) | Runner、模型替身与工具往返 | 需要标准模型—工具循环 |
| [Google ADK 2.8.0](/frameworks/google-adk) | 运行事件和会话状态 | 需要组合 Agent、工具和会话 |
| [AutoGen 0.7.5（存量）](/frameworks/autogen) | 参与者调度与有界终止 | 审计既有协作系统与准备迁移 |

四例共用本地政策材料与验收，全部实际导入对应框架；它们采用不同编排路径，不是同条件性能比较。[FACT:langgraph-overview] [FACT:openai-agents-sdk] [FACT:google-adk] [FACT:autogen-overview]

AutoGen 当前处于 maintenance mode，维护方建议新用户从 [Microsoft Agent Framework](/frameworks/microsoft-agent-framework)开始。[FACT:autogen-maintenance] MAF、DeepAgents、PydanticAI 与 CrewAI 的采用条件见[现代运行时](/frameworks/modern-runtimes)。这些新增候选目前只有 E0 来源与资格设计，不在上述四个真实框架示例中；项目同名 integration 也不能替代上游包执行。

## 先做最小对照

先保留一个普通函数或单循环基线。写清需要改善的是恢复、维护、上下文隔离还是延迟；不能只用代码行数或角色数量衡量。

用相同任务核对工具执行、错误、权限、状态与终止。只有所需能力合格后，再比较任务质量、资源和维护成本。填写[框架选型工作表](/practice/framework-selection)，记录采用、拒绝或暂缓及理由。

<span id="poc-要验证故障-不是重写应用"></span>
<span id="poc-要验证故障不是重写应用"></span>

## 安装与验证

按[前置环境](/guide/prerequisites)准备 Node.js 22+、Python 3.12、uv 0.11.16：

```bash
npm run frameworks:prepare
npm run frameworks:check
```

准备步骤下载锁定依赖，检查步骤离线运行四例和四个错误产物负例。预期每个示例都保留来源冲突，工具确实执行，外部连接尝试为零。

固定输入为 `examples/frameworks/materials.json` 与 `replay-answer.json`，结果必须包含 30/45、两份来源和 `conflict`；验收从材料独立计算。LangGraph 使用确定性节点，其余三例使用模型替身或回放，都没有调用真实模型。2026-09-08 公共记录及源码/锁文件 hash 见 `lab/results/public/frameworks/summary.json`，对应执行时字节保存在 `maintenance/execution-sources/frameworks.json`；不能把历史 hash 当作当前工作树身份。重跑写入 `lab/results/local/frameworks/summary.json`，不覆盖公共记录。

<span id="失败归因顺序"></span>
<span id="失败、停止、清理与回退"></span>
<span id="失败停止清理与回退"></span>

## 失败、清理与回退

失败时只运行对应框架入口定位，不临时安装浮动版本。会话和客户端由示例关闭；本地汇总在忽略的结果目录中，可以保留。回退恢复该示例的代码和锁文件。

E1 能证明这些固定运行路径，不证明真实模型、生产持久化或某框架优于其他框架。根环境继续保持最小依赖，四个示例不会改变它的导入集合。
