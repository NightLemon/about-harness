# Round 03 未决项

- 开放 P0：0
- 开放 P1：0
- 开放 P2：0
- 开放 P3：0

R03-P1-01 已由 budget/action/checkpoint 数值与结构验证、runner 边界错误归一化和负例测试修复。R03-P2-02 已由默认真实 sleeper、可注入测试 sleeper 和实际延迟断言修复。

最小 runner 不抢占任意阻塞 Python callable 的限制已在正文显式声明；生产 adapter/tool 的单调用 timeout 与进程隔离属于集成责任，不再冒充当前实现能力。模型/provider 事实、六教程和评测统计由后续独立 round 审阅。
