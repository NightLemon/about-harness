# 可靠性恢复工作坊：响应丢失后先对账

## 这页解决什么问题

外部写入最危险的失败，不是明确返回错误，而是动作可能已经成功、响应却没有到达 Harness。此时本地只知道 outcome unknown（结果未知）：把它当成失败并换一个 idempotency key（幂等键）重试，可能创建两个订单、发两封邮件或重复扣款。

本工作坊用固定内存服务复现这个窗口：服务先提交写入，再丢失第一次响应。安全路径保存 intent（动作意图），按原幂等键查询 receipt（回执），核对参数指纹后复用真实结果；反例改用新 key 重试，确定性地产生两次副作用。

当前证据为 E1：它证明仓库里的固定恢复算法和负例按断言运行，不证明生产数据库、队列、Provider 或跨区域系统已经具备相同保证。

## 学习目标

完成后你应该能够：

- 区分 attempt、external effect 与 response 三个不同事实；
- 解释 timeout 为什么不能证明远端动作没有发生；
- 在执行前固定 intent、业务身份、参数指纹和幂等键；
- 把 unknown outcome 保留为独立状态，而不是改写成普通失败；
- 先查询目标系统 receipt，再决定复用、重试、补偿或人工处理；
- 用副作用次数而不只用最终状态验证恢复安全性；
- 指出内存 fake 与持久化、多 worker、真实外部 API 之间还缺什么。

## 一次写入其实有三个结果

调用者常把“请求返回”与“动作完成”画成一个点，实际至少有三层：

```text
Harness attempt
  └─ request reached service?
       └─ external effect committed?
            └─ response reached Harness?
```

因此一次 timeout 可能对应完全不同的事实：

| 可观察结果 | 外部动作 | Harness 应如何记录 |
| --- | --- | --- |
| 明确成功回执 | 已提交 | `completed/acknowledged`，保存 receipt |
| 明确业务拒绝 | 未提交 | 已知失败，按错误分类处理 |
| 连接前失败且有可靠证据 | 未送达 | 在预算内可重试同一逻辑操作 |
| 请求已送达、响应丢失 | 可能已提交 | `unknown`，先对账 |
| 收到旧 key、不同参数的回执 | 身份冲突 | 失败关闭，禁止覆盖 |

Unknown 不是“系统还没想好报什么错”，而是一项业务事实：当前证据不足以判断副作用是否发生。只有新的权威证据才能把它转为成功或可安全重试。

## 安全恢复需要哪四样东西

### 1. Write intent

在外部调用前记录逻辑操作，而不是等成功后才补日志。最小 intent 包含：

```text
task/run identity
subject + environment
tool + operation version
business object
canonical arguments fingerprint
idempotency key
absolute deadline / approval reference
```

本工作坊的 `WriteIntent` 使用 `ToolCall`，并对 tool name 与 canonical JSON arguments 计算 SHA-256。`call_id` 表示一次尝试；`idempotency_key` 表示跨尝试不变的逻辑动作，两者不能互换。

### 2. 目标系统幂等

幂等不能只存在 Harness 进程的成功结果 cache 中。目标系统或持久代理需要按 key 记住已经接受的操作，并把 key 绑定参数指纹。相同 key、相同语义可以返回已有 receipt；相同 key、不同语义必须冲突。

### 3. 可查询 receipt

恢复程序需要按 key 查询目标系统。Receipt 至少绑定：

```text
idempotency key
canonical arguments fingerprint
external object / operation ID
committed status and version
```

如果目标系统既不支持稳定 key，也不能查询操作结果，Harness 无法靠重试制造“恰好一次”。高影响动作应停在 unknown，转人工对账。

### 4. 独立 reconciliation

Reconciliation（对账）不是再次执行原动作。它先读取 intent，再查询 receipt，比较业务身份和参数指纹：

