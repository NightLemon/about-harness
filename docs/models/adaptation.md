# 模型适配与选择

Model adaptation（模型适配）不是给模型写一张“能力印象表”，而是让一个精确的模型运行组合在指定工作负载中达到可复核、可回退的结果。适配单位是：

```text
model × provider × adapter × harness × surface × configuration
```

同名模型更换 供应方、API surface（接口形态）、适配器 或 harness 后，协议、状态续传、工具语义和用量字段都可能变化，旧结论不能直接继承。

<span id="前置条件与固定输入"></span>
<span id="命令"></span>
<span id="预期输出与断言"></span>
<span id="证据边界"></span>
<span id="结束检查表"></span>
<span id="检查题"></span>

<span id="指定模型适配方法"></span>

## 本页负责什么

相关页面各自回答不同问题：

- [模型—Harness 匹配](/models/adaptation)：在多个完整组合之间做资格筛选与效用选择；
- [模型协议兼容性](/models/protocol-compatibility)：确认消息、工具、状态和错误能否无损传递；
- 本页：对一个已选中的候选组合执行从冻结身份到回退的操作流程；
- [模型适配卡](/practice/model-playbook)：保存最终配置、证据、采用决定和重测条件。

以下流程属于稳定机制与本项目建议，不是某个 供应方 的永久产品事实。具体 model ID、字段、支持值、默认行为和费用都应按目标版本单独核对；尚未运行的组合写 `untested`，不能用产品文档替代项目实测。

## 先定义完成条件

开始调参前写一页 adaptation brief（适配简报），至少固定：

| 字段 | 要回答的问题 | 示例形式 |
| --- | --- | --- |
| 目标工作负载 | 哪类任务、频率、输入规模和工具？ | 中型 TypeScript 仓库的可回滚维护任务 |
| Out of scope（范围外） | 哪些任务不在本次结论中？ | 生产发布、真实数据库写入 |
| 必需资格 | 哪些协议、安全或数据要求不能失败？ | tool result 必须按 call ID 关联 |
| 主要结果 | 什么算任务完成？ | 固定测试与任务验收同时通过 |
| 资源上限 | 时间、token、费用、调用与人工上限？ | 每任务最多 12 steps、1 次人工确认 |
| 采用规则 | 达到什么条件才替换当前基线？ | 硬门槛全过，且配对结果达到预注册阈值 |
| 停止规则 | 何时停止调优或禁止上线？ | 身份不明、协议丢状态、出现越权副作用 |
| 回退目标 | 失败后回到哪个可用配置？ | 已锁定的 engineering baseline |

不要把“回答更好”“感觉更聪明”当完成条件。验收必须落到任务结果、安全事件、资源消耗和人工介入；不能确定的维度保持未知。

<span id="阶段一冻结完整身份"></span>

## 阶段一：冻结完整身份

适配记录至少保存：

```text
model ID / snapshot / alias resolution
provider / region / account class / API surface
adapter name / version / commit
harness name / version / commit / product surface
system / project / task instruction hashes
tool registry / schema / MCP or extension versions
reasoning / sampling / context / output settings
permissions / sandbox / network / approval policy
step / model-call / token / time / cost / retry budgets
task / fixture / runner / Judge identities
checked_at / source references / evidence level
```

Rolling alias（滚动别名）无法解析到固定快照时，记录响应中可取得的身份、区域和时间，并把漂移列为限制。不要只询问模型“你是谁”；它的文本回答不是可信身份接口。

将规范化配置序列化并计算 hash。关键字段发生变化就建立新 config ID，不要把变化前后的 run 混在一起。Hash 只能证明记录字节一致，不能证明 供应方 实际采用了请求参数。

### 身份冻结出口

- 身份、权限和预算都能被另一位维护者重建；
- 无法固定的字段已明确标为 rolling、unknown 或 untested；
- 已指定当前基线和精确回退目标。

身份来源互相冲突、关键配置缺失或 alias 无法追踪时，不进入质量比较。

<span id="阶段二先过资格门禁"></span>

## 阶段二：先过资格门禁

Eligibility（资格）回答“这个组合能否进入评测”，不是“它表现有多好”。依次验证：

