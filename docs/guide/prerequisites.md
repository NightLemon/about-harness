# 前置知识与环境

## 适合谁

读者应能使用 Git 与命令行，读懂 Python 或 TypeScript 的基础控制流，并理解 LLM 会生成概率性输出。无需训练模型、管理 GPU 或掌握某个 agent framework。

## 环境基线

项目已经提供 `Dockerfile`、`compose.yaml` 和 devcontainer。容器默认执行无网络、只读文件系统、非 root 的最小 harness smoke；完整站点与评测门禁在本地或 CI 工具链运行。

| 目标 | 必需环境 | 说明 |
| --- | --- | --- |
| 阅读或构建站点 | Node.js 22+、npm | VitePress、文档、事实和 review 检查；CI 以 Node.js 22 为发布基线 |
| 运行离线 lab | Python 3.11+（CI 使用 3.12）、uv 0.11.16 | pytest、Ruff、Pyright、六个离线案例 |
| 运行视觉门禁 | 上述 Node 环境、Playwright Chromium | 1440/390/320 视口、搜索、主题、菜单、表格和锚点 |
| 最小容器 smoke | Docker Compose 或 devcontainer | `network_mode: none`，不需要凭据 |

首次本地准备：

```bash
npm ci
uv sync --frozen
npm run verify
```

只验证最小容器 smoke 时运行 `docker compose run --rm lab-smoke`。Windows、macOS、Linux 都使用同一 lockfile；本地没有 uv 时先使用容器 smoke，不要临时改写依赖版本。

命令失败时停止，不要删除锁文件或盲目升级全部依赖。保存操作系统、Node/npm、Python/uv 版本、命令和退出码，再按仓库根目录 `CONTRIBUTING.md` 的字段形成最小复现；仓库未公开前只保存在本地。

## 概念自检

开始前应能回答：

1. Git 工作树、commit 与 tag 分别保存什么？
2. JSON Schema 能约束什么，不能证明什么？
3. 进程退出码 0 与任务业务正确有什么区别？
4. 为什么同一任务至少需要重复运行？
5. 为什么网页、工具输出和检索结果都可能是不可信输入？

答不出并不阻止学习，但应在实验前补齐相应基础。

## 凭据与费用

离线教程不需要凭据。真实 API、费用与敏感数据必须获得独立授权；不要把 key 写入命令历史、fixture、trace、截图或 Git。没有授权时，所有 live adapter 保持禁用。

## 完成条件

你能运行与目标对应的站点、lab 或容器检查，解释上述五个问题，并准备一个不含私人数据的练习工作负载，才进入[学习路径](/guide/start)。
