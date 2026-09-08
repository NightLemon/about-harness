# Google ADK：可运行的离线示例

本页用实际框架代码处理两份互相冲突的本地政策。框架版本固定为 2.8.0；模型输出来自回放，运行证据为 E1。[FACT:google-adk]

<span id="学习目标与选择问题"></span>
<span id="从业务契约映射-不从类名反推"></span>
<span id="从业务契约映射不从类名反推"></span>
<span id="adk-仍位于-harness-的一部分"></span>
<span id="model-身份先于能力判断"></span>
<span id="session-不等于对话存档"></span>
<span id="tool-与授权是两条链"></span>
<span id="runtime-取消、预算与并发"></span>
<span id="runtime取消预算与并发"></span>
<span id="deployment-是新的证据边界"></span>
<span id="observability-与-evaluation-不互相替代"></span>
<span id="工作例-合成订单解释"></span>
<span id="工作例合成订单解释"></span>
<span id="采用前检查"></span>
<span id="在本项目验证证据边界"></span>
<span id="检查题与下一步"></span>

<span id="google-agent-development-kit-把-agent、session-与部署责任分开"></span>

## 前置与输入

需要 Python 3.12、uv 0.11.16；npm 入口还需要 Node.js 22+。示例有独立 pyproject 和 uv.lock，位于 `examples/frameworks/google-adk/`。共同输入为 `materials.json` 与固定的 `replay-answer.json`。

首次准备会下载锁定依赖：

```bash
npm run frameworks:prepare
```

## 运行与核对

```bash
npm run frameworks:check -- google-adk
```

该命令先执行正常路径，再提交引用缺失的错误产物；外层退出 0 表示正例和拒绝负例都符合预期。tool_calls=1、model_requests=2，事件中包含工具与最终响应，会话状态保留 reads=1。

最终结果必须保留 30/45 两个值、两份来源和 conflict 状态。验收从本地材料重新计算，固定答案不决定验收标准。

## 关键调用

LlmAgent 与 Runner 使用 BaseLlm 替身。工具通过 ToolContext 更新会话 reads，工具响应回到下一轮，结束后重新读取会话状态。

直接入口是 `demo.py`，可逐行对应框架调用与输出。共享运行防线在导入框架前禁用外部网络和遥测；只允许本机事件循环所需连接，并断言没有外部连接尝试。

<span id="失败归因与恢复"></span>

## 失败与恢复

可直接观察负例：

```bash
uv run --project examples/frameworks/google-adk --frozen --offline python examples/frameworks/google-adk/demo.py --inject-failure
```

预期非零退出并报告产物验证失败。无法导入固定包、工具没执行、状态不符或出现外部连接时，停止引用结果，核对当前锁文件和首个错误。

运行只保留脚本输出与本地汇总；会话、客户端和进程结束后释放。回退同时恢复示例代码与对应锁文件，不更新所有框架来掩盖单个失败。

## 边界与选型

会话使用内存存储；缺失模型用量不会当成真实零用量，没有 Gemini/Vertex 调用。该示例支持对这一运行时接缝的判断，不构成产品质量排名。选型方法见[框架对照](/frameworks/comparison)。

来源：[官方资料](https://google.github.io/adk-docs/agents/models/)；本轮于 2026-09-08 核对文档、安装版本并执行离线示例。
