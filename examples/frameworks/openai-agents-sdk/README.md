# OpenAI Agents SDK 离线示例

Python 3.12、uv 0.11.16；OpenAI Agents SDK 0.22.1 及传递依赖由本目录 uv.lock 固定。输入为上级目录的合成材料和回放答案。

从仓库根目录准备（可联网下载依赖），再离线运行：

```bash
uv sync --project examples/frameworks/openai-agents-sdk --frozen --python 3.12
uv run --project examples/frameworks/openai-agents-sdk --frozen --offline python examples/frameworks/openai-agents-sdk/demo.py
```

Agent 注册本地工具，Runner 真正执行两轮调用；自定义 Model 先返回函数请求，再检查带原 call_id 的函数结果，最后返回固定回放答案。

预期：model_requests=2、tool_calls=1、tool_result_received=true。最终答案经过独立的本地材料验收。 错误产物通过 `--inject-failure` 触发非零退出。出现外部连接、未知版本或验收失败时停止；临时内存状态随进程释放，回退恢复本目录代码和锁文件。

E1：实际框架、假模型、本地材料。没有调用 OpenAI 网络、测试真实模型或运行流式协议；tracing 显式关闭。
