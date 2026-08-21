# V1 Review Round 02：学习路径、信息架构和作品集

## 结论

本轮基于 `review-v1-round-02-baseline` 发现并修复一个共同根因 P2：正式学习入口仍指向 legacy `/practice/` 页面，环境页仍把已完成能力写成未来工作，作品集也缺少可重复使用的统一评分锚点。

## 修改前证据

- Baseline：`17c4b9c47ccdc7a56a5866f1ba27331944c4c3fe`
- Findings commit：`58c542a`
- Finding：`R02-P2-01`
- 详细复现：`artifacts/reviews/v1/round-02/findings.md`

## 修正

- 把三条学习路线迁到 `models/`、`evaluation/`、`labs/` 和正式诊断页面。
- 区分站点、Python/uv lab、视觉检查和离线容器的环境要求。
- 给四个作品集维度增加 0/50/75/100 统一评分锚点和逐维证据要求。
- 新增 `learning:check` 与负例 self-test，并纳入 `npm run verify`。

## 验证与边界

`npm run learning:check`、`npm run learning:self-test` 和 `npm run verify` 均通过。内容结果 commit 为 `ca9c6c9`。本轮只证明学习路径、环境入口和评分 rubric 的一致性；没有调用真实模型/API，没有产生费用，也没有远程操作。
