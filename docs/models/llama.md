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

## 当前证据边界

本页只有 E0 适配建议和官方入口，没有下载权重、启动推理服务器或运行真实任务。

## 最小适配卡

先写完整身份，例如“权重仓库 + commit、量化格式、tokenizer hash、chat template、推理服务器与硬件”，再运行纯文本、单工具、坏 schema、长输入和取消五类探针。开箱基线不修改 system template；候选一次只改变量化、采样、模板或并发中的一项。输出同时记录质量断言、吞吐、首 token 延迟、峰值内存与失败原因。

## 失败诊断

JSON 不闭合可能来自模板、stop token、量化或 adapter，不应立即归因权重。上下文截断先核对 tokenizer 与服务器参数；并发退化要区分排队和模型计算。换 provider 时重新建立基线，因为同名权重可能经过不同模板和运行时包装。

## 检查题与下一步

没有 chat template hash 的结果能复现吗？许可证允许分发权重是否等同于允许分发输入数据？先填写[模型适配卡](/practice/model-playbook)，再按[协议兼容](/models/protocol-compatibility)设计探针。
