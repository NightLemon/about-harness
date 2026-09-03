# 模型—Harness 匹配

Model–harness fit（模型—Harness 匹配）不是寻找一个“总体最好”的模型，而是在目标工作负载、协议、安全、延迟、费用和维护约束下，选择可验证的完整运行组合。真正的比较单位是：

```text
model × provider × adapter × harness × surface × configuration
```

同名模型换了 provider、API surface（接口形态）、adapter 或 harness，消息格式、工具调用、状态续传、用量字段和权限都可能不同。没有固定完整身份的“模型结果”不能直接迁移。

## 先区分资格与效用

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

## 从实际工作负载反推要求

不要从模型榜单倒推用途。先用近期真实任务建立 workload profile（工作负载画像）：

- task 类型、语言/框架、仓库与输入规模；
- 是否需要代码、浏览器、文档、数据或多模态工具；
- 上下文长度、状态持续时间和中断恢复；
- 并发、子任务、重试与人工交互；
- 读取/写入范围、不可逆副作用与审批；
- 事实新鲜度、隐私、区域和审计要求；
- 用户可接受的首 token、总时长、费用和人工等待；
- 可用的确定性验证、rubric 与失败回退。

记录各类任务的真实频率与损失。高频小修影响默认体验；低频但高损失的发布/迁移任务应成为独立硬门槛，不能被高频低风险任务的平均分稀释。

画像还要写 out of scope（不在范围）：例如只评代码维护，不包含法律建议或生产数据库操作。结论范围从一开始就被限制，不能在报告时扩大。

## 建立需求矩阵

把“希望更聪明”改成可验证 requirement：

| 需求 | 最小探针 | 通过标准 | 失败后动作 |
| --- | --- | --- | --- |
| 精确结构化输出 | enum、嵌套、未知字段负例 | schema 可拒绝坏值 | 修 adapter 或排除 |
| 多步 tool calling | 两工具、错误修正、结果关联 | call/result ID 不丢 | 修协议，不做能力评测 |
| 状态续传 | response/session ID 与完整回放 | 两种允许路径结果一致 | 标 rejected/emulated |
| 长任务恢复 | checkpoint 后继续预算 | 不重置计数、不重复副作用 | 修 harness |
| 安全边界 | 非允许工具与注入文本 | handler 前拒绝 | 排除或补强 policy |
| 取消/timeout | 慢调用与 late result | 不把 late action 标成功 | 修 controller |
| Usage（用量） | token/cache/reasoning/cost 字段 | 能解释或标记缺失 | 降低成本结论强度 |
| 目标任务质量 | 锁定 task + 验收 | 达到预注册下限 | 路由、调优或否决 |

每项标 `required / preferred / irrelevant`，避免因候选展示了任务不需要的能力而加分。通过标准还要绑定精确版本和证据等级。

## 冻结完整身份

配置至少保存：

```text
model ID/snapshot/alias resolution
provider + region + account/API surface
adapter name/version/commit
harness name/version/commit + surface
system/project/task instruction hashes
tool registry/schema + MCP/extension versions
reasoning/sampling/context/output settings
permissions/sandbox/network/approval policy
step/model/token/time/cost/retry budgets
runner/Judge/fixture/task/environment identities
checked_at + source/evidence references
```

Rolling alias（滚动别名）无法解析到固定快照时，记录实际响应 identity、时间和区域，并把漂移列为限制。不要问模型“你是谁”作为唯一身份来源。

身份任一关键字段变化就建立新 config version。把变化前后的 run 合并会把版本漂移伪装成随机性。配置 hash 只能识别字节身份，不能证明 provider 实际执行了请求的 reasoning 参数；还要检查响应元数据或行为探针。

## 先做协议资格测试

候选能聊天不等于能可靠运行 agent。按三层测试：

1. **Transport（传输）**：认证、endpoint、streaming、timeout、限流和错误；
2. **Message/tool（消息与工具）**：role、content part、schema、call/result ID、并行调用；
3. **Harness semantics（Harness 语义）**：停止、取消、重试、usage、cache、状态续传与恢复。

最小探针集覆盖：

- 单轮文本、多轮历史和 system/developer 冲突；
- 必填/枚举/嵌套/未知字段、坏 JSON 与参数修正；
- 一个工具、两个工具、并行/连续调用和重复 ID；
- 工具错误、部分成功、timeout 后结果未知和幂等重试；
- 输出截断、stop reason、取消与 deadline；
- rate limit、认证、server error 的稳定分类；
- input/output/cache/reasoning token 与费用字段；
- stateful 协议的 response ID、typed/opaque output item 或完整回放。

Adapter 无法无损表示的功能应标 `rejected`，不能静默压成 assistant 文本后称 `supported`。可以由 harness 补偿的标 `emulated`，同时记录补偿、限制和测试；尚未真实运行的标 `untested`。

协议失败先修 provider adapter 或排除组合，不计入模型推理能力。否则会把 call ID 丢失、错误未送回和状态被截断误判成“模型不会用工具”。

## 再跑无副作用能力探针

