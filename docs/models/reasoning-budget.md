# 针对模型的推理预算

Reasoning control（推理控制）是 供应方 或产品暴露给单次模型调用的计算档位、模式或 token 上限；task budget（任务预算）则是 harness 对整个 run 的步骤、调用、时间、费用和人工轮次限制。两者解决不同问题，不能都简称“多想一点”。

```text
单次模型调用                         整个 Agent run
reasoning effort/mode                 max model calls / steps
output/reasoning token limit          deadline / retry / concurrency
model-specific defaults               total token / cost / human budget
                └──── 都受 task-level shared ledger 约束 ────┘
```

本页提供跨 供应方 的调优方法，不发布通用模型排名。具体字段、枚举、默认值、计费和可用 surface 会变化，必须在目标 model/供应方/适配器/harness 版本上核对并探测。

<span id="在本项目验证外循环预算边界"></span>
<span id="前置条件与固定输入"></span>
<span id="命令"></span>
<span id="预期输出与断言"></span>
<span id="失败、停止、清理与回退"></span>
<span id="失败停止清理与回退"></span>
<span id="证据边界"></span>
<span id="调优检查表"></span>
<span id="检查题"></span>

<span id="先区分六种预算"></span>

## 先区分六种“预算”

| 控制 | 作用范围 | 回答的问题 | 常见误解 |
| --- | --- | --- | --- |
| Reasoning effort/mode | 单次模型调用 | Provider 允许模型投入何种推理程度 | 等同于固定 reasoning token 数 |
| Context window | 单次请求 | 输入、状态与生成内容如何共享窗口 | 全部可用于加载文件 |
| Output token cap | 单次响应 | 生成内容最多占多少 token | 只限制可见文本 |
| Model-call budget | 整个 run | 最多调用模型几次 | 每次都可无限输出 |
| Step/time/cost budget | 整个 task | Agent 能循环多久、花多少 | 提高 effort 后自动同步扩大 |
| Human/authority budget | 整个流程 | 可请求几次人工、允许哪些副作用 | 可用费用换取更高权限 |

不同 供应方 的 `reasoning effort`、`thinking budget` 或产品档位没有统一刻度。两个都叫 `high` 的值不代表相同计算量、延迟、token 或质量；同一 供应方 下不同 model ID 也可能不同。

## 产品参数必须先过协议资格测试

在比较任务质量前，确认候选值真实被目标组合接受：

1. 固定精确 model ID/alias resolution、供应方、API surface、适配器、harness 与日期；
2. 从目标版本的官方 model/reference page 枚举合法字段和值；
3. 发出无副作用 probe（探针），保存脱敏 request 与 response identity；
4. 检查响应是否回显有效设置或提供可验证 usage/behavior signal；
5. 对非法值、缺失值、默认值和不支持模型运行负例；
6. 将结果标为 `supported / emulated / rejected / untested`。

HTTP 成功不足以证明参数生效。有的中间层可能静默忽略未知字段、替换模型、映射到另一档或使用默认值。无法确认时标 `untested`/`emulated`，不要把请求值当有效值。

不支持的值属于 protocol error（协议错误）。Adapter（适配器） 应在运行前拒绝或返回明确错误，不能静默 fallback 后仍把 run 记在候选档位下；否则 A/B 的配置身份已经错误。

## OpenAI 事实边界

