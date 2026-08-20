# Meta Llama 模型家族适配

## 核对入口

- [Llama Developer Docs](https://www.llama.com/docs/overview/)
- 目标模型的官方 license、model card 与下载来源

核对日期：2026-08-20。Llama 权重可由多种 runtime/provider 承载；必须记录精确权重、license、量化、chat template、tokenizer 和推理服务器。

## 适配重点

- 工具调用往往由模板、微调与 adapter 共同决定，不能只看 family 名；
- 测试 stop token、JSON/schema、长上下文、并发与取消；
- 本地性能报告硬件、batch、并行、缓存与内存；
- 许可与可再分发边界进入 artifact 清单。

## 结论边界

自托管提高数据与 runtime 控制，也增加部署、升级和可观测责任。与托管模型比较时把基础设施成本和运维失败纳入指标。