资格通过后，用 2–5 分钟的小探针形成能力假设，不做总排名：

| 探针 | 固定输入 | 观察信号 |
| --- | --- | --- |
| 指令作用域 | 根规则与子目录规则一处冲突 | 是否找到并采用有效 scope |
| 检索 | 未提供实现路径的小仓库 | 读取数、引用位置、是否猜测 |
| 工具恢复 | 第一次调用返回可修正错误 | 是否读错误并只修必要字段 |
| 状态保持 | 中途插入不相关长日志 | goal、禁区、改动是否保留 |
| 验证闭环 | 一个稳定失败测试 | 是否复现、修复、复跑 |
| 安全 | 文档内诱导外传模拟 Secret | 是否当数据并拒绝越权 |
| 不确定性 | 缺一个关键输入 | 是否澄清/abstain 而非编造 |

探针失败依次排查环境、任务契约、上下文、工具、权限和 adapter。只有确认正确证据已送达且控制层正常后，才把失败写进 model capability hypothesis（模型能力假设）。

探针的任务少、设计集中，通常只能支持 E2 窄范围可用性或发现明显不兼容，不能证明真实任务分布上的相对优势。

## 保留默认、工程与候选三种身份

- **Default baseline（默认基线）**：用户合理开箱设置；
- **Engineering baseline（工程基线）**：短项目指令、正确验证和最小安全边界；
- **Candidate（候选）**：在工程基线上改变一个主要变量。

默认基线回答配置工作值不值得，工程基线回答候选还能否增值。如果候选只在带答案暗示、额外工具、扩大权限或更高预算时领先，报告整个配置包差异，不能归因给模型。

模型比较时尽量保持任务、fixture、adapter 语义、工具、权限、预算口径和评分一致。不同模型必须使用不同协议表面时，记录差异；“公平”不应迫使一方使用错误协议，但结论也随之属于完整组合而不是裸模型。

## 在代表任务上比较净效用

对同一 task 运行各候选，使用干净起点、交错顺序和预注册重复。Task 是泛化的主要分析单位；同一 task 多次采样用于估计随机性，不等于增加不同任务数量。

主结果用任务成功或质量 rubric，并同时报告：

- 安全/权限/禁止动作和不可恢复副作用；
- single-run 与 success-within-budget，不混用 best-of-k；
- P50/P90、首 token、总 token、model/tool calls 和费用；
- 工具错误、重试、重复副作用、人工介入和恢复；
- 各 workload、风险、规模和工具类型切片；
- 配对 win/loss/tie、差值、区间、缺失和最差案例。

费用不只包含模型 token。Total cost of ownership（总拥有成本）还包括 Judge/工具 API、失败重跑、人工纠正、配置维护、adapter 修复和切换成本。无法换算成货币的安全风险与关键能力保留为硬门槛，不应硬塞进一条分数。

候选任务成功略高但需要更多人工接管，可能没有净收益；低单次价格但重复失败，单位成功成本可能更高。公开分项，让读者能按自己的约束重新判断。

## 形成路由，不强求一个全局默认

模型—Harness 匹配常得到分层策略：

| 路线 | 可观察任务条件 | 配置倾向 | 回退 |
| --- | --- | --- | --- |
| Fast | 局部、低风险、强确定性验证 | 低延迟/成本，窄工具 | 验证失败转 Standard |
| Standard | 常规多文件、多步骤、可回滚 | 工程基线 | 新证据触发有限升级 |
| Deep | 高歧义、跨系统、高影响 | 更高推理或替代组合 | 人工设计/审核 |
| Abstain | 证据、权限或安全条件不足 | 不自动执行 | 澄清、授权或拒绝 |

路由只能使用决策时已知特征，不能用最终成功或 Judge 分数造成标签泄漏。父子任务、重试和 fallback 共享总预算；切换模型不能关闭 schema、权限和安全门禁。详细设计见[推理预算与模型路由](/optimization/reasoning-routing)。

如果只有失败任务送到 Deep 路线，各路线样本难度不同，不能直接横比成功率。先用 full matrix 或 shadow routing 评估选择策略，再逐步上线。

## 处理“没有赢家”

结果只有三种：

- **Adopt（采用）**：所有硬门槛通过，主要结果与资源达到预注册规则；
- **Reject（否决）**：硬门槛失败或净效用不满足；
- **Inconclusive（结论不足）**：样本、身份、区间或覆盖不足。

结论不足时保持工程基线，不默认采用新候选。可以缩窄结论、补任务或做下一探针；不能把“未发现显著退化”写成“证明等价”。

没有组合满足必需协议/安全需求时，应修 adapter/harness、降低自动化范围或保持人工流程。选择一个“最不差”但不合格的候选不是匹配成功。

## 按失败位置归因

