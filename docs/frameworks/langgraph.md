# LangGraph：可运行的离线示例

本页用实际框架代码处理两份互相冲突的本地政策。框架版本固定为 1.2.11；节点使用确定性本地函数，不调用模型，运行证据为 E1。[FACT:langgraph-overview]

<span id="学习目标与选择问题"></span>
<span id="从状态-schema-开始-而不是先画箭头"></span>
<span id="从状态-schema-开始而不是先画箭头"></span>
<span id="node-是责任边界"></span>
<span id="edge-必须说明为什么继续"></span>
<span id="确定性与模型步骤混合"></span>
<span id="reducer-与并行合并"></span>
<span id="checkpoint-与-durable-execution-的边界"></span>
<span id="interrupt-与人工关口"></span>
<span id="streaming-与最终状态不同"></span>
<span id="工作例-有冲突来源的研究任务"></span>
<span id="工作例有冲突来源的研究任务"></span>
<span id="评测与采用门槛"></span>
<span id="检查题与下一步"></span>

<span id="langgraph-用显式状态图约束长运行-agent"></span>

## 前置与输入

需要 Python 3.12、uv 0.11.16；npm 入口还需要 Node.js 22+。示例有独立 pyproject 和 uv.lock，位于 `examples/frameworks/langgraph/`。本例读取共同材料 `examples/frameworks/materials.json` 并由节点计算结果；其他三例使用的 `replay-answer.json` 不参与本例生成。

首次准备会下载锁定依赖：

```bash
npm run frameworks:prepare
```

<span id="在本项目运行离线职责接缝"></span>

## 运行与核对

```bash
npm run frameworks:check -- langgraph
```

该命令先执行正常路径，再提交引用缺失的错误产物；外层退出 0 表示正例和拒绝负例都符合预期。interrupted=true、resumed=true、tool_calls=1，恢复后 next 为空；读取节点没有因恢复重复运行。

最终结果必须保留 30/45 两个值、两份来源和 conflict 状态。验收从本地材料重新计算，固定答案不决定验收标准。

## 关键调用

StateGraph 将一次读取拆到两个分支，通过 reducer（归并函数）合并状态后再汇总；条件边把冲突送到复核关口；InMemorySaver 保存暂停状态，Command(resume=True) 恢复同一运行。

直接入口是 `demo.py`，可逐行对应框架调用与输出。共享防线在导入框架前设置遥测关闭变量，并拦截 Python socket 的外部 DNS/连接，仅放行本机地址；结果断言被拦截的外部连接尝试为零。这是示例内的运行探针，不是操作系统网络沙箱。

<span id="失败归因"></span>

## 失败与恢复

可直接观察负例：

```bash
uv run --project examples/frameworks/langgraph --frozen --offline python examples/frameworks/langgraph/demo.py --inject-failure
```

预期非零退出并报告产物验证失败。无法导入固定包、工具没执行、状态不符或出现外部连接时，停止引用结果，核对当前锁文件和首个错误。

运行只保留脚本输出与本地汇总；会话、客户端和进程结束后释放。回退同时恢复示例代码与对应锁文件，不更新所有框架来掩盖单个失败。

## 边界与选型

进程内状态不提供跨进程持久恢复，也不替代外部写入对账。该示例支持对这一运行时接缝的判断，不构成产品质量排名。选型方法见[框架对照](/frameworks/comparison)。

来源：[官方资料](https://docs.langchain.com/oss/python/langgraph/overview)于 2026-09-21 复核；固定包的离线执行记录来自 2026-09-08，见 `lab/results/public/frameworks/summary.json`。来源 E0 与固定路径 E1 分开记录。
