# Google ADK 离线示例

Python 3.12、uv 0.11.16；Google ADK 2.8.0 及传递依赖由本目录 uv.lock 固定。输入为上级目录的合成材料和回放答案。

从仓库根目录准备（可联网下载依赖），再离线运行：

```bash
uv sync --project examples/frameworks/google-adk --frozen --python 3.12
uv run --project examples/frameworks/google-adk --frozen --offline python examples/frameworks/google-adk/demo.py
```

LlmAgent 与 Runner 使用 BaseLlm 替身。工具通过 ToolContext 更新会话 reads，工具响应回到下一轮，结束后重新读取会话状态。

预期：tool_calls=1、model_requests=2，事件中包含工具与最终响应，会话状态保留 reads=1。 错误产物通过 `--inject-failure` 触发非零退出。出现外部连接、未知版本或验收失败时停止；临时内存状态随进程释放，回退恢复本目录代码和锁文件。

E1：实际框架、假模型、本地材料。会话使用内存存储；缺失模型用量不会当成真实零用量，没有 Gemini/Vertex 调用。
