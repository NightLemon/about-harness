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

## 当前证据边界

本页只有 E0 适配建议和官方入口，没有运行 checkpoint、云 API 或真实任务比较。

## 最小适配卡

身份至少包含 checkpoint、revision、量化、tokenizer、chat template、runtime/provider 和 adapter。探针覆盖中英文任务契约、单次与连续工具调用、无效 JSON、长上下文截断和取消。若使用托管 API，还要保存 provider alias 解析、区域、usage 与数据策略。

## 失败诊断

中文表现下降先排查 system/template 编码与上下文裁剪；工具名或参数错误先核对兼容层转换；本地超时区分模型首 token、队列和工具执行。不要同时改变量化、模板和采样后把结果归因给“模型升级”。

## 检查题与下一步

同一 checkpoint 在两个 runtime 上结果不同，应把差异归因给谁？“OpenAI-compatible”还需验证哪些 stream 与 error 语义？填写[模型适配卡](/practice/model-playbook)，并用[实验方法](/optimization/experiment)做单变量比较。
