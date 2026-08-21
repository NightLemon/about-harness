# V1 Review Round 03：Harness 架构、可靠执行和最小实现

## 结论

本轮基于 `review-v1-round-03-baseline` 修复一个 P1 和一个 P2：不可信 adapter 可以用负数或非有限成本绕过预算，重试 trace 记录了退避却没有实际等待。两者都会让控制面证据与真实执行不一致。

## 修改前证据

- Baseline：`d4603b08e5cd09851107864d991c5506be19f382`
- Findings commit：`e94a655`
- Findings：`R03-P1-01`、`R03-P2-02`
- 详细复现：`artifacts/reviews/v1/round-03/findings.md`

## 修正

- 对 budget、action 和 checkpoint 的计数、成本有限性及字段组合做运行时验证。
- 在 adapter 信任边界拒绝错误返回类型，并统一产生 `INVALID_ACTION` 结果。
- 默认执行真实指数退避，同时允许测试注入 sleeper 并断言延迟序列。
- 增加负成本、NaN/Infinity、坏 checkpoint、错误 action 类型和退避等待测试。
- 明确总 deadline 只在调用边界检查，不能强制终止任意阻塞 Python callable。

## 验证与边界

定向 pytest、Ruff、Pyright、`npm run docs:check` 和完整 `npm run verify` 均通过；全量结果为 33 项 pytest。内容结果 commit 为 `bcf22da`。本轮没有真实模型/API、费用或远程操作。
