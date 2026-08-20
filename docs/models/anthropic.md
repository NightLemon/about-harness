# Anthropic Claude 模型家族适配

## 核对入口

- [Claude models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)
- [Claude Code model configuration](https://code.claude.com/docs/en/model-config)

核对日期：2026-08-20。模型名称、alias、上下文与价格以目标 provider 官方页面为准，不从旧 benchmark 推断当前行为。

## 适配重点

- 区分 Anthropic API、云 provider 转售层和 Claude Code surface；
- 探测 system、tool use/result、streaming、stop reason、usage 与 prompt caching；
- 长上下文任务报告检索/压缩策略，不把上下文容量等同于有效利用；
- CLAUDE.md/auto memory 是上下文，不是不可绕过 policy。[FACT:claude-memory]

## 评测建议

对 coding 任务分开探索、计划、实施与验证；比较不同预算时同时记录成本、延迟和工具错误。任何“更擅长长文/代码”的主张都需目标任务证据。
