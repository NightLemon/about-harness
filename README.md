# About Harness

面向中文读者的 AI agent harness（承载和约束智能体循环的工作环境）实用手册。项目把稳定原理、产品事实、配置示例和离线实验分开，帮助你针对明确任务选择模型与工作环境，并用可复现证据验证调优是否真的有效。

## 项目价值

读完并完成实验后，你应能回答四个问题：任务真正需要模型做什么；Codex、Pi、Claude Code 等 harness 分别在哪里注入指令、工具与权限；一次配置变化改善了哪项指标；失败时怎样停止、定位和回滚。站点不提供脱离工作负载的“最佳模型”排行榜，也不把离线脚本成功当作真实模型质量。

## 快速开始

需要 Node.js 22+；运行 Python 实验还需要 Python 3.11+ 与 `uv 0.11.16`。

```bash
npm ci
npm run docs:dev
```

完整本地验证：

```bash
npm run verify
```

`npm run check` 覆盖文档、内容契约、示例、构建和离线实验；`npm run pages:check` 以 `/about-harness/` 项目路径完成独立构建与三视口视觉检查。开发服务器只用于可信本机，不要以 `--host 0.0.0.0` 暴露到公网。

## 学习路线

- 从[学习路径](docs/guide/start.md)和[知识地图](docs/guide/roadmap.md)建立全局心智模型；
- 用[指定模型适配](docs/models/adaptation.md)和[模型—Harness 匹配](docs/optimization/model-fit.md)设计对照实验；
- 在[Codex](docs/harnesses/codex.md)、[Pi](docs/harnesses/pi.md)、[Claude Code](docs/harnesses/claude-code.md)中映射指令、配置、权限和回滚；
- 通过[实验环境](docs/labs/setup.md)运行六个离线案例，再用[评测方法](docs/evaluation/method.md)解释结果边界。

站点正文入口是 [docs/index.md](docs/index.md)，产品事实及核对日期集中在 [fact-registry.md](docs/references/fact-registry.md)。

## 实验与证据

离线 fake/replay fixture 是默认路径，live adapter 默认关闭。六个案例覆盖 coding、浏览器、研究、数据、文档与跨 harness 迁移，只证明项目职责接缝在固定 fixture 上可执行（E1）；它们没有调用真实模型、不能证明上游 framework 已运行，也不能外推模型质量。运行结果记录 task、trace、fixture hash、配置、退出码和失败分类。

```bash
uv run --frozen --offline python scripts/run-labs.py all
npm run eval:validate
npm run eval:summary
```

## 贡献与维护

提交内容前阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。易变产品事实需引用官方来源并写核对日期；教程需有前置条件、固定版本、输入、命令、预期、断言、失败案例、清理、回滚与限制。依赖使用锁文件；GitHub Actions 固定完整 SHA；公开结果必须通过 secret、隐私和许可检查。

GitHub Pages 由 `.github/workflows/deploy.yml` 构建静态站点。远程、push、PR、Pages 设置和发布都需要单独授权；本地实现与验证不会隐含获得这些权限。

## 许可

代码使用 [MIT](LICENSE)，原创文档使用 [CC BY 4.0](LICENSE-DOCS)。第三方 fixture、图像和引用仍受各自许可约束。
