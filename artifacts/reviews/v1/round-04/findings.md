# Round 04 修改前 Findings

- Round：04
- Baseline：`916d9247bd8c42b3416c368b4b1e3fd4c7ed11ca`
- Baseline tag：`review-v1-round-04-baseline`
- Rubric：模型、provider、协议和调优方法
- 记录时间：2026-08-21 11:28 +08:00
- 状态：已在任何 round-04 修正前冻结

## R04-P2-01：OpenAI 指南没有把 Responses 工具循环和 reasoning state 转成可执行 adapter 契约

- 严重性：P2
- 位置：`docs/models/openai.md`、`docs/models/protocol-compatibility.md`、`docs/models/reasoning-budget.md`、`docs/references/fact-registry.md`
- 复现：按 OpenAI 家族页尝试为一个精确 API model 建立 tool-use 适配卡。页面只有核对入口和概括性 bullet，没有说明 model tool call 只是请求、应用侧必须执行并回传带 `call_id` 的 output，也没有说明 Responses reasoning model 连续工具调用时如何保留 reasoning/function-call/output items。推理页也没有要求记录目标模型实际支持的 effort 枚举和有效默认值。
- 官方证据：2026-08-21 获取的 OpenAI Function calling 指南把流程定义为“提供工具—接收 tool call—应用执行—回传 tool output—继续响应”；Reasoning models 指南要求在 function calling 期间保留 reasoning items，推荐使用 `previous_response_id` 或完整回放 output items，并明确 effort 支持值与默认值依模型而异。
- 影响：读者可能把“模型请求调用工具”误当成“工具已执行”，或在手工维护 Responses 上下文时丢失 opaque reasoning items；即使请求成功，也会得到状态不连续、效率下降或无法复现的 agent 行为。统一写 `low/medium/high` 还可能向不支持该值的模型发送无效配置。
- 根因：通用适配方法列出了“工具、streaming、usage”字段，但没有为 stateful output-item 协议提供必须通过的探针；产品页的易变事实也未登记到 fact registry，现有门禁只检查 URL 和日期。
- 修正要求：补充 OpenAI API model 与 Codex surface 边界、五步工具循环、reasoning item 连续性、模型依赖的 effort 实验和失败判定；扩展通用协议探针；登记官方来源与核对日期；新增正反例检查防止这些字段再次消失。

## 计数判断

这是一个横跨产品事实、adapter 协议和调优变量的 P2，修正需要官方来源、正文、事实注册表和自动门禁共同变化，满足实质 review 门槛；不得在 Round 05 重复计数为 harness 产品事实问题。
