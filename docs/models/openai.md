# OpenAI 模型家族适配

本页不固定“最佳”模型。模型 ID、可用 surface、默认值和价格会变化，操作前从官方模型目录与目标 Codex surface 重新解析。

## 核对入口

- [OpenAI Models](https://developers.openai.com/api/docs/models)
- [Codex Models](https://learn.chatgpt.com/docs/models)
- [Codex configuration](https://learn.chatgpt.com/docs/config-file/config-basic)

核对日期：2026-08-20。Codex 用户/项目配置可选择默认 model/provider，并与 CLI override 形成优先级链。[FACT:codex-config]

## 适配重点

- 精确区分 API model ID、Codex 展示名/alias 和 provider；
- 探测 developer/system 指令、工具 schema、并行调用、streaming 与 usage；
- 在 coding workload 中分别评估规划、编辑、测试修复和长任务恢复；
- 将 reasoning effort 当作候选变量，不跨模型直接等量比较；
- 第三方或兼容 endpoint 仍需独立 adapter 探针。

## Harness 建议

项目规则放在最接近适用目录的 AGENTS.md，确定性门禁放测试/policy，不把安全寄托给提示。真实表现结论需 E2/E3；当前项目只有官方文档事实与 E1 harness 证据。
