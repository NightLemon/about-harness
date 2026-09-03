# Harness 问题诊断

Debugging（问题诊断）不是看到失败后反复改 prompt 或换模型，而是找到“实际行为第一次偏离预期”的边界，用最小证据证伪原因假设，再把修复固化成回归。Agent 系统包含 task、context、model、adapter、policy、tool、state 和 validator；最终输出错误只是症状，根因可能在任何一层。

## 先分清症状、故障与根因

- **Symptom（症状）**：用户可见的结果，例如修改错文件或任务超时；
- **Fault（故障点）**：某个组件出现的异常行为，例如 adapter 丢失 tool call ID；
- **Root cause（根因）**：为什么故障可以发生，例如协议版本变化但兼容性测试未覆盖；
- **Contributing factor（促成因素）**：放大影响但不是唯一原因，例如重试无总预算；
- **Fix（修复）**：移除或限制根因，并有负例证明旧路径不再发生。

“模型不够聪明”通常只是未经验证的归因。“把 timeout 从 30 秒改成 60 秒”也可能只隐藏阻塞工具，并未修复根因。

## 发现失败后先保全现场

在重跑、清缓存或修改配置前保存最小诊断包：

```text
task_id + task/fixture/acceptance hash
run_id + parent/attempt + 时间/区域
model/provider/adapter/harness/surface 精确身份
system/project/task instruction + config/tool schema/policy hash
cwd/worktree/commit/dependency/environment
budget + timeout + retry + approval
脱敏 trace + result + checkpoint + artifact/diff
验证命令 + stdout/stderr + exit code
期望、实际、首次观察与复现频率
```

先脱敏再分享；原始敏感证据放在受控位置，用 hash 关联。不要依赖模型最终总结重建现场，它可能遗漏失败动作、错误分类或未完成副作用。

若存在 Secret/个人数据泄漏、破坏性写入、未知外部副作用、费用失控、跨租户污染或无法停止的任务，优先按[事件响应](/security/incident-response)遏制，不要为了复现继续扩大影响。

## 沿数据流找第一处分歧

为每个边界写 expected（预期）与 observed（观察），从上游到下游比较：

```text
Task/Fixture
  → Instruction/Context
  → Model/provider response
  → Adapter parsed Action
  → Policy/Approval decision
  → Tool request/actual environment
  → Tool result/State/Checkpoint
  → Validator/Judge
  → Report/UI
```

第一处分歧通常最接近可修复原因；后续异常可能只是传播结果。例如最终报“文件不存在”：

1. Task 是否指向正确仓库版本？
2. Context 是否包含正确 cwd 与文件清单？
3. 模型原始响应是否选择了正确路径？
4. Adapter 是否规范化或截断了参数？
5. Policy 是否重写/拒绝路径？
6. Tool 实际在哪个 worktree 执行？

如果模型响应正确、adapter 输出错误，换模型不会修复。如果 tool 正确写入、validator 读取旧 checkout，继续调 prompt 也无效。

## 诊断表：症状只是入口

| 症状/信号 | 首查边界 | 需要的证据 | 不要先做 |
| --- | --- | --- | --- |
| 目标理解错误 | task、指令冲突 | 有效指令栈、目标/禁止动作 | 直接增加长提示 |
| 找不到事实/文件 | context、retrieval、cwd | selected/dropped context、真实路径/commit | 提高推理预算 |
| ToolCall 无效 | provider/adapter/schema | 原始响应、解析后 action、schema version | 原样无限重试 |
| `permission_denied` | task allowlist、policy、approval | 规范化参数、decision reason | 自动扩大权限 |
| 工具执行错误 | executor、依赖、环境 | 请求 ID、exit code、stderr、环境 hash | 归因给模型 |
| 重复副作用 | retry、幂等、checkpoint | idempotency key、外部回执、attempt | 盲目再执行 |
| 声称完成但验收失败 | completion/validator | 完成 action、实际 artifact、检查输出 | 接受模型自评 |
| 正确产物被判错 | validator/Judge | 锁定 rubric、顺序、对照样例 | 重写正确产物 |
| 偶发失败 | provider、race、cache、timeout | seed、顺序、并发、时间、attempt 分布 | 只保留成功 run |
| 成本/延迟突增 | 重试、循环、上下文、关键路径 | 分阶段耗时、token、调用树 | 只看单价 |
| 子 Agent 成功但总任务失败 | orchestration、merge、预算 | parent-child IDs、交付/冲突/取消 | 单看子任务摘要 |

同一个 stop reason 也可能有不同根因。`timeout` 可以是模型慢、approval 等待、tool 阻塞、退避过长或 controller 只在返回后检查 deadline。分类要基于事件时间和组件边界。

## 第一步：确认失败真的存在

先核对 acceptance（验收）是否对应当前 task 版本，validator 是否读取正确 artifact，测试本身是否稳定。手工打开关键输出，确认不是 UI 缓存、旧 report 或错误 checkout。

建立三列：

