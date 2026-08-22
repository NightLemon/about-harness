# About Harness

面向中文工程师的 agent harness 学习项目：从模型、上下文、指令、工具、权限、记忆和可靠执行出发，最终用可复现实验回答“一个指定模型在明确工作负载与 Codex、Pi、Claude Code 等环境中怎样配置得更好”。

## 当前状态

M0–M9 与 V1 Review Round 01–11 已完成；原 living [`EXECUTION_PLAN.md`](EXECUTION_PLAN.md) 已关闭并保留为简短状态入口，完整历史计划和已结束 Goal 均已归档，不能作为后续授权。Round 12 正在收口治理状态与 release clean-worktree 门禁。仓库中旧有的十轮记录已原样迁入 `docs/reviews/legacy/`，因缺少冻结 baseline、逐轮 diff、result commit/tag 和环境元数据，**不计入 v1 的审阅**。

V1 学习站点已从 commit `e13bd93` 发布到 <https://nightlemon.github.io/about-harness/>；CI、Deploy 与 2026-08-22 的 HTTP 200 记录见 [`publication-result.json`](artifacts/release/v1/publication-result.json)。RC3 的 `pending-publication` 保留为发布前历史快照。发布没有调用真实模型 API、使用模型凭据或产生费用；所有模型性能结论默认最高为离线 E1，除非文档明确给出 E2/E3 证据。

## 本地运行

要求 Node.js 22+ 与 npm；CI 与发布自动化以 Node.js 22 为最低发布基线。

```bash
npm ci
npm run docs:dev
```

当前完整检查：

```bash
npm run check
npm run facts:check
npm run reviews:check
npm run publication:check
```

文档入口为 [`docs/index.md`](docs/index.md)，站点配置为 [`docs/.vitepress/config.mts`](docs/.vitepress/config.mts)。学习顺序、作品集与项目治理分别见：

- [`docs/guide/start.md`](docs/guide/start.md)
- [`docs/guide/portfolio.md`](docs/guide/portfolio.md)
- [`docs/meta/review-method.md`](docs/meta/review-method.md)

## 内容原则

- 分开稳定机制、产品事实、本项目建议和示例。
- 易变产品事实就近引用官方来源，并登记版本与核对日期。
- 模型优化绑定模型身份、harness、任务集、配置、预算和证据等级，不给通用排行榜。
- 教程包含输入、命令、预期输出、失败情景、验证、停止和恢复。
- 默认离线、最小权限；secret、私人轨迹和未授权数据不得进入公开结果。

## 许可

代码使用 [MIT](LICENSE)，文档使用 [CC BY 4.0](LICENSE-DOCS)。第三方 fixture、图像和引用仍受其各自许可约束。
