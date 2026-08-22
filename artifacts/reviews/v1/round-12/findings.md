# Round 12 修改前 Findings

- Round：12
- Baseline：`b52f09c8e05d5ad81fff7bef13a9233482654d6b`
- Baseline tag：`review-v1-round-12-baseline`
- Previous evidence：`review-v1-round-11-complete` / `b52f09c8e05d5ad81fff7bef13a9233482654d6b`
- Rubric：已结束 Goal/执行计划的治理收口、Round 11 状态一致性与 release clean-worktree 门禁
- 记录时间：2026-08-22 18:17 +08:00
- 状态：已在任何 Round 12 修正前冻结

## R12-P2-01：Release checker 放行已失效的根目录 Goal 控制文件

- 严重性：P2
- 位置：`scripts/release-check.mjs`、`scripts/test-release-check.mjs`
- 复现：clean-worktree 检查显式过滤 `?? ACTIVE_GOAL.md`，因此在仓库根目录新增一个未跟踪的同名文件后，`release:check` 仍可通过。当前真实 Goal 已结束并归档，根目录已不存在该文件。
- 影响：一个可能承载旧授权、旧恢复点或并发指令的控制文件可以绕过 release 的干净工作树断言；后续维护者可能把它误认为当前控制面。
- 修正要求：删除这个单文件例外，使任何未跟踪的 `ACTIVE_GOAL.md` 都触发失败；在隔离 fixture 中增加能复现修改前错误通过的负例。

## R12-P3-02：Round 11 索引同时显示“正在复核”和“完成”

- 严重性：P3
- 位置：`docs/reviews/v1/index.md`
- 复现：导语称“Round 11 正在复核”，同页表格、Round 11 正文、verification 和 annotated complete tag 均已显示完成。
- 影响：读者无法从 review 入口判断当前审阅状态；也使机器证据与面向人的状态文案不一致。
- 修正要求：将导语改为 Round 11 已完成，并登记进行中的 Round 12；完成证据生成后再把 Round 12 状态切换为完成。

## R12-P3-03：已结束的 living execution plan 仍占据当前状态入口

- 严重性：P3
- 位置：`EXECUTION_PLAN.md`、`README.md`、`docs/meta/changelog.md`、`artifacts/goals/active-goal-m6-m8.md`
- 复现：`EXECUTION_PLAN.md` 已明确 M0-M9 全部完成且不是 Goal 授权锚点，但仍以 1,258 行 living plan 留在根目录；README 和 changelog 仍把它作为当前权威进度入口。归档 Goal 正文包含执行期的“M6 进行中”，只有顶部历史说明能消歧。
- 证据边界：`artifacts/goals/active-goal-m6-m8.md` 是已结束控制器的原文归档，其内部旧状态是历史证据，不能删除或改写。完整执行计划同样应保留，但无需继续伪装成活动计划。
- 影响：新任务容易把已用毕的授权、暂停条件或恢复点当成当前阻碍；根目录状态入口的信噪比过低。
- 修正要求：把完整 M0-M9 计划移动到历史 artifacts；根目录保留简短的 closed-plan 索引，明确没有仓库级 active Goal、历史文件不授予权限，并链接当前 review/publication 证据。同步更新 README 和 changelog。

## 计数与范围

本轮记录 1 个 P2、2 个 P3，均纳入治理收口。Round 11 遗留的短页面深度、E1 labs 语义和自动 a11y 三项 P3 原样保留，不在本轮扩展范围。
