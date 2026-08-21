# Round 03 修改前 Findings

- Round：03
- Baseline：`d4603b08e5cd09851107864d991c5506be19f382`
- Baseline tag：`review-v1-round-03-baseline`
- Rubric：Harness 架构、可靠执行和最小实现
- 记录时间：2026-08-21 11:14 +08:00
- 状态：已在任何 round-03 修正前冻结

## R03-P1-01：不可信 adapter 可用负数/非有限成本绕过预算，契约边界未被运行时验证

- 严重性：P1
- 位置：`lab/src/about_harness/contracts.py`、`lab/src/about_harness/loop.py`、`lab/tests/`
- 复现：在 `max_cost_usd=0` 的任务中让 fake adapter 返回 `Action.complete(..., cost_usd=-1.0)`；baseline 输出为 `completed completed -1.0`。`Budgets(max_cost_usd=NaN)`、负数 checkpoint 计数和错误类型的 adapter 返回值也没有统一边界校验。
- 影响：模型/adapter 控制的数据可以降低累计成本、绕过停止门禁、产生负指标，或在 `next_action` 返回后让 runner 未捕获地崩溃；这与“adapter 是显式信任边界、预算由 harness 控制”的正文相冲突。
- 根因：dataclass 只验证了部分 task 字段，runner 在读取 action 字段前没有把外部返回值转换为受信任契约。
- 修正要求：验证 budget/action/checkpoint 的数值有限性和非负性、action kind/字段组合，并在 runner 边界把无效返回统一转换为 `INVALID_ACTION`；加入预算绕过和错误返回的负例。

## R03-P2-02：重试事件声称等待指数退避，但默认执行路径实际零等待

- 严重性：P2
- 位置：`lab/src/about_harness/retry.py`、`lab/src/about_harness/tools.py`、`docs/foundations/state-reliability.md`
- 复现：以 `base_backoff_ms=1000` 让操作前两次抛 `RetryableError`；baseline 三次尝试在 `0.0s` 内完成。`run_with_retry` 只有调用者显式传入 `sleep` 才等待，而 `ToolRegistry.execute` 从不传入。
- 影响：trace 中记录了 `delay_ms`，实际却没有退避；真实 transient failure 会被紧密重试，文档、trace 和运行行为不一致。
- 根因：测试只断言 retry 事件数量，没有把 sleeper 作为可注入依赖并验证实际延迟序列。
- 修正要求：默认使用真实 sleeper、允许测试注入、断言指数延迟；同时明确最小 runner 的总 timeout 是调用边界间检查，blocking adapter/tool 必须由具体集成提供可中断 timeout，不能声称通用 Python callable 可被强制终止。

## 计数判断

本轮包含一个会绕过成本控制的 P1 和一个会制造虚假退避证据的 P2，均来自“控制面字段只声明、未在执行边界落实”的共同可靠性根因。需要实现、测试和文档边界共同修正，满足实质 review 门槛；不得在后续轮次重复计数。
