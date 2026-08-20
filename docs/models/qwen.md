# Qwen 模型家族适配

## 核对入口

- [Qwen 官方站](https://qwenlm.github.io/)
- 目标模型的官方 model card、仓库 tag 与 provider 文档

核对日期：2026-08-20。Qwen 家族可经不同云 provider、兼容 API 或本地 runtime 提供；“OpenAI-compatible”只描述部分 transport/message 外形，不证明 tool、stream 与 usage 语义完全相同。

## 适配重点

- 固定具体 checkpoint/model ID、量化、runtime、chat template 与 tokenizer；
- 分别探测中文/英文指令、代码、工具 JSON、长上下文和停止标记；
- 本地运行报告硬件、并发、显存/内存与推理参数；
- Provider 托管版本需记录其 adapter 和别名解析。

## 结论边界

开放权重允许更深控制，也把模板、部署和资源错误带入 harness。没有锁定 runtime 的结果不能归因给模型权重。