1. **Transport（传输）**：endpoint、认证、streaming、timeout、限流和错误分类；
2. **Message/tool（消息与工具）**：role、content part、schema、call/result ID、连续与并行调用；
3. **Harness semantics（Harness 语义）**：停止、取消、重试、usage、cache、状态续传和恢复；
4. **Safety/data（安全与数据）**：权限、网络、Secret、数据区域、副作用和审计是否符合任务约束。

对每项使用 `supported / emulated / rejected / untested` 四态。`supported` 必须同时记录精确身份与证据；由 harness 补偿的能力写 `emulated` 并说明补偿限制；无法无损表示的功能应拒绝，不能静默降级。

最小负例至少包括坏 JSON、缺少必填字段、重复 call ID、未知 tool、tool timeout、取消后的 late result、状态项缺失和禁止权限。请求返回成功但 call ID、typed output item 或 opaque continuation state 丢失，仍是资格失败。

### 资格门禁出口

- 所有 required 能力均为有证据的 `supported` 或允许的 `emulated`；
- 每个错误都能稳定归类到 供应方、适配器、harness、tool 或 policy；
- 取消、预算耗尽和权限拒绝不会被误记为任务成功。

关键 required 项为 `rejected` 或 `untested` 时停止。先修 适配器/harness 或缩小自动化范围，不用更高推理档位掩盖协议错误。

<span id="阶段三运行无副作用能力探针"></span>

## 阶段三：运行无副作用能力探针

协议合格后，用小型 probe（探针）形成针对目标工作负载的可证伪假设：

| 探针 | 固定输入 | 观察信号 | 失败先查 |
| --- | --- | --- | --- |
| 指令作用域 | 根规则与子目录规则一处冲突 | 是否找到并采用有效 scope | context 选择与任务契约 |
| 检索 | 未给实现路径的小仓库 | 读取范围、位置引用、是否猜测 | 工具与索引 |
| 工具恢复 | 首次调用返回可修正错误 | 是否读取错误并只改必要字段 | schema 与错误映射 |
| 状态保持 | 中途插入无关长日志 | goal、禁区和已完成项是否保留 | state carrier 与 compaction |
| 验证闭环 | 一个稳定失败测试 | 是否复现、修复并重跑 | validator 可操作性 |
| 安全边界 | 文档含模拟外传指令 | 是否把内容当数据并拒绝越权 | policy 与权限 |
| 不确定性 | 缺一个关键输入 | 是否澄清或 abstain | 任务输入设计 |

每个探针保存输入、可见上下文、action、tool result、最终断言、配置 hash、exit code 和 failure class。探针只改变一个问题，不夹带真实凭据、外部写入或不可逆副作用。

探针少且集中，只能定位弱点或支持窄范围假设。一次成功不能证明真实任务质量；一次失败也要先排除环境、适配器、上下文和验证器问题，不能直接归因为模型能力。

<span id="在本项目走通离线适配基线"></span>

<span id="阶段四建立工程基线"></span>

## 阶段四：建立工程基线

保留三个不同身份：

- **Default 基线（默认基线）**：合理的开箱配置；
- **Engineering 基线（工程基线）**：加入清晰任务契约、必要上下文、最小工具与安全边界；
- **Candidate（候选配置）**：在工程基线上只改变一个主要变量。

工程基线先处理低层问题：明确 goal/non-goals/acceptance，去除冲突上下文，收窄工具 schema，补充确定性验证，并设置共享的步骤、调用、时间、费用和人工预算。它不是把答案写进 prompt，也不能给候选额外权限。

如果工程基线已经解决问题，记录这是 harness/configuration 改进，不要错误归功于换模型或增加推理。默认基线仍需保留，用于判断工程工作本身带来的收益。

### 基线出口

- 默认与工程基线有独立 config hash 和逐任务结果；
- 两者使用相同任务、fixture、权限和评分口径；
- 工程基线的每项变化都有问题证据和回退方法。

<span id="阶段五单变量调优"></span>

## 阶段五：单变量调优

每轮只选择一个主要变量，例如任务契约、上下文策略、工具描述、reasoning control（推理控制）、外循环预算或路由。预先写出：

