# DeepSeek 模型家族适配

核对日期：2026-08-20。

## 核对入口

- [DeepSeek API Docs](https://api-docs.deepseek.com/)
- 目标模型的官方 model card 与发布说明

本轮对特定 pricing 页面出现 TLS 失败，因此 API surface（API 可用面）中的价格、model alias、上下文和可用性保持 `pending`，不得抄写旧值。[FACT:deepseek-api-surface]

## 适配重点

- 区分官方 API、第三方托管、兼容 endpoint 与本地开放权重 runtime；
- 探测 reasoning output 的暴露/隐藏、tool calling、JSON、streaming、stop 与 usage；
- 对代码任务检查 patch 纪律、测试闭环和重复编辑；
- 预算实验报告 token/延迟/费用，不用单次成功推广到所有任务。

## 安全

任何兼容 endpoint 都单独审查数据流、日志、凭据和区域。无法核对的 provider 行为按 E0 处理。

## 当前证据边界

页面只提供 E0 适配方法；价格、alias、上下文和可用性仍为 pending，不支持成本或质量比较。

## 最小适配卡

为目标组合记录官方或第三方 provider、精确 model ID、endpoint 类型、adapter、核对日期和数据区域。先离线验证消息与 tool schema，再由获授权探针检查 streaming、stop reason、usage 和 reasoning 字段；任何未核对字段都保留 `unknown`，不能从“兼容 OpenAI API”推断。

## 失败诊断

认证、限流、协议解析、工具参数、reasoning 连续性和模型任务失败要分开分类。若第三方 endpoint 返回相同 model alias，也要核对实际解析版本。价格或上下文信息无法访问时，不用缓存截图或博客数字补空；预算表标记待核验并阻止费用实验。

## 检查题与下一步

你能否从运行记录判断请求去了哪个 provider、解析成哪个模型？E0 页面为何不能支持成本结论？先看[事实注册表](/references/fact-registry)，再用[模型适配方法](/models/adaptation)建立不依赖旧价格的基线。
