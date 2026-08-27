# 多 Agent 编排

多 agent 的价值来自上下文隔离、专长与并行，不来自角色数量。一个清晰的单 agent loop 往往比相互聊天的多个 agent 更可靠。

## 委派契约

父 agent 给子 agent：具体目标、输入位置、允许工具/文件、禁区、输出 schema、预算、停止和回报方式。子 agent 不自动继承父级全部权限或未公开上下文。

## 常见拓扑

- Router → specialist：按任务类型选择责任人；
- Planner → workers → verifier：计划、并行执行、独立验收；
- Supervisor loop：动态分派，但需全局步数和终止条件；
- Debate/jury：适合主观评审，不替代确定性测试。

## 共享状态

优先传不可变 artifact 与摘要，不共享可任意改写的长对话。并行修改使用独立 worktree/目录，合并前检查冲突。父级负责最终验收与取消传播。

## 失败模式

循环委派、重复工作、权限放大、结论投票代替证据、一个 agent 的注入污染全局。评测同时报告单 agent 基线；多 agent 只有在质量/延迟收益超过编排成本时晋级。

## 工作例：并行调查

父 agent 把前端与后端测试失败分给两个只读 worker，各自返回文件、复现命令和假设，不允许修改共享 checkout。父级合并证据后只派一个 implementer 写入，再由 verifier 在独立上下文运行验收。这样并行的是信息收集，不是互相覆盖文件；任何 worker 超时都向父级传播取消。

## 失败诊断

两个 worker 重复同一搜索，说明分工输入不互斥；结论冲突却被投票抹平，说明缺少证据 schema；子 agent 访问额外工具，说明权限未按任务下放；一直委派说明没有全局终止条件。比较时必须保留单 agent 基线与总成本。

## 自检与下一步

为什么共享可变计划比共享不可变 artifact 风险更高？父级最终需要验证什么？到[可观测性](/foundations/observability)定义跨 agent 事件，再看[AutoGen](/frameworks/autogen)的层次边界。
