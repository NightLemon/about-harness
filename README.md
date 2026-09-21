# About Harness

面向中文工程师的 Agent Harness（智能体运行与控制系统）实用手册。主线连接任务、模型、工具、权限、状态、独立验收和评测；产品事实与实验结果分开记录。

## 开始学习

阅读[学习路径](docs/guide/start.md)，或直接运行[端到端案例](docs/practice/end-to-end.md)。用[Agent 生态全景](docs/ecosystem/overview.md)定位模型服务、Harness、框架、协议、知识、部署、应用与评测的职责；准备面试时完成[五张迁移卡](docs/guide/interview-practice.md)。已合并页面保留旧地址迁移入口。

前置：Node.js 22+、Python 3.12、uv 0.11.16 和 Git。依赖准备可能联网：

```bash
npm ci
uv sync --frozen --python 3.12
npx playwright install chromium
npm run docs:dev
```

开发服务器仅用于本机预览。停止时使用 Ctrl+C。

## 运行完整实践

```bash
npm run study:demo
npm run labs:source
npm run model:probe
npm run ecosystem:workshop
```

第一条在临时 Git 仓库执行六任务、两配置、一次运行，生成完整 12 单元报告。第二条读取 Markdown/HTML/CSV 并启动本地 Playwright。第三条使用模拟 Responses 传输。第四条用合成记录验证能力与授权、程序化汇总、候选选择与弃权阈值。默认没有真实模型调用或费用；生态工作坊也不执行真实协议握手或供应商环境。

框架示例独立安装，实际使用 LangGraph、Agents SDK、Google ADK 和 AutoGen 的运行时：

```bash
npm run frameworks:prepare
npm run frameworks:check
```

框架真实、模型为替身，证据仍是 E1。原六个固定 JSON 实验和不完整评测样例保留为历史教材。

## 验证与维护

```bash
npm run check
npm run facts:check
npm run pages:check
npm run verify
```

共享站点输出的命令顺序执行。verify 在核心验证之外运行四个独立框架；所有产物先检查来源、许可和敏感数据。检查失败时保留首个错误，不用删除负例恢复绿色。

[贡献指南](CONTRIBUTING.md)、[维护说明](maintenance/development.md)和[逐页修订对照](maintenance/content-review.md)说明范围与验证。全站初审、逐页覆盖和复审历史记录位于 `reports/audits/2026-09-21/`；它们描述当时版本，合并后结果以本轮实际检查为准。源代码使用 MIT，原创文档使用 CC BY 4.0。真实 API、费用、远端写入和发布需单独授权。
