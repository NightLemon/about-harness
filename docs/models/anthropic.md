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

## 当前证据边界

本页的配置方法为 E0；未调用 Anthropic 或云转售 API，也未产生模型质量证据。

## 最小适配卡

记录 API 或云转售 surface、区域、精确 model ID、SDK/adapter、Claude Code 版本（若使用）和 thinking 配置。依次探测 system、tool use/result、连续工具、stream stop、取消、usage 与缓存命中；项目指令和 auto memory 单独版本化，避免把 harness 变化算作模型变化。

## 失败诊断

工具循环中断先检查 tool result 关联和 stop reason；长上下文退化先检查检索、压缩和缓存边界；Claude Code 行为变化还要核对 active settings 与 cwd。模型 alias、provider 或 thinking 档位变化就建立新 config ID，不混入旧重复。

## 检查题与下一步

CLAUDE.md 为什么不是权限边界？Prompt caching 改变成本时是否也改变质量归因？先完成[Claude Code 教程](/harnesses/claude-code)，再用[推理预算](/models/reasoning-budget)设计配对任务。
