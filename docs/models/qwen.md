# Qwen 模型家族适配

## 核对入口与证据边界

- [Qwen 官方站](https://qwenlm.github.io/)
- 目标模型的官方 model card（模型说明卡）、仓库 revision（修订版本）与 provider 文档

核对日期：2026-08-20。Qwen 家族可通过不同 provider（模型供应方）、兼容 API 或本地 runtime（运行时）接入；目标模型、许可证、上下文、价格和能力必须在采用前按实际 surface（使用界面/执行表面）重新核对。本页只给出 E0 适配方法，没有运行 Qwen checkpoint、云 API 或真实任务比较。

“OpenAI-compatible（兼容 OpenAI API）”通常只说明一部分请求外形相似，不证明 tool calling、streaming、error、usage、JSON、stop 或 retry 语义等价。协议未经探针验证前，不把兼容标签当作可替换承诺。

## 先确定你实际运行的对象

| 对象 | 必须冻结的身份 | 主要新增变量 | 不能直接证明 |
| --- | --- | --- | --- |
| Provider 托管 API | provider、endpoint、region、精确 model ID、alias 解析 | 服务端模板、路由、配额、日志与版本更新 | 本地同名权重的行为 |
| 第三方兼容 endpoint | 运营方、base URL、adapter、实际解析版本 | 协议转换、模型替换、数据边界 | 第一方 API 的语义与质量 |
| 本地/自托管权重 | checkpoint、revision、量化、runtime、tokenizer、chat template | 硬件、kernel、采样、调度与运维 | 任意云 provider 的结果 |
| 集成式 Harness | 上述身份加 Harness、工具、指令、上下文和 policy | 控制循环、权限、重试与 trace | 模型权重单独贡献 |

同一 checkpoint 在两个 runtime 上可能收到不同 token 序列、停止标记或 tool schema；同一 alias 也可能在 provider 侧被重新解析。实验身份必须以完整组合为单位，不能只写“Qwen”。

## 最小适配卡

托管与本地配置使用同一主键结构，但字段缺失时显式写 `not_applicable` 或 `unknown`：

```text
surface / provider / region / endpoint class
resolved model ID or checkpoint / immutable revision
license identifier + inspected source + checked_at
quantization format / precision
tokenizer revision / chat template hash / special tokens
runtime + server + kernel versions
SDK + adapter + protocol version
system/project instruction hash
tool schema + tool-result mapping
sampling / seed support / stop / output limit
context construction / truncation / cache
hardware / concurrency / scheduler / memory limits
retry / timeout / usage / cost source / data policy
```

不要从模型回答“我是什么模型”取得身份。托管 API 应保存 provider 返回的可验证元数据和 alias 核对时间；本地部署保存文件 hash、revision、启动参数和实际加载日志。任一关键字段变化都建立新 config ID。

## Checkpoint、量化与模板是一组版本

Checkpoint（模型检查点）只定位权重还不够。Tokenizer（分词器）、chat template（对话模板）、special token（特殊标记）和 generation config 会共同决定模型实际收到的 token。

最低资格探针包括：

- 单轮与多轮 system/user/assistant 映射；
- 空内容、中文标点、非 ASCII tool 名与长参数；
- assistant/tool/result 的连续关联；
- 正常完成、长度截断、stop token 与取消；
- 模板渲染后的文本或 token ID 快照。

模板若重复插入系统指令、漏掉 tool result 或使用错误的结束标记，表现下降不能归因给权重。升级 tokenizer、模板或 runtime 时，即使 checkpoint 不变，也要重跑协议资格集。

量化同样是实验变量。记录格式、位宽、校准方式、加载器和 kernel；用固定任务同时报告质量、首 token 延迟、生成速度和峰值资源。一次同时更换 checkpoint、量化和采样只能评价整个 bundle，不能声称某一项带来改善。

## 托管 API 与本地部署分开验收

托管 API 的责任边界包含认证、区域、alias、配额、数据处理、provider 重试和 usage；本地部署则包含权重取得、许可证、artifact 完整性、驱动、runtime、调度、资源隔离、日志和升级回退。

两者使用相同任务集时也分别报告：

```text
model/checkpoint identity
protocol qualification result
task acceptance result
queue + time-to-first-token + generation + tool wall time
input/output token under that tokenizer
provider usage/cost OR local hardware utilization
infrastructure and model failure classification
```

不要把本地 GPU 成本与 API 账单直接放在同一“每 token 价格”列。自托管成本还包括空闲率、并发、工程运维和失败恢复；若测量口径不同，保持分表。

## 兼容 API 必须做协议探针

下面是要实际执行的 probe（探针），不是当前 Qwen surface 的无条件事实：

| 探针 | 保存的原始观察 | 通过条件 |
| --- | --- | --- |
| messages | 发出与实际接收的 role/content | system、多轮、空值和 Unicode 不被静默改写 |
| tool schema | tool 定义、choice 与响应 arguments | 名称、类型、必填项和未知字段策略明确 |
| tool result | call ID、result 映射、下一轮请求 | 连续调用不丢 identity，不伪装成普通用户文本 |
| structured JSON | schema、原始文本与解析错误 | 非法/截断 JSON 可识别，不能静默补造成成功 |
| streaming | 原始 event、增量、最终包络 | 文本和 arguments 不重复/漏拼，终态唯一 |
| stop/error | HTTP、provider error、stop reason | 截断、拒绝、工具、限流、取消和服务错误可区分 |
| usage | provider 字段、本地 tokenizer 计数 | 单位、缺失与缓存口径明确，拒绝负数/NaN |
| cancel/retry | 时间线、幂等键与迟到 event | 取消后不覆盖终态；写操作不盲目重试 |

任一协议探针失败，先修 Adapter 或固定目标版本，不进入模型任务评分。HTTP 200、文本可读或一次 tool call 成功，都不足以证明完整兼容。

## Tool loop 与权限边界

模型输出的是 Action（动作）提议，不是执行授权：

```text
provider/runtime output
  → canonical ToolCall
  → schema validation
  → Task allowlist + identity/scope policy
  → optional approval
  → executor + timeout + idempotency
  → canonical ToolResult
  → provider/runtime-specific mapping
```

Trace 同时保存脱敏的原始输出引用和规范化 ToolCall/ToolResult，才能区分模型参数错误、模板错位、Adapter 丢 call ID 与工具自身失败。网页、仓库文本和 tool result 都是不可信数据，不能提升成 system instruction 或扩大权限。

连续工具负例至少覆盖字段错误后的修正、工具返回错误、重复幂等键、取消和结果后完成。写操作 timeout 后先查询目标状态；不要因为模型再次请求就重复执行。

## 中文、代码与长上下文怎么测

不要只用翻译或聊天题代表中文工作负载。按实际用途分层：中文约束遵循、中英混合标识符、结构化抽取、代码编辑、工具调用和长文档证据定位。每层固定 Task、Harness、采样、上下文和 validator。

代码任务至少保存输入 commit、允许路径、实际 diff、失败测试、目标测试、回归测试和未完成项。模型说“已完成”不计通过，必须由外部 validator 检查 acceptance 和 diff 边界。

长上下文记录实际发送 token、文件选择、顺序、检索、截断和输出预留，不用模型宣称的窗口数字代替有效利用。把关键约束放在开头/中间/结尾，加入旧新版本冲突、超长 ToolResult 和压缩后恢复的负例。

## 本地部署的硬件与运维边界

本地实验固定 GPU/CPU 型号与数量、内存/显存、驱动、runtime、kernel、batch、并发、上下文长度和量化。至少拆分：

- queue time（排队时间）；
- time to first token（首 token 延迟）；
- generation throughput（生成吞吐）；
- tool/validator wall time；
- 峰值显存/内存、OOM、重启和降级次数。

单用户短 prompt 的 tokens/s 不能代表多并发 Agent loop。吞吐提高也可能伴随尾延迟、截断或质量变化；用代表性并发阶梯与 P50/P90/P99 报告。

部署前单独核对目标 revision 的许可证、再分发、商用、衍生物和使用限制。本页不替代法律意见，也不从“可以下载”推导“可用于任意场景”。权重与 tokenizer artifact 应固定来源和 hash，避免自动拉取浮动版本。

## 失败归因

| 症状 | 首查 | 不要先归因给 |
| --- | --- | --- |
| 中文约束丢失 | system/template 编码、tokenizer、裁剪 | 模型家族整体能力 |
| Tool 名或参数异常 | 模板、compat layer、stream 拼装 | 模型规划 |
| 输出停不下来 | stop token、模板、generation config | “模型不听话” |
| 本地首 token 很慢 | 队列、加载、prefill、上下文长度 | 工具执行 |
| OOM/吞吐下降 | 并发、KV cache、量化、kernel、硬件 | checkpoint 唯一变量 |
| 托管 usage 对不上 | alias、provider tokenizer、retry/cache | 本地 tokenizer |
| Runtime 间结果不同 | 模板/tokenizer/kernel/采样 | 权重已改变 |
| 测试通过但任务错 | validator 覆盖、允许路径、Task acceptance | 协议已合格 |

修复后重跑原失败、相邻正例和协议负例。基础设施、Adapter、模型任务和控制违规分别统计，不用删除失败 run 的方式改善分数。

## 评测、晋级与回退

按真实 workload（工作负载）建立 development、holdout 和 incident regression。质量、延迟、资源与安全阈值预注册；报告 task-level 和 run-level 单位、失败分布及区间，不用单次 demo 或跨 Harness 排名。

晋级可以只覆盖一类任务或一个量化/硬件组合。托管 API 的回退固定上一个 provider/model/adapter；本地回退保留上一套 checkpoint、tokenizer、template、runtime 镜像和启动配置。发现许可证不符、artifact hash 变化、协议探针失败、OOM 超阈值或安全违规时停止扩大流量并回退。

## 在本项目验证离线边界

当前仓库没有 Qwen provider client、权重加载器或 credential reader，`LiveAdapter` 为 hard-disabled（硬禁用）。以下命令只验证共享离线协议和门禁，不验证 Qwen API、checkpoint 或本地 runtime：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py
npm run lab:ts-runtime-test
npm run model:check
npm run model:self-test
```

前置条件是 Python 3.11+、`uv 0.11.16`、Node.js 22+ 与锁定依赖。输入是仓库固定 replay fixture；预期 Python 显示 `5 passed`，TypeScript runtime 拒绝坏 Task/Action，模型协议 checker 与负例自测退出 0。断言 live adapter 在任何 provider/权重动作前失败。

这些 E1 控制结果不下载权重、不访问 Qwen/第三方 API，也不验证 tokenizer、chat template、tool/stream/error/usage、硬件性能、许可证或模型质量。`model:check` 主要验证共享/OpenAI 协议文档，不是 Qwen 兼容测试。

若命令请求 API key、网络或模型文件，live adapter 不再硬拒绝，或坏 Action 进入 metrics，立即停止；不要配置真实凭据、下载大文件或产生费用。命令只读 fixture，并可能产生 cache。清理时只删除本轮明确生成的 cache；误改时先用 `git diff -- lab docs/models/qwen.md` 确认范围，再只恢复自己的修改。候选不合格时回退到 replay/live-disabled baseline。

## 检查题与下一步

1. 同一 checkpoint 在两个 runtime 上结果不同，为什么不能立即归因给权重？
2. “OpenAI-compatible”还需验证哪些 tool、stream、error 与 usage 语义？
3. 量化实验必须同时记录哪些质量、延迟与资源指标？
4. 为什么托管 API 账单和本地 GPU 利用率不能直接排成统一价格榜？
5. 当前离线 `5 passed` 为什么不能证明 Qwen checkpoint 可用？

先填写[模型适配卡](/practice/model-playbook)，按[协议兼容性](/models/protocol-compatibility)建立资格探针，再用[实验方法](/optimization/experiment)做单变量比较。
