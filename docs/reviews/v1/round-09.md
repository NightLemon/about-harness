# V1 Review Round 09：迁移、中文可读性与视觉体验

## 结论

本轮基于 `review-v1-round-09-baseline` 修复一个 P1 和一个 P2：迁移 runner 原先只检查四个 key 是否存在，未知 harness、空语义和权限扩大仍可能被判为成功；移动截图又可能在导航遮罩未关闭时生成，且没有覆盖迁移页。两项问题现已由结构化迁移契约、负例和三视口视觉证据修复。

## 修改前证据

- Baseline：`a8d45347fb837b4e4581ed7c43a38ead18f6d743`
- Baseline tag：`review-v1-round-09-baseline`
- Findings commit：`51c207b`
- Findings：`R09-P1-01`、`R09-P2-02`
- 详细复现：`artifacts/reviews/v1/round-09/findings.md`

## 修正

- 同时覆盖 Codex → Pi 与 Codex → Claude Code 两条路径，把职责拆为 instructions、tools、sandbox、approval、network、state。
- 每项映射记录 source/target semantics、gap、compensating control、evidence axis 和 boundary-preservation 标记；runner 拒绝未知 harness、空语义、未补偿 gap、边界扩大和整条目标路径逐字复制。
- 新增两类迁移负例，并把 coding、浏览器、研究、数据、文档五类领域状态纳入迁移清单。
- 中文教程明确六类职责与验收输出；兼容矩阵继续把 source、local、seam、live 四条证据轴分开。
- 视觉门禁等待移动菜单真正关闭并核对 `aria-expanded=false`，再生成截图；迁移页加入页面级 overflow、表格可滚动性与实际滚动断言。
- 新建 `artifacts/visual/round-09/`，保存 1440、390、320 三个视口的首页、评测和迁移页共 9 张截图，不覆盖 M6 基线。

## 验证与边界

内容候选的完整 `npm run verify` 通过：117 个 Markdown/route、118 个 HTML、36 项 pytest、Ruff、Pyright、TypeScript、事实、许可、secret、workflow 和三视口 9 张截图均为绿色；加入本轮记录与 artifacts 后再次全量通过 118 个 Markdown/route、119 个 HTML 和 9 份 v1 记录。迁移 E1 runner 输出 `paths_checked=2`、`mapped_responsibilities=12`、`domains_checked=5`，两个负例均被拒绝。内容结果 commit 为 `dc71b0d`。

移动菜单另在 in-app Browser 中核对过 opened → closed；固定 Chromium manifest 记录 390/320 宽迁移表实际横向滚动 159/229px。M6 manifest 未被覆盖。

本轮无真实 harness/model/API、无凭据或费用、无 remote/Pages。结果只证明迁移契约与本地视觉门禁达到 E1，不证明三个产品的实时行为或模型性能。
