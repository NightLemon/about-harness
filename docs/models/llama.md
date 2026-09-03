# Meta Llama 模型家族适配

适配 Llama 不是只填写一个 family name（家族名称）。同一名称可能对应不同 checkpoint、权重格式、tokenizer、chat template、量化、推理 runtime、provider 包装和硬件；任何一层变化，都可能改变工具调用、停止、上下文、速度和质量。

本页给出可复现的适配与评测方法，不给 Llama checkpoint 做通用排名，也不声明某个版本永久拥有特定能力。

## 官方核对入口与事实边界

- [Meta Developer：AI Developer Docs & Resources](https://developer.meta.com/ai/docs/overview/)
- 目标 checkpoint 的官方 model card、license、acceptable-use 条款和不可变下载来源

本页于 2026-09-03 实际打开官方入口并确认页面可访问。旧 `llama.com/docs/overview/` 入口当前会转到 Meta Developer 的 canonical 页面；具体模型、下载、许可、上下文、工具格式和运行要求仍必须以目标 checkpoint 的官方材料为准。

这条来源核验只能提供 E0。当前仓库没有下载权重、安装推理 runtime、启动 server 或调用托管 Llama API，不能据此声称任何真实组合兼容、可用或效果更好。

## 先把“Llama 模型”拆成完整身份

| 层 | 至少记录 | 为什么不能省略 |
| --- | --- | --- |
| Family/release | 正式名称、发布日期、官方来源 | Family 不能唯一定位字节与能力 |
| Checkpoint | Repository/artifact、revision/commit、文件 hashes | 同名 tag 或镜像可能漂移 |
| Model variant | 参数规模、base/instruct/其他官方变体 | 训练目标和接口预期不同 |
| License | 文件版本、适用主体/地区/用途、核对日期 | 代码仓库 license 不代替权重许可 |
| Tokenizer | Artifact/revision/hash、special tokens | Token 数、截断和 stop 会改变 |
| Chat template | 模板内容/hash、role 映射、generation prompt | 消息边界与 tool syntax 可能改变 |
| Weight format | Dtype、shard、container/file format | Runtime 加载与数值路径不同 |
| Quantization | 方法、bits、group/calibration、工具/version | “4-bit”不是唯一处理 |
| Runtime/backend | Runtime、版本、backend/kernels、flags | Sampling、batch、cache 和协议不同 |
| Serving surface | 本地进程、server API 或 managed provider | 请求/错误/usage/数据边界不同 |
| Hardware | CPU/GPU/accelerator、数量、内存、driver | 吞吐、可载入性和数值都会变化 |
| Adapter/harness | Adapter commit、tool schema、policy、config hash | 同一 server 在不同 loop 中行为不同 |

结果身份不能只写 `llama`、`model-x` 或一个目录名。最低可比较单元是：

```text
checkpoint + revision + tokenizer + chat-template hash
+ weight/quantization format + runtime/backend/version
+ server/API config + hardware/driver
+ adapter/harness/tool schema + task config
```

如果 managed provider 不公开权重或模板 hash，就把这些字段标 `provider-managed/unknown`，并固定 provider、region、endpoint family、model ID/alias、API version 和实际响应 identity；不能用猜测补齐。

## 三种承载方式改变责任边界

| Surface（承载面） | 你通常能控制 | 你仍需验证 | 主要新增责任 |
| --- | --- | --- | --- |
| 本地/自托管 runtime | 权重、模板、量化、server、硬件和网络 | 字节身份、协议、性能、质量和许可 | 部署、升级、容量、监控、安全与回滚 |
| Managed provider | API、region、可见 model ID 与部分参数 | Alias、模板包装、工具/stream/error/usage | Provider 数据政策、配额、漂移和可用性 |
| Gateway/兼容 API | 统一 endpoint 与 adapter | 实际下游、字段丢失、fallback 和身份回显 | 多一层路由、重试、成本与归因 |

“Self-hosted（自托管）”增加 runtime 和数据路径控制，但不自动更安全；错误开放网络、共享 GPU、未审查容器或动态代码都可能扩大风险。“OpenAI-compatible”或相似协议名只描述部分表面，不能证明 tool call ID、stream、state、stop、error 与 usage 语义完全一致。

换 surface 必须建立新 baseline。即使 provider 声称承载相同 checkpoint，其模板、量化、server flags、sampling defaults、guardrail 和 context policy 也可能不同。

## License 与数据权利分开审查

至少分四份权利：

1. Model weights/license：是否允许当前主体、用途、修改和再分发；
2. Code/runtime license：推理 server、kernel、adapter 和依赖；
3. Input/output data rights：训练、评测、日志和用户数据能否被处理；
4. Artifact publication rights：能否公开权重片段、trace、fixture 或模型输出。

权重允许下载不等于允许任意再分发；代码是宽松 license 也不覆盖模型权重；模型可商用不等于输入数据可送入外部 provider。每个实验 artifact 记录来源、许可、数据分类和公开范围。

许可或 acceptable-use 条款不清时停止下载/部署，不从博客摘要推断。目标版本变化后重新核对，旧核对不能自动继承给新 checkpoint。

## 下载与加载是供应链边界

Model artifact bundle 可能包含权重、config、tokenizer、chat template、pre/post-processing 代码和 runtime 配置。下载前固定官方来源与 revision，下载后保存每个文件 hash、总大小和 manifest。

加载前检查：

- Artifact 与 manifest/hash 是否一致；
- Runtime 是否会执行仓库自带的动态代码；
- Model/config/tokenizer 是否来自同一受支持 revision；
- 文件格式 parser 是否受资源和路径限制；
- Container image、driver、kernel 与依赖是否锁定；
- Cache 路径、权限、共享用户和清理策略；
- 启动参数是否允许网络、插件或任意文件读取。

“需要 remote code 才能加载”是新的供应链决定，不是普通开关。优先使用已审计实现；确实需要时固定并检查代码、在隔离环境运行，并把它视为 executable dependency（可执行依赖）。

具体清单见[供应链安全](/security/supply-chain)。

## Chat template 是协议实现的一部分

Chat template（对话模板）把 system/user/assistant/tool 等 canonical messages 编码为 token 序列。它会决定：

- Role 名称、顺序与分隔；
- BOS/EOS、turn terminator 和 generation prompt；
- System instruction 是否单独表达或拼接；
- Tool schema 怎样展示，call/result 怎样关联；
- 多轮 history、空 content 和多模态占位如何处理；
- 哪些 stop tokens 应由 server/adapter 使用。

不要手写一个“看起来像官方”的字符串模板，也不要只记录模板文件名。保存 template content/hash、tokenizer identity 与实际 rendered prompt 的脱敏 hash。

### Template 探针

1. 单轮文本与 system/user 优先级；
2. 多轮 user/assistant 顺序；
3. Unicode、换行、空内容与边界长度；
4. Tool schema、call、result 和第二轮 tool call；
5. 输入中出现模板分隔符时是否越界；
6. Stop token 是否过早截断或继续生成下一角色；
7. Template 不匹配 tokenizer/runtime 时能否明确拒绝。

同一权重更换 template 后是新 config。结果变化不能全部归因给“模型”，应报告权重、模板和 adapter 的组合。

## Tool calling 是组合能力

工具调用通常同时依赖：目标 checkpoint 的训练/官方约定、chat template、tool schema 表达、sampling、stop、runtime 输出、adapter parser 和 harness controller。只看 family 名或一次 JSON 输出不足以声明支持。

最小闭环：

```text
Task + tool schema
  → template/render
  → runtime/model generation
  → adapter parses typed Action
  → runtime schema + policy
  → handler executes or rejects
  → tool Result with call identity
  → next model turn
  → completed / failed / budget stop
```

Probe（探针）按难度递增：

- 单工具、必填参数、稳定 call identity；
- 坏 JSON、缺字段、额外字段、未知工具与非有限数；
- 同一工具连续两次、参数不同；
- 两个独立工具并行或明确拒绝并行；
- Tool error 后修正一次，不能无限重试；
- Result 回传后继续调用或完成；
- Stream 中参数分片、断连、取消和 late event；
- Timeout 后副作用未知时先对账。

模型输出能 parse 不等于获准执行。Schema、Task allowlist、主体权限、Secret、network、审批和幂等仍由 harness 强制。

## Structured output 不能只测一个正例

Structured output（结构化输出）至少测试：

- Object/array、required、enum、nested、nullable；
- Unicode key/value、转义、长字符串和空集合；
- Unknown field、重复 key、错误类型和截断 JSON；
- `NaN/Infinity` 等语言/JSON 边界；
- Schema 本身超出 runtime/provider 支持范围；
- 输出前后混入解释文字；
- Sampling/template/quantization 改变后的合规率。

Adapter 侧自动修 JSON 属于 `emulated`，必须保留原始输出、修复规则和修复后值。静默纠正再把结果记为模型原生合规，会污染比较。

## Context length 不等于可用任务上下文

Model card 或 server 参数中的最大长度只是容量边界的一部分。真实请求还要给这些内容分配 token：

```text
system/project/task instructions
+ message history / tool schemas / tool results
+ retrieved files or documents
+ generation and reasoning allowance
+ safety margin for tokenizer/template variance
```

测试 tokenizer 本地计数与 server 接收/usage 是否一致；记录输入裁剪、truncation side、special tokens、context overflow error 和 final stop reason。文件被“加载”不表示全部 token 进入请求。

Long-context（长上下文）质量用目标任务测试：将必要事实放在不同位置，加入相似干扰、冲突版本和无关内容，检查 retrieval/selection、引用和完成率。不能用请求不报错证明模型有效利用了全部上下文。

KV cache、prefix cache 或 context reuse 会影响内存和延迟，但具体支持与口径属于 runtime 事实；在目标版本实测，不写成 Llama 家族通用能力。

## Quantization 是新的实验变量

Quantization（量化）不只是“bits”。至少记录：

```text
method / weight bits / activation or KV treatment
group size / calibration dataset and hash
quantizer/tool/version / output format
runtime kernels / hardware / flags
```

同为 4-bit 的 artifact 可能由不同方法、校准和 kernel 产生，质量、速度与内存不可互换。不要同时改量化、template、sampling 和 runtime 后把差异归因给权重。

量化比较使用同 checkpoint、tokenizer、template、runtime、hardware、tasks 和 budgets。报告：

- Task-level success 与 failure types；
- Tool/schema 合规、引用和安全；
- Load time、TTFT、throughput、P50/P90；
- Peak device/host memory、KV cache 与 OOM；
- Energy/compute 或基础设施成本（能可靠测量时）；
- 质量—延迟—内存的配对差异与区间。

如果量化版本只能运行更小 batch，这本身是系统结果；不要用不同并发掩盖。

## Sampling、Stop 与终态要固定

记录 runtime 实际支持并生效的 temperature、top-p/top-k、seed、max output、stop tokens、repetition controls 和 deterministic flags。相同字段名跨 runtime 可能语义不同；HTTP 接受参数也不证明生效。

至少区分：

| 终态 | 含义 | Harness 动作 |
| --- | --- | --- |
| Completed | 完整结果生成 | 进入 validator |
| Tool requested | 完整 Action | 进入 schema/policy |
| Output limited | Token/length 截断 | 保留 partial，不能标成功 |
| Context rejected | 输入超限/模板错误 | 修 config，不调高重试 |
| Cancelled | 用户/controller 停止 | 丢弃 late completion |
| Runtime failure | OOM、kernel/server 错误 | 归基础设施，按规则恢复 |
| Invalid protocol | 坏 JSON/role/item/ID | 修 adapter/template |

Stop token 过早可能产生可解析但语义不完整的 JSON；终态仍应是 limited/invalid，而不是 completed。

## 性能测量必须包含系统条件

本地推理性能至少报告：

- Cold load 与 warm load；
- Time to first token（TTFT，首 token 时间）；
- Inter-token latency 与 output tokens/s；
- End-to-end task P50/P90/timeout；
- Queue wait、prefill、decode、tool time 的分解；
- Concurrent requests、batch policy 与序列长度分布；
- Peak GPU/accelerator/host memory 与 OOM/restart；
- Cache cold/warm、编译和模型副本数量；
- Hardware/driver/runtime/kernel identity。

吞吐量和单请求低延迟经常冲突。只在 batch=1 的短 prompt 上报 tokens/s，不能代表并发 Agent workload；只看 model decode，也会漏掉 template、queue、tools 和 validation。

Managed provider 没有本地 memory 指标时，保存 latency、usage、rate limit、provider identity 和成本。不同可观察性条件下不要伪造可比字段。

## 容量与故障恢复

Self-hosted runtime 要处理：

- 权重加载失败、磁盘不足、OOM 与 kernel crash；
- Queue/backpressure、batch 饥饿和请求取消；
- 健康检查“进程活着但模型未就绪”；
- Rolling update 中新旧 checkpoint 混流；
- 多 GPU/worker 的 config 漂移与一致性；
- Timeout 后 server 是否仍继续生成；
- Cache、临时 artifact 和 crash dump 的敏感数据；
- 失败 request 的有限重试和共享 task budget。

Readiness probe（就绪探针）应验证实际目标 model identity 与最小推理，而不是只看端口开放。部署切流前跑 protocol core probes；失败就保持旧版本，不让 load balancer 把请求发给未知组合。

## 安全与隔离

开放权重不代表低风险。至少控制：

- Artifact 来源、hash、license 和动态代码；
- Runtime/container 的文件、device、network 和系统调用；
- Prompt、cache、trace、crash dump 和 metrics 中的敏感数据；
- 多租户 batch/KV cache/adapter 的隔离；
- Model server 是否能读取宿主 credential 或任意路径；
- Tool schema 和结果是否把不可信文本升级为指令；
- Managed endpoint 的数据处理、region 和保留政策；
- 权重/adapter 更新、撤销和安全公告响应。

模型 server 只负责生成不等于它可以绕过 ToolRegistry。Tool execution、approval、network egress 与外部副作用仍由受控 harness 处理。

## 建立协议资格矩阵

每个精确组合逐项给四态：`supported / emulated / rejected / untested`。

| 能力 | 正例 | 负例 | 通过边界 |
| --- | --- | --- | --- |
| Text/roles | 单/多轮、system/user | 未知 role、空/长 content | Role/顺序不静默丢失 |
| Template/stop | 正确 turn 与完成 | 分隔符注入、过早 stop | 无角色串线/截断假成功 |
| Tool schema | 单工具闭环 | 坏 JSON、未知工具 | Handler 前失败关闭 |
| Tool sequence | 连续/并行（若支持） | 重复/缺 call ID | Result 关联不靠猜 |
| Structured output | Nested/enum/nullable | 类型/额外字段/非有限数 | Runtime validator 一致 |
| Stream | Text/tool deltas | 断连、乱序、取消 | 完整后才提交 Action |
| Context | 边界内请求 | Overflow/truncation | Token 身份与 stop 可解释 |
| Usage/error | 正常 usage | OOM/rate/timeout/bad request | 缺失不填 0，分类稳定 |
| Resume/cache | 同 config 续接 | 跨模型/模板恢复 | 不丢 state，不重复副作用 |

Source/model card 只能帮助设计矩阵，不能填 `supported`。离线 adapter test 最多 E1；目标 runtime/provider probe 才可能是 E2；代表 workload 的重复比较才可能是 E3。

## 同条件评测设计

先建立未量化或官方推荐基线（以目标 model card 为准），再一次只改变一个主要变量：checkpoint、quantization、template、runtime、sampling 或 parallelism。

固定：

```text
tasks / split / fixture / acceptance / Judge
instructions / tool schema / permissions / context builder
max steps / calls / output / deadline / cost
hardware allocation / concurrency / warm-up / run order
```

报告：任务成功、安全、协议合规、P50/P90、吞吐、内存、OOM、成本和失败类型。若 candidate 必须用另一预算或硬件才能运行，另建系统级实验，不把它与单变量模型实验混合。

避免把本地小样本结果写成“Llama 家族更好/更差”。合法表述类似：

```text
在固定 checkpoint/revision、template、runtime、hardware、tasks 和 budgets 下，
candidate quantization 相对 baseline 的 task pass、P90 和 peak memory 如表；
结论只适用于该组合与日期。
```

## 最小适配卡

```yaml
model:
  family: Meta Llama
  checkpoint: <official repository/artifact>
  revision: <immutable revision>
  variant: <exact variant>
  license: <license file/version/checked date>
artifacts:
  weights: <format + hashes>
  tokenizer: <revision + hash>
  chat_template: <source + hash>
  quantization: <method/tool/version/calibration>
runtime:
  name_version: <runtime@version>
  backend_flags: <canonical config hash>
  server_protocol: <surface/version>
hardware:
  accelerators: <type/count/memory>
  host_driver: <identity>
harness:
  adapter_commit: <commit>
  tool_schema_hash: <hash>
  policy_config_hash: <hash>
  budgets: <steps/calls/context/output/deadline/cost>
evidence:
  protocol: untested
  workload: untested
  checked_at: YYYY-MM-DD
rollback:
  baseline_config: <id>
  artifact_retention: <policy>
```

不要把 Secret、个人路径或私有 registry token 写入适配卡。Managed provider 无法公开的字段使用 `unknown/provider-managed`，不要删除字段制造完整假象。

## 在本项目验证适配前置边界

当前仓库只提供跨 provider 的协议/预算方法和离线 runtime validator，不包含 Llama 权重、transformers、vLLM、llama.cpp Python binding 或 provider client。下面的命令验证“本页没有把未安装组件写成项目能力”，不验证 Llama 本身。

### 前置条件与固定输入

需要 Python 3.11+、uv 0.11、Node.js 22+；依赖由 `uv.lock` 和 `package-lock.json` 固定。从仓库根目录离线执行，不下载权重、不设置 provider credential、不启动 model server，也不产生费用。

固定输入为当前锁定依赖、模型协议页面、TypeScript Task/Action 负例和事实/内容门禁。

### 命令

```powershell
uv run --frozen --offline python -c "import importlib.util as u; assert u.find_spec('transformers') is None; assert u.find_spec('vllm') is None; assert u.find_spec('llama_cpp') is None"
npm run facts:check
npm run lab:ts-runtime-test
```

### 预期输出与断言

- 第一条命令退出 0，证明当前锁定 Python 环境没有三个常见推理入口；这不枚举所有可能 runtime，但能验证项目没有依赖它们；
- `facts:check` 确认产品主张的来源状态、版本、日期与正文引用一致；它不判断 surface identity、tool flow 或 reasoning 解释是否充分，这些由人工审阅对照目标 runtime；
- TypeScript runtime test 拒绝无效 Task/Action、重复/空工具和非有限预算/成本；
- 全程没有权重下载、GPU/CPU model load、provider request 或费用。

### 失败、停止、清理与回滚

若任一 runtime 意外可 import、检查器接受缺少身份的负例、坏 action 进入 metrics，或命令尝试联网，停止“当前无 Llama runtime、仅 E0/E1 方法”的结论。先核对 lockfile、环境和实现，不下载权重或配置 API key 来让页面看起来完整。

命令只读锁定依赖并可能生成可忽略缓存；无需清理模型文件，因为不会创建。误改时先运行：

```powershell
git diff -- pyproject.toml uv.lock package.json package-lock.json lab/ts docs/models/llama.md
```

只恢复自己的修改，不覆盖其他工作树变化。候选接入失败时回滚到当前无权重、无 server、live-disabled 的基线，并保留失败 artifact。

### 已知限制与证据边界

这些检查提供 E1：当前项目的文档与本地 validator 能表达部分模型身份、协议和坏值边界，并确认三个指定 Python 包未安装。

它们没有验证任何 Llama checkpoint、tokenizer、template、license、runtime、quantization、hardware、tool calling、context、performance 或 provider。命令全部通过后，Llama 组合仍应保持 `untested`，不能声明兼容、可部署或更适合某 workload。

## 灰度、回滚与退役

真实部署先保留已验证 baseline，candidate 使用不同 config/model identity。Shadow 或小流量阶段比较协议错误、任务成功、P90、OOM、队列、内存和安全，不只看 server health。

回滚触发条件预先定义：

- Tool/schema/stop/state 核心探针失败；
- Task pass 或安全低于门槛；
- OOM/restart/queue/timeout 超预算；
- License、来源或 artifact identity 无法证明；
- Template/tokenizer/runtime 漂移；
- 敏感数据、cache 或 trace 隔离失败。

回滚必须恢复 checkpoint、tokenizer、template、runtime image、server flags、adapter 和 policy 的完整组合。只把权重目录切回旧版，可能仍使用新 template 或 cache。确认 in-flight 请求完成/取消，清理 candidate cache，并让旧配置重新通过 readiness 与 protocol probes。

退役前保留历史 trace reader、config manifest 与结果解释所需 artifact；权重删除按许可、存储和取证策略执行，不能用未验证路径做批量清理。

## 适配检查表

- 是否固定 checkpoint/revision/file hashes，而不是只写 family？
- Tokenizer、chat template、special/stop tokens 是否有独立身份？
- License、runtime code、输入数据和 artifact 发布权是否分别审查？
- Quantization 是否记录方法、校准、工具、格式和 kernel？
- Runtime/backend/server/hardware/driver 是否可重建？
- Role、tool、structured output、stream、state、stop、usage/error 是否有正负探针？
- Schema 合法与本次工具执行授权是否分开？
- Context capacity 与目标任务有效利用是否分别测试？
- 性能是否包含 queue、prefill、decode、tool、P90、内存和 OOM？
- 每次实验是否只改变一个主要变量并保留 baseline？
- Managed provider 的 unknown 字段是否诚实保留？
- 当前 E0/E1 方法是否没有被写成 Llama live 兼容或质量证据？

下一步先填写[模型适配卡](/practice/model-playbook)，再按[模型协议兼容性](/models/protocol-compatibility)设计目标组合的正负探针，并用[模型—Harness 匹配](/optimization/model-fit)建立同 workload 的配对实验。涉及 tool/context 调优时继续阅读[上下文与工具优化](/optimization/context-tools)。

## 检查题

1. 为什么同一个 Llama checkpoint 换 chat template 后必须视为新 config？
2. “4-bit”为什么不足以标识一个量化 artifact？
3. Self-hosted 增加控制权后，还新增了哪些 Harness 责任？
4. Runtime 接受 tool schema 后，为什么仍不能标记工具闭环 `supported`？
5. 本项目所有离线检查通过后，为什么 Llama live 状态仍是 `untested`？
