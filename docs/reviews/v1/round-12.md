# V1 Review Round 12：治理状态收口

状态：**完成；修改前 findings、独立修正 commits、真实 diff、验证和未决项已由 evidence commit 与 annotated complete tag 绑定。**

## 复核结论

Round 11 的功能与证据目标已经完成，当前仓库也没有根目录 `ACTIVE_GOAL.md` 或 Codex 活动 Goal。问题集中在生命周期表达没有完全闭环：release checker 仍允许旧控制文件绕过 clean-worktree；review 索引同时把 Round 11 写成“正在复核”和“完成”；已经结束的 1,258 行 living execution plan 仍占据当前状态入口。

本轮冻结并关闭 1 个 P2、2 个 P3。它们不会否定 Round 11 的修复结果，但会让下一项工作误读旧授权、旧恢复点或审阅状态，因此作为独立治理轮处理。

## 冻结基线与方法

基线为 `b52f09c8e05d5ad81fff7bef13a9233482654d6b`，annotated tag 为 `review-v1-round-12-baseline`，同时也是上一轮 evidence commit。复核读取根目录状态、完整 execution plan、归档 Goal、README、changelog、review 入口、Round 11 evidence、release checker 与负例，并用 Git 状态、tag lineage 和实际门禁交叉验证。

历史 `artifacts/goals/active-goal-m6-m8.md` 保持原文不变。完整 M0–M9 计划移动前后的 SHA256 均为 `F8CEA34E7D767B7D39A7751CF9FD373303203E5C6E2E2B9DC6E2848FE40B38B7`，没有删除旧状态或授权证据。

## 修正结果

1. `R12-P2-01`（`e8b513c`）：删除 release checker 对未跟踪 `ACTIVE_GOAL.md` 的特判；隔离 self-test 先在旧实现上以 exit 1 复现错误放行，再验证修正后该文件触发 dirty-worktree 失败，而完全干净的 fixture 仍通过。
2. `R12-P3-02`（`aecc898`）：Round 11 状态改为完成，Round 12 在 review 索引和 changelog 独立登记，避免同页状态冲突。
3. `R12-P3-03`（`aecc898`）：完整计划原样归档到 `artifacts/plans/execution-plan-v1-m0-m9.md`；根目录 `EXECUTION_PLAN.md` 缩为 closed-plan 状态/证据入口，并明确仓库没有活动 Goal、历史授权不能复用。README 和 changelog 同步更新。

Content result 为 `aecc8980ee1bba8ef8a5082781b82fe13623c9f8`。机器证据位于 `artifacts/reviews/v1/round-12/`；有效完成标签为 annotated tag `review-v1-round-12-complete`。

## 验证与证据边界

修改前新增的 stale `ACTIVE_GOAL.md` canary 在旧 checker 上以 exit 1 报告“accepted an untracked stale ACTIVE_GOAL.md”；修正后的 `release:self-test`、干净工作树 `release:check` 和 `REVIEWS_ALLOW_PENDING=12 npm run verify` 均为 exit 0。Pending-tag 全量验证覆盖 12 轮 review、18 条事实（17 verified、1 pending）、42 个 Python 测试、TypeScript、六类离线 labs、许可、secret、workflow、视觉和 publication 门禁。

本轮没有调用真实模型/API、使用凭据、产生费用，也没有 fetch、push、PR、Pages 配置或发布写入。开放项仍只有 Round 11 延续的三个非阻塞 P3：短页面按需深化、E1 labs 语义增强和自动 a11y 门禁。
