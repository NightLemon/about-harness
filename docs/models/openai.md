# OpenAI 模型家族适配

本页不固定“最佳”模型。模型 ID、可用 surface、默认值和价格会变化，操作前从官方模型目录与目标 Codex surface 重新解析。

## 核对入口

- [OpenAI Models](https://developers.openai.com/api/docs/models)
- [Codex Models](https://learn.chatgpt.com/docs/models)
- [Codex configuration](https://learn.chatgpt.com/docs/config-file/config-basic)

核对日期：2026-08-21。Codex 用户/项目配置可选择默认 model/provider，并与 CLI override 形成优先级链。[FACT:codex-config]

## 先区分 API model 与 Codex surface

| 对象 | 要冻结的身份 | 不能直接推断的内容 |
| --- | --- | --- |
| OpenAI API model | 精确 model ID、endpoint、SDK/HTTP adapter、请求字段、核对日期 | Codex 中是否可选、产品默认权限或工具 |
| Codex model 选择 | Codex surface、展示名/alias、provider、配置来源与解析日期 | 完全等同于某个 API model ID 或拥有同一 effort 枚举 |

同一模型名称出现在两个 surface，不代表 adapter、工具、上下文管理和默认值相同。适配卡必须分别记录，无法解析底层快照时写 `rolling alias`，不能询问模型后把自报当作唯一证据。

## Responses 工具循环

OpenAI 的 function calling/tool calling 是模型向应用提出的调用请求，不是工具已经执行。[FACT:openai-function-calling]

1. Harness 把 JSON Schema 工具定义随请求发送。
2. 模型返回 function/tool call；adapter 保存类型、参数和 `call_id`。
3. Harness 先做 schema、权限、幂等和副作用检查，再在应用侧执行。
4. Adapter 用对应 `call_id` 回传 function call output。
5. 模型继续生成最终响应或更多 tool calls。

验收必须同时断言“模型请求”和“真实副作用”是两个事件。参数符合 schema 也不授予权限；内置工具与应用 function tool 还要分别记录执行责任方。

## Reasoning state 不是普通消息历史

Responses reasoning model 连续调用工具时，应保留上一响应中相关的 reasoning items、function call items 和 function call output items。最短路径是 `previous_response_id`；手工回放时，要把上一个 user message 之后到 tool output 的 output items 原样带回。[FACT:openai-reasoning-items]

Reasoning item 是 opaque 协议状态，不等于可展示的“思维过程”。Compatibility probe 至少比较：

- `previous_response_id` 连续路径；
- 手工回放完整 output items 的 stateless 路径；
- 故意删除 reasoning item 的负例是否被识别为 adapter/state 缺陷；
- 多个连续 tool calls 的 `call_id` 和顺序是否保持。

只回放可见 assistant 文本，不能证明 reasoning/tool 协议兼容。

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

这是一项待实验变量，不是“越高越好”的等级表。当前页面只有 E1 官方协议核对，没有运行真实模型。

## Harness 建议

项目规则放在最接近适用目录的 AGENTS.md，确定性门禁放测试/policy，不把安全寄托给提示。真实表现结论需 E2/E3；当前项目只有官方文档事实与 E1 harness 证据。

适配完成条件：身份可解析、五步工具循环通过、reasoning state 两种路径有证据、支持的 effort 值已探测、错误/取消/usage 映射可复现，且没有把 Codex 产品行为冒充 API model 能力。
