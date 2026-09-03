# DeepSeek 模型家族适配

## 核对入口与 pending 边界

- [DeepSeek API Docs](https://api-docs.deepseek.com/)
- 目标模型的官方 model card（模型说明卡）与发布说明

核对日期：2026-08-20。本轮对特定 pricing 页面出现 TLS 失败，因此 API surface（API 使用界面）中的价格、model alias（模型别名）、上下文和可用性保持 `pending`，不得抄写旧值或从第三方摘要补空。[FACT:deepseek-api-surface]

本页只有 E0 适配方法。项目没有调用 DeepSeek 官方 API、第三方 endpoint（端点）或本地权重，没有 reasoning、tool、stream、usage、成本与模型质量证据。`pending` 不是“暂时相信旧数字”，而是阻止依赖这些数字的费用实验、容量承诺和能力比较。

## 先拆开三种部署身份

| Surface | 必须记录 | 新增风险 | 不能互相证明 |
| --- | --- | --- | --- |
| DeepSeek 官方 API | 官方 endpoint、账户/区域类别、精确 model ID、alias 核对时间 | 官方协议、配额、数据与版本变化 | 第三方或本地同名模型行为 |
| 第三方托管/兼容 endpoint | 运营方、base URL、区域、adapter、实际解析模型 | 路由替换、协议转换、日志与供应链 | 官方 API 的身份和语义 |
| 本地/自托管权重 | checkpoint、revision、tokenizer、模板、量化、runtime、硬件 | artifact、许可证、资源和运维 | 任意 API surface 的结果 |

Provider 身份是实验变量。第三方返回相同 alias 或兼容响应外形，并不证明请求到达同一模型；本地同名 checkpoint 也不继承官方 API 的模板、reasoning 字段、usage 或服务端路由。

## Pending 如何进入控制流

把 volatile fact（易变事实）当结构化依赖，而不是散落在说明文字中：

```text
fact status = pending
  → price/context/alias/availability = unknown
  → block cost calculator and capacity promise
  → allow only offline design/replay
  → authorized probe + official-source inspection
  → evidence review
  → verified 后才建立带日期的配置
```

在事实恢复为 verified 前：

- 预算字段写 `unknown`，不使用缓存价格计算“预计花费”；
- alias 不作为模型身份，必须由获授权的 provider 元数据核验；
- 不按未经核对的上下文数字拼接生产请求；
- 不声称某功能、区域或模型当前可用；
- 不用一次 HTTP 成功把所有 pending 字段一起升级。

每个字段分别保存来源、检查日期和证据。价格页可访问不等于 alias、上下文或 capability（能力项）均已验证。

## 最小适配卡

```text
provider operator / official-or-third-party / region
endpoint class / API + SDK + adapter versions
requested alias / resolved model identity / observed_at
checkpoint + revision（本地时）
system/project instruction hash
reasoning setting + exposed field policy
tool schema + tool-result mapping
JSON / streaming / stop configuration
context construction / input + output limits
retry / timeout / idempotency / concurrency
provider usage fields / price source status
data retention / logging / credential scope
Harness / Task / validator / checked_at
```

无法核对的值写 `unknown`，不要省略。模型自报、响应正文里的名称或第三方宣传页都不能单独证明身份。Endpoint、provider、alias 解析、Adapter 或 reasoning 设置变化时创建新 config ID。

## 先做协议资格探针

下面是应由获授权实验实际执行的 probe（探针），不是对当前 API 的无条件声明：

| 探针 | 必须保存的观察 | 合格条件 |
| --- | --- | --- |
| messages | 原始请求、Adapter 后消息、响应包络 | role/content、空值、多轮映射无静默变化 |
| reasoning | 请求参数、可见/隐藏字段、下一轮映射 | 字段边界明确，不泄露或误回送隐藏内容 |
| tool call | schema、choice、call ID、arguments | 类型可解析，无效字段与拒绝可区分 |
| tool result | result 与 call 关联、下一轮请求 | 连续工具不丢 identity |
| structured JSON | schema、原始输出、解析错误 | 截断/非法 JSON 不伪装成成功 |
| streaming | 原始 event、增量、最终包络 | reasoning/text/arguments 不重复或漏拼 |
| stop/error | stop reason、HTTP/provider error、retry | 完成、工具、长度、拒绝、取消、限流可区分 |
| usage | provider 字段、单位、缺失值 | 来源可审计；负数、NaN、Infinity 被拒绝 |
| cancel/retry | 请求与 event 时间线、幂等键 | 迟到 completion 不覆盖终态；写操作不盲重试 |

探针按官方 API、每个第三方 endpoint 和本地 runtime 分别执行。任一协议资格失败，先修 Adapter 或冻结目标版本，不进入代码任务或成本比较。

“OpenAI-compatible（兼容 OpenAI API）”只是一条待验证的接入假设。HTTP 路径、JSON 外形和 SDK 能发出请求，不代表 reasoning/tool/stream/error/usage 语义等价。

## Reasoning 字段不是普通正文

Reasoning（推理过程）是否可请求、返回、隐藏或与 tool call 交错，必须以目标 surface 的官方文档和 probe 为准。Adapter 需显式定义：

- 哪些字段进入用户可见答案；
- 哪些字段仅用于受限 trace，如何脱敏与保留；
- 下一轮请求回送哪些内容；
- streaming 时不同增量如何分流与拼装；
- reasoning 缺失、拒绝或截断如何分类。

不要把未知字段拼入 assistant 正文，也不要把内部 reasoning 当作可靠审计解释。最终决策仍用 Action、工具证据、validator 和 policy 判断；一段合理的推理文字不能证明工具已执行或答案正确。

## Tool loop 与真实执行边界

Tool calling（工具调用）输出只是待验证 Action：

```text
provider response
  → canonical ToolCall
  → schema validation
  → Task allowlist + identity/scope policy
  → optional approval
  → executor + timeout + idempotency
  → canonical ToolResult
  → provider-specific mapping
  → next model action
```

Trace 同时保存脱敏 provider event 引用和规范化 ToolCall/ToolResult，才能区分模型参数错误、Adapter 丢 call ID、stream 拼装错误与工具故障。来自网页、仓库和 tool result 的文字是不可信数据，不能扩大权限或改变 system instruction。

连续工具探针包含成功、无效参数后的修正、工具错误、重复幂等键、取消和结果后完成。写操作 timeout 后状态未知时先查询目标系统，不把原请求直接重放。

## Streaming、Usage 与预算

Streaming（流式返回）应保存原始事件序列、到达时间、事件类型、增量归属和最终聚合结果。重点测试 reasoning/text/tool arguments 交错、UTF-8 边界、空 event、重复 event、网络中断、取消和迟到 completion。

Usage（用量）要记录 provider 原字段、单位、缓存口径、重试归属和本地计量，不在 Adapter 内悄悄补零。缺失 usage 与 `0` 不同；非有限值不得进入 metrics 或预算判断。

当前价格为 `pending`，因此可以设计 token/调用次数上限，但不能给出货币成本结论。未来获授权验证时也先设置独立的最小费用硬上限，保存实际账单证据；一次成功请求只产生该 surface、配置和日期下的 E2 probe，不代表代表性 workload 的 E3 质量。

## Coding 工作例与失败分类

以下是建议实验设计，不是已经运行的 DeepSeek 结果：

```text
Task: 在固定 commit 修复一个可复现边界错误
Allowed: read/search/edit/targeted-test
Forbidden: network/dependency/generated files/真实凭据
Acceptance: 失败测试先复现；目标与回归通过；diff 仅允许路径
Budget: call/tool/token/time caps；货币成本 unknown
```

运行记录保存 provider/resolved model、Adapter、reasoning/tool 配置、Task、输入 commit、trace、实际 diff、测试、usage、exit code 和 failure classification（失败分类）。由外部 validator 执行测试与路径审查；模型输出 `completed`、流畅解释或一次 tool call 成功都不算 acceptance。

| 症状 | 首查 | 不要先归因给 |
| --- | --- | --- |
| Reasoning 与正文混杂 | event 类型、Adapter mapping、回送策略 | 模型任务能力 |
| Tool 参数丢失 | 原始 stream、call ID、JSON 拼装 | 模型规划 |
| 第三方 alias 相同 | provider 身份、路由与解析元数据 | 与官方模型相同 |
| 认证/限流失败 | endpoint、credential scope、quota、retry | 模型质量 |
| 长上下文漏约束 | 实际 token、顺序、截断/压缩 | 未核对的窗口数字 |
| Usage 或费用异常 | 单位、retry/cache、pending price | “推理太多” |
| 测试绿色但任务错误 | validator 覆盖、diff、Task acceptance | Harness 已可靠 |
| Cancel 后仍显示完成 | controller 终态与迟到 event | 正常 completion |

基础设施、认证、协议、Adapter、工具、模型任务与控制违规分别计数。修复后重跑原失败、相邻正例和协议负例，一次只改变一个主要变量。

## 第三方 Endpoint 的身份与安全

第三方兼容 endpoint 是独立供应商集成，不是 base URL 的机械替换。上线前核对运营主体、区域、数据保留/训练政策、日志、子处理者、删除机制、可观测字段、限流和事件响应。

凭据按 provider、环境和最小 scope 隔离，不把 key 写入仓库、fixture、命令历史或原始 trace。日志默认脱敏 authorization、个人数据、工具结果和代码 Secret。若无法确认请求实际路由、数据边界或删除责任，保持 E0，不发送真实业务数据。

本地权重也需固定 artifact 来源/hash、许可证、tokenizer/template、runtime 与硬件。它减少某些外部数据流，不自动解决供应链、隔离、日志或模型输出风险。

## 评测、晋级与回退

按真实 workload（工作负载）分层建立 development、holdout 和 incident regression。固定 provider/model/Harness/Task/资源，预注册安全零容忍、质量阈值、非劣界限和 P90 延迟/用量上限。

在价格、alias、上下文和可用性仍 pending 时，不做成本优胜或容量晋级。待事实分别 verified 后，先跑协议资格，再做只读 synthetic shadow（合成影子任务），最后才扩大数据与工具权限。回退配置必须固定上一个 provider、resolved model、Adapter、Harness 和事实快照；alias 漂移、协议失败、账单异常或安全违规立即停止扩大流量。

## 在本项目验证离线边界

当前仓库没有 DeepSeek provider client、第三方 endpoint 配置、权重加载器或 credential reader，`LiveAdapter` 为 hard-disabled（硬禁用）。以下命令只验证共享离线协议与门禁：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py
npm run lab:ts-runtime-test
npm run model:check
npm run model:self-test
```

前置条件是 Python 3.11+、`uv 0.11.16`、Node.js 22+ 与锁定依赖。输入为仓库固定 replay fixture；预期 Python 显示 `5 passed`，TypeScript runtime 拒绝坏 Task/Action，model checker 与负例自测退出 0。断言 live adapter 在任何 provider、网络或权重动作前失败。

这些 E1 控制结果不访问 DeepSeek/第三方 API、不下载权重，也不验证 reasoning、tool、stream、usage、价格、alias、上下文、可用性或模型质量。`model:check` 主要验证共享/OpenAI 协议文档，不是 DeepSeek 兼容测试。

若命令请求 API key、网络或模型文件，live adapter 不再硬拒绝，或 pending 值进入费用计算，立即停止；不要配置凭据、产生费用或用旧数字补空。命令只读 fixture，并可能产生 cache。清理时只删除本轮明确生成的 cache；误改时用 `git diff -- lab docs/models/deepseek.md` 确认范围并只恢复自己的改动。候选失败时回到 replay/live-disabled baseline。

## 检查题与下一步

1. 为什么官方 API、第三方 endpoint 和本地权重是三套实验身份？
2. `pending` 为什么必须阻止费用和容量结论，而不只是页面上加一句免责声明？
3. Reasoning、text 与 tool arguments 在 streaming 中应如何分流验证？
4. “OpenAI-compatible”还不能证明哪些 stop、error 与 usage 语义？
5. 当前离线 `5 passed` 为什么不能证明 DeepSeek API 或模型可用？

先查[事实注册表](/references/fact-registry)，再按[模型适配方法](/models/adaptation)冻结身份，用[协议兼容性](/models/protocol-compatibility)建立资格探针，并以[实验方法](/optimization/experiment)设计单变量比较。
