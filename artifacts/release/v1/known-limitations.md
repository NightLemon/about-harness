# V1 Release Candidate 已知限制

## 证据边界

- 当前 release candidate 的最高证据等级是 **E1**：固定 fixture、fake/replay、离线 runner、容器/本地门禁和只读来源核对。它不能证明真实模型、provider 或线上产品组合的质量。
- **A3 未使用**：没有读取凭据、调用真实模型 API 或产生费用。E2 烟测与 E3 正式比较均未运行。
- **A4 已用于发布准备**：已经创建公开 remote、推送 RC1 历史与 tags、启用 branch protection 和 Pages，并观察到首次 workflow 的浅克隆失败。RC2 仍为 **pending-publication（尚未发布）**；在新的 PR、CI、deploy 与线上 smoke 全部通过前，不得声称已发布成功。
- 20-task × 3-repeat 的正式矩阵要求 120 个 cells；当前公开 E1 样例只有 12 个，缺少 108 个，因此 `promotion_eligible=false`，不得形成模型排行榜或“最优配置”结论。

## 运行与事实限制

- Node.js 22+ 是支持范围，CI/deploy/facts workflow 使用 Node.js 22；本轮本地证据来自 Node.js 24.14.0。未逐一实测未来 Node 主版本。
- Python runner 要求 3.11+，CI/容器基线可能使用 3.12；第三方 Browser Use、LangGraph、PydanticAI、LlamaIndex 在案例中仅作为 offline contract seam，没有导入或 live 调用。
- 外链检查默认只验证 HTTPS URL 结构。三份 Round 10 官方来源的 DOM SHA256 只绑定 2026-08-21 当次可见文本，不是永久网页快照；发布时仍须满足 30 天事实窗口。
- 静态 VitePress 无法替 GitHub Pages 配置全部 HTTP 安全响应头；这些响应头必须在 M9 获得 A4 后对真实部署实测。

## 发布与恢复

- 公开构建只包含 85 个学习页面；`docs/reviews/**`、`meta/changelog` 与 `meta/review-method` 保留在仓库治理范围，不进入 Pages artifact。本地 smoke 不证明真实 Pages origin、响应头或 deploy workflow 结果。
- VitePress preview 会把 artifact 挂到根路径，不能模拟项目 Pages 的 `/about-harness/` clean URL。RC2 使用仓库内的项目路径感知静态服务在 4175 端口完成本地 smoke；端口本身不是发布事实。
- RC1 tag 保持原位；RC2 用新的 commit 与 annotated tags 记录本次恢复。不得 force push、移动公开 tag 或在部署阶段临时篡改 artifact。
