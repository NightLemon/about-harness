# Harness 学习文档项目执行计划 v1（已关闭）

状态：**Closed。M0–M9 已完成，原 living execution plan 不再是活动计划或授权控制面。**

## 当前状态入口

- M0–M9 已完成；V1 已从 commit `e13bd93` 发布到 <https://nightlemon.github.io/about-harness/>。
- 仓库级活动 Goal：无。历史 Goal 和计划中的授权均已用毕，不能授予后续操作。
- V1 review 的当前状态以 [`docs/reviews/v1/index.md`](docs/reviews/v1/index.md) 及对应 evidence commits/annotated tags 为准。
- 发布结果以 [`artifacts/release/v1/publication-result.json`](artifacts/release/v1/publication-result.json) 为准；RC1–RC3 保留为发布前历史快照。

## 历史审计入口

- 完整 M0–M9 计划原文：[`artifacts/plans/execution-plan-v1-m0-m9.md`](artifacts/plans/execution-plan-v1-m0-m9.md)
- 已结束的 M6–M8 Goal 原文：[`artifacts/goals/active-goal-m6-m8.md`](artifacts/goals/active-goal-m6-m8.md)
- Review 方法：[`docs/meta/review-method.md`](docs/meta/review-method.md)

历史文件中的“进行中”、授权、暂停条件和恢复点只描述当时状态，不是当前阻碍，也不能复用为真实 API、费用、remote、push、PR、Pages 或发布授权。新的工作应从最新已验收 commit/tag 和干净工作树开始，并按实际范围重新取得所需授权。