[OpenAI 官方 reasoning guide](https://developers.openai.com/api/docs/guides/reasoning)明确说明：`reasoning.effort` 的支持值和默认值依具体模型而异。[FACT:openai-reasoning-effort]

因此本项目不把某一个模型页面列出的枚举、默认 effort 或建议复制为整个 OpenAI 家族规则，也不从 API model 推断 Codex surface 的可选项。来源状态、项目核对日期和证据等级以[事实注册表](/references/fact-registry)为准。

该官方事实是 E0 产品来源，不是本仓库已运行 OpenAI 模型的证据。[Responses 适配器](/models/openai)默认使用模拟传输，另有需显式授权与参数的可选 HTTP 路径；尚未取得任何真实 effort 值的 E2 证据。离线测试通过也不能证明目标模型接受或执行了某个推理档位。

## 建立可比较的配置身份

每个候选保存：

```text
model/provider/region/API surface
adapter/harness/surface/version
reasoning request + observed effective value/status
context/output/token settings
system/project/task instruction hashes
tool schema + permissions + network
max steps/model calls/retries/deadline/cost
task/fixture/runner/Judge identity
pricing/usage schema version + checked date
```

配置 ID 不能只叫 `medium`。例如 `model-a / provider-x / responses / effort=medium / adapter@abc` 才是可比较身份；另一 供应方 的 `medium` 是新 config。

Reasoning 参数属于 treatment（实验处理）的一部分。候选同时提高 effort、换模型、增加 `max_steps` 并改 prompt，只能评价整个 bundle，不能把增益归因给 effort。

<span id="先修低层问题再增加推理"></span>

## 先修低层问题，再增加推理

按照以下顺序排查：

1. 环境、依赖、认证、工作目录与网络；
2. 任务 goal、输入、non-goals 与 acceptance；
3. 必需上下文是否加载、可信、未过期且未截断；
4. Tool 名称、schema、错误返回、权限与幂等；
5. Validator（验证器） 是否提供可操作的新信号；
6. 最后才测试 reasoning 档位或替代模型。

不该通过增加 effort 恢复的信号：

| 失败 | 正确的首要动作 |
| --- | --- |
| 缺文件/事实 | 检索权威来源或请求输入 |
| Tool schema 不匹配 | 修 adapter/schema 与负例 |
| 权限/安全拒绝 | 停止并请求授权 |
| 测试/依赖不可运行 | 修环境或标 infrastructure failure |
| 来源冲突 | 保存冲突并核验，不让模型猜 |
| Adapter 丢 call ID/state | 修协议，旧 run 不计模型能力 |
| Timeout 后副作用未知 | 按幂等键对账 |
| Judge/汇总错误 | 修 evaluator，不调模型 |

只有正确证据与工具已经可用，模型仍在规划、综合、验证或不确定性处理上稳定失败，effort 才是合理候选变量。

## 哪些任务值得测试更高档位

不要用“看起来很难”路由。使用决策时可观察特征：

- 多文件/多组件依赖与长因果链；
- 三项以上相互制约的验收；
- 多个可信来源需要冲突消解；
- 需要比较替代方案、风险和回退；
- 确定性 验证器 返回具体、但非局部的失败；
- 高价值只读分析，需要更完整覆盖；
- 同一合理基线在同类 development tasks 上有已验证缺口。

机械转换、固定 schema 提取、单文件局部修改、强确定性工具主导任务，可能更适合较低档位。但这是待实验假设，不是“小任务必然低、小模型必然差”。

高风险副作用不是自动提高 reasoning 的理由。模型更充分思考仍不能替代 policy、sandbox、审批、幂等和人工责任人。

## 设计单变量配对实验

对同一 model/供应方/适配器 选择实际支持的 2–3 个候选值：

1. 先运行 供应方/harness 默认值并记录它实际解析为何值；
2. 锁定 task/fixture、prompt、工具、权限、上下文、采样、agent budgets 和 Judge；
3. 同一 task 运行每个档位，按预注册 seed 交错顺序；
4. Development set 用于找阈值，配置冻结后才看 holdout；
5. 报告 task-level 配对差异、区间、失败类型和资源；
6. 未达到门槛时保持工程基线，不默认选最高档。

若 供应方 的档位不可跨模型比较，就在每个精确 model 内先评估；换 model 的实验另建处理。无法固定 rolling alias 时记录每次响应身份，并把漂移作为限制。

### 一个可证伪假设

```text
在锁定的多文件 debugging workload 上，保持模型、prompt、工具与 task budget 不变，
候选 effort 相对默认值使 task-level success 至少提高 5 个百分点，
安全违规为 0，且 P90 总时长与单位成功成本不超过预注册上限。
```

阈值由使用风险和机会成本决定，不照抄示例。简单任务没有收益、复杂任务有收益时，形成路由可能优于全局提高默认值。

## 记录结果而不是只数 reasoning tokens

Primary outcome（主要结果）仍应是任务成功或质量 rubric。至少同时报告：

- 请求的 reasoning 设置与实际有效状态；
- single-run success、success-within-budget 与 task-level 结果；
- input/output/reasoning/cache token（供应方 提供时）；
- model/tool/Judge calls、retry 与人工介入；
- 首 token、端到端 P50/P90 和 timeout；
- 模型、工具 API、Judge 与失败重跑总费用；
- schema、context、planning、tool、verification、安全和预算失败；
- incomplete/截断、缺失 usage 与身份漂移。

Reasoning token 是机制/资源指标，不是质量分数。使用更多不证明推理更正确，使用更少也不证明效率更高。没有可比 usage 字段时，保留 missing/unknown，不能用 0 或本地字符估算做精确排名。

单位成功成本比单次请求价格更接近用户体验：

```text
cost per success = 全部成功与失败 run、重试、Judge、工具费用 / 完成任务数
```

仍需单列安全违规和人工成本，不能让平均费用掩盖高损失失败。

## 输出上限与推理预算会相互作用

Provider（供应方） 可能将内部 reasoning 与可见输出共同受某种生成上限或上下文约束，但具体口径必须查目标文档。调高 effort 却保持过小输出上限，可能在可见答案前耗尽；简单把 incomplete 计为“模型不会做”会错误归因。

每个 probe 记录：输入 token、请求的生成上限、response status/stop reason、可见输出是否存在、usage 分项和费用。截断/不完整与答案错误分开分类。

不要为避免 incomplete 无上限扩大输出。使用 task-level token/cost/截止时间 硬上限，先在无副作用 development tasks 估计分布，再设置有余量的明确界限。

## Agent 外循环仍要限制

较高 effort 只改变单次调用，不自动限制 agent 反复调用。Harness 仍需：

- `max_model_calls`、`max_steps`、截止时间 和 `max_cost`；
- retry/反思/人工轮次与并发上限；
- 父子任务、fallback 和 Judge 的共享账本；
- 每类耗尽的具体 stop reason；
- timeout/取消后的 late result 与副作用对账。

相反，step budget 太小也可能让候选来不及执行相同验证。实验必须固定外循环预算，或明确比较的是“effort + 更高 task budget”整体方案。

<span id="升级降级和拒绝自动路由"></span>

## 升级、降级和拒绝自动路由

路由输入只使用决策时已有特征。合理转移包括：

```text
fast/default
  ├─ 信息不足 → retrieve / ask / abstain
  ├─ schema/permission/environment → 修对应层或停止
  ├─ 新验证信号表明综合不足 → bounded higher-effort retry
  └─ 高影响且无法验证 → human review
```

每次升级都从共享预算扣减，并有总 attempt 上限。相同 prompt、状态和配置的重复请求没有新证据，不应无限重试。

模型/档位降级时仍保留 tool schema、权限、Secret、安全和验收门槛。所有候选的区间跨越决策阈值时 abstain（拒绝自动选择），保持默认/工程基线或交给人。

## 常见误读

| 观察 | 可能原因 | 不能直接推出 |
| --- | --- | --- |
| 高档位输出更长 | 风格/上限/任务差异 | 更正确 |
| Reasoning token 更多 | 任务更难或计算更多 | 更高质量 |
| 平均成功率更高 | 样本/选择偏差/重复 | 已达到晋级门槛 |
| P50 变化很小 | 长尾被均值隐藏 | P90/timeout 可接受 |
| 只有失败任务进入高档 | 路由选择造成难度差异 | 高档不如低档 |
| 请求字段被 HTTP 接受 | 中间层可能忽略/改写 | 设置已生效 |
| 单次价格更低 | 可能有更多失败/重试 | 单位成功更便宜 |
| 离线预算测试通过 | 只验证 controller | Provider effort 兼容 |

## 漂移与复核

以下变化建立新 config 并重跑协议 probe：model snapshot/alias、供应方 或 region、API surface、适配器/harness、reasoning 字段、usage/计费 schema、tool protocol。协议通过后再按风险决定是否重跑 development/holdout。

产品事实的 checked date 表示当日实际看过来源，不是永久保证。来源更新、实测与文档冲突时，注册 `conflict`/`pending`，保留两边证据；不能用一次成功调用覆盖官方约束，也不能用文档声明冒充项目 live evidence。