```text
期望事实 | 实际证据 | 差异
```

“模型说完成了”不是实际证据；“CI 红了”也不等于候选逻辑错。测试脚本缺依赖、fixture hash 漂移、Judge 顺序偏差都可能制造假失败。反之，exit code 0 也不能证明安全、副作用或内容质量。

## 第二步：锁定身份并复现

复现前固定 task/fixture/config/instruction/tool/policy/commit 和环境。Provider alias、依赖或网页内容漂移时，记录实际身份和时间；不能固定就把结果标为不可完全复现。

把失败分成：

- **Deterministic（确定性）**：相同条件稳定失败，适合直接最小化；
- **Intermittent（间歇性）**：相同标识下时成时败，需保存多次分布和相关条件；
- **Environment-specific（环境相关）**：只在某 OS、region、权限、时间或并发下发生；
- **Non-reproducible（暂不可复现）**：证据不足，不等于问题不存在。

复现应从无副作用的 fake/replay、只读环境或副本开始。真实外发、付款、发布、生产写入和凭据使用不能仅为调试自动重放。外部动作结果不明时，先按幂等键和目标系统回执查询。

## 第三步：最小化输入与路径

Delta debugging（差分最小化）是逐步删除输入、工具、上下文和步骤，每次验证失败是否仍存在。最终保留“再删一项就不复现”的最小案例。

按风险从外围缩小：

1. 复制到隔离 fixture，替换 Secret、个人数据和真实端点；
2. 删除无关文件、历史消息、工具和子任务；
3. 固定模型 action 或使用 replay，判断是否仍失败；
4. 将真实 tool 换成记录请求的 fake，判断执行环境是否必要；
5. 将复杂 validator 换成一个确定性断言；
6. 保留触发条件、错误证据和安全边界。

最小化时一次只删一类因素，并记录结果。删掉攻击文本后失败消失，只说明触发条件被移除，不证明安全漏洞已修复。

## 第四步：用替身隔离责任层

可以在不改变目标问题的情况下替换一层：

| 想隔离的层 | 替换方法 | 若仍失败说明什么 |
| --- | --- | --- |
| Live model/provider | 固定 fake/replay Action | 更可能在 adapter 之后 |
| Adapter | 保存的原始响应 + 独立 parser test | 协议映射可独立复现 |
| Tool/external API | 参数记录 fake + 固定 result | 更可能在计划/policy/state |
| Policy | 对固定 Action 跑 decision unit test | 是否在授权逻辑 |
| Context selection | 固定 selected item IDs | 是否由选择/截断造成 |
| Memory | 关闭读写或固定快照 | 是否由污染/过期造成 |
| Validator/Judge | 已知好/坏 artifact 金标 | 是否误判 |
| Orchestrator | 单独运行子 task 与合并器 | 是子任务还是交付整合 |

替身也必须满足真实接口，不要用过于宽松的 mock 让问题消失。安全调试不能通过在生产环境关闭 policy、sandbox 或审批来“排除权限因素”；在隔离测试中对固定 Action 直接测 policy 即可。

## 第五步：一次证伪一个假设

用表格管理假设，避免凭感觉连改多项：

| 假设 | 支持证据 | 反证实验 | 结果 | 下一步 |
| --- | --- | --- | --- | --- |
| Context 截断目标文件 | selected IDs 无该文件 | 固定加入该文件，其他不变 | 仍失败 | 降低优先级 |
| Adapter 丢失参数 | 原始响应有、Action 无 | parser 单元负例 | 复现 | 修 adapter |
| Tool 暂时失败 | 错误类型可恢复 | 固定 Action + fake 前两次失败 | 第三次成功 | 检查有限重试 |

每个实验只改变一个主要变量，并预先写“什么结果会否定假设”。同时改模型、prompt、工具和预算，即使成功也只能说明新组合可用，不能解释根因。

## 二分版本与配置

若已知某个旧版本正常、新版本失败，按 commit、依赖版本或 config revision 二分。每个点使用同一最小 fixture 和验证命令，记录 good/bad/invalid：环境无法构建属于 invalid，不能随意当 bad。

配置二分从工程基线开始逐项恢复 context、instructions、tools、memory、budget、adapter/model。顺序根据第一处分歧选择，不必永远从模型开始。若每个单项都正常、组合失败，设计二因子测试查交互，而不是认定观察有误。

版本二分只能定位首次出现差异的 change，仍需理解机制。附近可能同时有测试变化、依赖漂移或隐藏服务端变化。

## 间歇性失败怎样诊断

先确认每次 run 的身份真的相同，再按 task 配对重复。保存 seed/采样设置、执行顺序、worker、region、缓存冷热、并发、rate limit、时间和资源水位。将失败按这些特征切片，寻找相关但不立即宣称因果。

常用故障注入：固定前几次 provider/tool 返回暂时错误；延迟响应越过 deadline；在 checkpoint 前后中断；并发恢复同一 run；返回部分成功；制造缓存过期。每次同时断言停止、重试上限、幂等、副作用和 trace。