```text
intent checkpointed
  → submit
     ├─ acknowledged → save receipt → completed
     ├─ known failure → classify → stop/retry same logical action
     └─ unknown
          → lookup original key
             ├─ matching receipt → reuse → completed/reconciled
             ├─ no receipt + authoritative non-execution proof → retry same key
             ├─ conflicting receipt → stop/contract failure
             └─ still unknown → stop/manual reconciliation
```

“查询不到”不总等于“没有执行”。有些目标系统存在最终一致性、查询索引延迟或回执保留期；生产策略要写清查询强度、等待上限和人工升级条件。

## 当前工作坊实现

核心实现位于 `lab/src/about_harness/recovery.py`：

| 组件 | 教学责任 | 刻意没有实现 |
| --- | --- | --- |
| `WriteIntent` | 固定 Tool、参数指纹与稳定 key | Task/config/subject 持久身份 |
| `SyntheticWriteService` | 提交一次副作用、保存 receipt、丢失首次响应 | 网络、数据库、并发和真实故障 |
| `execute_with_reconciliation` | unknown 后先 lookup，匹配后复用 | 重试队列、人工审批和补偿 |
| `demonstrate_unsafe_new_key_retry` | 展示换 key 怎样绕过去重 | 可在生产使用的恢复逻辑 |

它没有修改 `HarnessRunner` 的完成语义，也没有声称内存 `ToolRegistry` cache 已经持久化。工作坊是一条独立 E1 seam，用来观察生产实现必须补上的业务台账责任。

## 三个安全案例

默认命令运行三条路径：

| Case | 故障 | 关键断言 |
| --- | --- | --- |
| `acknowledged-write` | 没有故障 | 1 attempt、0 lookup、1 side effect |
| `lost-response-reconciled` | 提交后丢响应 | 1 attempt、1 lookup、1 side effect，完成原因为 `reconciled` |
| `same-key-changed-payload-denied` | 同 key 改参数 | `stopped/receipt_conflict`，副作用仍为 1 |

第二个案例最重要：它没有“再执行一次看看”，而是把目标系统已有 receipt 变成新的权威证据。第三个案例证明幂等不是“key 一样就返回任何旧结果”，参数指纹漂移必须失败关闭。

## 运行正例

### 前置条件与固定输入

- Node.js 22+，仅用于 npm 入口；
- Python 3.11+，项目 CI 使用 Python 3.12；
- `uv 0.11.16`，依赖由 `uv.lock` 固定并已进入本地 cache；
- 从仓库根目录运行，当前输入固定在脚本的合成 `report.write` 调用；
- 不使用真实模型、Provider、网络、凭据、个人路径、费用或外部资源。

开始前记录 `git rev-parse HEAD` 与 `git status --short`。工作树有自己的实验改动时保留路径，不用 stash 或删除来“清场”。

### 命令

PowerShell、bash 与 zsh 都可直接运行：

```bash
npm run reliability:workshop
```

预期退出码为 0，顶层摘要为：

```json
{
  "evidence": "E1",
  "offline": true,
  "unsafe_retry_demo": false,
  "passed": true
}
```

不要只看顶层 `passed`。逐项断言：

1. `acknowledged-write` 是 `completed/acknowledged`，`attempts=1`、`lookups=0`、`side_effects=1`。
2. `lost-response-reconciled` 的事件顺序严格为：

```text
intent_checkpointed
→ external_outcome_unknown
→ receipt_lookup
→ write_reconciled
→ run_stopped
```

3. 该案例 `safe_to_retry=false`，但最终仍可完成，因为 lookup 找到相同 key 和 fingerprint 的 receipt；`attempts` 保持 1，说明对账不是第二次写入。
4. `same-key-changed-payload-denied` 是 `stopped/receipt_conflict`；服务累计接到两次 attempt，但只提交第一次，`side_effects=1`。
5. 三个案例都只使用 `external-write-001`；没有第二个业务对象。

## 运行会重复副作用的反例

```bash
npm run reliability:workshop -- --unsafe-retry-demo
```

这条命令刻意把未知结果当作失败，并使用新 key 重试。预期退出码为 1，关键输出为：

