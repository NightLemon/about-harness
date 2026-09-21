# OpenAI Agents SDK：可运行的离线示例

本页用实际框架代码处理两份互相冲突的本地政策。框架版本固定为 0.22.1；模型输出来自回放，运行证据为 E1。[FACT:openai-agents-sdk]

<span id="先决定是否需要-sdk"></span>
<span id="sdk-与完整-harness-的边界"></span>
<span id="用六个契约理解-sdk"></span>
<span id="agent-definition-一个-specialist-的静态身份"></span>
<span id="agent-definition一个-specialist-的静态身份"></span>
<span id="tool-模型请求与应用副作用分离"></span>
<span id="tool模型请求与应用副作用分离"></span>
<span id="handoff-所有权转移-不是消息广播"></span>
<span id="handoff所有权转移不是消息广播"></span>
<span id="guardrail-与-human-review-明确暂停点"></span>
<span id="guardrail-与-human-review明确暂停点"></span>
<span id="result、session-与-trace-三种不同记录"></span>
<span id="resultsession-与-trace三种不同记录"></span>
<span id="单-agent-先于多-agent"></span>
<span id="最小架构草图"></span>
<span id="设计-handoff-时避免上下文泄漏"></span>
<span id="评测的是完整工作流"></span>
<span id="采用前门槛"></span>
<span id="在本项目验证责任边界"></span>
<span id="前置条件与固定输入"></span>
<span id="命令"></span>
<span id="预期输出与断言"></span>
<span id="证据边界"></span>
<span id="学习检查表"></span>
<span id="检查题"></span>

<span id="openai-agents-sdk"></span>

## 前置与输入

需要 Python 3.12、uv 0.11.16；npm 入口还需要 Node.js 22+。示例有独立 pyproject 和 uv.lock，位于 `examples/frameworks/openai-agents-sdk/`。共同输入为 `materials.json` 与固定的 `replay-answer.json`。

首次准备会下载锁定依赖：

```bash
npm run frameworks:prepare
```

<span id="runner-运行状态机-不是业务正确性证明"></span>
<span id="runner运行状态机不是业务正确性证明"></span>

## 运行与核对

```bash
npm run frameworks:check -- openai-agents-sdk
```

该命令先执行正常路径，再提交引用缺失的错误产物；外层退出 0 表示正例和拒绝负例都符合预期。model_requests=2、tool_calls=1、tool_result_received=true。最终答案经过独立的本地材料验收。

最终结果必须保留 30/45 两个值、两份来源和 conflict 状态。验收从本地材料重新计算，固定答案不决定验收标准。

## 关键调用

Agent 注册本地工具，Runner 真正执行两轮调用；自定义 Model 先返回函数请求，再检查带原 call_id 的函数结果，最后返回固定回放答案。

直接入口是 `demo.py`，可逐行对应框架调用与输出。共享防线在导入框架前设置遥测关闭变量，并拦截 Python socket 的外部 DNS/连接，仅放行本机地址；结果断言被拦截的外部连接尝试为零。这是示例内的运行探针，不是操作系统网络沙箱。

<span id="失败归因"></span>
<span id="失败、停止、清理与回退"></span>
<span id="失败停止清理与回退"></span>

## 失败与恢复

可直接观察负例：

```bash
uv run --project examples/frameworks/openai-agents-sdk --frozen --offline python examples/frameworks/openai-agents-sdk/demo.py --inject-failure
```

预期非零退出并报告产物验证失败。无法导入固定包、工具没执行、状态不符或出现外部连接时，停止引用结果，核对当前锁文件和首个错误。

运行只保留脚本输出与本地汇总；会话、客户端和进程结束后释放。回退同时恢复示例代码与对应锁文件，不更新所有框架来掩盖单个失败。

## 边界与选型

没有调用 OpenAI 网络、测试真实模型或运行流式协议；tracing 显式关闭。该示例支持对这一运行时接缝的判断，不构成产品质量排名。选型方法见[框架对照](/frameworks/comparison)。

来源：[官方资料](https://developers.openai.com/api/docs/guides/agents)于 2026-09-21 复核；固定包的离线执行记录来自 2026-09-08，见 `lab/results/public/frameworks/summary.json`。来源 E0 与固定路径 E1 分开记录。
