# AutoGen：可运行的离线示例

本页用实际框架代码处理两份互相冲突的本地政策。框架版本固定为 0.7.5；模型输出来自回放，运行证据为 E1。[FACT:autogen-overview]

<span id="学习目标与采用问题"></span>
<span id="四层分别解决什么"></span>
<span id="framework-仍不是完整-harness"></span>
<span id="给每个参与者写责任契约"></span>
<span id="conversation、route-与-state-分开"></span>
<span id="conversationroute-与-state-分开"></span>
<span id="多-agent-何时有可测价值"></span>
<span id="工作例-研究、写作与引用验证"></span>
<span id="工作例研究写作与引用验证"></span>
<span id="工具、权限与不可信消息"></span>
<span id="工具权限与不可信消息"></span>
<span id="可靠性与恢复"></span>
<span id="评测和采用门槛"></span>
<span id="在本项目验证证据边界"></span>
<span id="检查题与下一步"></span>

<span id="autogen-从对话原型到可控多-agent-系统"></span>

## 前置与输入

需要 Python 3.12、uv 0.11.16；npm 入口还需要 Node.js 22+。示例有独立 pyproject 和 uv.lock，位于 `examples/frameworks/autogen/`。共同输入为 `materials.json` 与固定的 `replay-answer.json`。

首次准备会下载锁定依赖：

```bash
npm run frameworks:prepare
```

## 运行与核对

```bash
npm run frameworks:check -- autogen
```

该命令先执行正常路径，再提交引用缺失的错误产物；外层退出 0 表示正例和拒绝负例都符合预期。tool_calls=1、terminated=true，最终发言来自 reviewer；参与者与消息数量可从结果核对。

最终结果必须保留 30/45 两个值、两份来源和 conflict 状态。验收从本地材料重新计算，固定答案不决定验收标准。

## 关键调用

RoundRobinGroupChat 调度 reader 和 reviewer。ReplayChatCompletionClient 给出固定工具请求和答案；显式声明函数调用能力，并组合消息上限与终止词。

直接入口是 `demo.py`，可逐行对应框架调用与输出。共享运行防线在导入框架前禁用外部网络和遥测；只允许本机事件循环所需连接，并断言没有外部连接尝试。

## 失败与恢复

可直接观察负例：

```bash
uv run --project examples/frameworks/autogen --frozen --offline python examples/frameworks/autogen/demo.py --inject-failure
```

预期非零退出并报告产物验证失败。无法导入固定包、工具没执行、状态不符或出现外部连接时，停止引用结果，核对当前锁文件和首个错误。

运行只保留脚本输出与本地汇总；会话、客户端和进程结束后释放。回退同时恢复示例代码与对应锁文件，不更新所有框架来掩盖单个失败。

## 边界与选型

固定回放只验证协作与终止路径，不证明多智能体比单智能体更准确或更省成本。该示例支持对这一运行时接缝的判断，不构成产品质量排名。选型方法见[框架对照](/frameworks/comparison)。

来源：[官方资料](https://microsoft.github.io/autogen/stable/reference/python/autogen_ext.models.replay.html)；本轮于 2026-09-08 核对文档、安装版本并执行离线示例。
