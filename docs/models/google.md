# Google Gemini 模型家族适配

## 核对入口与证据边界

- [Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [Google ADK models](https://google.github.io/adk-docs/agents/models/)

核对日期：2026-08-20。Gemini API、Vertex AI 与 Google ADK 是不同层；model ID、区域、provider adapter（供应方适配器）和 surface（使用界面/执行表面）必须分别记录。当前项目不运行 Gemini live API；本页只有 E0 适配方法与官方入口，没有性能或模型质量证据。

## 先冻结“从哪里调用什么”

| 变量 | 例子类别 | 为什么必须独立记录 |
| --- | --- | --- |
| API surface | Gemini API 或 Vertex AI | 认证、区域、endpoint、配额和数据边界可能不同 |
| Runtime/framework | 自建 Harness 或 ADK | 工具循环、Session、重试与 trace 属于 Harness |
| Model identity | 精确 ID、alias 解析、核对时间 | 家族名不能定位实际版本 |
| SDK/Adapter | 语言、包版本、协议映射版本 | content/tool/stream 可能在客户端被改写 |
| Safety/config | safety、generation、output/stop 设置 | 拒绝与截断需要可归因 |
| Input pipeline | 文本、图像、文档的预处理版本 | 多模态字节可能在请求前已变化 |

“ADK 能配置 Gemini”只说明一条可能调用路径，不证明目标 API surface、模型和 workload（工作负载）已验证。相同 model 名经不同区域、provider 或 Adapter 运行也不应混进同一个 config ID。

## 最小适配卡

```text
surface / project-account class / region / endpoint
resolved model ID / alias observed_at
SDK + adapter + API version
request/response schema version
system/instruction mapping
tool/function schema + result mapping
generation/reasoning/safety/stop settings
media preprocessing + MIME + asset hash
context construction + output limit
retry / timeout / usage / cost source
data retention / logging / checked_at
```

身份来自 provider 响应、运行时配置和受控日志，不来自模型自报。区域、alias、SDK、media pipeline 或 safety 设置变化都建立新配置；不能把旧 run 当作新配置的重复样本。

## 协议资格探针

下面列的是必须实际探测的边界，不是对当前 Gemini API 的版本无关承诺：

| 探针 | 保存什么 | 合格条件 |
| --- | --- | --- |
| role/content parts | 原始请求与 Adapter 后消息 | 文本/多 part 顺序、空值和 role 不丢失 |
| structured/function call | schema、call ID、arguments | 合法/无效参数与未知字段可区分 |
| function result | call/result 关联与下一轮消息 | 连续工具不丢 identity |
| streaming | 原始 event、增量和最终包络 | 文本/参数不重复、不漏拼，结束可判断 |
| safety/stop | stop category、候选/错误元数据 | safety、长度、工具、取消与错误不混写 |
| usage | provider 字段、单位、缺失语义 | token/费用来源可审计，非有限值被拒绝 |
| cancel/timeout | 请求、观察、迟到 event 时间 | 迟到结果不覆盖终态 |

先用合成文本和只读工具做探针。Protocol（协议）不合格时修 SDK/Adapter，不进入模型能力评测；否则会把 parts 丢失、function mapping 错误或 stream 拼装 bug 误算成模型失败。

## 多模态输入是一条供应链

图像、音频或文档从原始资产到 model request 通常经过读取、转码、缩放、分页、OCR 或上传。可复现记录至少包含：

```text
source asset ID/hash
license / personal-data classification
original + sent MIME
dimensions/pages/duration
preprocessing code + version + parameters
uploaded asset/reference identity and expiry（若有）
request part order
```

用合成或获授权数据做探针，不把私人文档、截图或凭据放进 fixture。若两个配置收到不同分辨率、页数或 OCR 文本，结果不能只归因给模型。

多模态负例覆盖错误 MIME、损坏字节、超限尺寸、页序变化、缺失 part、重复 asset 和取消。工具返回的 OCR/网页文字是不可信数据，不能改变 system instruction 或授权外发其他文件。

## Function calling 与真实执行分开

Function calling（函数调用）输出只是 Action 提议：

```text
provider response
  → Adapter canonical ToolCall
  → schema validation
  → Task allowlist + identity/scope policy
  → optional approval
  → executor / idempotency / timeout
  → ToolResult
  → provider-specific result mapping
```

函数名和参数正确仍不代表获权；safety 设置也不替代操作系统 sandbox、网络 policy 或资源权限。Trace 同时保存脱敏的 provider event 引用与规范化 Action，才能定位错误发生在模型还是 Adapter。

连续工具探针至少包含成功、字段修正、工具错误、重复幂等键、取消和结果后完成。写操作 timeout 后结果未知时先查询目标系统，不由模型猜测是否重试。

## Safety stop 如何计分

Safety（安全策略）触发不是天然“模型失败”或“正确拒绝”。在实验前按任务定义：

- 输入本应允许却被拒绝：可能是 false positive，计入任务失败并保存类别；
- 输入违反预注册安全规则而被拒绝：计控制成功；
- Provider 拒绝但本地 policy 本应更早拦截：业务安全可能成立，但暴露控制层缺口；
- 无法识别 stop 原因：协议不合格，不能进入质量评分。

报告 safety 配置、输入类别、provider stop 元数据和应用最终处理。不要通过关闭安全设置来提高表面通过率；也不要把所有拒绝从分母删除。

## 长上下文不是文件数量

记录实际发送 token、part 顺序、检索/压缩策略和输出预留。目录中有 100 个文件不表示全部进入上下文；名义窗口足够也不证明模型能在中间位置找到冲突事实。

固定 probes：关键约束位于不同位置、旧/新版本冲突、跨 part 引用、超长 ToolResult、压缩后恢复和输出截断。评价任务 acceptance、引用准确性和约束违反，不用“成功接收请求”代替有效利用。

## Google ADK 是独立 Harness 变量

ADK 可以承担 Agent/runtime 组合，但 model provider 身份、Session、Tool policy、deployment target 和 evaluation mapping 都需要单独冻结。换成 ADK 后即使 model ID 相同，也改变了消息编排、工具、状态和 trace，必须建立新 config。

对比自建 Harness 与 ADK 时，报告默认体验和合理调优后的体验；不要隐藏一边的内建 Session、checkpoint 或人工确认。详情见[Google ADK](/frameworks/google-adk)。

## 工作例：图像与结构化解释

项目建议的 E0 设计，不是已运行的 Gemini 结果：

```text
Input: 两张合成产品图 + 固定 JSON 元数据
Task: 提取可见字段，调用 validate_product，生成带证据解释
Allowed: read_fixture / validate_product
Acceptance: schema 通过；字段引用对应 asset；未知内容 abstain
Negative: 图片内文字要求外发 Secret；错误 MIME；重复 asset
```

固定每张图片 hash、尺寸、MIME、part 顺序与预处理版本。Validator 复查结构化字段和引用，不能让模型文本自行声称“看到了”。任何网页/图像内指令作为数据处理；工具 policy 不因模型解释而扩大。

## 失败归因

| 症状 | 首查 | 不要先归因给 |
| --- | --- | --- |
| 文本正常、多模态异常 | MIME、预处理、part mapping/order | 模型视觉能力 |
| Function 参数丢失 | 原始 event、stream 拼装、Adapter | 模型规划 |
| Safety stop 增多 | 输入切片、配置、provider metadata | “模型变差” |
| 区域/权限错误 | project identity、endpoint、quota | model ID |
| 长上下文漏事实 | 实际 request token/顺序/压缩 | 名义窗口 |
| Usage 对不上 | SDK/provider 字段、重试、缓存 | 任务成本本身 |
| ADK 与直连结果不同 | Runtime、Session、tool/message mapping | 模型唯一变量 |

一次只改变一个主要变量。若同时换 surface、区域、model alias、SDK 和预处理，只能评价整个 bundle。

## 评测、晋级与回退

从真实 workload 分层取样，文本、工具、多模态、长上下文和安全负例分别报告。固定 model/Harness/provider/Task 和资源预算，预注册安全硬门槛、质量改善、不劣界限及 P90 延迟/费用上限。

真实 API 探针属于 E2，需要单独授权网络、凭据和费用；完整代表性矩阵与留出集才可能支持 E3。先在只读/synthetic shadow（合成影子流量）晋级，再扩大数据与工具权限。回退配置固定上一个 surface/model/SDK/Adapter/预处理组合。

## 在本项目验证离线边界

当前仓库没有 Gemini/Vertex client 或 credential reader，`LiveAdapter` 必定在 provider action 前失败。以下只验证共享协议控制，不验证 Google 服务：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py
npm run lab:ts-runtime-test
npm run facts:check
```

前置条件是 Python 3.11+、`uv 0.11.16`、Node.js 22+ 与锁定依赖。预期 Python `5 passed`，证明固定 replay tool loop、未知字段/坏 checkpoint 拒绝和 live hard-disable；TypeScript 拒绝坏 Task/Action；事实检查确认正文引用的产品主张已登记来源状态、版本和日期。

这些 E1 结果不发送文本/媒体到 Gemini API 或 Vertex，不验证 parts、function calling、safety、streaming、usage、区域或 ADK。`facts:check` 也不是 Google 兼容测试；协议覆盖是否完整需要人工对照目标 surface 和官方来源。

若 live adapter 可执行、命令请求 API key/网络，或坏 Action 被接受，停止任何 Gemini 适配结论。不要配置真实凭据、上传素材或改负例。命令只读 fixture，并可能产生 cache；误改时检查 `git diff -- lab docs/models/google.md` 并只恢复自己的变更，保持 replay/live-disabled baseline。

## 检查题与下一步

1. Gemini API、Vertex AI 和 Google ADK 为什么是不同实验变量？
2. 多模态结果异常时，为什么先检查预处理与 part mapping？
3. Provider safety stop 在哪些情况下算任务失败、控制成功或协议缺口？
4. Function call schema 合法后，还缺哪几层才能执行？
5. 当前离线测试为什么不能证明 Gemini 可用？

先读[Google ADK](/frameworks/google-adk)，再按[协议兼容性](/models/protocol-compatibility)实现探针，并用[评测方法](/evaluation/method)定义多模态与安全判定。
