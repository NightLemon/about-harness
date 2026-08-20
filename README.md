# About Harness

面向中文工程师的 agent harness 学习项目：从模型、上下文、指令、工具、权限、记忆和可靠执行出发，最终用可复现实验回答“一个指定模型在明确工作负载与 Codex、Pi、Claude Code 等环境中怎样配置得更好”。

## 当前状态

项目正在按 [`EXECUTION_PLAN.md`](EXECUTION_PLAN.md) 重建。仓库中旧有的十轮记录已原样迁入 `docs/reviews/legacy/`，但因缺少冻结 baseline、逐轮 diff、result commit/tag 和环境元数据，**不计入 v1 的十轮审阅**。新的 v1 review 只有在证据契约全部满足后才会标记完成。

当前阶段不会调用真实模型 API、使用凭据、产生费用或执行远程发布。所有模型性能结论默认最高为离线 E1，除非文档明确给出 E2/E3 证据。

## 本地运行

要求 Node.js 22 与 npm。

```bash
npm ci
npm run docs:dev
```

当前完整检查：

```bash
npm run check
npm run facts:check
npm run reviews:check
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