```json
{
  "case_id": "unsafe-new-key-retry",
  "status": "unsafe",
  "reason": "new_key_after_unknown_outcome",
  "attempts": 2,
  "lookups": 0,
  "side_effects": 2,
  "duplicate_effect_observed": true,
  "passed": false
}
```

第一次写入已经创建 `external-write-001`，只是响应丢失；新 key 绕过目标系统去重后又创建 `external-write-002`。非零退出不是脚本坏了，而是 canary（故障探针）证明危险策略能被观察并阻止冒充成功。

如果反例返回 0、`side_effects` 不是 2，或使用新 key 却显示 `second_reused=true`，停止使用工作坊结论，先检查脚本的退出码、服务 key 索引和断言；不要把 oracle 改成当前错误输出来获得绿色。

## 运行独立测试锚点

```bash
uv run --frozen --offline pytest -vv lab/tests/test_recovery.py
```

预期收集 4 项并全部通过，分别验证：

- 明确回执无需 lookup；
- 提交后丢响应能靠 receipt 对账且不重复写；
- 同 key 改 payload 在第二次副作用前停止；
- unknown 后换新 key 的确产生两个副作用。

测试与脚本共享实现，所以它们不是独立生产证据；测试的价值是把事件顺序、attempt/lookup/side-effect 三个计数和退出语义固定成回归。

## 怎样把模式接回 Harness

当前 `HarnessRunner → ToolRegistry` 的顺序是：handler 正常返回后才把结果写入内存 cache，再记录 ToolResult 和 checkpoint。它能处理“副作用发生前的暂时错误”和“成功返回后的同 key 重复调用”，不能覆盖：

```text
external commit succeeded
→ response lost / process crashed
→ ToolRegistry cache not written
→ checkpoint has no receipt
```

生产接缝至少要增加：

1. controller 在调用前持久保存 intent 与参数指纹；
2. key 作用域绑定 subject、环境、operation version 与业务对象；
3. Tool/目标系统按同一 key 去重并支持 receipt lookup；
4. Adapter/Tool timeout 返回 `unknown`，不能自动映射成未执行；
5. 恢复 worker 先取得 run 所有权，再逐项对账 pending intents；
6. matching receipt 补写本地 ToolResult/checkpoint，conflict 失败关闭；
7. 没有权威未执行证据时不重试高影响动作；
8. Validator 检查最终业务对象，而不只检查函数返回值。

这个顺序与 transactional outbox/inbox、任务队列至少一次投递并不冲突。它们仍需处理旧 worker、并发、乱序、过期和补偿失败。

## 恢复决策表

| 最后可证明的事实 | 默认动作 | 需要的新证据 | 不能做什么 |
| --- | --- | --- | --- |
| Intent 未落盘 | 查 trace/目标系统 | 确认是否存在旁路动作 | 直接声称未执行 |
| Intent 有，receipt 无 | 按原 key 查询 | matching receipt 或权威未执行证明 | 换 key 重试 |
| Receipt 匹配，checkpoint 无 | 复用并补写本地状态 | receipt 版本与对象状态 | 再执行一次 |
| Receipt 与 fingerprint 冲突 | 失败关闭 | 身份漂移根因和人工裁决 | 覆盖旧 receipt |
| 查询仍 unknown | 停止/人工队列 | 目标系统审计或业务对账 | 把 unknown 记成失败 |
| Run 已取消但迟到成功 | 记录事实，再按业务补偿 | 真实对象状态与补偿 receipt | 删除迟到结果 |

补偿不是时间倒流。删除重复对象、退款或发送撤回消息都是新的副作用，也需要独立 key、权限、回执和失败处理。

## 迁移到真实服务前的最小探针

不要一开始就测试付款、发布或外发消息。先找隔离环境中的可撤销对象，固定一个业务身份，逐步验证：