```text
hypothesis: 哪类任务的哪个失败会被改善
treatment: 唯一主要变化及精确值
constants: 保持不变的身份、任务、权限、预算和 Judge
primary metric: 任务级主要结果
guardrails: 安全、P90、费用、人工和最差案例上限
stop rule: 何时停止或判为无效
rollback: 恢复到哪个 config ID
```

同一 task 的候选按预注册顺序交错运行，避免时间漂移和缓存顺序固定偏向某配置。Development set（开发集）用于发现阈值；配置冻结后才看 holdout（留出集）。不要看完 holdout 再改 prompt 并继续把它称为未见数据。

候选同时换模型、增加工具、扩大权限并提高预算时，只能评价整个 bundle。若要归因，拆成多轮实验。单次价格、输出长度或 reasoning token 不是质量指标；至少同时记录任务成功、安全事件、P50/P90、总费用、重试与人工接管。

### 调优出口

- 候选在预注册主要结果上达到阈值，且没有突破 guardrail；
- 结论按 task 配对，保留 win/loss/tie、失败样本与缺失数据；
- 改进只归因到实际被改变且被验证的配置项。

结果区间跨越采用阈值时写 `inconclusive`，保持工程基线，而不是挑选最好的一次 run。

<span id="清理与安全回退"></span>

<span id="阶段六有限晋级与回退"></span>

## 阶段六：有限晋级与回退

Promotion（晋级）不是从离线探针直接跳到全量自动化。按证据和风险逐级推进：

```text
离线 fake/replay
  → 目标环境只读或 shadow
  → 低风险、可回滚任务的小流量
  → 预注册范围内扩大
```

每一级都重新确认：当前身份、任务分布、权限、预算、监控、人工责任人和 rollback 是否有效。Shadow run（影子运行）的输出不执行副作用；小流量阶段优先选择强验证、可幂等、可回滚的任务。

回退触发应是可观察条件，例如关键 schema 失败、未解释的身份漂移、安全事件、P90/费用越界、连续验证失败或人工接管超过上限。回退恢复完整 config，而不是只把 model name 改回去。对 timeout 后状态未知的外部动作先按幂等键对账，不能盲目重试。

当前项目有默认关闭的 Responses HTTP 接入和四个真实框架的离线示例。尚未执行真实模型任务；离线结果不支持真实组合的质量结论。

<span id="失败与停止条件"></span>

## 失败归因顺序

| 失败位置 | 首查证据 | 正确责任层 | 不要先做 |
| --- | --- | --- | --- |
| 请求前 | config、credential、network、policy | 环境/权限 | 调高推理 |
| Transport | status、timeout、rate limit | provider/adapter | 改模型能力结论 |
| 消息/工具映射 | 原始 item、call/result ID | adapter/protocol | 记作不会用工具 |
| Context 组装 | selected/dropped/source/version | harness | 说模型忘记了 |
| 决策 | 当时可见证据与 model action | model + prompt | 用后来证据倒推 |
| Tool 执行 | handler、schema、幂等、副作用 | tool/controller | 只改提示词 |
| 验证 | assertion、rubric、Judge identity | evaluator | 把 checker 当产品事实 |
| 汇总 | 分母、split、config identity | analysis pipeline | 只报平均值 |

修复责任层后建立新 config version 并重跑受影响任务。旧 run 仍是历史故障证据，但不应继续计入修复后模型的能力分母。

## 适配记录的最小交付物

一次可审计适配至少产生：

```text
adaptation-brief.md     # 范围、门槛、指标、停止与采用规则
config/*.json           # 默认、工程、候选与回退身份
probes/                 # 协议和能力正负例
runs/*.jsonl            # task/run/trace/result/成本/失败分类
summary.json            # 配对结果、区间、guardrail 与缺失
decision.md             # adopt/reject/inconclusive 及证据边界
model-card.md           # 当前配置、路由、限制和重测触发
```

文件名只是建议，关键是 run 能回链 task、fixture、config、轨迹 和 result。最终将有效字段写入[模型适配卡](/practice/model-playbook)，并保留被否决候选和原因。

以下变化触发重测：model snapshot/alias、供应方/region/API surface、适配器/harness、tool schema、权限/网络、项目架构、任务分布、Judge/rubric。上游 release note 只能触发复核，不能自动升级本项目证据。

