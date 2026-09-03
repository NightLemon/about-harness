# 指定模型适配方法

Model adaptation（模型适配）不是给模型写一张“能力印象表”，而是让一个精确的模型运行组合在指定工作负载中达到可复核、可回退的结果。适配单位是：

```text
model × provider × adapter × harness × surface × configuration
```

同名模型更换 provider、API surface（接口形态）、adapter 或 harness 后，协议、状态续传、工具语义和用量字段都可能变化，旧结论不能直接继承。

## 本页负责什么

相关页面各自回答不同问题：

- [模型—Harness 匹配](/optimization/model-fit)：在多个完整组合之间做资格筛选与效用选择；
- [模型协议兼容性](/models/protocol-compatibility)：确认消息、工具、状态和错误能否无损传递；
- 本页：对一个已选中的候选组合执行从冻结身份到回退的操作流程；
- [模型适配卡](/practice/model-playbook)：保存最终配置、证据、采用决定和重测条件。

以下流程属于稳定机制与本项目建议，不是某个 provider 的永久产品事实。具体 model ID、字段、支持值、默认行为和费用都应按目标版本单独核对；尚未运行的组合写 `untested`，不能用产品文档替代项目实测。

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

将规范化配置序列化并计算 hash。关键字段发生变化就建立新 config ID，不要把变化前后的 run 混在一起。Hash 只能证明记录字节一致，不能证明 provider 实际采用了请求参数。

### 身份冻结出口

- 身份、权限和预算都能被另一位维护者重建；
- 无法固定的字段已明确标为 rolling、unknown 或 untested；
- 已指定当前基线和精确回退目标。

身份来源互相冲突、关键配置缺失或 alias 无法追踪时，不进入质量比较。

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
- 每个错误都能稳定归类到 provider、adapter、harness、tool 或 policy；
- 取消、预算耗尽和权限拒绝不会被误记为任务成功。

关键 required 项为 `rejected` 或 `untested` 时停止。先修 adapter/harness 或缩小自动化范围，不用更高推理档位掩盖协议错误。

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

探针少且集中，只能定位弱点或支持窄范围假设。一次成功不能证明真实任务质量；一次失败也要先排除环境、adapter、上下文和验证器问题，不能直接归因为模型能力。

## 阶段四：建立工程基线

保留三个不同身份：

- **Default baseline（默认基线）**：合理的开箱配置；
- **Engineering baseline（工程基线）**：加入清晰任务契约、必要上下文、最小工具与安全边界；
- **Candidate（候选配置）**：在工程基线上只改变一个主要变量。

工程基线先处理低层问题：明确 goal/non-goals/acceptance，去除冲突上下文，收窄工具 schema，补充确定性验证，并设置共享的步骤、调用、时间、费用和人工预算。它不是把答案写进 prompt，也不能给候选额外权限。

如果工程基线已经解决问题，记录这是 harness/configuration 改进，不要错误归功于换模型或增加推理。默认基线仍需保留，用于判断工程工作本身带来的收益。

### 基线出口

- 默认与工程基线有独立 config hash 和逐任务结果；
- 两者使用相同任务、fixture、权限和评分口径；
- 工程基线的每项变化都有问题证据和回退方法。

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

当前项目没有真实 provider client、credential reader 或 live-model 运行证据。因此本仓库只能演示离线阶段，不能据此执行后续有限上线，也不能声称某个真实模型组合可用或较优。

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

文件名只是建议，关键是 run 能回链 task、fixture、config、trace 和 result。最终将有效字段写入[模型适配卡](/practice/model-playbook)，并保留被否决候选和原因。

以下变化触发重测：model snapshot/alias、provider/region/API surface、adapter/harness、tool schema、权限/网络、项目架构、任务分布、Judge/rubric。上游 release note 只能触发复核，不能自动升级本项目证据。

## 在本项目走通离线适配基线

这段教程只验证当前仓库的离线 replay/fake 接缝和评测文件关系，不调用真实模型。

### 前置条件与固定输入

需要 Python 3.11+、uv 0.11、Node.js 22+；依赖由 `uv.lock` 与 `package-lock.json` 固定。从仓库根目录执行，不设置 provider credential，不授予网络、费用或远程写权限。

固定输入包括：

