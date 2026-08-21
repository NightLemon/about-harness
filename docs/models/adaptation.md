# 指定模型适配方法

目标不是写一张“模型能力印象表”，而是让精确模型—provider—adapter—harness—surface 组合在指定工作负载中达到可验证结果。

## 第一步：冻结身份

记录 model ID/alias、provider、API/本地 runtime、adapter 版本、harness 版本与 surface、解析日期。Alias 可能漂移；无法解析底层版本时明确写“rolling alias”。

## 第二步：协议兼容

探测 message roles、system/developer 语义、工具 schema、并行 tool calls、streaming、stop reason、usage、context、错误分类和状态载体。请求成功但 tool arguments、call ID、typed output item 或 opaque continuation state 丢失仍是不兼容。

## 第三步：能力与工作负载

用小型、无副作用探针形成假设，再写真实任务分布：语言、仓库大小、长上下文、工具数量、交互/自动、风险、延迟与成本。能力不与工作负载绑定就不能指导配置。

## 第四步：保留基线

同时保存开箱默认和合理工程基线。候选配置每次只改变一个主要变量：任务契约、上下文、工具、权限、记忆、推理预算或路由。

## 第五步：评测与晋级

E1 证明 harness 流程；E2 证明目标环境窄范围可用；E3 才能支持“在限定工作负载下较优”。正式比较至少 20 个任务、每配置每任务 3 次、holdout 20% 且不少于 5 题。

## 适配卡最小字段

身份、协议、state carrier、工作负载、能力假设、探针、默认/工程/候选配置、任务级结果、安全事件、成本/延迟、路由/回退、证据等级、已知限制与复核日期。
