# V1 Review Round 01：范围、术语和知识地图

## 结论

本轮基于 `review-v1-round-01-baseline` 发现并修复一个 P2：知识地图仍把 M3/M4 已交付页面描述成未来工作，并漏掉多个核心主题的直接入口。该缺陷会让读者和覆盖审计误判项目范围。

## 修改前证据

- Baseline：`999a4c3a88409193b0ce0d9da3635e0c1054a1b8`
- Findings commit：`9624c51`
- Finding：`R01-P2-01`
- 详细复现：`artifacts/reviews/v1/round-01/findings.md`

## 修正

- 为知识地图第二至第七层补齐架构、记忆、可靠执行、可观测性、多 Agent、模型适配、framework、领域、实验、评测、安全和发布入口。
- 删除已经失效的 M3/M4 未来时态。
- 新增 `roadmap:check` 与负例 self-test，并纳入 `npm run verify`。

## 验证与边界

`npm run roadmap:check`、`npm run roadmap:self-test` 和 `npm run verify` 均通过。内容结果 commit 为 `becedcd`；完整证据由 annotated tag `review-v1-round-01-complete` 绑定。本轮没有调用真实模型/API，没有产生费用，也没有远程操作。
