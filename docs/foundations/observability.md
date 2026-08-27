# 可观测性与故障归因

可观测性让外部人员重建“给了什么、模型建议什么、harness 执行什么、为何停止”。它不是把所有原始对话永久保存。

## 最小事件

Run started、model action、policy decision、tool result、retry、checkpoint、validator result、run stopped。每个事件有 sequence、timestamp、run/task ID、版本和脱敏 data。

## 指标

- 结果：任务成功、测试/规则评分、安全事件；
- 过程：steps、model/tool calls、重试、人工介入；
- 资源：延迟、token、费用、缓存；
- 可靠性：timeout、取消、恢复成功、重复副作用；
- 数据质量：schema 拒绝、fixture/version/hash 缺失。

平均值会隐藏尾部延迟；报告样本量、P50/P90、成功率区间或效应量。成本为 0 可能表示未记录，不应自动解释为免费。

## 归因树

先区分任务契约、fixture、模型、provider、adapter、context、policy、tool、validator 和基础设施。总分下降后回到具体失败 trace；不要把所有问题归因给模型。

## 隐私

默认记录结构化摘要，secret、个人路径、私人输入和原始 live trace 不进入公开结果。脱敏后仍需人工抽查可逆标识。

## 工作例：工具调用失败

一次 run 在第 4 步调用 `read_file`，policy 允许，工具却返回路径不存在。Trace 依次保存 model action、policy decision、tool result、failure class 与 stop reason；内容只记录脱敏相对路径和错误码。仅保存最终回答无法判断是模型选错路径、adapter 改写参数还是工具本身故障。

## 失败诊断

指标突然归零先检查采集而非宣称成本下降；事件乱序检查 sequence 与并发 clock；无法关联 task/run 检查 ID 传播；日志过多污染隐私则缩小 data 字段并保留 hash。Trace schema 变化要版本化，读取器不能静默丢事件。

## 自检与下一步

第三方能否从最小事件重建一次失败？哪些原始内容没有必要公开？到[评测报告](/evaluation/reporting)学习聚合，再用[测试策略](/implementation/testing)加入故障注入。
