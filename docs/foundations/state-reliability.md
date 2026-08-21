# 状态与可靠执行

可靠执行的目标不是“永不失败”，而是失败可分类、可停止、可安全重试、可恢复。

## 状态机

Run 至少经历 created、running、waiting-approval、stopping、completed、failed/cancelled。状态转换由 controller 写入，工具或模型不能直接宣告业务完成。

## Timeout、重试与退避

分别设置模型、工具、步骤和总 run timeout。只有限流、短暂网络或明确可恢复的资源冲突进入有限指数退避；退避事件记录的 `delay_ms` 必须和实际 sleeper 一致。认证、schema、拒权、注入与确定性测试失败立即停止。

本项目的最小 runner 只在 adapter/tool 调用边界检查总 run deadline；它不能强制终止任意阻塞的 Python callable。生产 adapter 与 tool executor 必须自己实现可中断的单调用 timeout，或使用可终止的进程/容器隔离。把“调用返回后发现超时”写成“已中断调用”属于错误证据。

## 幂等与副作用

每个副作用带稳定 idempotency key。缓存结果前要确认工具实际成功；checkpoint 在副作用结果后写入 adapter position 与调用状态。恢复先读取 checkpoint，再决定是否复用结果，不能重复支付、发信或修改文件。

## 并发与取消

父任务取消向子任务、模型流、工具进程和队列传播；等待中的批准也可取消。并发写同一文件或状态需要所有权、锁或隔离 worktree。

## 验证

故障注入覆盖进程中断、timeout、重复 delivery、partial output、并发取消和坏 checkpoint。通过正常路径不能证明恢复正确。
