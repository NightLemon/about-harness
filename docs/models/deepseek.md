# DeepSeek：适配差异与验证入口

本页集中说明这一模型家族需要额外核对的条件。通用流程只在[模型适配与选择](/models/adaptation)维护，探针格式见[协议兼容](/models/protocol-compatibility)。

<span id="核对入口与-pending-边界"></span>
<span id="先拆开三种部署身份"></span>
<span id="pending-如何进入控制流"></span>
<span id="最小适配卡"></span>
<span id="先做协议资格探针"></span>
<span id="reasoning-字段不是普通正文"></span>
<span id="tool-loop-与真实执行边界"></span>
<span id="streaming、usage-与预算"></span>
<span id="streamingusage-与预算"></span>
<span id="coding-工作例与失败分类"></span>
<span id="第三方-endpoint-的身份与安全"></span>
<span id="评测、晋级与回退"></span>
<span id="评测晋级与回退"></span>
<span id="在本项目验证离线边界"></span>

<span id="deepseek-模型家族适配"></span>

## 来源与版本

[官方入口](https://api-docs.deepseek.com/)的来源状态保持 `pending`。[FACT:deepseek-api-surface] 上次登记日期为 2026-08-20；2026-09-08 与 2026-09-21 重试仍遇到 TLS 握手失败，不能将重试日期写成核验成功。价格、别名、上下文与可用性不填旧数字，相关费用实验、容量承诺与比较停止在来源核验阶段。

来源记录属于 E0；本仓库没有该家族真实模型运行结果。具体型号、套餐、区域、上下文和价格不跨版本继承。

## 冻结这个组合

官方 API、第三方 endpoint 和本地权重是不同组合。分别核对 reasoning、正文、工具参数及下一轮回送字段，避免把不同类型拼接成普通消息。

<span id="检查题与下一步"></span>

## 产品特有的检查

来源恢复后逐项核验，而不是一次请求成功就升级所有字段。当前不产生费用、容量或性能结论。

先做一个无副作用文本探针、一个完整工具往返和一个错误/取消探针。保存请求与实际型号、协议映射、用量状态和终态；协议不合格时修适配层，不进入质量比较。

## 配置与操作路径

用[适配卡](/practice/model-playbook)记录 requested/observed model、供应方、版本、工具和预算。产品用户按[Harness 教程](/harnesses/comparison)配置；自建循环先对照[Responses 参考实现](/models/openai)，只复用控制边界，不复制其他供应方的 wire 字段。

当前没有本家族可直接调用的适配器，页面不再通过共享 Replay 测试冒充家族验证。真实探针需单独授权；缺少身份、字段来源或费用上限时停止。回退恢复完整旧配置，未知写操作先对账。
