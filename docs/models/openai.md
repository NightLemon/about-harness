# OpenAI 模型家族适配

本页讨论怎样把 OpenAI 模型接进可约束、可恢复的 Agent Harness，不提供脱离任务和运行环境的“最佳模型”排名。模型 ID、可用 surface、默认值、上下文与价格都会变化；每次实验都要重新解析目标身份，并把 API 行为、Codex 产品行为和本项目离线控制证据分开。

## 核对入口

- [OpenAI Models](https://developers.openai.com/api/docs/models)
- [Function calling](https://developers.openai.com/api/docs/guides/function-calling/)
- [Reasoning models](https://developers.openai.com/api/docs/guides/reasoning/)
- [Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses/)
- [Codex Models](https://learn.chatgpt.com/docs/models)
- [Codex configuration](https://learn.chatgpt.com/docs/config-file/config-basic)

API 三份指南于 2026-09-03 实际读取；Codex 配置事实沿用注册表中的 2026-08-27 核对记录。[FACT:codex-config] 官方来源已核验只说明产品事实可追溯，实验等级仍是 E0；当前仓库没有 OpenAI client、API key reader 或 live run。

## 先区分 API model 与 Codex surface

| 对象 | 要冻结的身份 | 不能直接推断的内容 |
| --- | --- | --- |
| OpenAI API model | 精确 model ID、endpoint、SDK/HTTP adapter、请求字段、核对日期 | Codex 中是否可选、产品默认权限或工具 |
| Codex model 选择 | Codex surface、展示名/alias、provider、配置来源与解析日期 | 完全等同于某个 API model ID 或拥有同一 effort 枚举 |

同一模型名称出现在两个 surface，不代表 adapter、工具、上下文管理和默认值相同。适配卡必须分别记录，无法解析底层快照时写 `rolling alias`，不能询问模型后把自报当作唯一证据。

## 先冻结最小适配卡

把一次调用身份写成能被另一位读者复现的记录：

| 字段 | 必须记录 | 为空时怎样处理 |
| --- | --- | --- |
| Surface | Responses、Chat Completions、Codex CLI/IDE 或第三方兼容 endpoint | 不开始比较 |
| Model identity | 请求的精确 model ID、响应中的有效身份与解析日期 | alias 无法解析时标 `rolling` |
| Adapter | SDK/HTTP 版本、endpoint、请求/响应映射版本 | 结果不能跨 adapter 合并 |
| Tool protocol | 工具 envelope、strict 状态、并行策略、内置/应用工具责任方 | 只允许无工具基线 |
| State | `previous_response_id`、完整 item 回放或明确 stateless | 禁止声称多步连续性 |
| Controls | instructions、reasoning 设置、最大输出、timeout、预算、权限 | 使用 provider 默认也要记为默认 |
| Environment | 地区、日期、网络策略、harness commit、配置 hash | 该 run 不进入比较 |
| Evidence | task/run/trace/result、usage、退出状态与失败分类 | 只能保留为调查记录 |

“同一个模型”至少要求 surface、精确身份和 adapter 相同；“同一个配置”还要求工具、状态续接、reasoning、预算和权限相同。否则差异可能来自 Harness，而不是模型。

## 先过协议资格，再测任务能力

协议资格探针回答“adapter 是否忠实承载目标 surface”，不回答模型质量高低。至少覆盖：

| 探针 | 正例 | 必须保留的负例 |
| --- | --- | --- |
| 身份 | 请求与有效 model identity 可对账 | alias 漂移或响应身份缺失 |
| 指令 | developer/user 边界按目标 API 映射 | 把项目策略拼进普通 user 文本 |
| Tool call | 名称、JSON 参数与 `call_id` 无损 | 未知工具、坏 JSON、重复 call ID |
| Tool output | 每个结果回到正确调用 | 错配、漏配或重复 output |
| State | ID continuation 与完整 items 回放均可解释 | 丢 reasoning/function item 后仍宣称等价 |
| Streaming | delta 可重组，终态唯一 | 断流、乱序、重复 done、部分参数执行 |
| Usage | input/output/reasoning/cache 状态可区分 | 缺失 usage 被记作 0 成本 |
| Stop | completed/incomplete/failed/cancelled 分开 | 部分文本被标成完成 |

任一资格探针失败，都先归为 adapter/protocol failure。此时继续跑 coding benchmark 只会把协议缺陷污染成“模型能力差”。

## Responses 工具循环

OpenAI 的 function calling/tool calling 是模型向应用提出的调用请求，不是工具已经执行。[FACT:openai-function-calling]

1. Harness 把 JSON Schema 工具定义随请求发送。
2. 模型返回 function/tool call；adapter 保存类型、参数和 `call_id`。
3. Harness 先做 schema、权限、幂等和副作用检查，再在应用侧执行。
4. Adapter 用对应 `call_id` 回传 function call output。
5. 模型继续生成最终响应或更多 tool calls。

验收必须同时断言“模型请求”和“真实副作用”是两个事件。参数符合 schema 也不授予权限；内置工具与应用 function tool 还要分别记录执行责任方。

## Strict schema、可用工具与并行调用

官方 function calling 指南说明：`strict: true` 依赖 Structured Outputs；对象的 `additionalProperties` 应为 `false`，`properties` 中的字段都要列入 `required`，可选值用包含 `null` 的类型表达。不满足 strict 要求的请求应被视为协议错误；如果实际工具定义显示回退到 `strict: false`，也要写入 trace，不能继续假设参数一定合规。[FACT:openai-function-controls]

下面只是参数 schema 片段，不是完整 API 请求：

```yaml
type: object
properties:
  query:
    type: string
  limit:
    type: [integer, 'null']
required: [query, limit]
additionalProperties: false
```

Strict 解决的是输出形状，不解决语义正确、授权和副作用。Harness 仍要拒绝空查询、越权路径、超预算数值和不允许的目标。

工具集合也应分成三层：注册工具、当前请求传给模型的工具、当前 turn 真正允许调用的子集。官方指南提供 `allowed_tools` 约束和 `parallel_tool_calls` 控制；关闭并行可把一次响应限制为零或一个 function call，但是否支持、与内置工具如何组合仍要按目标模型和 surface 探测。[FACT:openai-function-controls]

并行开启时不要按数组下标完成副作用。每个调用使用独立 `call_id`、参数 hash、幂等键、policy 结果和 tool result；只有不存在依赖边且资源所有权不冲突的调用才并行。一个调用失败时，其他已发生副作用不能被模型文本“回滚”。

## Reasoning state 不是普通消息历史

Responses reasoning model 连续调用工具时，应保留上一响应中相关的 reasoning items、function call items 和 function call output items。最短路径是 `previous_response_id`；手工回放时，要把上一个 user message 之后到 tool output 的 output items 原样带回。[FACT:openai-reasoning-items]

Reasoning item 是 opaque 协议状态，不等于可展示的“思维过程”。Compatibility probe 至少比较：

- `previous_response_id` 连续路径；
- 手工回放完整 output items 的 stateless 路径；
- 故意删除 reasoning item 的负例是否被识别为 adapter/state 缺陷；
- 多个连续 tool calls 的 `call_id` 和顺序是否保持。

只回放可见 assistant 文本，不能证明 reasoning/tool 协议兼容。

## Streaming 是事件协议，不是字符串打印

Responses 的 HTTP streaming 使用 Server-Sent Events（SSE，服务器发送事件）和带类型的语义事件。`response.output_text.delta` 只是增量，`response.completed` 才表示服务端完成；`error`、断流或最终状态异常必须进入独立失败路径。[FACT:openai-streaming-events]

Adapter 至少维护下面的本地状态机：

```text
created -> in_progress -> completed
                      \-> incomplete
                      \-> failed
                      \-> cancelled-by-client
```

处理顺序是：先按 response/item/content index 关联事件，再累积文本或工具参数，收到 item/response 终结事件后解析和校验，最后才允许 controller 使用结果。工具参数 delta 还没闭合时绝不能执行；重连后收到重复事件时要靠 event/item 身份去重，而不是再次触发工具。

流式界面可以提前展示文字，但“用户看到了部分内容”和“任务满足验收”是两件事。部分内容更难做完整审核；涉及外发、执行命令或其他副作用时，先缓冲到结构和 policy 均通过，再提交动作。若业务允许展示增量，也要保留撤回/标记未完成的 UI 状态。

验证 streaming 不只比较最终字符串。还要测试 Unicode/JSON 跨 chunk、空 delta、多个 tool call 交错、断流、迟到 completion、重复 done、取消后事件和 usage 到达顺序。任何一次只在非流式成功的 adapter，都不能宣称已支持 streaming。

## 适配重点

- 精确区分 API model ID、Codex 展示名/alias 和 provider；
- 探测 developer/system 指令、工具 schema、并行调用、streaming 与 usage；
- 在 coding workload 中分别评估规划、编辑、测试修复和长任务恢复；
- 将 reasoning effort 当作候选变量，不跨模型直接等量比较；
- 第三方或兼容 endpoint 仍需独立 adapter 探针。

## Reasoning effort 调优

`reasoning.effort` 的可用值和默认值依精确模型而变，可能包含 `none`、`minimal`、`low`、`medium`、`high`、`xhigh` 或 `max` 的子集；不能把某个模型的枚举或默认值复制给整个家族。[FACT:openai-reasoning-effort]

1. 从目标 model page 冻结实际支持值；不支持的值记为 protocol failure。
2. 先跑 provider/harness 默认值，再只改变 effort，保持任务、提示、工具和权限不变。
3. 记录任务成功、reasoning/input/output/cache token、P50/P90 延迟、费用、工具错误和人工介入。
4. 只有配对重复与 holdout 支持改善时才改变默认；简单任务若没有收益，应保留更低预算。

这是一项待实验变量，不是“越高越好”的等级表。当前产品事实的官方来源已经核验；页面没有运行真实模型，只有独立的离线协议示例能够达到 E1。

## 不完整响应、Usage 与预算

Reasoning 模型可能在生成可见答案前消耗输出预算。官方指南要求检查 `response.status`；当状态为 `incomplete` 且 `incomplete_details.reason` 为 `max_output_tokens` 时，返回值可能只有部分可见文本，也可能在 reasoning 阶段就耗尽。两种情况都不能标记为任务完成。[FACT:openai-incomplete-status]

预算至少分四层：

| 层 | 观察值 | 停止判断 |
| --- | --- | --- |
| 请求 | 最大输出、timeout、取消信号 | 请求是否还允许继续 |
| Provider | input/output/reasoning/cache token 与 response status | 是否到达 provider 限制 |
| Harness | model/tool step、累计 token、费用和墙钟 deadline | 是否越过任务总预算 |
| 业务 | 测试、格式、来源、安全与副作用验收 | 是否真的完成目标 |

Usage 字段缺失时写 `unknown`，不能写 0；离线 replay 的 0 成本必须同时带 `offline=true`。价格计算绑定核对日期、币种、计价单位和精确 model identity，不能用当前价格回填旧 run。缓存 token、reasoning token 与可见 output token 分开记录，否则“更省”可能只是漏记。

## 错误分类与重试边界

把所有异常压成 `provider_error` 会妨碍恢复。Adapter 至少区分：请求/schema 被拒绝、认证/权限、限流、provider 5xx、stream 中断、response incomplete、response failed、状态续接错误、usage 缺失和本地解析错误。Tool/policy/validator 失败属于 Harness 下游，不能算到模型上。

只有明确暂时性、尚未产生不可对账副作用且仍在总预算内的失败才自动重试。重试保存首次失败、attempt、退避和相同幂等键；认证、坏 schema、无效 model ID 和状态不兼容应立即停止。stream 断开后若无法确认服务端是否创建了 response，先查询或按响应身份对账，不要盲目发起第二个逻辑任务。

## Coding 工作例：先测组合，不测品牌

准备一个固定 commit：两个相关文件中存在同一逻辑缺陷，初始测试稳定失败；允许 `read_file`、限定路径的 `apply_patch` 和目标测试，禁止网络、依赖升级与仓库外写入。验收是目标测试和邻近回归都通过、只修改允许文件、没有 Secret 或未授权副作用。

先跑无工具回答作为诊断基线，再跑固定工具 schema 的单 Agent loop。比较时只改变一个变量，例如 reasoning effort 或是否允许并行 read；model identity、adapter、instructions、工具、权限、deadline、初始 commit 和验收保持不变。至少记录：首次有效补丁、总模型/工具调用、测试次数、token/费用、P50/P90、人工介入和失败层。

负例包括：模型请求未注册工具、工具参数多出字段、两个并行调用写同一文件、测试输出含注入文字、response incomplete 却提出完成，以及 stream 中断后重复应用补丁。Harness 应在执行前拒绝或安全停止；只看最后测试绿色会漏掉重复副作用和协议错误。

## 从 E0 到 E3 的晋级

| 等级 | 本页能提供什么 | 还缺什么 |
| --- | --- | --- |
| E0 | 官方协议与产品事实、适配设计 | 任何仓库运行结果 |
| E1 | fake/replay 下的 action、预算、权限、恢复和失败负例 | 真实 OpenAI endpoint 行为 |
| E2 | 获单独授权后，锁定 model/adapter/config 的少量 live 协议探针 | 足够任务、重复和 holdout |
| E3 | 同 workload 的预注册比较，含安全、成本、区间和失败报告 | 跨版本或跨任务的通用结论 |

E2 首先验证身份、strict 工具、状态续接、streaming、usage 与取消，不急着比较“谁更聪明”。只有协议资格通过的 run 才进入能力评测；E3 仍应把 API model 与 Codex surface 作为不同实验组合。

## 在本项目验证离线边界

### 前置条件与固定输入

在仓库根目录执行；要求 Python 3.11+、`uv 0.11.16`、Node.js 22+，依赖按 `uv.lock` 和 `package-lock.json` 安装。输入是仓库内 replay records 和合成 Task/Action，不设置 API key，不访问 OpenAI 网络。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py
npm run lab:ts-runtime-test
npm run facts:check
```

### 预期输出与断言

- pytest 显示 `5 passed`：固定 `call_id` 的 replay 完成求和；未知字段与坏 checkpoint 被拒绝；`LiveAdapter` 在任何 provider 动作前硬失败；
- TypeScript runtime 测试拒绝空/重复工具名、非有限预算和非法 Action，坏值不能进入 metrics；
- 事实检查确认本页引用的 OpenAI/Codex 主张有来源状态、版本、日期和实验边界；
- 进程不读取 credential、不创建网络请求，也不产生费用。

### 失败、停止、清理与回退

若 live adapter 不再硬拒绝、命令请求 API key/网络、未知字段被接受、坏 Action 进入 metrics，或事实引用失效，立即停止并保留首个失败输出。不要配置真实凭据、调用付费 API、删除负例或把 E1 改成 E2 来获得绿色结果。

命令只读固定 fixture，可能产生可忽略测试缓存。需要清理时只删除本轮生成的 `.pytest_cache/`；若为了学习修改实现，先用 `git diff -- lab docs/models/openai.md docs/references/fact-registry.md` 确认范围，只恢复自己的改动。回退基线是 replay + live-disabled，而不是换一个未登记 endpoint。

### 当前证据边界

这些命令只证明本项目最小 Harness 的 E1 控制语义和事实引用完整。它们没有安装 OpenAI SDK、发出 Responses 请求、接收真实 SSE、解析真实 reasoning item、测量 usage/价格，也没有启动 Codex。因此不能证明任一 OpenAI model、Codex surface 或第三方兼容 endpoint 已支持、质量更高或适合生产。

## 适配检查表

- API model、Codex surface 和第三方 endpoint 是否分开记录？
- 精确身份、adapter、工具 schema、state 路径和有效配置是否可对账？
- strict 回退、并行调用、stream 断流和 incomplete 是否有负例？
- policy 是否在应用 function tool 执行前检查权限、预算和幂等？
- usage 缺失是否写 `unknown`，费用是否绑定当时价格与身份？
- 资格失败是否停在 protocol 层，而不是污染模型能力得分？
- E1/E2/E3 是否分别绑定真实 artifact，没有因官方来源或命令成功自动升级？

下一步：到[协议兼容性](/models/protocol-compatibility)设计 adapter 探针，到[Reasoning 预算](/models/reasoning-budget)做单变量实验；若目标是 Codex 产品配置，再单独阅读[Codex Harness](/harnesses/codex)。