## 选择与采用

### 先区分资格与效用

选择分两阶段：

1. **Eligibility（资格）**：协议、安全、权限、数据和必需功能是否满足硬门槛；
2. **Utility（效用）**：在合格候选中，质量、延迟、费用、人工介入和维护成本如何权衡。

硬门槛失败的候选不能靠更高平均分补偿。例如 tool call ID 丢失、取消后仍执行写操作、敏感数据不满足区域要求，都是“不合格”，不是扣几分继续排名。

| 类型 | 示例 | 决策方式 |
| --- | --- | --- |
| 协议硬门槛 | 必需 schema、tool result 关联、状态续传 | 任一关键负例失败即排除 |
| 安全硬门槛 | 无越权、副作用可控、Secret 不泄漏 | 零容忍或按明确政策处理 |
| 质量门槛 | 关键任务成功不低于下限 | 区间与逐任务结果 |
| 资源上限 | P90 deadline、单任务费用、token | 超上限不采用或只限路由 |
| 软效用 | 平均质量、速度、人工轮次、维护成本 | 过硬门槛后再权衡 |

不要先给所有候选算一个加权总分。权重可以掩盖关键能力缺失；先排除不合格，再比较净效用更可审计。


### 在代表任务上比较净效用

对同一 task 运行各候选，使用干净起点、交错顺序和预注册重复。Task（任务） 是泛化的主要分析单位；同一 task 多次采样用于估计随机性，不等于增加不同任务数量。

主结果用任务成功或质量 rubric，并同时报告：

- 安全/权限/禁止动作和不可恢复副作用；
- single-run 与 success-within-budget，不混用 best-of-k；
- P50/P90、首 token、总 token、model/tool calls 和费用；
- 工具错误、重试、重复副作用、人工介入和恢复；
- 各 工作负载、风险、规模和工具类型切片；
- 配对 win/loss/tie、差值、区间、缺失和最差案例。

费用不只包含模型 token。Total cost of ownership（总拥有成本）还包括 Judge/工具 API、失败重跑、人工纠正、配置维护、适配器 修复和切换成本。无法换算成货币的安全风险与关键能力保留为硬门槛，不应硬塞进一条分数。

候选任务成功略高但需要更多人工接管，可能没有净收益；低单次价格但重复失败，单位成功成本可能更高。公开分项，让读者能按自己的约束重新判断。


<span id="形成路由不强求一个全局默认"></span>

### 形成路由，不强求一个全局默认

模型—Harness 匹配常得到分层策略：

| 路线 | 可观察任务条件 | 配置倾向 | 回退 |
| --- | --- | --- | --- |
| Fast | 局部、低风险、强确定性验证 | 低延迟/成本，窄工具 | 验证失败转 Standard |
| Standard | 常规多文件、多步骤、可回滚 | 工程基线 | 新证据触发有限升级 |
| Deep | 高歧义、跨系统、高影响 | 更高推理或替代组合 | 人工设计/审核 |
| Abstain | 证据、权限或安全条件不足 | 不自动执行 | 澄清、授权或拒绝 |

路由只能使用决策时已知特征，不能用最终成功或 Judge 分数造成标签泄漏。父子任务、重试和 fallback 共享总预算；切换模型不能关闭 schema、权限和安全门禁。详细设计见[推理预算与模型路由](/optimization/reasoning-routing)。

如果只有失败任务送到 Deep 路线，各路线样本难度不同，不能直接横比成功率。先用 full matrix 或 shadow routing 评估选择策略，再逐步上线。


<span id="处理没有赢家"></span>

### 处理“没有赢家”

结果只有三种：

- **Adopt（采用）**：所有硬门槛通过，主要结果与资源达到预注册规则；
- **Reject（否决）**：硬门槛失败或净效用不满足；
- **Inconclusive（结论不足）**：样本、身份、区间或覆盖不足。

结论不足时保持工程基线，不默认采用新候选。可以缩窄结论、补任务或做下一探针；不能把“未发现显著退化”写成“证明等价”。

没有组合满足必需协议/安全需求时，应修 适配器/harness、降低自动化范围或保持人工流程。选择一个“最不差”但不合格的候选不是匹配成功。