| 失败阶段 | 首查证据 | 所属层 | 不要归因给 |
| --- | --- | --- | --- |
| 请求前 | config、credential、network、policy | 环境/权限 | 模型质量 |
| transport | status、timeout、rate limit | provider/adapter | reasoning |
| message/tool 映射 | 原始 item、call/result ID | adapter/protocol | 工具选择能力 |
| context 组装 | selected/dropped/source/version | harness | 模型记忆 |
| 决策 | 模型 action 与当时可见证据 | model + prompt | 后来才知道的事实 |
| tool 执行 | handler、schema、幂等、副作用 | tool/controller | 模型答案质量 |
| 验证 | assertion、rubric、Judge identity | evaluator | 产品行为本身 |
| 汇总 | 分母、cell、split、identity | analysis pipeline | 候选配置 |

保存失败 trace 和邻近回归。Adapter bug 修复后的旧 run 仍是历史故障证据，但不应继续计入修复后模型能力；建立新 config version 和正式 run。

## 写入适配卡并维护生命周期

采用决定落到[模型适配卡](/practice/model-playbook)：身份、协议四态、工作负载、探针、默认/工程/候选配置、任务级结果、安全/资源、路由/回退、证据和已知限制。

以下变化触发重测：model snapshot/alias、provider 路由、adapter/harness/surface、tool schema、权限/网络、项目架构、任务分布、Judge/rubric。小变化先跑协议与事故回归；大变化重跑代表矩阵和未见 holdout。

维护 rejected candidate（被否决候选）记录，说明版本与原因。上游修复可能使其重新合格，但不能仅凭 release note 自动改变项目证据等级。

## 在本项目验证最低兼容边界

### 前置条件与固定输入

需要 Python 3.11+、uv 0.11、Node.js 22+，依赖由 `uv.lock` 和 `package-lock.json` 固定。从仓库根目录离线执行；不设置 provider credential、网络或费用授权。

输入是固定 `ReplayAdapter` 记录、进程内 `sum` 工具、hard-disabled `LiveAdapter`，以及兼容性矩阵和 checker 的正负例。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py
npm run facts:check
```

### 预期输出与断言

- pytest 应有 2 项通过：replay 在无网络/凭据下完成 `1+2+3=6`；live adapter 在产生 provider action 前抛出 `LiveAdapterDisabled`；
- `facts:check` 应确认产品主张的来源状态、版本、日期和正文引用一致；
- 人工逐行检查目标 identity、tool flow、reasoning state、effort control，以及 source fact、offline seam、live evidence 和 control-layer evidence 是否分列；关键词存在本身不算通过。

### 失败、停止、清理与回退

若 replay 需要网络/凭据、live adapter 未被硬拒绝、事实引用无效，或人工核对发现 evidence axis/控制责任混写，停止任何兼容或模型质量声明。先修 adapter、事实记录或正文并保留负例；不要配置真实 key、调用付费 API 或把 `untested` 改成 `supported` 让页面通过。

命令只读固定数据并产生可忽略测试缓存；需要时只清理 `.pytest_cache/`。误改实现或矩阵时用 `git diff -- lab/src/about_harness/adapters lab/tests/test_replay_and_live.py docs/references/compatibility.md` 精确定位，并只恢复自己的修改。候选失败时保持 offline replay 与 live-disabled 基线。

### 证据边界

这些测试提供 E1：当前项目的 replay action 能通过最小 harness loop；live adapter 是无 provider client、无 credential reader 的硬禁用占位。事实检查只能证明来源登记和引用结构有效；evidence axis、职责边界与适用范围需要人工审阅。

整组测试没有安装或启动 Codex、Pi、Claude Code、LangGraph、Browser Use、PydanticAI 或 LlamaIndex，也没有调用真实模型/provider。因此不能证明任何真实组合兼容、可用、较优或满足生产安全；兼容矩阵中 live 状态仍应是 `untested`，不能由文案检查或命令成功升级。

## 选择前检查表

- 比较单位是否固定到 model/provider/adapter/harness/surface/config？
- Workload 的频率、风险、工具、验证和 out-of-scope 是否明确？
- 必需协议与安全要求是否先作为资格门槛，而非总分权重？
- 每个 `supported/emulated/rejected/untested` 是否有精确版本和证据？
- 协议失败是否先从模型能力结果中隔离？
- 默认、工程和候选基线是否有 hash，预算/权限是否可比？
- 结果是否按 task 配对，报告区间、失败、成本和人工介入？
- 路由是否只用决策时特征，并保留 abstain 与回退？
- 结论不足或没有合格候选时，是否保持基线/人工流程？
- 版本、任务分布或控制层变化时，是否触发重测？

下一步先完成[模型协议兼容性](/models/protocol-compatibility)探针，再按[实验方法](/optimization/experiment)运行单变量候选，并把限定结论写入[模型适配卡](/practice/model-playbook)。

## 检查题

1. 为什么同名模型换 provider 或 harness 后不能直接沿用旧结论？
2. 哪些失败应直接判定组合不合格，而不是在总分里扣分？
3. Tool call ID 被 adapter 丢失时，为什么不能记为模型工具能力失败？
4. 单次价格更低为什么不一定意味着单位成功成本更低？
5. 没有候选满足硬门槛时，正确决定是什么？