1. 相同 key + 相同 payload 返回同一 external ID；
2. 相同 key + 不同 payload 被拒绝；
3. Client timeout 后可按 key 查询；
4. 响应丢失后不会创建第二个对象；
5. 并发两个相同请求只有一个 commit winner；
6. Receipt 保留期长于最大恢复窗口；
7. 凭据、租户和环境进入 key 作用域或等价隔离；
8. 清理/补偿也有可核对 receipt。

这类真实探针需要目标系统授权和明确副作用范围。没有授权时停在当前 E1，不把 fake 的通过状态写成真实服务能力。

## 常见错误与第一处分歧

| 症状 | 第一处检查 | 常见根因 |
| --- | --- | --- |
| 对账后仍出现两个对象 | key/target ledger | 重试生成了新 key，或目标系统未去重 |
| 同 key 返回错误旧对象 | fingerprint/scope | key 未绑定业务对象、参数或租户 |
| 本地显示 failed，目标对象存在 | error mapping | timeout 被错误改写为未执行 |
| Receipt 存在但 Run 一直 unknown | reconciliation | lookup 结果未补写 checkpoint/Result |
| Cancel 后对象仍创建 | late result path | 客户端取消没有撤销服务端提交 |
| 两个恢复 worker 都写终态 | ownership | 缺少 CAS、lease 或 fencing token |
| 对账查询不到但稍后对象出现 | consistency window | lookup 非强一致、等待策略过短 |

先保存原始 intent、key、fingerprint、attempt 时间线和目标 receipt，再修改 retry。扩大次数或缩短 timeout 只会改变故障概率，不能修复身份和对账语义。

## 停止、清理与回滚

出现以下任一情况立即停止扩大实验：真实凭据进入输入、目标从合成服务变成外部系统、无法确认 key 作用域、lookup 不具权威性、反例没有非零退出、第二个副作用无法清理，或当前工作树包含来源不明的重叠修改。

默认工作坊只修改进程内对象并向 stdout 输出 JSON；进程结束后状态释放，没有外部资源、账单或个人数据需要清理。pytest 可能产生已忽略的 cache，可以保留复用，不应递归清理仓库。

若为练习修改实现，先审查：

```bash
git diff -- lab/src/about_harness/recovery.py scripts/reliability-workshop.py lab/tests/test_recovery.py docs/practice/reliability-recovery.md
```

只回滚自己的候选 commit。Git 回滚不能撤销真实外部写入；一旦接入外部系统，先按 receipt 对账和补偿，再处理代码版本。

## 当前证据边界

当前 E1 能证明：

- 固定 ToolCall 在调用前形成可观察 intent 与参数指纹；
- 合成服务提交后可以丢失响应；
- matching receipt 能把 unknown 安全转为 reconciled，副作用仍为 1；
- 同 key 改参数会失败关闭；
- unknown 后换新 key 会确定性地产生第二个副作用并非零退出。

它不能证明：

- intent、receipt 或 key 在进程重启后持久；
- 目标系统的真实幂等、查询一致性或回执保留期；
- 多 worker 的原子 reservation、CAS、lease 或 fencing；
- 网络分区、队列重复、时钟漂移和跨区域恢复；
- 补偿一定成功，或任何真实模型/Provider 的行为与质量。

## 检查题

1. 为什么客户端 timeout 后不能立即使用新 key 重试？
2. `call_id` 与 `idempotency_key` 分别标识什么，哪个跨 attempt 复用？
3. 为什么 receipt 必须包含参数 fingerprint？
4. 第二个安全案例只有一次 attempt，为什么仍能从 unknown 变成 completed？
5. 查询不到 receipt 时，还需要什么证据才能安全重试？
6. 当前内存服务提供了哪种 E1 证据，离生产还缺哪些持久和并发能力？
7. 如果 cancel 后收到迟到成功 receipt，Result 和业务状态应怎样处理？

下一步回到[状态与可靠执行](/foundations/state-reliability)画完整崩溃窗口，在[可观测性](/foundations/observability)定义 intent/receipt 事件，再把一条恢复负例纳入[测试策略](/implementation/testing)和自己的 [Capstone](/guide/capstone)。
