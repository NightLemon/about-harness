# Meta Llama：适配差异与验证入口

本页集中说明这一模型家族需要额外核对的条件。通用流程只在[模型适配与选择](/models/adaptation)维护，探针格式见[协议兼容](/models/protocol-compatibility)。

<span id="官方核对入口与事实边界"></span>
<span id="先把-llama-模型-拆成完整身份"></span>
<span id="先把llama-模型拆成完整身份"></span>
<span id="三种承载方式改变责任边界"></span>
<span id="license-与数据权利分开审查"></span>
<span id="下载与加载是供应链边界"></span>
<span id="chat-template-是协议实现的一部分"></span>
<span id="template-探针"></span>
<span id="tool-calling-是组合能力"></span>
<span id="structured-output-不能只测一个正例"></span>
<span id="context-length-不等于可用任务上下文"></span>
<span id="quantization-是新的实验变量"></span>
<span id="sampling、stop-与终态要固定"></span>
<span id="samplingstop-与终态要固定"></span>
<span id="性能测量必须包含系统条件"></span>
<span id="容量与故障恢复"></span>
<span id="安全与隔离"></span>
<span id="建立协议资格矩阵"></span>
<span id="同条件评测设计"></span>
<span id="最小适配卡"></span>
<span id="在本项目验证适配前置边界"></span>
<span id="前置条件与固定输入"></span>
<span id="命令"></span>
<span id="预期输出与断言"></span>
<span id="失败、停止、清理与回滚"></span>
<span id="失败停止清理与回滚"></span>
<span id="已知限制与证据边界"></span>
<span id="灰度、回滚与退役"></span>
<span id="灰度回滚与退役"></span>

<span id="meta-llama-模型家族适配"></span>

## 来源与版本

[官方入口](https://developer.meta.com/ai/docs/overview/)，本轮检查日期 2026-09-08。[FACT:llama-source] 本轮核对 Meta Developer 官方入口；具体权重能力和使用条款仍由目标模型卡决定。

来源记录属于 E0；本仓库没有该家族真实模型运行结果。具体型号、套餐、区域、上下文和价格不跨版本继承。

## 冻结这个组合

本地配置必须同时固定权重 revision、tokenizer、chat template、量化方法、运行时、硬件与采样。托管方无法提供的内部字段明确写 unknown。

<span id="适配检查表"></span>
<span id="检查题"></span>

## 产品特有的检查

测量时分开冷启动、排队、首 token、生成、工具和验收耗时；4-bit 不是唯一量化身份，tokens/s 也不是完整任务效率。

先做一个无副作用文本探针、一个完整工具往返和一个错误/取消探针。保存请求与实际型号、协议映射、用量状态和终态；协议不合格时修适配层，不进入质量比较。

## 配置与操作路径

用[适配卡](/practice/model-playbook)记录 requested/observed model、供应方、版本、工具和预算。产品用户按[Harness 教程](/harnesses/comparison)配置；自建循环先对照[Responses 参考实现](/models/openai)，只复用控制边界，不复制其他供应方的 wire 字段。

当前没有本家族可直接调用的适配器，页面不再通过共享 Replay 测试冒充家族验证。真实探针需单独授权；缺少身份、字段来源或费用上限时停止。回退恢复完整旧配置，未知写操作先对账。