不要只重跑到成功、只保存最后一次或把所有偶发失败标成 infrastructure。预注册重跑规则，原尝试保留；产品随机性、race 与基础设施失败分别分类。

## 成本与延迟问题看关键路径

总时长拆成 queue、model、policy/approval、tool、retry backoff、validation。并行子任务耗时总和不等于墙钟关键路径；一个慢分支可能阻塞合并，多个快速重试可能放大总费用。

成本至少拆为 input/output token、模型调用、Judge、工具/API、失败重试和人工轮次。所谓“快模型更贵”可能来自低一次成功率导致更多纠正；所谓“cache 降成本”可能掩盖错误跨租户复用。比较成功任务的单位成本，同时保留失败成本。

优化前先证明瓶颈：若 80% 时间在测试工具，提高模型推理速度不会带来同比收益；若上下文选择错误，增加 token 只会扩大噪声。

## 修复必须同时通过三种验证

1. **Reproduction test（复现测试）**：修复前在最小 fixture 稳定失败；
2. **Fix test（修复测试）**：同一 fixture、同一目标条件在修复后通过；
3. **Regression/neighbor tests（回归与邻近测试）**：旧正常行为未退化，相似变体也被覆盖。

修复记录绑定根因、修改层、测试和证据边界。Prompt 变更可能降低失败概率，但若安全依赖确定性阻断，还要在 policy/tool 边界加入负例。无法稳定复现时，把检测和额外事件先加入，不要假装已根除。

完成后重跑与影响范围匹配的测试：adapter/schema 变化需要协议负例；context 变化需要 selection 与任务集；工具重试变化需要幂等和副作用；Judge 变化需要金标与顺序交换。正式采用仍按[评测方法](/evaluation/method)而不是单个 bug 成功决定。

## 诊断记录模板

```markdown
## Symptom and impact
## Scope / stop conditions
## Exact identities and diagnostic bundle
## Expected vs observed by boundary
## Minimal reproduction
## Hypotheses and falsification results
## First divergence and root cause
## Fix + negative/regression tests
## Verification commands and exit codes
## Residual uncertainty / rollback
```

若第三方不能仅凭记录重现或证伪结论，诊断还不完整。失败输出和被否定假设也有价值，避免下一人重复同一路径。

## 在本项目做一次边界诊断

### 前置条件与输入

要求 Python 3.11+ 与 uv 0.11，依赖已按 `uv.lock` 安装，并从仓库根目录执行。三个测试使用 fake adapter 和内存工具，不访问网络、凭据或真实 provider。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_loop.py::test_wrong_adapter_return_is_classified_as_invalid_action lab/tests/test_loop.py::test_permission_denial_stops_before_tool_execution lab/tests/test_loop.py::test_retry_and_idempotency_prevent_duplicate_side_effects
```

### 预期输出与诊断

应有 3 项通过：

- 错误 adapter 返回普通对象而不是 `Action`，第一处分歧位于 adapter trust boundary；runner 返回 `failed/invalid_action`，而不是让坏值进入后续工具；
- 模型提出已注册但 Task 未允许的危险工具，policy 返回 `permission_denied`，handler 的执行标志仍为 false；
- 暂时性工具前两次失败、第三次成功，trace 有两次 retry；同一幂等键的第二个调用复用结果，实际 `tool_calls=1`、`reused_tool_calls=1`。

这三个案例说明同一个“任务没按第一次计划完成”症状可以分别属于 adapter、policy 和 tool/retry，不能统一归因给模型。

### 失败、停止、清理与回退

若坏 adapter 被当成完成、危险 handler 执行、重试无限或同一幂等键再次产生副作用，停止扩大测试；保存脱敏输出和 trace，修对应边界。不要删除断言、放宽 Task 工具或增加无限重试让测试变绿。

命令只创建进程内状态和可忽略测试缓存；需要时只清理 `.pytest_cache/`。误改实现时用 `git diff -- lab/` 定位，只恢复自己改动的文件。修复失败时回到上一已验证 adapter/policy/retry 配置，并保留最小负例。

这些测试提供 E1：证明固定 fake 下三条错误路径被正确分类，不证明 live provider、真实工具、分布式 race、外部副作用或生产诊断包完整。遇到真实 Secret、生产写入或费用事件，先转入事件响应。

下一步用[诊断工作表](/practice/debugging)记录一次完整案例，到[可观测性](/foundations/observability)补缺失事件，并用[回归集](/evaluation/regression)长期保留失败。

## 检查题

1. 最终报“文件不存在”时，为什么第一处分歧可能在 adapter 而不是 tool？
2. 关闭 production policy 后问题消失，为什么仍不是安全的诊断方案？
3. 间歇性失败重跑成功后，原失败记录为什么必须保留？
4. 修复最小案例通过后，为什么还需要邻近和影响范围回归？
5. 哪些证据能区分“模型提出坏动作”和“harness 实际执行坏动作”？
