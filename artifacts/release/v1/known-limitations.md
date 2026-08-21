# V1 Release Candidate 已知限制

## 证据边界

- 当前 release candidate 的最高证据等级是 **E1**：固定 fixture、fake/replay、离线 runner、容器/本地门禁和只读来源核对。它不能证明真实模型、provider 或线上产品组合的质量。
- **A3 未使用**：没有读取凭据、调用真实模型 API 或产生费用。E2 烟测与 E3 正式比较均未运行。
- **A4 未使用**：没有 remote、push、PR、远程 GitHub Actions、Pages 设置或发布。站点仍为**未发布**；本地 smoke 不能证明真实 Pages URL、响应头或组织策略。
- 20-task × 3-repeat 的正式矩阵要求 120 个 cells；当前公开 E1 样例只有 12 个，缺少 108 个，因此 `promotion_eligible=false`，不得形成模型排行榜或“最优配置”结论。

## 运行与事实限制

- Node.js 22+ 是支持范围，CI/deploy/facts workflow 使用 Node.js 22；本轮本地证据来自 Node.js 24.14.0。未逐一实测未来 Node 主版本。
- Python runner 要求 3.11+，CI/容器基线可能使用 3.12；第三方 Browser Use、LangGraph、PydanticAI、LlamaIndex 在案例中仅作为 offline contract seam，没有导入或 live 调用。
- 外链检查默认只验证 HTTPS URL 结构。三份 Round 10 官方来源的 DOM SHA256 只绑定 2026-08-21 当次可见文本，不是永久网页快照；发布时仍须满足 30 天事实窗口。
- 静态 VitePress 无法替 GitHub Pages 配置全部 HTTP 安全响应头；这些响应头必须在 M9 获得 A4 后对真实部署实测。

## 发布与恢复

- 本地 `/about-harness/` smoke 覆盖 16 条关键路由和 23 个同源资源；未测试 `<owner>.github.io` 的真实 origin、branch protection、Pages 可见性或 deploy workflow run。
- 4173 端口在 RC 验证时已被既有进程占用；没有终止未知进程，改用 4174 启动当前构建。该恢复不影响静态 artifact，但说明本地服务端口不是发布事实。
- 若 M9 发现内容、base、响应头或 smoke 缺陷，必须返回 M8 形成新 RC；不得移动本 RC tag、force push 或在发布阶段临时篡改 artifact。
