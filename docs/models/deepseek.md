# DeepSeek 模型家族适配

## 核对入口

- [DeepSeek API Docs](https://api-docs.deepseek.com/)
- 目标模型的官方 model card 与发布说明

本轮对特定 pricing 页面出现 TLS 失败，因此价格、model alias、上下文和可用性保持 `pending`，不得抄写旧值。

## 适配重点

- 区分官方 API、第三方托管、兼容 endpoint 与本地开放权重 runtime；
- 探测 reasoning output 的暴露/隐藏、tool calling、JSON、streaming、stop 与 usage；
- 对代码任务检查 patch 纪律、测试闭环和重复编辑；
- 预算实验报告 token/延迟/费用，不用单次成功推广到所有任务。

## 安全

任何兼容 endpoint 都单独审查数据流、日志、凭据和区域。无法核对的 provider 行为按 E0 处理。