- `lab/tests/test_replay_and_live.py` 中的 `ReplayAdapter`、进程内 `sum` 工具和 hard-disabled `LiveAdapter`；
- `evals/tasks.example.jsonl`、`evals/fixture-refs.example.json`、`evals/study.example.json` 与 `evals/runs.example.jsonl`；
- 文档中的模型协议标记、兼容矩阵和 checker 负例。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py
npm run model:check
npm run compat:check
npm run compat:self-test
npm run eval:validate
npm run eval:summary
```

### 预期输出与断言

- pytest 有 2 项通过：replay 在无网络/凭据下完成 `1+2+3=6`；live adapter 在产生 provider action 前抛出 `LiveAdapterDisabled`；
- `model:check` 确认 identity、tool flow、reasoning state、effort control 与事实边界所需标记存在；
- `compat:check` 确认 Source fact、Offline seam、Live evidence 与控制层责任被分开记录；
- `compat:self-test` 拒绝缺少证据轴、当前对象状态、责任缺口、独立控制或 fact registry 的固定 canary；
- `eval:validate` 验证 task、不可变 fixture ref、run 与 hash lineage 一致；
- `eval:summary` 只汇总通过 schema/lineage 校验的固定示例，并明确其证据等级。

所有命令退出码都必须为 0。还要人工确认没有请求 credential、没有 provider/network action，并且 live 状态仍是 `untested`。

### 失败与停止条件

若 replay 需要网络/凭据、live adapter 未被硬拒绝、负例被 checker 接受、fixture ref/hash 无法解析，或 summary 把离线结果写成真实模型质量，立即停止“适配完成”声明。先修对应的 adapter、validator 或证据标签并保留失败样本；不要配置真实 key、放宽校验或把 `untested` 改为 `supported` 来让流程通过。

### 清理与安全回退

这些命令只读取固定输入并可能产生 `.pytest_cache/` 等可忽略缓存；不需要删除评测 artifact。若误改文件，先用：

```powershell
git diff -- lab evals scripts docs/models/adaptation.md
```

精确确认本轮变化，再只恢复自己的改动。不要用会覆盖整个工作树的命令。适配候选失败时，决策回到已锁定的 replay/live-disabled 工程基线。

### 证据边界

上述结果是 E1：证明当前仓库的固定 replay 能经过最小 harness loop，live adapter 被技术禁用，静态 checker 能验证它定义的标记和负例，示例 eval 文件之间的 lineage 可校验。

它不安装或运行 Codex、Claude Code、Pi、LangGraph 等真实 harness，不调用 OpenAI、Anthropic、DeepSeek 或其他 provider，也不测真实延迟、费用、reasoning 参数、长上下文和模型质量。静态 marker checker 不理解整段文字语义。因此命令通过不能证明任何真实组合兼容、可用、较优或满足生产安全。

## 结束检查表

- 是否把结论固定到完整 model/provider/adapter/harness/surface/config？
- 是否先定义目标 workload、范围外、硬门槛、停止与回退？
- Required 协议和安全能力是否在质量比较前通过正负例？
- 默认、工程与候选基线是否各有 config hash 和任务级记录？
- 每轮是否只改变一个主要变量，并冻结权限、预算和 Judge？
- 失败是否先按环境、协议、harness、tool、evaluator 顺序归因？
- 是否同时报告主要结果、安全、P90、费用、人工和最差案例？
- 证据不足时是否保持 `untested`/`inconclusive` 而非强行选赢家？
- 有限晋级是否设置 shadow、小流量、监控、责任人和完整回退？
- 最终适配卡能否让另一位维护者重跑并知道何时失效？

下一步：先完成[协议兼容性](/models/protocol-compatibility)的资格探针，再按[实验方法](/optimization/experiment)运行单变量候选，并把限定结论写入[模型适配卡](/practice/model-playbook)。

## 检查题

1. 为什么同一个 model ID 更换 provider 或 adapter 后需要重新建立 config？
2. Tool call ID 丢失时，为什么应该停止能力评测而不是提高推理档位？
3. Default baseline、engineering baseline 和 candidate 分别回答什么问题？
4. 候选同时扩大权限和提高预算后，为什么不能把收益只归因给模型？
5. 本项目离线命令全部通过后，为什么仍不能进入真实模型小流量上线？
