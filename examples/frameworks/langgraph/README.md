# LangGraph 离线示例

Python 3.12、uv 0.11.16；LangGraph 1.2.11 及传递依赖由本目录 uv.lock 固定。输入为上级目录的合成材料和回放答案。

从仓库根目录准备（可联网下载依赖），再离线运行：

```bash
uv sync --project examples/frameworks/langgraph --frozen --python 3.12
uv run --project examples/frameworks/langgraph --frozen --offline python examples/frameworks/langgraph/demo.py
```

StateGraph 定义读取、汇总与复核节点，条件边把冲突送到人工关口；InMemorySaver 保存暂停状态，Command(resume=True) 恢复同一运行。

预期：interrupted=true、resumed=true、tool_calls=1，恢复后 next 为空；读取节点没有因恢复重复运行。 错误产物通过 `--inject-failure` 触发非零退出。出现外部连接、未知版本或验收失败时停止；临时内存状态随进程释放，回退恢复本目录代码和锁文件。

E1：实际框架、假模型、本地材料。进程内状态不提供跨进程持久恢复，也不替代外部写入对账。
