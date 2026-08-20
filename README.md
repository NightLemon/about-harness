# About Harness

一套面向 AI agent 使用者与工程师的中文学习文档：理解模型之外的 agent harness，并通过可复现的实验，让特定模型在 Codex、Pi、Claude Code 等环境里更可靠地工作。

## 本地运行

```bash
npm install
npm run docs:dev
```

完整检查：

```bash
npm run check
```

文档入口是 `docs/index.md`，站点配置位于 `docs/.vitepress/config.mts`。GitHub Pages 工作流已放在 `.github/workflows/deploy.yml`；推送前请先阅读[发布说明](docs/meta/publishing.md)。

## 内容原则

- 区分跨 harness 的稳定原理与会随版本变化的产品事实。
- 产品行为优先引用官方文档，并标注核对日期。
- 模型优化必须通过任务集、指标和重复实验验证，不凭主观手感下结论。
- 安全边界、验证闭环和可回滚性属于 harness 质量的一部分。

首个完整版本已完成 10 轮有记录的审阅，内容仍会持续迭代。详见[审阅方法](docs/meta/review-method.md)和[迭代记录](docs/meta/changelog.md)。
