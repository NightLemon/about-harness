# V1 Review Round 10：发布、来源时效与全局一致性

## 结论

本轮基于 `review-v1-round-10-baseline` 修复一个 P1 和两个 P2：review 门禁原先只数文件存在，事实注册表没有约束正文锚点，Node 运行基线又在 22 与 24 之间矛盾。修正后，十轮证据必须绑定可解析 commit lineage、annotated tags、artifact hash 和真实 Git patch；每条非 retired 事实必须出现在其 `Used by` 页面；项目统一要求 Node.js 22+，CI 与发布以 22 为最低基线。

## 修改前证据

- Baseline：`621ec3cb48569434a4f283275c7d2ab1083d33c2`
- Baseline tag：`review-v1-round-10-baseline`
- Findings commit：`6294de1`
- Findings：`R10-P1-01`、`R10-P2-02`、`R10-P2-03`
- 官方复核：三份 OpenAI 官方页面的 2026-08-21 浏览器 DOM SHA256 记录在 `baseline.json` 和[来源页](/references/sources)

## 修正

### Review 与 release 证据链

- `reviews:check` 解析短/完整 SHA 到真实 commit，验证 baseline/findings/content/evidence 祖先关系、annotated baseline/complete tags、证据文件存在于 complete tag，以及 patch 与声明路径的真实 Git diff 一致。
- 空文件、伪造非空 evidence、错误 hash、lightweight tag、错 lineage 和缺失 release gate 都有 fail-closed canary。
- 新增版本化 release candidate schema、`release:check` 与 `release:self-test`；RC 必须绑定十轮、30 天事实、许可、隐私、workflow、视觉、公开结果、全量验证和 A3/A4 边界。

### 事实逐项锚点

- 所有非 retired registry 记录必须在其 `Used by` 页面出现 `[FACT:ID]`，错路由或零引用会失败。
- 为 `boundary-harness`、`review-legacy` 和审计时额外暴露的 `mcp-spec` 补充正文锚点。
- 来源页追加 Round 10 DOM 指纹，并明确指纹不是滚动页面的永久快照。

### Node 运行基线

- `package.json` 与 lockfile 声明 `engines.node >=22`。
- README、前置知识和实验环境统一为 Node.js 22+；CI/deploy/facts workflow 继续固定 Node 22，单次实验记录实际 runtime。
- 教程门禁同时校验 package、lockfile、三份文档和三份 workflow，并用 Node 24-only 负例证明矛盾会被拒绝。

## 验证

- `npm run reviews:check`
- `npm run checks:self-test`
- `npm run facts:check` 与 `npm run facts:release`
- `npm run tutorial:check` 与 `npm run tutorial:self-test`
- `npm run release:self-test`
- `REVIEWS_ALLOW_PENDING=10 npm run verify`（complete tag 创建前）
- complete tag 创建后再次运行正常 `npm run reviews:check` 和 `npm run verify`

完整命令、退出码、环境、hash 和未决项见 `artifacts/reviews/v1/round-10/`。有效完成标签为 `review-v1-round-10-complete`。

## 证据边界

本轮只使用本地离线验证和只读官方来源复核，仍为 E1。没有真实模型/API、费用、remote、push、PR、Pages 或发布；release candidate 的线上状态必须保持“未发布”。
