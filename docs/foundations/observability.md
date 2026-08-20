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
