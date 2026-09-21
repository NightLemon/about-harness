# Microsoft Agent Framework：把 Agent loop 与确定性 workflow 分开

官方维护仓库于 2026-09-21 核对。[FACT:maf-overview] Microsoft Agent Framework（MAF）是 Microsoft 面向新项目的 Agent 路线；AutoGen 维护仓库说明其已进入 maintenance mode，并建议新用户转向 MAF。[FACT:autogen-maintenance] 这是 E0 产品事实，不表示本仓库安装或运行过 MAF、调用过 provider、A2A 或 MCP。

## 两类控制流先分开

Agent loop 处理模型决定下一步的任务：模型看见受限工具，提出 typed action，controller 做 policy/approval，handler 返回 result，再决定继续或停止。它适合“根据文档缺口选择下一个只读来源”这类开放分支，但必须设置总 steps、预算、终止和 validator。

Workflow 处理可预先表达的确定性步骤、状态和边：例如“接收工单 → schema 校验 → 读取规则 → 人工批准 → 幂等写入 → 对账”。模型可成为其中一个节点，却不应拥有状态转换、tenant、批准或 completed 的最终解释权。若工作流已能由现有队列/状态机清楚实现，先比较该基线；不要只因有 Agent 名词就改成 loop。

实际系统常混合两者：workflow 负责路由、预算和副作用，Agent loop 只在“提取候选、解释冲突、选择下一项只读工具”处运行。验收仍由确定性 validator 或人工 rubric 负责。

| 问题 | 优先形状 | 最小反例 |
| --- | --- | --- |
| 下一步要读哪份候选资料未知 | Agent loop | 模型提出范围外来源时 policy 必须拒绝 |
| 顺序、暂停、owner 和写入时机已知 | Workflow | 路由遗漏 timeout/cancel 边时不得 completed |
| 两者混合 | Workflow 包住局部 loop | loop 预算耗尽不能重置全任务预算 |

这个区分避免把“模型可说出流程”误当作“系统拥有流程”。如果失败模式主要是字段缺失、金额计算或版本比较，先放在确定性节点；只有开放文本判断留给模型。

## 互操作不是权限继承

MAF 文档涉及 multi-provider 与 A2A/MCP 互操作时，至少冻结对端 identity、协议版本、schema、工具清单、credential flow、网络出口、取消和 trace 脱敏。A2A/MCP 连接可用不表示远端 agent/server 获得本任务的文件、tenant、写入或预算；应用应将其视为受约束的 adapter。

## 从 AutoGen 迁移：迁移资产，不迁移幻觉

可迁移资产包括 Task/fixture、participant owner、消息和业务 state schema、tool contract、审批记录、预算规则、trace reader、validator 与外部 receipt。它们是业务语义，应该比框架对象更稳定。

不能假定原样兼容的是 AgentChat/Core 对象、group-chat 路由默认值、checkpoint/session 格式、回调顺序、内部 call ID、序列化 payload 和 extension 生命周期。为每一项写 `AutoGen responsibility → MAF responsibility → semantic gap → compensating control → positive/negative fixture`。例如原来的“所有 participant 看见全部 history”必须重新审查为最小化 context contract，不能机械导入。

迁移完成条件是相同 Task、fixture、工具 handler、权限和预算下，业务 validator 通过；cancel/retry/resume 不重置预算或重复副作用；旧 AutoGen baseline 可重建。没有对应 probe 的能力保留 `untested`。

本仓库已有 [AutoGen 0.7.5 的固定包离线示例](/frameworks/autogen)，可帮助观察参与者调度、工具与终止的 E1 路径；它没有运行 MAF，不能充当迁移后基线或兼容证明。

### 迁移盘点例

| 原资产 | 迁移时的问题 | 合格证据 |
| --- | --- | --- |
| participant 指令 | 哪个 MAF owner 可见哪些摘要 | 已脱敏 context contract 和负例 |
| group-chat 路由 | 谁可成为下一 owner，何时终止 | 有限 transition 与 budget trace |
| checkpoint | schema 能否读、外部 receipt 是否对应 | 迁移 reader 或明确 quarantine |
| extension/tool | schema、凭据与权限是否变化 | handler 前 policy 与拒权测试 |
| historical trace | 是否还能解释旧失败而不伪造新结果 | 原 artifact 引用和版本标签 |

若某项只能保留为历史 reader，不要把它改写为新的 MAF 运行记录。迁移证据必须保留 source/target config identity，不能将旧任务成功率并入新 runtime 的分母。

## E0 资格计划

前置条件：锁定目标语言与 MAF 版本、隔离 worktree、provider fake/replay、只读 tool、确定性 validator，输入为 Task/Action/Result schema 及 success/error/timeout/cancel fixture。实际实验按以下顺序：

```text
workflow baseline → 单 Agent typed result → policy 前置 tool
→ cancel/resume 与外部对账 → 必要时增加 handoff/A2A/MCP
```

每一步保存 config/schema/fixture hash、trace 摘要、exit code 和 failure class。断言是 approval 绑定精确 action、late result 不覆盖终态、workflow 状态与外部 receipt 一致。跨 tenant context、未脱敏 trace、未知写状态或 validator 失败即停止；清理临时 tenant/session/trace，回退到无 MAF 的 workflow 或冻结的 AutoGen 基线。

本页不验证 MAF API 兼容、真实互操作、provider 身份、性能、费用或模型质量；它们分别需要 E2/E3 证据。

## 采用前自检

- 这个任务的关键复杂度是开放式下一步选择，还是可预先表达的状态转换？
- Agent loop 是否只能触达明确的工具、上下文和预算，而非拥有全局权限？
- Workflow 是否为 timeout、cancel、拒绝和未知副作用定义了终态？
- AutoGen 的可迁移业务资产是否与不可原样兼容的框架对象分别列出？
- 每一个 A2A/MCP 对端是否有身份、版本、schema、出口和撤销记录？
- 本次结论是否仍限定为 E0，且没有把 migration mapping 写成 runtime 验收？

选择 MAF 的收益应当是可测的：例如把原先散落的暂停、路由和 trace 收束为可重放的 workflow 责任。若同一 Task 下成功率未提高，或 P90、人工等待、重复动作和维护成本升高，回退到既有状态机或单 Agent，而不是继续堆加 specialist。

这个回退判断也适用于迁移途中：先让旧 AutoGen 的 validator 继续读取旧结果，新增 MAF result 作为平行 artifact；在两边的 Task 分母、fixture 与预算可解释之前，不把某一次成功当作替换依据。
