# AutoGen 离线示例

Python 3.12、uv 0.11.16；AutoGen 0.7.5 及传递依赖由本目录 uv.lock 固定。输入为上级目录的合成材料和回放答案。

从仓库根目录准备（可联网下载依赖），再离线运行：

```bash
uv sync --project examples/frameworks/autogen --frozen --python 3.12
uv run --project examples/frameworks/autogen --frozen --offline python examples/frameworks/autogen/demo.py
```

RoundRobinGroupChat 调度 reader 和 reviewer。ReplayChatCompletionClient 给出固定工具请求和答案；显式声明函数调用能力，并组合消息上限与终止词。

预期：tool_calls=1、terminated=true，最终发言来自 reviewer；参与者与消息数量可从结果核对。 错误产物通过 `--inject-failure` 触发非零退出。出现外部连接、未知版本或验收失败时停止；临时内存状态随进程释放，回退恢复本目录代码和锁文件。

E1：实际框架、假模型、本地材料。固定回放只验证协作与终止路径，不证明多智能体比单智能体更准确或更省成本。
